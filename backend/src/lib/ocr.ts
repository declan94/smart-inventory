import sharp from "sharp";
import fs from "fs";
import https from "https";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

export interface OcrResult {
  text: string;
  box: number[][];
}

const localFileCache: Record<string, string> = {};
const toLocalFile = async (url: string) => {
  if (localFileCache[url]) {
    return localFileCache[url];
  }
  const tmpFile = `/tmp/${url.split("/").pop()}`;
  await downloadFile(url, tmpFile);
  localFileCache[url] = tmpFile;
  return tmpFile;
};

const downloadFile = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(() => resolve());
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {
          reject(err);
        });
      });
  });
};

const s3 = new AWS.S3();
const uploadFile = (src: string): Promise<string> => {
  const bucketName = process.env.BUCKET_NAME!;
  const key = "ocr/result/" + (src.split("/").pop() || `upload-${uuidv4()}`);
  const fileStream = require("fs").createReadStream(src);
  let contentType = "image/jpeg";
  if (key.toLowerCase().endsWith("png")) {
    contentType = "image/png";
  }
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  };
  return new Promise((resolve, reject) => {
    s3.upload(params, (err: Error, data: AWS.S3.ManagedUpload.SendData) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location);
      }
    });
  });
};

export const extractCandidateKeywords = async (imgFile: string, ocrResults: OcrResult[]): Promise<OcrResult[]> => {
  if (imgFile.startsWith("https://")) {
    imgFile = await toLocalFile(imgFile);
  }
  const img = sharp(imgFile).removeAlpha().greyscale().toColourspace("b-w");
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  let posMarks = ocrResults.filter((r) => r.text.includes("是否进货")).map((r) => r.box);
  if (posMarks.length < 3) {
    posMarks = ocrResults
      .filter((r) => (r.text.includes("是") || r.text.includes("否")) && r.text.includes("进货"))
      .map((r) => r.box);
  }
  if (posMarks.length != 3) {
    return [];
  }

  const [box0, box1, box2] = posMarks;
  let pos0 = { x: Math.round(box0[0][0] - (box0[1][0] - box0[0][0]) / 3), y: box0[0][1] };
  let pos1 = { x: Math.round(box1[0][0] - (box1[1][0] - box1[0][0]) / 5), y: box1[0][1] };
  let pos2 = { x: Math.round(box2[0][0] - (box2[1][0] - box2[0][0]) / 9), y: box2[0][1] };
  const w = Math.round(((box0[1][0] - box0[0][0] + (box1[1][0] - box1[0][0]) + (box2[1][0] - box2[0][0])) * 1.5) / 3);
  const h = Math.round((box0[2][1] - box0[0][1] + (box1[2][1] - box1[0][1]) + (box2[2][1] - box2[0][1])) / 3);

  // adjust order, make sure that:
  // pos0: top left
  // pos1: top right
  // pos2: bottom right
  if (pos0.y > pos2.y) {
    [pos0, pos2] = [pos2, pos0];
  }
  if (pos1.y > pos2.y) {
    [pos1, pos2] = [pos2, pos1];
  }
  if (pos0.x > pos1.x) {
    [pos0, pos1] = [pos1, pos0];
  }

  // left pos marks used to calibrate positions on the left column
  let leftPosMarks = ocrResults.filter((r) => ["咸骨", "成骨", "肉丝"].includes(r.text)).map((r) => r.box);
  let lpos0: { x: number; y: number } | null = null;
  let lpos1: { x: number; y: number } | null = null;
  if (leftPosMarks.length == 2) {
    const [lbox0, lbox1] = leftPosMarks;
    lpos0 = { x: lbox0[0][0], y: lbox0[0][1] };
    lpos1 = { x: lbox1[0][0], y: lbox1[0][1] };
    if (lpos0.y > lpos1.y) {
      [lpos0, lpos1] = [lpos1, lpos0];
    }
  }

  return ocrResults.filter((r) => {
    if ((r.text.includes("是") || r.text.includes("否")) && r.text.includes("进货")) {
      return false;
    }
    if (r.text.includes("冻品") || r.text.includes("生鲜") || r.text.includes("包材") || r.text.includes("日期")) {
      return false;
    }
    let markPos = pos0;
    if (r.box[0][0] > pos0.x + w / 2) {
      markPos = r.box[0][1] > pos2.y + h / 2 ? pos2 : pos1;
    }
    const yc = (r.box[0][1] + r.box[2][1]) / 2;
    const y0 = Math.max(0, Math.min(info.height - 1, Math.round(yc - h / 2)));
    const y1 = Math.max(0, Math.min(info.height - 1, Math.round(yc + h / 2)));
    const xCorrection =
      markPos == pos0 && lpos0 && lpos1
        ? Math.round(((y0 - markPos.y) * (lpos1.x - lpos0.x)) / (lpos1.y - lpos0.y))
        : Math.round(((y0 - markPos.y) * (pos2.x - pos1.x)) / (pos2.y - pos1.y));
    const x0 = Math.max(0, Math.min(info.width - 1, markPos.x + xCorrection));
    const x1 = Math.max(0, Math.min(info.width - 1, x0 + w));
    let weight = 0;
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        if (data[y * info.width + x] < 128) {
          weight += Math.min(x - x0, y - y0, x1 - x, y1 - y);
        }
      }
    }
    console.log(r.text, w, h, weight);
    return weight >= 0.12 * w * h;
  });
};

export const markEffectiveCandidates = async (imgFile: string, effectiveCandidates: OcrResult[]): Promise<string> => {
  if (imgFile.startsWith("https://")) {
    imgFile = await toLocalFile(imgFile);
  }
  const img = sharp(imgFile).removeAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const fillColor = (x: number, y: number) => {
    data[(y * info.width + x) * 3] = 0; // R
    data[(y * info.width + x) * 3 + 1] = 255; // G
    data[(y * info.width + x) * 3 + 2] = 0; // B
  };
  effectiveCandidates.forEach((c) => {
    const [x0, y0, x1, y1] = [c.box[0][0], c.box[0][1], c.box[2][0], c.box[2][1]];
    for (let x = x0; x <= x1; x++) {
      fillColor(x, y0);
      fillColor(x, y0 + 1);
      fillColor(x, y1);
      fillColor(x, y1 - 1);
    }
    for (let y = y0; y <= y1; y++) {
      fillColor(x0, y);
      fillColor(x0 + 1, y);
      fillColor(x1, y);
      fillColor(x1 - 1, y);
    }
  });
  const filepath = `/tmp/result-${uuidv4()}.jpeg`;
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .toFormat("jpeg")
    .toFile(filepath);

  return uploadFile(filepath);
};

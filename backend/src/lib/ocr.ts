import sharp from "sharp";

export interface OcrResult {
  text: string;
  box: number[][];
}

export const extractCandidateKeywords = async (imgFile: string, ocrResults: OcrResult[]): Promise<OcrResult[]> => {
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
  const pos0 = { x: Math.round(box0[0][0] - (box0[1][0] - box0[0][0]) / 3), y: box0[0][1] };
  const pos1 = { x: Math.round(box1[0][0] - (box1[1][0] - box1[0][0]) / 5), y: box1[0][1] };
  const pos2 = { x: Math.round(box2[0][0] - (box2[1][0] - box2[0][0]) / 9), y: box2[0][1] };
  const w = Math.round(((box0[1][0] - box0[0][0] + (box1[1][0] - box1[0][0]) + (box2[1][0] - box2[0][0])) * 1.5) / 3);
  const h = Math.round((box0[2][1] - box0[0][1] + (box1[2][1] - box1[0][1]) + (box2[2][1] - box2[0][1])) / 3);

  if (pos1.x <= pos0.x || pos2.y <= pos1.y) {
    return [];
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
    const y0 = r.box[0][1];
    const y1 = r.box[2][1];
    const xCorrection = Math.round(((y0 - markPos.y) * (pos2.x - pos1.x)) / (pos2.y - pos1.y));
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
    console.log(r.text, weight);
    return weight >= 600;
  });
};

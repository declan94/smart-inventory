import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { errorResponse, okResponse } from "../utils/api";
import { v4 as uuidv4 } from "uuid";
import Replicate from "replicate";
import { query } from "../utils/db";
import { OcrCalibration, OcrTask } from "../types";
import { extractCandidateKeywords, markEffectiveCandidates, OcrResult } from "../lib/ocr";

const STATUS_PENDING = 0;
const STATUS_SUCCESS = 1;
const STATUS_FAILURE = 2;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path;
  const queryParams = event.queryStringParameters || {};

  if (method == "GET" && path == "/ocr/upload/url") {
    const s3 = new AWS.S3();
    const bucketName = process.env.BUCKET_NAME;
    const { fmt } = queryParams;
    if (!fmt || !["jpeg", "jpg", "png"].includes(fmt.toLowerCase())) {
      return errorResponse("不支持的图片格式", 400);
    }
    let contentType = "image/jpeg";
    if (fmt.toLowerCase() == "png") {
      contentType = "image/png";
    }
    const key = `ocr/${uuidv4()}.${fmt}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 300,
      ContentType: contentType,
    };

    try {
      const url = await s3.getSignedUrlPromise("putObject", params);
      const public_url = `${process.env.BUCKET_URL}/${key}`;
      return okResponse({ url, public_url });
    } catch (error) {
      const err = error as Error;
      return errorResponse(err.message, 500);
    }
  }

  const { shop_id } = queryParams;
  if (!shop_id) {
    return errorResponse("缺少参数: shop_id", 400);
  }
  const shopId = Number(shop_id);
  if (!shopId) {
    return errorResponse("错误参数: shop_id", 400);
  }

  if (method == "POST" && path == "/ocr") {
    const body = JSON.parse(event.body || "");
    const { image_url } = body;
    if (!image_url) {
      return errorResponse("缺少参数: image_url", 400);
    }
    if (!image_url.startsWith("https://")) {
      return errorResponse("image_url 必须以 https:// 开头", 400);
    }
    if (!image_url.endsWith(".jpg") && !image_url.endsWith(".jpeg") && !image_url.endsWith(".png")) {
      return errorResponse("image_url 必须以 .jpg, .jpeg 或 .png 结尾", 400);
    }
    try {
      const activeTask = await getActiveTask(shopId);
      if (activeTask) {
        return errorResponse("已有任务在处理中", 400);
      }
      const prediction = await replicate.predictions.create({
        version: "084b779cb09bc2462335a5768fabaeaaba53bb3f70afd0d2fe48fad71fdc4d5a",
        input: {
          lang: "ch",
          image: image_url,
        },
      });
      const sql = `INSERT INTO ocr_task (shop_id, image_url, prediction_id, status, consumed) 
      VALUES (${shopId}, '${image_url}', '${prediction.id}', ${STATUS_PENDING}, 0)`;
      await query(sql);
      return okResponse({});
    } catch (error) {
      return errorResponse((error as Error).message || `${error}`, 500);
    }
  }

  if (method == "GET" && path == "/ocr") {
    try {
      const activeTask = await getActiveTask(shopId);
      if (!activeTask) {
        return okResponse({});
      }
      if (activeTask.status == STATUS_PENDING) {
        const prediction = await replicate.predictions.get(activeTask.prediction_id);
        console.log("prediction", prediction);
        if (["failed", "canceled"].includes(prediction.status)) {
          activeTask.status = STATUS_FAILURE;
          await updateTask(activeTask.id, STATUS_FAILURE);
        } else if (prediction.status == "succeeded") {
          if (!prediction.output) {
            // expired
            await updateTask(activeTask.id, STATUS_FAILURE, undefined, undefined, true);
            return okResponse({});
          }
          const ocrResults: OcrResult[] = prediction.output.results;
          const candidates = await extractCandidateKeywords(activeTask.image_url, ocrResults);
          console.log("OCR Candidates: ", candidates);
          const calibrations = await query<OcrCalibration>("SELECT * FROM ocr_calibration");
          const materialIds: number[] = [];
          const effective: OcrResult[] = [];
          await Promise.all(
            candidates.map(async (c) => {
              let calibratedText = c.text;
              calibrations.forEach((calibration) => {
                calibratedText = calibratedText.replace(calibration.ocr_text, calibration.calibrated_text);
              });
              const ret = await query<{ id: number }>(
                `SELECT id FROM material WHERE name = '${c.text}' OR JSON_CONTAINS(ocr_alias, '["${c.text}"]') 
              OR name = '${calibratedText}' OR JSON_CONTAINS(ocr_alias, '["${calibratedText}"]') `
              );
              if (ret.length > 0) {
                materialIds.push(ret[0].id);
                effective.push(c);
              }
            })
          );
          console.log("Effective Candidates: ", effective);
          const markedImageUrl = await markEffectiveCandidates(activeTask.image_url, effective);
          activeTask.status = STATUS_SUCCESS;
          activeTask.material_ids = materialIds;
          activeTask.result_image_url = markedImageUrl;
          await updateTask(activeTask.id, STATUS_SUCCESS, materialIds, markedImageUrl);
        }
      }
      return okResponse(activeTask);
    } catch (error) {
      return errorResponse((error as Error).message || `${error}`, 500);
    }
  }

  if (method == "POST" && path == "/ocr/consume") {
    const sql = `UPDATE ocr_task SET consumed = 1 WHERE shop_id = ? AND consumed = 0`;
    try {
      await query(sql, [shopId]);
    } catch (error) {
      return errorResponse((error as Error).message || `${error}`, 500);
    }
    return okResponse({});
  }

  return errorResponse("not found", 404);
};

const getActiveTask = async (shopId: number): Promise<OcrTask | null> => {
  const sql = `SELECT * FROM ocr_task WHERE shop_id = ${shopId} AND consumed = 0`;
  const rows = await query<OcrTask>(sql);
  if (rows.length == 0) {
    return null;
  }
  return rows[0];
};

const updateTask = async (
  id: number,
  status: number,
  materialIDs?: number[],
  resultImgUrl?: string,
  consumed?: boolean
) => {
  return query(`UPDATE ocr_task SET status = ?, material_ids = ?, result_image_url = ?, consumed = ? WHERE id = ?`, [
    status,
    materialIDs ? JSON.stringify(materialIDs) : null,
    resultImgUrl || "",
    consumed ? 1 : 0,
    id,
  ]);
};

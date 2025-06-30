import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { errorResponse, okResponse } from "../utils/api";
import { v4 as uuidv4 } from "uuid";

exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

  return errorResponse("not found", 404);
};

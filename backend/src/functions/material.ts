import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { query } from "../utils/db";
import { Material } from "../types";
import { errorResponse, okResponse } from "../utils/api";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // only get materials now. later we can add create, update, delete
  try {
    const result = await query<Material>("SELECT * FROM material");
    return okResponse(result);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`${error}`);
  }
};

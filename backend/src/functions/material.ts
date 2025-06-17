import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { query } from "../utils/db";
import { Material, SupplierDetail } from "../types";
import { errorResponse, okResponse } from "../utils/api";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path;
  const queryParams = event.queryStringParameters || {};

  if (method === "GET" && path === "/material") {
    // only get materials now. later we can add create, update, delete
    try {
      const result = await query<Material>("SELECT * FROM material WHERE disabled=0");
      return okResponse(result);
    } catch (error) {
      console.error("Error:", error);
      return errorResponse(`${error}`);
    }
  }

  if (method === "GET" && path === "/material/supplier") {
    const { material_id } = queryParams;
    if (!material_id) {
      return errorResponse("缺少参数", 400);
    }
    material_id.split(",").forEach((mid) => {
      if (!Number(mid)) {
        return errorResponse("material_id参数错误", 400);
      }
    });
    try {
      const suppliers = await query<SupplierDetail>(
        `
        SELECT ms.material_id, s.name as supplier_name, ms.supplier_priority
        FROM material_supplier ms
        JOIN supplier s ON ms.supplier_id = s.id
        WHERE ms.material_id IN (${material_id})
      `
      );
      return okResponse(suppliers);
    } catch (error) {
      console.error("Error:", error);
      return errorResponse(`${error}`);
    }
  }

  return errorResponse(`not found`, 404);

};

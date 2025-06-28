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

  if (method === "GET" && path === "/material/add-on") {
    // 推荐凑单商品列表
    const { shop_id } = queryParams;
    if (!shop_id) {
      return errorResponse("缺少参数", 400);
    }
    const shopId = Number(shop_id);
    try {
      interface AddOnCandidate {
        material_id: number;
        add_on_days: number;
        limit_times: number;
        last_order_time: Date;
      }
      const candidates = await query<AddOnCandidate>(
        `
        SELECT A.material_id, A.add_on_days, A.limit_times, MAX(B.order_time) AS last_order_time FROM material_add_on A 
        JOIN material_shortage_record B ON A.material_id = B.material_id
        WHERE A.shop_id = ?
        GROUP BY A.material_id, A.add_on_days, A.limit_times
        `,
        [shopId]
      );
      // filter according to add_on_days
      const filteredCandidates = candidates.filter((c) => {
        if (c.last_order_time) {
          c.last_order_time.setUTCHours(0, 0, 0, 0);
          const daysDiff = (new Date().getTime() - new Date(c.last_order_time).getTime()) / (1000 * 3600 * 24);
          if (daysDiff >= c.add_on_days) {
            return true;
          }
        }
      });
      if (filteredCandidates.length == 0) {
        return okResponse([]);
      }
      // further filter according to limit_times
      const limit = filteredCandidates.reduce((s, cur) => s + cur.limit_times, 0);
      const records = await query<{ material_id: number; status: number; is_add_on: number }>(
        `
        SELECT material_id, status, is_add_on FROM material_shortage_record
        WHERE shop_id = ? AND 
        status IN (2,3) AND
        material_id IN (${filteredCandidates.map((c) => c.material_id).join(",")})
        ORDER BY time DESC LIMIT ${limit}
        `,
        [shopId]
      );
      const reuslt = filteredCandidates.filter((c) => {
        let addOnCnt = 0; // 连续凑单次数
        for (const r of records) {
          if (r.material_id == c.material_id) {
            if (r.status == 2) return false; // already in submitted shortage records
            if (r.is_add_on == 0) return true;
            addOnCnt++;
            if (addOnCnt >= c.limit_times) return false;
          }
        }
      });
      if (reuslt.length == 0) {
        return okResponse([]);
      }
      const materialIds = reuslt.map((c) => c.material_id).join(",");
      const resultMaterials = await query<any>(
        `WITH B AS ( 
          SELECT material_id, MAX( order_time ) AS last_order_time FROM material_shortage_record 
          WHERE STATUS = 3 AND material_id IN ( ${materialIds} ) 
          GROUP BY material_id 
          ) 
      SELECT A.*, B.last_order_time 
        FROM material A
        JOIN B ON A.id = B.material_id 
        WHERE A.disabled = 0
        `
      );
      return okResponse(resultMaterials);
    } catch (error) {
      console.error("Error:", error);
      return errorResponse(`${error}`);
    }
  }

  return errorResponse(`not found`, 404);
};

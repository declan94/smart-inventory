import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPool, query } from "../utils/db";
import { MaterialStock, StockChangeType } from "../types";
import { errorResponse, okResponse } from "../utils/api";

export interface StockUpdateBody {
  stock: number;
  type: StockChangeType;
  comment: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const materialId = event.pathParameters?.material_id;
    const shopId = event.queryStringParameters?.shop_id;
    const body: StockUpdateBody = JSON.parse(event.body || "{}");

    if (body.stock < 0) {
      return errorResponse("校准后库存不能小于0", 400);
    }

    if (!materialId || !shopId) {
      return errorResponse("material_id and shop_id are required", 400);
    }

    // 获取当前库存
    const [currentStock] = await query<MaterialStock>(`
      SELECT stock, warning_stock 
      FROM material_stock ms 
      JOIN material m ON ms.material_id = m.id 
      WHERE material_id = ? AND shop_id = ?`,
      [materialId, shopId]
    );

    if (!currentStock) {
      return errorResponse("Stock record not found", 404); // Return a 404 status code for not found erro
    }

    const prevStock = currentStock.stock;
    const postStock = body.stock;

    if (body.type === StockChangeType.SHORTAGE && postStock > currentStock.warning_stock) {
      return errorResponse("缺货校准，校准后库存不能大于预警库存：" + currentStock.warning_stock, 400);
    }

    // 开启事务
    const pool = await getPool(); // Assuming you have a function to get the database pool objec;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 更新库存
      await connection.execute("UPDATE material_stock SET stock = ? WHERE material_id = ? AND shop_id = ?", [
        postStock,
        materialId,
        shopId,
      ]);

      // 记录变更历史
      await connection.execute(
        `INSERT INTO stock_change_record 
        (material_id, shop_id, type, comment, prev_stock, post_stock, change_time, operator)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          materialId,
          shopId,
          body.type,
          body.comment || "",
          prevStock,
          postStock,
          event.requestContext.authorizer?.claims?.sub || "system",
        ]
      );

      await connection.commit();

      return okResponse({});
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(`${error}`);
  }
};

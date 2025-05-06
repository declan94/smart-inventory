import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPool, query } from '../utils/db';
import { MaterialStock } from '../types';
import { errorResponse, okResponse } from '../utils/api';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const materialId = event.pathParameters?.material_id;
    const shopId = event.queryStringParameters?.shop_id;
    const body = JSON.parse(event.body || '{}');
    
    if (!materialId || !shopId) {
      return errorResponse('material_id and shop_id are required', 400);
    }

    // 获取当前库存
    const currentStock = await query<MaterialStock>(
      'SELECT stock FROM material_stock WHERE material_id = ? AND shop_id = ?',
      [materialId, shopId]
    );

    if (!currentStock.length) {
      return errorResponse('Stock record not found', 404); // Return a 404 status code for not found erro
    }

    const prevStock = currentStock[0].stock;
    const postStock = body.stock;

    // 开启事务
    const pool = await getPool(); // Assuming you have a function to get the database pool objec;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 更新库存
      await connection.execute(
        'UPDATE material_stock SET stock = ? WHERE material_id = ? AND shop_id = ?',
        [postStock, materialId, shopId]
      );

      // 记录变更历史
      await connection.execute(
        `INSERT INTO stock_change_record 
        (material_id, shop_id, type, comment, prev_stock, post_stock, change_time, operator)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [materialId, shopId, body.type, body.comment || "", prevStock, postStock, event.requestContext.authorizer?.claims?.sub || 'system']
      );

      await connection.commit();

      return okResponse({ });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(`${error}`);
  }
};
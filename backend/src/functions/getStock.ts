import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { query } from '../utils/db';
import { MaterialStockDetail } from '../types';
import { errorResponse, okResponse } from '../utils/api';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const shopId = event.queryStringParameters?.shop_id;
    if (!shopId) {
      return errorResponse('shop_id is required', 400);
    }

    const sql = `
      SELECT m.name, m.type, m.priority, m.unit, ms.material_id, ms.shop_id, ms.stock
      FROM material m
      JOIN material_stock ms ON m.id = ms.material_id
      WHERE ms.shop_id = ?
    `;

    const result = await query<MaterialStockDetail>(sql, [shopId]);

    return okResponse(result);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(`${error}`);
  }
};
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { query } from '../utils/db';
import { MaterialStockDetail } from '../types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const shopId = event.queryStringParameters?.shop_id;
    if (!shopId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'shop_id is required' })
      };
    }

    const sql = `
      SELECT m.name, m.type, m.unit, ms.material_id, ms.shop_id, ms.stock
      FROM material m
      JOIN material_stock ms ON m.id = ms.material_id
      WHERE ms.shop_id = ?
    `;

    const result = await query<MaterialStockDetail>(sql, [shopId]);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
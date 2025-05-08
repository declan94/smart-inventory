import { Material } from "../types";
import { query } from "../utils/db";
import { sendShortageEmail } from "../utils/shortageEmail";

interface InputEvent {
  shopID: number;
  alertEmails: string;
}

export const handler = async (event: InputEvent) => {
  const { shopID, alertEmails } = event;
  const recipients = alertEmails.split(",");

  // 查询低于预警库存的原材料及其信息
  const materials = await query<Material>(
    `
    SELECT m.id, m.name, m.type, m.priority, m.unit, m.search_key, m.comment, ms.stock, m.warning_stock
    FROM material_stock ms
    JOIN material m ON ms.material_id = m.id
    WHERE ms.shop_id = ? AND ms.stock <= m.warning_stock
  `,
    [shopID]
  );

  if (materials.length === 0) {
    return { statusCode: 200, body: "No low stock materials." };
  }

  await sendShortageEmail(materials, recipients);
  
  return { statusCode: 200, body: "Alert sent." };

};

import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { query } from "../utils/db";
import { errorResponse, okResponse } from "../utils/api";
import { Material, UserRole } from "../types";
import { sendShortageEmail } from "../utils/shortageEmail";

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  const path = event.path;
  const queryParams = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};
  const uuid = getUuid(event);

  let shop_id = queryParams.shop_id || (body && body.shop_id);

  if (!shop_id) {
    return errorResponse("缺少shop_id参数", 400);
  }

  shop_id = Number(shop_id);

  // 上报缺货记录
  if (method === "POST" && path === "/material/shortage") {
    const user = await checkRole(uuid, shop_id);
    if (!user) return errorResponse("无权限", 403);
    const { material_id } = queryParams;
    if (!shop_id || !material_id) {
      return errorResponse("缺少参数", 400);
    }
    material_id.split(",").forEach((mid) => {
      if (!Number(mid)) {
        return errorResponse("material_id参数错误", 400);
      }
    });
    const existing = (await query<{material_id: number}>(
      `
    SELECT material_id
    FROM material_shortage_record
    WHERE shop_id = ? AND status IN (1, 2) AND material_id IN (${material_id})`,
      [shop_id]
    )).map((item) => item.material_id);
    
    // 去掉已经存在的
    const material_ids = material_id
      .split(",")
      .map((mid) => Number(mid))
      .filter((mid) => !existing.includes(mid));

    if (material_ids.length === 0) {
      return okResponse({});
    }

    if (material_ids.length > 20) {
      return errorResponse("一次最多只能新增20条记录", 400);
    }
    const sql = `
      INSERT INTO material_shortage_record (shop_id, material_id, time, status) VALUES
      ${material_ids.map((mid) => `(${shop_id}, ${mid}, NOW(), 1)`).join(",")}
    `;
    await query(sql);
    return okResponse({});
  }

  // 查询缺货记录
  if (method === "GET" && path === "/material/shortage") {
    const { status } = queryParams;
    if (!status) {
      return errorResponse("缺少参数", 400);
    }
    status.split(",").forEach((s) => {
      if (![1, 2, 3].includes(Number(s))) {
        return errorResponse("status参数错误", 400);
      }
    });
    const user = await checkRole(uuid, shop_id);
    if (!user) return errorResponse("无权限", 403);

    const records = await query<any>(
      `SELECT r.*, 
        JSON_OBJECT(
          'id', m.id, 'name', m.name, 'type', m.type, 'unit', m.unit, 'priority', m.priority, 'search_key', m.search_key, 'comment', m.comment
        ) as material
      FROM material_shortage_record r
      LEFT JOIN material m ON r.material_id = m.id
      WHERE r.shop_id = ? AND r.status IN (${status}) AND r.time >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [shop_id]
    );
    return okResponse(records);
  }

  // 删除缺货记录
  if (method === "DELETE" && path.startsWith("/material/shortage/")) {
    const user = await checkRole(uuid, shop_id);
    if (!user) return errorResponse("无权限", 403);
    const id = path.split("/").pop();
    // 只能删除status为1的记录
    const rows = await query<any>("SELECT status FROM material_shortage_record WHERE id = ?", [id]);
    if (!rows.length || rows[0].status !== 1) {
      return errorResponse("只能删除尚未提交的记录", 400);
    }
    await query("DELETE FROM material_shortage_record WHERE id = ?", [id]);
    return okResponse({});
  }

  // 提交缺货记录
  if (method === "POST" && path === "/material/shortage/submit") {
    const user = await checkRole(uuid, shop_id);
    if (!user) return errorResponse("无权限", 403);

    // 发送邮件，先确保邮件发送成功，再更新状态
    const materials = await query<Material>(
      `
    SELECT m.id, m.name, m.type, m.priority, m.unit, m.search_key, m.comment
    FROM material_shortage_record msr
    JOIN material m ON msr.material_id = m.id
    WHERE msr.shop_id =? AND msr.status IN (1, 2)`,
      [shop_id]
    );
    const admins = await getAdmins(shop_id);
    const recipients = admins.map((admin) => admin.email);
    // 发送邮件
    await sendShortageEmail(materials, recipients);

    // 更新状态
    await query("UPDATE material_shortage_record SET status = 2 WHERE shop_id = ? AND status = 1", [shop_id]);
    return okResponse({});
  }

  // 更新订货状态
  if (method === "POST" && path === "/material/shortage/order") {
    const user = await checkRole(uuid, shop_id);
    if (user?.role !== 1) return errorResponse("仅管理员可操作", 403);
    const { shortage_ids } = body;
    if (!shop_id || !Array.isArray(shortage_ids) || shortage_ids.length === 0) {
      return errorResponse("缺少参数", 400);
    }
    await query(
      `UPDATE material_shortage_record SET status = 3 WHERE shop_id = ? AND id IN (${shortage_ids
        .map(() => "?")
        .join(",")})`,
      [shop_id, ...shortage_ids]
    );
    return okResponse({});
  }

  return errorResponse("Not Found", 404);
};

// 获取 Cognito 用户 uuid
function getUuid(event: APIGatewayProxyEvent): string | null {
  return event.requestContext?.authorizer?.claims?.sub || null;
}

// 权限校验
async function checkRole(uuid: string | null, shop_id: number): Promise<UserRole | null> {
  if (!uuid || !shop_id) return null;
  const [user] = await query<UserRole>("SELECT role, email FROM user_role WHERE uuid = ? AND shop_id = ?", [
    uuid,
    shop_id,
  ]);
  if (!user) return null;
  user.shop_id = shop_id;
  user.uuid = uuid;
  return user;
}

async function getAdmins(shop_id: number): Promise<UserRole[]> {
  const admins = await query<UserRole>("SELECT uuid, email FROM user_role WHERE role = 1 AND shop_id = ?", [shop_id]);
  return admins;
}

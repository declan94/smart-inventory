import { Material, SupplierDetail } from "../types";
import { query } from "./db";
import { sendMail } from "./sendMail";

export async function sendShortageEmail(materials: Material[], recipients: string[]) {
  // 查询所有相关原材料的供应商信息
  const materialIds = materials.map((m) => m.id);
  const placeholders = materialIds.map(() => "?").join(",");
  const suppliers = await query<SupplierDetail>(
    `
    SELECT ms.material_id, s.name as supplier_name, ms.supplier_priority
    FROM material_supplier ms
    JOIN supplier s ON ms.supplier_id = s.id
    WHERE ms.material_id IN (${placeholders})
  `,
    materialIds
  );
  // 整理数据为表格
  const supplierNames = Array.from(new Set(suppliers.map((s: SupplierDetail) => s.supplier_name)));
  const tableHeader = ["原材料名称", "原材料类型", "搜索关键词", "备注", ...supplierNames];
  const tableRows = materials
    .sort((a, b) => b.priority - a.priority)
    .map((mat) => {
      const row: string[] = [
        `${mat.name}${mat.priority > 0 ? " *" : ""}`,
        mat.type,
        mat.search_key,
        mat.comment,
        ...supplierNames.map((supName) => {
          const found = suppliers.find((s) => s.material_id === mat.id && s.supplier_name === supName);
          return found ? found.supplier_priority : "";
        }),
      ];
      return row;
    });

  // 生成HTML表格
  const htmlTable = `
  <table border="1" cellpadding="4" cellspacing="0">
    <tr>${tableHeader.map((h) => `<th>${h}</th>`).join("")}</tr>
    ${tableRows.map((row: string[]) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
  </table>
`;

  // 发送邮件
  return sendMail({
    to: recipients,
    subject: "缺货通知",
    html: `<p>以下原材料已登记缺货，请尽快订货：</p>${htmlTable}<p>下单完成后请前往<a href="https://smart-inventory.org/manage/shortage">订货管理页面</a>更新状态</p>`,
  });
}

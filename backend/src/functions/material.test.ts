import { query } from "../utils/db";

describe("addOnCandidates integration test", () => {
  it("should filter candidates", async () => {
    const shopId = 1;
    interface AddOnCandidate {
      material_id: number;
      add_on_days: number;
      limit_times: number;
      last_order_time?: Date;
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
    console.log("filteredCandidates", filteredCandidates);
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
    console.log("result", resultMaterials);
  }, 30000); // Set timeout to 30 seconds
});

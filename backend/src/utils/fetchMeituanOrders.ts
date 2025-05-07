import axios from "axios";

const API_URL =
  "https://waimaie.meituan.com/gw/api/unified/r/order/list/page/history?region_id=1000440300&region_version=1540350602";
const PRESET_COOKIE = process.env.MEITUAN_COOKIE || "";

/**
 * 自动分页拉取指定日期的美团订单
 * @param startDate 格式如 2025-05-06
 * @param endDate 格式如 2025-05-06（可选，不传则与 startDate 相同）
 * @param pageSize 每页数量，默认10
 * @returns 所有订单合并后的数组
 */
export async function fetchAllMeituanOrders(startDate: string, endDate?: string, pageSize: number = 10) {
  let pageNum = 1;
  let hasMore = true;
  let allOrders: any[] = [];
  let nextLabel = null;
  let lastLabel = null;

  while (hasMore) {
    const formData = new URLSearchParams();
    formData.append("tag", "allOrder");
    formData.append("extParam", JSON.stringify({ phfRollback: 0, searchTag: -1 }));
    formData.append("startDate", startDate);
    formData.append("endDate", endDate || startDate);
    formData.append(
      "pageParam",
      JSON.stringify({
        pageSize,
        pageNum,
        sort: 0,
        nextLabel,
        lastLabel,
        direction: 0,
      })
    );

    const resp = await axios.post(API_URL, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: PRESET_COOKIE,
      },
    });

    // 假设响应结构为 resp.data.data.list，需根据实际 respData.json 调整
    const list = resp.data?.data?.orderList || [];
    allOrders = allOrders.concat(list);

    // 判断是否还有下一页，需根据实际 respData.json 的分页字段调整
    hasMore = list.length === pageSize;
    nextLabel = resp.data?.data?.nextLabel;
    lastLabel = resp.data?.data?.lastLabel;
    pageNum += 1;
  }

  return allOrders;
}

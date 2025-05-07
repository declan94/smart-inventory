import { fetchAllMeituanOrders } from "./fetchMeituanOrders";
import * as fs from "fs";
import * as path from "path";

describe("fetchAllMeituanOrders integration test", () => {
  it("should fetch all orders for a given date (requires valid Cookie)", async () => {
    const startDate = "2025-05-06";
    const orders = await fetchAllMeituanOrders(startDate);
    expect(Array.isArray(orders)).toBe(true);
    console.log("orders length", orders.length);
    // 写入到文件
    const outputPath = path.resolve(__dirname, "../../../tmp-data/orders.json");
    fs.writeFileSync(outputPath, JSON.stringify(orders, null, 2), "utf-8");
    console.log("orders written to", outputPath);
  }, 30000); // Set timeout to 30 seconds
});
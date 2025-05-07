import { fetchAllMeituanOrders } from "./fetchMeituanOrders";

describe("fetchAllMeituanOrders integration test", () => {
  it("should fetch all orders for a given date (requires valid Cookie)", async () => {
    const startDate = "2025-05-06";
    const orders = await fetchAllMeituanOrders(startDate);
    expect(Array.isArray(orders)).toBe(true);
    console.log(orders.length);
  }, 30000); // Set timeout to 30 seconds
});
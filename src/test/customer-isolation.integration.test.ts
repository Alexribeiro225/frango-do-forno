import { describe, expect, it } from "vitest";

// Run against an existing empty customer account using temporary test credentials.
const url = process.env["TEST_STORE_URL"];
const key = process.env["TEST_STORE_KEY"];
const token = process.env["TEST_STORE_TOKEN"];
const enabled = Boolean(url && key && token);

async function request(path: string, body?: unknown) {
  if (!url || !key || !token) throw new Error("Customer test session required");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

describe.skipIf(!enabled)("New customer store isolation", () => {
  it("starts without any test orders or other store's orders", async () => {
    const result = await request("orders?select=id,total");
    expect(result.status).toBe(200);
    expect(result.data).toEqual([]);
  });
  it("starts with no inherited products or low-stock alerts", async () => {
    const result = await request("products?select=id,stock_quantity");
    expect(result.status).toBe(200);
    expect(result.data).toEqual([]);
  });
  it("cannot sell another store's product through the counter RPC", async () => {
    const result = await request("rpc/create_counter_sale", { p_payment_method: "PIX", p_items: [{ product_id: 5, quantity: 1 }] });
    expect(result.status).toBe(400);
    expect(result.data.message).toBe("Produto de outra loja não permitido.");
  });
});
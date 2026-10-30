import { describe, expect, it } from "vitest";

const url = process.env["TEST_STORE_URL"];
const key = process.env["TEST_STORE_KEY"];
const token = process.env["TEST_STORE_TOKEN"];
const owner = process.env["TEST_STORE_OWNER"];
const product = Number(process.env["TEST_STORE_PRODUCT"]);
const enabled = Boolean(url && key && token && owner && product);

async function order(store: string | null, productId: number, authenticated: boolean) {
  if (!url || !key || !token) throw new Error("Test session required");
  const response = await fetch(`${url}/rest/v1/rpc/create_store_order`, {
    method: "POST", headers: { apikey: key, "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ p_store_id: store, p_customer_name: "Verificação temporária", p_customer_phone: "14999999999", p_fulfillment: "pickup", p_address: {}, p_payment_method: "PIX", p_notes: "", p_items: [{ product_id: productId, quantity: 1 }] }),
  });
  return { status: response.status, data: await response.json() };
}

describe.skipIf(!enabled)("Public store order boundaries", () => {
  it("rejects products from the master store in a customer storefront", async () => {
    const result = await order(owner ?? null, 5, false);
    expect(result.status).toBe(400);
    expect(result.data.message).toBe("Produto de outra loja não permitido.");
  });
  it("rejects a signed-in caller substituting a different store", async () => {
    const result = await order(null, product, true);
    expect(result.status).toBe(400);
    expect(result.data.message).toBe("Produto de outra loja não permitido.");
  });
  it("stores a signed-in order under the verified account", async () => {
    const result = await order(owner ?? null, product, true);
    expect(result.status).toBe(200);
    if (!url || !key || !token) throw new Error("Test session required");
    const response = await fetch(`${url}/rest/v1/orders?select=owner_id,total&id=eq.${result.data.id}`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    expect(await response.json()).toEqual([{ owner_id: owner, total: 1 }]);
  });
});
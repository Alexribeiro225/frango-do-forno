import { describe, expect, it } from "vitest";
import { withComboAvailability } from "@/lib/inventory";

const recipe = [5, 6, 8, 10].map(id => ({ combo_product_id: 13, component_product_id: id, quantity_per_combo: 1 }));
const products = [
  { id: 5, category: "Suínos", is_active: true, stock_quantity: 10 },
  { id: 6, category: "Acompanhamentos", is_active: true, stock_quantity: 15 },
  { id: 8, category: "Acompanhamentos", is_active: true, stock_quantity: 10 },
  { id: 10, category: "Bebidas", is_active: true, stock_quantity: 30 },
  { id: 13, category: "Combos", is_active: true, stock_quantity: 5 },
];
const comboStock = (rows: typeof products) => withComboAvailability(rows, recipe).find(product => product.id === 13)?.stock_quantity;

describe("Combo Joelho de Porco follows component inventory", () => {
  it("uses current components instead of the stale combo stock of 5", () => {
    expect(comboStock(products)).toBe(10);
  });
  it("updates when Joelho de Porco drops to 3", () => {
    expect(comboStock(products.map(product => product.id === 5 ? { ...product, stock_quantity: 3 } : product))).toBe(3);
  });
  it("sells out when Joelho de Porco reaches zero", () => {
    expect(comboStock(products.map(product => product.id === 5 ? { ...product, stock_quantity: 0 } : product))).toBe(0);
  });
  it("still respects the accompaniment that limits the combo", () => {
    expect(comboStock(products.map(product => product.id === 8 ? { ...product, stock_quantity: 2 } : product))).toBe(2);
  });
});
import { describe, expect, it } from "vitest";

import { addToCart, canAdd } from "@/lib/cart";

describe("Prato esgotado não entra no carrinho", () => {
  it("does not let a sold-out product be added", () => {
    expect(canAdd({ stock_quantity: 0 }, 0)).toBe(false);
    expect(addToCart({}, { stock_quantity: 0 }, 6, 1)).toEqual({});
  });

  it("does not let a sold-out product be added several units at once", () => {
    expect(addToCart({}, { stock_quantity: 0 }, 6, 5)).toEqual({});
  });

  it("takes a sold-out product out of a cart it was already in", () => {
    expect(addToCart({ 6: 2 }, { stock_quantity: 0 }, 6, 1)).toEqual({});
  });

  it("keeps letting a product with stock be added", () => {
    expect(canAdd({ stock_quantity: 15 }, 0)).toBe(true);
    expect(addToCart({}, { stock_quantity: 15 }, 6, 2)).toEqual({ 6: 2 });
  });

  it("never sells past the stock on hand", () => {
    expect(canAdd({ stock_quantity: 3 }, 3)).toBe(false);
    expect(addToCart({ 6: 3 }, { stock_quantity: 5 }, 6, 10)).toEqual({ 6: 5 });
  });

  it("still removes units and clears an empty line", () => {
    expect(addToCart({ 6: 2 }, { stock_quantity: 15 }, 6, -1)).toEqual({ 6: 1 });
    expect(addToCart({ 6: 1 }, { stock_quantity: 15 }, 6, -1)).toEqual({});
  });
});

import { describe, expect, it } from "vitest";
import { parseStoreSearch, storeSearch } from "@/lib/storefront";

describe("Storefront ownership", () => {
  const id = "89ab7006-28c7-4107-8477-72d74c6c1b8f";
  it("links a registered owner's storefront to their own account", () => {
    expect(storeSearch({ id, role: "owner" })).toEqual({ loja: id });
  });
  it("keeps the master storefront separate", () => {
    expect(storeSearch({ id, role: "master" })).toEqual({ loja: undefined });
  });
  it("rejects invalid store identifiers rather than falling back to the master", () => {
    expect(() => parseStoreSearch({ loja: "other-store" })).toThrow("Link da loja inválido.");
    expect(parseStoreSearch({ loja: id })).toEqual({ loja: id });
  });
});
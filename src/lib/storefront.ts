export function storeSearch(user: { id: string; role: "master" | "owner" }) {
  return { loja: user.role === "owner" ? user.id : undefined };
}

export function parseStoreSearch(search: Record<string, unknown>): { loja?: string } {
  if (search["loja"] === undefined) return {};
  if (typeof search["loja"] !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search["loja"])) {
    throw new Error("Link da loja inválido.");
  }
  return { loja: search["loja"] };
}
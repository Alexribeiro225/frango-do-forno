export type StockedItem = { stock_quantity?: number | null };

const MAX_PER_ITEM = 99;

/**
 * Whether one more unit of this product may go into the cart.
 * A product with no stock left (stock_quantity === 0) can never be added.
 */
export function canAdd(item: StockedItem | undefined, inCart = 0) {
  if (item?.stock_quantity === 0) return false;
  if (item?.stock_quantity == null) return inCart < MAX_PER_ITEM;
  return inCart < Math.min(MAX_PER_ITEM, item.stock_quantity);
}

/**
 * Applies a cart change. A sold-out product never enters the cart, and is taken
 * out of it if it sold out while already there; a line never grows past the
 * stock the kitchen actually has.
 */
export function addToCart(
  current: Record<number, number>,
  item: StockedItem | undefined,
  id: number,
  amount: number,
): Record<number, number> {
  if (item?.stock_quantity === 0) {
    if (!(id in current)) return current;
    const cleared = { ...current };
    delete cleared[id];
    return cleared;
  }
  const maximum = item?.stock_quantity == null ? MAX_PER_ITEM : Math.min(MAX_PER_ITEM, item.stock_quantity);
  const quantity = Math.min(maximum, Math.max(0, (current[id] ?? 0) + amount));
  const next = { ...current, [id]: quantity };
  if (!quantity) delete next[id];
  return next;
}

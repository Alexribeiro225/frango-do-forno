type StockProduct = { id: number; category: string; is_active: boolean; stock_quantity: number | null };
type Component = { combo_product_id: number; component_product_id: number; quantity_per_combo: number };

export function withComboAvailability<T extends StockProduct>(products: T[], components: Component[]): T[] {
  const byId = new Map(products.map(product => [product.id, product]));
  return products.map(product => {
    if (product.category !== "Combos") return product;
    const recipe = components.filter(component => component.combo_product_id === product.id);
    const capacities = recipe.map(component => {
      const ingredient = byId.get(component.component_product_id);
      if (!ingredient?.is_active || component.quantity_per_combo <= 0) return 0;
      return ingredient.stock_quantity === null ? Infinity : Math.max(0, Math.floor(ingredient.stock_quantity / component.quantity_per_combo));
    });
    const available = recipe.length ? Math.min(...capacities) : 0;
    return { ...product, stock_quantity: Number.isFinite(available) ? available : null };
  });
}
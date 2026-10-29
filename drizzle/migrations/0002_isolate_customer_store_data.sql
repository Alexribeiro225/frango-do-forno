CREATE OR REPLACE FUNCTION public.current_store_owner() RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT CASE WHEN public.is_superadmin() THEN NULL::uuid ELSE auth.uid() END $$;
GRANT EXECUTE ON FUNCTION public.current_store_owner() TO anon,authenticated,service_role;
ALTER TABLE public.products ADD COLUMN owner_id uuid DEFAULT public.current_store_owner();
ALTER TABLE public.promotions ADD COLUMN owner_id uuid DEFAULT public.current_store_owner();
ALTER TABLE public.announcements ADD COLUMN owner_id uuid DEFAULT public.current_store_owner();
ALTER TABLE public.orders ADD COLUMN owner_id uuid DEFAULT public.current_store_owner();
COMMENT ON COLUMN public.orders.owner_id IS 'NULL identifies the existing Frango Show storefront; UUID identifies an isolated customer store. Legacy records remain unchanged.';
CREATE INDEX products_owner_idx ON public.products(owner_id);
CREATE INDEX orders_owner_created_idx ON public.orders(owner_id,created_at DESC);
CREATE POLICY "Store boundary products" ON public.products AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id IS NOT DISTINCT FROM public.current_store_owner()) WITH CHECK (owner_id IS NOT DISTINCT FROM public.current_store_owner());
CREATE POLICY "Public store products only" ON public.products AS RESTRICTIVE FOR SELECT TO anon USING (owner_id IS NULL);
CREATE POLICY "Store boundary promotions" ON public.promotions AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id IS NOT DISTINCT FROM public.current_store_owner()) WITH CHECK (owner_id IS NOT DISTINCT FROM public.current_store_owner());
CREATE POLICY "Public store promotions only" ON public.promotions AS RESTRICTIVE FOR SELECT TO anon USING (owner_id IS NULL);
CREATE POLICY "Store boundary announcements" ON public.announcements AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id IS NOT DISTINCT FROM public.current_store_owner()) WITH CHECK (owner_id IS NOT DISTINCT FROM public.current_store_owner());
CREATE POLICY "Public store announcements only" ON public.announcements AS RESTRICTIVE FOR SELECT TO anon USING (owner_id IS NULL);
CREATE POLICY "Store boundary orders" ON public.orders AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id IS NOT DISTINCT FROM public.current_store_owner()) WITH CHECK (owner_id IS NOT DISTINCT FROM public.current_store_owner());
CREATE POLICY "Store boundary recipes" ON public.combo_components AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.products p WHERE p.id=combo_product_id AND p.owner_id IS NOT DISTINCT FROM public.current_store_owner())) WITH CHECK (EXISTS(SELECT 1 FROM public.products p JOIN public.products c ON c.id=component_product_id WHERE p.id=combo_product_id AND p.owner_id IS NOT DISTINCT FROM public.current_store_owner() AND c.owner_id IS NOT DISTINCT FROM p.owner_id));
CREATE POLICY "Public store recipes only" ON public.combo_components AS RESTRICTIVE FOR SELECT TO anon USING (EXISTS(SELECT 1 FROM public.products p WHERE p.id=combo_product_id AND p.owner_id IS NULL));
CREATE OR REPLACE FUNCTION public.validate_store_recipe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.products p JOIN public.products c ON c.id=NEW.component_product_id WHERE p.id=NEW.combo_product_id AND p.owner_id IS NOT DISTINCT FROM c.owner_id AND p.owner_id IS NOT DISTINCT FROM public.current_store_owner()) THEN RAISE EXCEPTION 'Composição de outra loja não permitida.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_store_recipe BEFORE INSERT OR UPDATE ON public.combo_components FOR EACH ROW EXECUTE FUNCTION public.validate_store_recipe();
CREATE OR REPLACE FUNCTION public.assign_order_store() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.items IS NULL OR jsonb_typeof(NEW.items)<>'array' OR jsonb_array_length(NEW.items)=0 THEN RAISE EXCEPTION 'Pedido sem produtos.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items) i LEFT JOIN public.products p ON p.id=(i->>'product_id')::bigint WHERE p.id IS NULL OR p.owner_id IS DISTINCT FROM public.current_store_owner()) THEN RAISE EXCEPTION 'Produto de outra loja não permitido.'; END IF;
 NEW.owner_id := public.current_store_owner();
 RETURN NEW;
END $$;
CREATE TRIGGER assign_order_store BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assign_order_store();
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.consume_combo_inventory(jsonb)'::regprocedure) INTO definition;
 definition := replace(definition, E'begin\n', E'begin\n  if exists(select 1 from jsonb_array_elements(p_items) i left join public.products p on p.id=(i->>\'product_id\')::bigint where p.id is null or p.owner_id is distinct from public.current_store_owner()) then raise exception \'Produto de outra loja não permitido.\'; end if;\n');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.save_combo_components(bigint,jsonb)'::regprocedure) INTO definition;
 definition := replace(definition, E'begin\n', E'begin\n  if not exists(select 1 from public.products where id=p_combo_product_id and owner_id is not distinct from public.current_store_owner()) then raise exception \'Combo de outra loja não permitido.\'; end if;\n');
 EXECUTE definition;
END $$;
REVOKE EXECUTE ON FUNCTION public.consume_combo_inventory(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_combo_inventory(jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.validate_store_recipe() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_order_store() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_store_recipe(), public.assign_order_store() TO service_role;
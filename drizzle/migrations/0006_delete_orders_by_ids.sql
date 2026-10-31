CREATE OR REPLACE FUNCTION public.delete_orders_by_ids(p_ids bigint[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL OR public.is_superadmin() OR NOT public.has_active_saas_subscription() THEN
    RAISE EXCEPTION 'Sem permissão para apagar pedidos.';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um pedido.';
  END IF;
  DELETE FROM public.orders WHERE owner_id = public.current_store_owner() AND id = ANY(p_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.delete_orders_by_ids(bigint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_orders_by_ids(bigint[]) TO authenticated;
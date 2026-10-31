CREATE OR REPLACE FUNCTION public.delete_orders_in_range(p_start timestamptz, p_end timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL OR public.is_superadmin() OR NOT public.has_active_saas_subscription() THEN
    RAISE EXCEPTION 'Sem permissão para apagar pedidos.';
  END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN
    RAISE EXCEPTION 'Período inválido.';
  END IF;
  DELETE FROM public.orders WHERE owner_id = public.current_store_owner() AND created_at >= p_start AND created_at < p_end;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.delete_orders_in_range(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_orders_in_range(timestamptz, timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.create_order(p_customer_name text, p_customer_phone text, p_fulfillment text, p_address jsonb, p_payment_method text, p_notes text, p_items jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_main uuid := public.main_store_owner();
begin
  if v_main is null then raise exception 'Loja indisponível no momento.'; end if;
  return public.create_store_order(v_main, p_customer_name, p_customer_phone, p_fulfillment, p_address, p_payment_method, p_notes, p_items);
end; $function$;
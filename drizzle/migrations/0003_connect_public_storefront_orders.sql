CREATE OR REPLACE FUNCTION public.store_accepts_orders(p_owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT p_owner IS NULL OR EXISTS (SELECT 1 FROM public.saas_subscriptions s WHERE s.user_id=p_owner AND NOT s.is_blocked AND ((s.status='active' AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.status='trial' AND s.trial_ends_at>now()))) $$;
REVOKE ALL ON FUNCTION public.store_accepts_orders(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_accepts_orders(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.current_store_owner() RETURNS uuid LANGUAGE sql STABLE SET search_path=public,pg_temp AS $$ SELECT CASE WHEN public.is_superadmin() THEN NULL::uuid WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE nullif(current_setting('app.public_store_owner',true),'')::uuid END $$;
CREATE OR REPLACE FUNCTION public.public_store_content(p_store_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.store_accepts_orders(p_store_id) THEN RAISE EXCEPTION 'Loja indisponível no momento.'; END IF;
 RETURN jsonb_build_object(
 'products',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'category',category,'name',name,'price',price,'description',description,'image_url',image_url,'is_popular',is_popular,'is_active',is_active,'stock_quantity',stock_quantity) ORDER BY sort_order,id) FROM public.products WHERE owner_id IS NOT DISTINCT FROM p_store_id AND is_active),'[]'::jsonb),
 'promos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'description',description,'image_url',image_url,'starts_at',starts_at,'ends_at',ends_at,'is_active',is_active)) FROM public.promotions WHERE owner_id IS NOT DISTINCT FROM p_store_id AND is_active AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>=now())),'[]'::jsonb),
 'announcements',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'image_url',image_url,'is_active',is_active)) FROM public.announcements WHERE owner_id IS NOT DISTINCT FROM p_store_id AND is_active),'[]'::jsonb),
 'components',coalesce((SELECT jsonb_agg(jsonb_build_object('combo_product_id',cc.combo_product_id,'component_product_id',cc.component_product_id,'quantity_per_combo',cc.quantity_per_combo)) FROM public.combo_components cc JOIN public.products p ON p.id=cc.combo_product_id WHERE p.owner_id IS NOT DISTINCT FROM p_store_id AND p.is_active),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.public_store_content(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_store_content(uuid) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.create_store_order(p_store_id uuid,p_customer_name text,p_customer_phone text,p_fulfillment text,p_address jsonb,p_payment_method text,p_notes text,p_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result jsonb; v_previous text;
BEGIN
 IF NOT public.store_accepts_orders(p_store_id) THEN RAISE EXCEPTION 'Loja indisponível no momento.'; END IF;
 IF auth.uid() IS NOT NULL AND p_store_id IS DISTINCT FROM public.current_store_owner() THEN RAISE EXCEPTION 'Produto de outra loja não permitido.'; END IF;
 v_previous := current_setting('app.public_store_owner',true);
 PERFORM set_config('app.public_store_owner',coalesce(p_store_id::text,''),true);
 v_result := public.create_order(p_customer_name,p_customer_phone,p_fulfillment,p_address,p_payment_method,p_notes,p_items);
 PERFORM set_config('app.public_store_owner',coalesce(v_previous,''),true);
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.create_store_order(uuid,text,text,text,jsonb,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_order(uuid,text,text,text,jsonb,text,text,jsonb) TO anon,authenticated,service_role;
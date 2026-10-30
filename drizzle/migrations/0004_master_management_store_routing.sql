ALTER TABLE public.saas_subscriptions ADD COLUMN is_main_store boolean NOT NULL DEFAULT false;
UPDATE public.saas_subscriptions SET is_main_store=true WHERE user_id=(SELECT min(user_id::text)::uuid FROM public.saas_subscriptions HAVING count(*)=1);
CREATE UNIQUE INDEX single_main_store ON public.saas_subscriptions ((is_main_store)) WHERE is_main_store;
CREATE OR REPLACE FUNCTION public.main_store_owner() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT user_id FROM public.saas_subscriptions WHERE is_main_store $$;
REVOKE ALL ON FUNCTION public.main_store_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.main_store_owner() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.set_main_store(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF NOT public.is_superadmin() THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
 PERFORM pg_advisory_xact_lock(785219);
 IF NOT EXISTS(SELECT 1 FROM public.saas_subscriptions WHERE user_id=p_user_id AND lower(customer_email)<>'conectstore.app@gmail.com') THEN RAISE EXCEPTION 'Usuário da loja não encontrado.'; END IF;
 UPDATE public.saas_subscriptions SET is_main_store=false WHERE is_main_store;
 UPDATE public.saas_subscriptions SET is_main_store=true WHERE user_id=p_user_id;
END $$;
REVOKE ALL ON FUNCTION public.set_main_store(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_main_store(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.store_accepts_orders(p_owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT p_owner IS NOT NULL AND EXISTS(SELECT 1 FROM public.saas_subscriptions s WHERE s.user_id=p_owner AND lower(s.customer_email)<>'conectstore.app@gmail.com' AND NOT s.is_blocked AND ((s.status='active' AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.status='trial' AND s.trial_ends_at>now()))) $$;
CREATE OR REPLACE FUNCTION public.public_store_content(p_store_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_owner uuid := coalesce(p_store_id,public.main_store_owner());
BEGIN
 IF NOT public.store_accepts_orders(v_owner) THEN RAISE EXCEPTION 'Loja indisponível no momento.'; END IF;
 RETURN jsonb_build_object('store_id',v_owner,
 'products',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'category',category,'name',name,'price',price,'description',description,'image_url',image_url,'is_popular',is_popular,'is_active',is_active,'stock_quantity',stock_quantity) ORDER BY sort_order,id) FROM public.products WHERE owner_id=v_owner AND is_active),'[]'::jsonb),
 'promos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'description',description,'image_url',image_url,'starts_at',starts_at,'ends_at',ends_at,'is_active',is_active)) FROM public.promotions WHERE owner_id=v_owner AND is_active AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>=now())),'[]'::jsonb),
 'announcements',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body,'image_url',image_url,'is_active',is_active)) FROM public.announcements WHERE owner_id=v_owner AND is_active),'[]'::jsonb),
 'components',coalesce((SELECT jsonb_agg(jsonb_build_object('combo_product_id',cc.combo_product_id,'component_product_id',cc.component_product_id,'quantity_per_combo',cc.quantity_per_combo)) FROM public.combo_components cc JOIN public.products p ON p.id=cc.combo_product_id WHERE p.owner_id=v_owner AND p.is_active),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.create_store_order(p_store_id uuid,p_customer_name text,p_customer_phone text,p_fulfillment text,p_address jsonb,p_payment_method text,p_notes text,p_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_owner uuid:=coalesce(p_store_id,public.main_store_owner()); v_result jsonb; v_previous text;
BEGIN
 IF public.is_superadmin() THEN RAISE EXCEPTION 'O admin master gerencia o sistema; use a conta da loja para pedidos.'; END IF;
 IF NOT public.store_accepts_orders(v_owner) THEN RAISE EXCEPTION 'Loja indisponível no momento.'; END IF;
 IF auth.uid() IS NOT NULL AND v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Produto de outra loja não permitido.'; END IF;
 v_previous:=current_setting('app.public_store_owner',true);
 PERFORM set_config('app.public_store_owner',v_owner::text,true);
 v_result:=public.create_order(p_customer_name,p_customer_phone,p_fulfillment,p_address,p_payment_method,p_notes,p_items);
 PERFORM set_config('app.public_store_owner',coalesce(v_previous,''),true);
 RETURN v_result;
END $$;
CREATE OR REPLACE FUNCTION public.assign_order_store() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_owner uuid:=public.current_store_owner();
BEGIN
 IF v_owner IS NULL OR public.is_superadmin() THEN RAISE EXCEPTION 'Pedidos devem pertencer a um usuário da loja, não ao admin master.'; END IF;
 IF NOT public.store_accepts_orders(v_owner) THEN RAISE EXCEPTION 'Loja indisponível no momento.'; END IF;
 IF NEW.items IS NULL OR jsonb_typeof(NEW.items)<>'array' OR jsonb_array_length(NEW.items)=0 THEN RAISE EXCEPTION 'Pedido sem produtos.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items) i LEFT JOIN public.products p ON p.id=(i->>'product_id')::bigint WHERE p.id IS NULL OR p.owner_id IS DISTINCT FROM v_owner) THEN RAISE EXCEPTION 'Produto de outra loja não permitido.'; END IF;
 NEW.owner_id:=v_owner; RETURN NEW;
END $$;
CREATE POLICY "Master is platform management not fulfillment" ON public.orders AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_superadmin()) WITH CHECK (NOT public.is_superadmin());
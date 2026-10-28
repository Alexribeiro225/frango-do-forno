create table if not exists public.combo_components (
  combo_product_id bigint not null references public.products(id) on delete cascade,
  component_product_id bigint not null references public.products(id) on delete cascade,
  quantity_per_combo integer not null check (quantity_per_combo between 1 and 99),
  primary key (combo_product_id, component_product_id),
  check (combo_product_id <> component_product_id)
);
alter table public.combo_components enable row level security;
create policy "Public reads combo compositions" on public.combo_components for select to anon, authenticated using (true);
create policy "Admin manages combo compositions" on public.combo_components for all to authenticated using (auth.jwt()->>'email'='conectstore.app@gmail.com') with check (auth.jwt()->>'email'='conectstore.app@gmail.com');
revoke all on table public.combo_components from public, anon, authenticated;
grant select on public.combo_components to anon, authenticated;
grant insert, update, delete on public.combo_components to authenticated;

insert into public.combo_components(combo_product_id,component_product_id,quantity_per_combo) values
  (11,1,1),(11,6,1),(11,8,1),(11,9,1),
  (12,1,1),(12,8,1),(12,10,1),
  (13,5,1),(13,6,1),(13,8,1),(13,10,1),
  (14,3,1),(14,7,1),(14,8,1),(14,9,1)
on conflict (combo_product_id,component_product_id) do nothing;

create or replace function public.save_combo_components(p_combo_product_id bigint,p_components jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_component_id bigint;
begin
  if coalesce(auth.jwt()->>'email','')<>'conectstore.app@gmail.com' then raise exception 'Apenas o superadministrador pode editar combos.'; end if;
  if jsonb_typeof(p_components)<>'array' or jsonb_array_length(p_components) not between 1 and 30 then raise exception 'Selecione ao menos um componente para o combo.'; end if;
  perform 1 from public.products where id=p_combo_product_id and category='Combos' for update;
  if not found then raise exception 'Combo não encontrado.'; end if;
  if exists(select 1 from jsonb_array_elements(p_components) e where coalesce((e->>'quantity')::integer,0) not between 1 and 99 or coalesce((e->>'product_id')::bigint,0)<=0 or (e->>'product_id')::bigint=p_combo_product_id) then
    raise exception 'Composição inválida.';
  end if;
  select count(*) into v_component_id from jsonb_array_elements(p_components);
  if (select count(distinct (e->>'product_id')::bigint) from jsonb_array_elements(p_components) e)<>v_component_id then raise exception 'Não repita produtos na composição.'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_components) e
    left join public.products p on p.id=(e->>'product_id')::bigint
    where p.id is null or not p.is_active or p.category='Combos'
  ) then raise exception 'Os componentes devem ser produtos ativos que não sejam combos.'; end if;
  delete from public.combo_components where combo_product_id=p_combo_product_id;
  insert into public.combo_components(combo_product_id,component_product_id,quantity_per_combo)
  select p_combo_product_id,(e->>'product_id')::bigint,(e->>'quantity')::integer from jsonb_array_elements(p_components) e;
end; $$;
revoke all on function public.save_combo_components(bigint,jsonb) from public,anon;
grant execute on function public.save_combo_components(bigint,jsonb) to authenticated;

create or replace function public.consume_combo_inventory(p_items jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_product_id bigint; v_requirements jsonb;
begin
  if exists(
    select 1 from jsonb_array_elements(p_items) i
    left join public.products p on p.id=(i->>'product_id')::bigint
    where p.id is null or not p.is_active
  ) then raise exception 'Produto indisponível.'; end if;

  -- Lock sold items first. Recipe edits lock the same combo row before replacing components.
  for v_product_id in
    select distinct (i->>'product_id')::bigint from jsonb_array_elements(p_items) i order by 1
  loop
    perform 1 from public.products where id=v_product_id for update;
  end loop;

  if exists(
    select 1 from jsonb_array_elements(p_items) i
    join public.products combo on combo.id=(i->>'product_id')::bigint and combo.category='Combos'
    where not exists(select 1 from public.combo_components cc where cc.combo_product_id=combo.id)
  ) then raise exception 'Configure a composição deste combo no superadmin antes de vendê-lo.'; end if;

  if exists(
    select 1 from jsonb_array_elements(p_items) i
    join public.products combo on combo.id=(i->>'product_id')::bigint and combo.category='Combos'
    join public.combo_components cc on cc.combo_product_id=combo.id
    join public.products component on component.id=cc.component_product_id
    where not component.is_active or component.category='Combos'
  ) then raise exception 'Um componente do combo está indisponível.'; end if;

  -- Lock all physical stock rows in ID order, preventing concurrent checkout/cashier overselling.
  for v_product_id in
    select ids.product_id from (
      select (i->>'product_id')::bigint as product_id from jsonb_array_elements(p_items) i
      union
      select cc.component_product_id
      from jsonb_array_elements(p_items) i
      join public.products combo on combo.id=(i->>'product_id')::bigint and combo.category='Combos'
      join public.combo_components cc on cc.combo_product_id=combo.id
    ) ids order by ids.product_id
  loop
    perform 1 from public.products where id=v_product_id for update;
  end loop;

  select jsonb_agg(jsonb_build_object('product_id',requirements.product_id,'quantity',requirements.quantity))
  into v_requirements
  from (
    select consumed.product_id,sum(consumed.quantity)::integer as quantity
    from (
      select cc.component_product_id as product_id,(i->>'quantity')::integer*cc.quantity_per_combo as quantity
      from jsonb_array_elements(p_items) i
      join public.products combo on combo.id=(i->>'product_id')::bigint and combo.category='Combos'
      join public.combo_components cc on cc.combo_product_id=combo.id
      union all
      select p.id as product_id,(i->>'quantity')::integer as quantity
      from jsonb_array_elements(p_items) i
      join public.products p on p.id=(i->>'product_id')::bigint and p.category<>'Combos'
    ) consumed
    group by consumed.product_id
  ) requirements;

  if exists(
    select 1 from jsonb_array_elements(v_requirements) req
    join public.products p on p.id=(req->>'product_id')::bigint
    where p.stock_quantity is not null and p.stock_quantity<(req->>'quantity')::integer
  ) then raise exception 'Estoque insuficiente para concluir a venda. Atualize o carrinho e tente novamente.'; end if;

  update public.products p
  set stock_quantity=p.stock_quantity-(req->>'quantity')::integer,updated_at=now()
  from jsonb_array_elements(v_requirements) req
  where p.id=(req->>'product_id')::bigint and p.stock_quantity is not null;
end; $$;
revoke all on function public.consume_combo_inventory(jsonb) from public,anon,authenticated;

create or replace function public.create_order(
  p_customer_name text,p_customer_phone text,p_fulfillment text,p_address jsonb,
  p_payment_method text,p_notes text,p_items jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_items jsonb; v_subtotal numeric(10,2); v_count integer; v_order_id bigint;
begin
  if length(trim(coalesce(p_customer_name,''))) not between 2 and 120 then raise exception 'Informe um nome válido.'; end if;
  if length(trim(coalesce(p_customer_phone,''))) not between 8 and 30 then raise exception 'Informe um telefone válido.'; end if;
  if p_fulfillment not in ('delivery','pickup') then raise exception 'Modalidade inválida.'; end if;
  if p_payment_method not in ('PIX','Cartão','Dinheiro') then raise exception 'Forma de pagamento inválida.'; end if;
  if p_fulfillment='delivery' and (nullif(trim(coalesce(p_address->>'street','')),'') is null or nullif(trim(coalesce(p_address->>'number','')),'') is null) then raise exception 'Endereço e número são obrigatórios para entrega.'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Carrinho inválido.'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) e where coalesce((e->>'quantity')::integer,0) not between 1 and 99 or coalesce((e->>'product_id')::bigint,0)<=0) then raise exception 'Quantidade de produto inválida.'; end if;
  select count(*) into v_count from jsonb_array_elements(p_items);
  if (select count(distinct (e->>'product_id')::bigint) from jsonb_array_elements(p_items) e)<>v_count then raise exception 'Itens repetidos no carrinho.'; end if;
  perform public.consume_combo_inventory(p_items);
  select jsonb_agg(jsonb_build_object('product_id',p.id,'name',p.name,'category',p.category,'quantity',(i->>'quantity')::integer,'unit_price',p.price,'line_total',p.price*(i->>'quantity')::integer) order by p.sort_order,p.id),sum(p.price*(i->>'quantity')::integer)
  into v_items,v_subtotal from jsonb_array_elements(p_items) i join public.products p on p.id=(i->>'product_id')::bigint and p.is_active;
  if coalesce(jsonb_array_length(v_items),0)<>v_count then raise exception 'Um produto não está mais disponível.'; end if;
  insert into public.orders(customer_name,customer_phone,fulfillment,address,payment_method,notes,items,subtotal,delivery_fee,total)
  values(trim(p_customer_name),trim(p_customer_phone),p_fulfillment,coalesce(p_address,'{}'::jsonb),p_payment_method,left(trim(coalesce(p_notes,'')),1000),v_items,v_subtotal,case when p_fulfillment='delivery' then null else 0 end,v_subtotal)
  returning id into v_order_id;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_id,'items',v_items,'subtotal',v_subtotal,'delivery_fee',case when p_fulfillment='delivery' then null else 0 end,'total',v_subtotal);
end; $$;
revoke all on function public.create_order(text,text,text,jsonb,text,text,jsonb) from public;
grant execute on function public.create_order(text,text,text,jsonb,text,text,jsonb) to anon,authenticated;

create or replace function public.create_counter_sale(p_payment_method text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_items jsonb; v_subtotal numeric(10,2); v_count integer; v_order_id bigint;
begin
  if coalesce(auth.jwt()->>'email','')<>'conectstore.app@gmail.com' then raise exception 'Somente o superadministrador pode registrar vendas de balcão.'; end if;
  if p_payment_method not in ('PIX','Cartão','Dinheiro') then raise exception 'Forma de pagamento inválida.'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Adicione produtos à venda.'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) e where coalesce((e->>'quantity')::integer,0) not between 1 and 99 or coalesce((e->>'product_id')::bigint,0)<=0) then raise exception 'Quantidade de produto inválida.'; end if;
  select count(*) into v_count from jsonb_array_elements(p_items);
  if (select count(distinct (e->>'product_id')::bigint) from jsonb_array_elements(p_items) e)<>v_count then raise exception 'Há produtos repetidos na venda.'; end if;
  perform public.consume_combo_inventory(p_items);
  select jsonb_agg(jsonb_build_object('product_id',p.id,'name',p.name,'category',p.category,'quantity',(i->>'quantity')::integer,'unit_price',p.price,'line_total',p.price*(i->>'quantity')::integer) order by p.sort_order,p.id),sum(p.price*(i->>'quantity')::integer)
  into v_items,v_subtotal from jsonb_array_elements(p_items) i join public.products p on p.id=(i->>'product_id')::bigint and p.is_active;
  if coalesce(jsonb_array_length(v_items),0)<>v_count then raise exception 'Produto indisponível.'; end if;
  insert into public.orders(customer_name,customer_phone,fulfillment,address,payment_method,notes,items,subtotal,delivery_fee,total,status)
  values('Venda no balcão','','counter','{}'::jsonb,p_payment_method,'Venda presencial',v_items,v_subtotal,0,v_subtotal,'completed') returning id into v_order_id;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_id,'items',v_items,'subtotal',v_subtotal,'total',v_subtotal,'payment_method',p_payment_method);
end; $$;
revoke all on function public.create_counter_sale(text,jsonb) from public,anon;
grant execute on function public.create_counter_sale(text,jsonb) to authenticated;
notify pgrst, 'reload schema';

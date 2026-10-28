alter table public.orders drop constraint if exists orders_fulfillment_check;
alter table public.orders add constraint orders_fulfillment_check check (fulfillment in ('delivery','pickup','counter'));

create or replace function public.create_counter_sale(p_payment_method text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_items jsonb;
  v_subtotal numeric(10,2);
  v_count integer;
  v_order_id bigint;
  v_product_id bigint;
begin
  if coalesce(auth.jwt()->>'email','') <> 'conectstore.app@gmail.com' then
    raise exception 'Somente o superadministrador pode registrar vendas de balcão.';
  end if;
  if p_payment_method not in ('PIX','Cartão','Dinheiro') then raise exception 'Forma de pagamento inválida.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Adicione produtos à venda.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where coalesce((e->>'quantity')::integer,0) not between 1 and 99 or coalesce((e->>'product_id')::bigint,0) <= 0) then raise exception 'Quantidade de produto inválida.'; end if;
  select count(*) into v_count from jsonb_array_elements(p_items);
  if (select count(distinct (e->>'product_id')::bigint) from jsonb_array_elements(p_items) e) <> v_count then raise exception 'Há produtos repetidos na venda.'; end if;

  for v_product_id in
    select (e->>'product_id')::bigint from jsonb_array_elements(p_items) e order by 1
  loop
    perform 1 from public.products where id = v_product_id for update;
  end loop;

  select jsonb_agg(jsonb_build_object(
      'product_id', p.id, 'name', p.name, 'category', p.category,
      'quantity', (i->>'quantity')::integer, 'unit_price', p.price,
      'line_total', p.price * (i->>'quantity')::integer
    ) order by p.sort_order, p.id),
    sum(p.price * (i->>'quantity')::integer)
  into v_items, v_subtotal
  from jsonb_array_elements(p_items) i
  join public.products p on p.id = (i->>'product_id')::bigint
    and p.is_active
    and (p.stock_quantity is null or p.stock_quantity >= (i->>'quantity')::integer);

  if coalesce(jsonb_array_length(v_items),0) <> v_count then
    raise exception 'Produto indisponível ou estoque insuficiente. Atualize a venda.';
  end if;

  insert into public.orders(customer_name, customer_phone, fulfillment, address, payment_method, notes, items, subtotal, delivery_fee, total, status)
  values ('Venda no balcão', '', 'counter', '{}'::jsonb, p_payment_method, 'Venda presencial', v_items, v_subtotal, 0, v_subtotal, 'completed')
  returning id into v_order_id;

  update public.products p
  set stock_quantity = p.stock_quantity - (i->>'quantity')::integer,
      updated_at = now()
  from jsonb_array_elements(p_items) i
  where p.id = (i->>'product_id')::bigint and p.stock_quantity is not null;

  return jsonb_build_object('id',v_order_id,'order_number',v_order_id,'items',v_items,'subtotal',v_subtotal,'total',v_subtotal,'payment_method',p_payment_method);
end;
$$;
revoke all on function public.create_counter_sale(text,jsonb) from public, anon;
grant execute on function public.create_counter_sale(text,jsonb) to authenticated;
notify pgrst, 'reload schema';

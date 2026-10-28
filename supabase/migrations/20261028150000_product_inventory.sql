alter table public.products
  add column if not exists stock_quantity integer
  check (stock_quantity is null or stock_quantity >= 0);

create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_fulfillment text,
  p_address jsonb,
  p_payment_method text,
  p_notes text,
  p_items jsonb
) returns jsonb
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
  if length(trim(coalesce(p_customer_name,''))) not between 2 and 120 then raise exception 'Informe um nome válido.'; end if;
  if length(trim(coalesce(p_customer_phone,''))) not between 8 and 30 then raise exception 'Informe um telefone válido.'; end if;
  if p_fulfillment not in ('delivery','pickup') then raise exception 'Modalidade inválida.'; end if;
  if p_payment_method not in ('PIX','Cartão','Dinheiro') then raise exception 'Forma de pagamento inválida.'; end if;
  if p_fulfillment = 'delivery' and (nullif(trim(coalesce(p_address->>'street','')),'') is null or nullif(trim(coalesce(p_address->>'number','')),'') is null) then
    raise exception 'Endereço e número são obrigatórios para entrega.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Carrinho inválido.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where coalesce((e->>'quantity')::integer,0) not between 1 and 99 or coalesce((e->>'product_id')::bigint,0) <= 0) then
    raise exception 'Quantidade de produto inválida.';
  end if;
  select count(*) into v_count from jsonb_array_elements(p_items);
  if (select count(distinct (e->>'product_id')::bigint) from jsonb_array_elements(p_items) e) <> v_count then raise exception 'Itens repetidos no carrinho.'; end if;

  -- Lock products in a stable order so simultaneous checkouts cannot oversell inventory.
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
    raise exception 'Produto indisponível ou estoque insuficiente. Atualize o carrinho e tente novamente.';
  end if;

  insert into public.orders(customer_name, customer_phone, fulfillment, address, payment_method, notes, items, subtotal, delivery_fee, total)
  values (trim(p_customer_name), trim(p_customer_phone), p_fulfillment, coalesce(p_address,'{}'::jsonb), p_payment_method,
    left(trim(coalesce(p_notes,'')),1000), v_items, v_subtotal, case when p_fulfillment='delivery' then null else 0 end, v_subtotal)
  returning id into v_order_id;

  update public.products p
  set stock_quantity = p.stock_quantity - (i->>'quantity')::integer,
      updated_at = now()
  from jsonb_array_elements(p_items) i
  where p.id = (i->>'product_id')::bigint and p.stock_quantity is not null;

  return jsonb_build_object('id',v_order_id,'order_number',v_order_id,'items',v_items,'subtotal',v_subtotal,
    'delivery_fee',case when p_fulfillment='delivery' then null else 0 end,'total',v_subtotal);
end;
$$;

notify pgrst, 'reload schema';

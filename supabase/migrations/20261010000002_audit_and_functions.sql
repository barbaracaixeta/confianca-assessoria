-- =====================================================================
-- Auditoria, reserva de cupom e métricas
-- =====================================================================

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role public.app_role,
  action text not null,
  entity text not null,
  entity_id text,
  changes jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Registra somente os campos alterados: {"campo": {"from": ..., "to": ...}}
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
  old_row jsonb;
  new_row jsonb;
  k text;
  ignored text[] := array['updated_at', 'created_at'];
begin
  if tg_op = 'INSERT' then
    new_row := to_jsonb(new);
    diff := jsonb_build_object('created', new_row);
  elsif tg_op = 'DELETE' then
    old_row := to_jsonb(old);
    diff := jsonb_build_object('deleted', old_row);
  else
    old_row := to_jsonb(old);
    new_row := to_jsonb(new);
    for k in select jsonb_object_keys(new_row) loop
      if not (k = any (ignored)) and (old_row -> k) is distinct from (new_row -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', old_row -> k, 'to', new_row -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return new;
    end if;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity, entity_id, changes)
  values (
    auth.uid(),
    case when auth.uid() is null then null else public.current_role() end,
    lower(tg_op),
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old_row else new_row end) ->> 'id',
             (case when tg_op = 'DELETE' then old_row else new_row end) ->> 'key'),
    diff
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row_change();
create trigger audit_product_prices after insert or update or delete on public.product_prices
  for each row execute function public.audit_row_change();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_row_change();
create trigger audit_coupons after insert or update or delete on public.coupons
  for each row execute function public.audit_row_change();
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function public.audit_row_change();
create trigger audit_orders after update on public.orders
  for each row execute function public.audit_row_change();
create trigger audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_row_change();
create trigger audit_profiles_role after update of role, is_active on public.profiles
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------
-- Reserva atômica do cupom (trava a linha do cupom para respeitar o limite)
-- Chamado pelo servidor (service role) ao criar o pedido.
-- ---------------------------------------------------------------------
create or replace function public.reserve_coupon(
  p_coupon_id uuid,
  p_order_id uuid,
  p_customer_id uuid,
  p_discount_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  used_total integer;
  used_by_customer integer;
begin
  select * into c from public.coupons where id = p_coupon_id for update;

  if not found or not c.is_active then
    return false;
  end if;
  if (c.starts_at is not null and now() < c.starts_at) or (c.ends_at is not null and now() > c.ends_at) then
    return false;
  end if;

  if c.usage_limit is not null then
    select count(*) into used_total from public.coupon_usages
     where coupon_id = c.id and released_at is null;
    if used_total >= c.usage_limit then
      return false;
    end if;
  end if;

  if c.per_customer_limit is not null then
    select count(*) into used_by_customer from public.coupon_usages
     where coupon_id = c.id and customer_id = p_customer_id and released_at is null;
    if used_by_customer >= c.per_customer_limit then
      return false;
    end if;
  end if;

  insert into public.coupon_usages (coupon_id, order_id, customer_id, discount_cents)
  values (c.id, p_order_id, p_customer_id, p_discount_cents);

  return true;
end;
$$;

revoke all on function public.reserve_coupon(uuid, uuid, uuid, integer) from public, anon, authenticated;

-- Libera o cupom quando o pedido é cancelado
create or replace function public.release_coupon_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.coupon_usages set released_at = now()
     where order_id = new.id and released_at is null;
  end if;
  return new;
end;
$$;

create trigger orders_release_coupon after update of status on public.orders
  for each row execute function public.release_coupon_on_cancel();

-- Uso atual de um cupom (para validação de prévia no carrinho)
create or replace function public.coupon_usage_count(p_coupon_id uuid, p_customer_id uuid default null)
returns table (total integer, by_customer integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.coupon_usages where coupon_id = p_coupon_id and released_at is null),
    (select count(*)::int from public.coupon_usages
      where coupon_id = p_coupon_id and released_at is null
        and p_customer_id is not null and customer_id = p_customer_id);
$$;

revoke all on function public.coupon_usage_count(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Métricas do dashboard (somente equipe)
-- Faturamento considera pedidos com pagamento confirmado/recebido.
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard_metrics(p_tz text default 'America/Sao_Paulo')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today_start timestamptz := date_trunc('day', now() at time zone p_tz) at time zone p_tz;
  month_start timestamptz := date_trunc('month', now() at time zone p_tz) at time zone p_tz;
  result jsonb;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with paid as (
    select * from public.orders where payment_status in ('confirmed', 'received')
  ),
  daily as (
    select d::date as day,
           coalesce(sum(o.total_cents) filter (where o.payment_status in ('confirmed', 'received')), 0) as revenue_cents,
           count(o.id) as orders
      from generate_series(
             (now() at time zone p_tz)::date - 29,
             (now() at time zone p_tz)::date,
             interval '1 day'
           ) as d
      left join public.orders o
        on (o.created_at at time zone p_tz)::date = d::date
     group by d
     order by d
  )
  select jsonb_build_object(
    'revenue_today_cents', (select coalesce(sum(total_cents), 0) from paid where paid_at >= today_start),
    'revenue_month_cents', (select coalesce(sum(total_cents), 0) from paid where paid_at >= month_start),
    'orders_today', (select count(*) from public.orders where created_at >= today_start),
    'orders_month', (select count(*) from public.orders where created_at >= month_start),
    'avg_ticket_cents', (select coalesce(round(avg(total_cents)), 0) from paid where paid_at >= month_start),
    'awaiting_payment', (select count(*) from public.orders where status = 'awaiting_payment'),
    'in_production', (select count(*) from public.orders where status in ('in_analysis', 'in_production', 'in_review', 'awaiting_approval')),
    'completed', (select count(*) from public.orders where status in ('delivered', 'completed')),
    'new_customers_month', (select count(*) from public.customers where created_at >= month_start),
    'conversion_rate', (
      select case when count(*) = 0 then 0
             else round(100.0 * count(*) filter (where payment_status in ('confirmed', 'received')) / count(*), 1) end
        from public.orders where created_at >= month_start
    ),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'revenue_cents', revenue_cents, 'orders', orders)), '[]'::jsonb) from daily),
    'top_products', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select oi.product_name as name, sum(oi.quantity)::int as quantity, sum(oi.total_cents)::bigint as revenue_cents
          from public.order_items oi
          join paid o on o.id = oi.order_id
         where o.paid_at >= month_start - interval '60 days'
         group by oi.product_name
         order by revenue_cents desc
         limit 5
      ) t
    ),
    'top_coupons', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select c.code::text as code, count(u.id)::int as uses, sum(u.discount_cents)::bigint as discount_cents
          from public.coupon_usages u
          join public.coupons c on c.id = u.coupon_id
         where u.released_at is null
         group by c.code
         order by uses desc
         limit 5
      ) t
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_metrics(text) from public, anon;
grant execute on function public.admin_dashboard_metrics(text) to authenticated;

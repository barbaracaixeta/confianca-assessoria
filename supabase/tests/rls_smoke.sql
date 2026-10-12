-- Testes de fumaça de RLS e funções. Rodar em banco descartável (ver README).
\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111', 'ana@teste.dev', now(), '{"full_name":"Ana Teste"}'),
 ('22222222-2222-4222-8222-222222222222', 'bruno@teste.dev', now(), '{"full_name":"Bruno Teste"}'),
 ('33333333-3333-4333-8333-333333333333', 'admin@teste.dev', now(), '{"full_name":"Admin Teste"}');
update profiles set role = 'admin' where id = '33333333-3333-4333-8333-333333333333';

-- Pedido de visitante criado antes do cadastro é vinculado pelo e-mail confirmado
insert into customers (id, full_name, email) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Ana', 'ana@teste.dev') on conflict do nothing;
insert into customers (full_name, email, profile_id) values ('Bruno', 'bruno@teste.dev', '22222222-2222-4222-8222-222222222222');
update auth.users set email_confirmed_at = now() where id = '11111111-1111-4111-8111-111111111111';

insert into orders (id, customer_id, subtotal_cents, discount_cents, total_cents)
values ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 19990, 1999, 17991);
insert into orders (customer_id, subtotal_cents, total_cents)
select id, 5000, 5000 from customers where email = 'bruno@teste.dev';

select reserve_coupon((select id from coupons where code = 'CONFIANCA10'), 'bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 1999) as reserved;

do $$ begin assert (select profile_id from customers where email = 'ana@teste.dev') = '11111111-1111-4111-8111-111111111111', 'vínculo por e-mail falhou'; end $$;
do $$ begin assert (select number from orders where id = 'bbbbbbbb-0000-4000-8000-000000000001') ~ '^CF-[0-9]{7}$', 'número do pedido'; end $$;

-- ===== Ana (cliente)
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ begin assert (select count(*) from orders) = 1, 'Ana deve ver só o próprio pedido'; end $$;
do $$ begin assert (select count(*) from coupons) = 0, 'cliente não pode listar cupons'; end $$;
do $$ begin assert (select count(*) from customers) = 1, 'Ana vê só o próprio cadastro'; end $$;
do $$ begin
  begin
    update profiles set role = 'super_admin' where id = auth.uid();
    raise exception 'escalonamento de papel deveria falhar';
  exception when raise_exception then
    if sqlerrm like 'escalonamento%' then raise; end if;
  end;
end $$;
do $$ begin
  update products set base_price_cents = 1 where slug = 'formatacao-abnt';
  assert (select base_price_cents from products where slug = 'formatacao-abnt') <> 1, 'cliente não pode alterar preço';
end $$;
do $$ begin
  begin perform admin_dashboard_metrics(); raise exception 'métricas deveriam ser negadas';
  exception when insufficient_privilege then null; end;
end $$;

-- ===== Anônimo
reset role; set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin assert (select count(*) from orders) = 0, 'anon não vê pedidos'; end $$;
do $$ begin assert (select count(*) from products) = 8, 'anon vê catálogo ativo'; end $$;

-- ===== Admin
reset role; set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
do $$ begin assert (select count(*) from orders) = 2, 'admin vê todos os pedidos'; end $$;
update products set base_price_cents = 17990, discount_value = 15990 where slug = 'artigo-cientifico';
do $$ begin
  assert exists (select 1 from audit_logs where entity = 'products' and actor_id = auth.uid()
                 and changes -> 'base_price_cents' ->> 'to' = '17990'), 'auditoria de preço';
end $$;
update orders set status = 'cancelled' where id = 'bbbbbbbb-0000-4000-8000-000000000001';
do $$ begin assert (select released_at is not null from coupon_usages where order_id = 'bbbbbbbb-0000-4000-8000-000000000001'), 'cupom liberado no cancelamento'; end $$;
do $$ begin assert (select count(*) from order_status_history where order_id = 'bbbbbbbb-0000-4000-8000-000000000001') = 2, 'histórico de status'; end $$;
select admin_dashboard_metrics() ->> 'orders_month' as orders_month;
reset role;
select 'RLS OK' as result;
rollback;

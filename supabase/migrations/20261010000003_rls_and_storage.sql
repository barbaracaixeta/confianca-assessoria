-- =====================================================================
-- Row Level Security e Storage
-- Regra geral:
--   * anon/clientes leem apenas conteúdo público ativo;
--   * clientes leem somente os próprios pedidos, pagamentos, arquivos e mensagens;
--   * escrita de pedidos/pagamentos acontece no servidor (service role), nunca no navegador;
--   * equipe (operator/admin/super_admin) administra conforme o papel.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_prices enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_products enable row level security;
alter table public.coupon_usages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.files enable row level security;
alter table public.order_files enable row level security;
alter table public.messages enable row level security;
alter table public.banners enable row level security;
alter table public.faqs enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.carts enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: o cliente (linha de customers) do usuário atual
create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customers where profile_id = auth.uid();
$$;

create or replace function public.owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
     where o.id = p_order_id
       and o.customer_id = public.current_customer_id()
  );
$$;

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create policy "perfil: dono lê" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "perfil: dono edita dados básicos" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "perfil: super admin gerencia" on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- Clientes
create policy "cliente: dono lê" on public.customers
  for select using (profile_id = auth.uid() or public.is_staff());
create policy "cliente: equipe edita" on public.customers
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Catálogo público
-- ---------------------------------------------------------------------
create policy "categorias: leitura pública das ativas" on public.categories
  for select using (is_active or public.is_staff());
create policy "categorias: admin escreve" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "produtos: leitura pública dos ativos" on public.products
  for select using (is_active or public.is_staff());
create policy "produtos: admin escreve" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "imagens: leitura pública" on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_staff()))
  );
create policy "imagens: admin escreve" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy "faixas: leitura pública" on public.product_prices
  for select using (
    exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_staff()))
  );
create policy "faixas: admin escreve" on public.product_prices
  for all using (public.is_admin()) with check (public.is_admin());

create policy "promoções: leitura pública das vigentes" on public.promotions
  for select using ((is_active and now() between starts_at and ends_at) or public.is_staff());
create policy "promoções: admin escreve" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "promoção-produto: leitura pública" on public.promotion_products
  for select using (true);
create policy "promoção-produto: admin escreve" on public.promotion_products
  for all using (public.is_admin()) with check (public.is_admin());

-- Cupons NÃO são legíveis publicamente (evita enumeração de códigos).
-- A validação acontece no servidor com service role.
create policy "cupons: equipe lê" on public.coupons
  for select using (public.is_staff());
create policy "cupons: admin escreve" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
create policy "cupom-produto: equipe" on public.coupon_products
  for select using (public.is_staff());
create policy "cupom-produto: admin escreve" on public.coupon_products
  for all using (public.is_admin()) with check (public.is_admin());
create policy "uso de cupom: equipe lê" on public.coupon_usages
  for select using (public.is_staff());

-- ---------------------------------------------------------------------
-- Pedidos (inserção somente via servidor)
-- ---------------------------------------------------------------------
create policy "pedidos: dono lê" on public.orders
  for select using (customer_id = public.current_customer_id() or public.is_staff());
create policy "pedidos: equipe atualiza" on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

create policy "itens: dono lê" on public.order_items
  for select using (public.owns_order(order_id) or public.is_staff());

create policy "histórico: dono lê" on public.order_status_history
  for select using (public.owns_order(order_id) or public.is_staff());

create policy "pagamentos: dono lê" on public.payments
  for select using (public.owns_order(order_id) or public.is_staff());

create policy "eventos: admin lê" on public.payment_events
  for select using (public.is_admin());

-- Arquivos
create policy "arquivos: dono lê" on public.files
  for select using (customer_id = public.current_customer_id() or public.is_staff());
create policy "arquivos: equipe escreve" on public.files
  for all using (public.is_staff()) with check (public.is_staff());

create policy "arquivo-pedido: dono lê" on public.order_files
  for select using (public.owns_order(order_id) or public.is_staff());
create policy "arquivo-pedido: equipe escreve" on public.order_files
  for all using (public.is_staff()) with check (public.is_staff());

-- Mensagens
create policy "mensagens: participantes leem" on public.messages
  for select using (public.owns_order(order_id) or public.is_staff());
create policy "mensagens: cliente envia no próprio pedido" on public.messages
  for insert with check (
    author_id = auth.uid()
    and ((not is_staff and public.owns_order(order_id)) or (is_staff and public.is_staff()))
  );

-- ---------------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------------
create policy "banners: leitura pública dos vigentes" on public.banners
  for select using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.is_staff()
  );
create policy "banners: admin escreve" on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

create policy "faq: leitura pública" on public.faqs
  for select using (is_active or public.is_staff());
create policy "faq: equipe escreve" on public.faqs
  for all using (public.is_staff()) with check (public.is_staff());

create policy "depoimentos: leitura pública" on public.testimonials
  for select using (is_active or public.is_staff());
create policy "depoimentos: admin escreve" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- Configurações: chaves com prefixo "public." podem ser lidas por todos
create policy "config: leitura pública das chaves públicas" on public.site_settings
  for select using (key like 'public.%' or public.is_staff());
create policy "config: admin escreve" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "notificações: dono lê" on public.notifications
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "carrinho: dono" on public.carts
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "auditoria: admin lê" on public.audit_logs
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- Storage
--   order-files: privado; caminho = <order_id>/<arquivo>. Upload e download
--                acontecem pelo servidor com URLs assinadas.
--   catalog:     público (imagens de serviços, banners, depoimentos, logo).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('order-files', 'order-files', false, 26214400, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png', 'image/jpeg', 'image/webp'
  ]),
  ('catalog', 'catalog', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon'])
on conflict (id) do nothing;

create policy "order-files: dono lê" on storage.objects
  for select using (
    bucket_id = 'order-files'
    and (public.is_staff() or public.owns_order(((storage.foldername(name))[1])::uuid))
  );
create policy "order-files: equipe escreve" on storage.objects
  for insert with check (bucket_id = 'order-files' and public.is_staff());
create policy "order-files: equipe remove" on storage.objects
  for delete using (bucket_id = 'order-files' and public.is_staff());

create policy "catalog: leitura pública" on storage.objects
  for select using (bucket_id = 'catalog');
create policy "catalog: admin escreve" on storage.objects
  for insert with check (bucket_id = 'catalog' and public.is_admin());
create policy "catalog: admin atualiza" on storage.objects
  for update using (bucket_id = 'catalog' and public.is_admin());
create policy "catalog: admin remove" on storage.objects
  for delete using (bucket_id = 'catalog' and public.is_admin());

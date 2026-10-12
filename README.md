# Confiança Assessoria Acadêmica

Plataforma de e-commerce de serviços acadêmicos: catálogo, preços com promoções, cupons, carrinho, checkout com Pix e cartão (Asaas), pedidos, área do cliente com upload de arquivos e painel administrativo.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Asaas · Resend · Vercel.

---

## Estado desta entrega (1ª fase)

| Área | Situação |
|---|---|
| Arquitetura, design system, tokens, tipografia, componentes base | ✅ |
| Banco: migrations, RLS, Storage, auditoria, funções (testados em Postgres local) | ✅ |
| Home, listagem e página de serviço (preço calculado, faixas por página, promoções) | ✅ |
| Carrinho persistente (navegador + conta), cupons validados no servidor | ✅ |
| Checkout em 3 etapas, Pix e cartão via Asaas, webhook idempotente | ✅ |
| Página do pedido (QR Code, copia e cola, atualização automática) | ✅ |
| Login, cadastro, recuperação de senha | ✅ |
| Área do cliente: visão geral, pedidos, linha do tempo, upload, mensagens, arquivos | ✅ |
| Dashboard admin (métricas, gráficos, mais vendidos, cupons, pedidos recentes) | ✅ |
| Gestão admin de pedidos, serviços, preços, cupons, promoções, clientes, conteúdo, configurações | ⏳ próxima fase — aparecem no menu como “em breve”, sem links falsos |

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev                  # http://localhost:3000
```

Sem as variáveis do Supabase o site abre em **modo demonstração**: o catálogo usa dados mockados (`src/lib/demo/catalog-data.ts`), um aviso aparece no topo e qualquer ação que grava dados (pedido, login, cupom) informa que o backend precisa ser configurado. Em desenvolvimento, `/admin` mostra uma prévia com números fictícios sinalizados; em produção exige login de equipe.

Scripts úteis:

```bash
npm run test          # testes do motor de preços e cupons (Vitest)
npm run typecheck
npm run lint
npm run seed:generate # regenera supabase/seed.sql a partir dos dados mockados
```

---

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Chave anon (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **servidor** | Usada só em operações que o servidor autoriza (pedidos, webhook, cupons, uploads) |
| `ASAAS_API_KEY` | **servidor** | Chave do Asaas (`$aact_hmlg_…` sandbox / `$aact_prod_…` produção) |
| `ASAAS_API_URL` | servidor | `https://api-sandbox.asaas.com/v3` ou `https://api.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | **servidor** | Token que o Asaas envia no header `asaas-access-token` |
| `NEXT_PUBLIC_APP_URL` | público | URL pública (links de e-mail, SEO, retorno de auth) |
| `NEXT_PUBLIC_MAX_PRODUCT_FILE_SIZE_MB` | público | Tamanho máximo (MB) de cada arquivo de entrega (padrão `50`). Deve ser ≤ ao limite do bucket e ao limite global do projeto Supabase |
| `RESEND_API_KEY` / `EMAIL_FROM` | servidor | Envio de e-mails transacionais |

Nenhum segredo é lido no navegador: `src/lib/env.server.ts` importa `server-only`, e o build falha se um componente cliente tentar usá-lo.

---

## Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique as migrations em ordem (SQL Editor ou CLI):

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push          # aplica supabase/migrations/*
   psql "$DATABASE_URL" -f supabase/seed.sql   # dados de exemplo (opcional)
   ```

   | Migration | Conteúdo |
   |---|---|
   | `…0001_core_schema.sql` | Tipos, tabelas, índices, constraints, triggers de perfil/cliente/status |
   | `…0002_audit_and_functions.sql` | `audit_logs` + triggers, `reserve_coupon` (atômica), métricas do dashboard |
   | `…0003_rls_and_storage.sql` | RLS de todas as tabelas, buckets e políticas do Storage |
   | `…11000001_store_pivot.sql` | Loja de produtos digitais: `product_files`, `downloads`, bucket `product-files` |
   | `…12000001_file_manager.sql` | Gerenciador de arquivos: `extension`, `status`, view `product_file_stats`, limite do bucket (`MAX_PRODUCT_FILE_SIZE_MB`) |
   | `…12000002_product_covers.sql` | Capa/preview automática: `product_files.preview_path`/`preview_status`/`preview_generated_at` e `products.cover_source_file_id`/`cover_status`/`cover_generated_at` (reusa `products.image_path`) |

3. **Primeiro administrador:** cadastre-se pelo site e, no SQL Editor:

   ```sql
   update public.profiles set role = 'super_admin' where email = 'voce@exemplo.com';
   ```

   Papéis: `customer`, `operator` (opera pedidos), `admin` (catálogo, cupons, conteúdo), `super_admin` (também papéis de outros usuários). Um usuário não consegue alterar o próprio papel — um trigger bloqueia.

4. **Auth:** em Authentication › URL Configuration, defina *Site URL* = `NEXT_PUBLIC_APP_URL` (ex.: `https://confianca-assessoria.vercel.app`) e adicione `NEXT_PUBLIC_APP_URL/auth/confirm` em *Redirect URLs* (e `http://localhost:3000/**` para desenvolvimento). Nos templates de e-mail (Authentication › Emails), aponte o link para o próprio site usando o `token_hash`, com um destino **relativo** — não use `{{ .RedirectTo }}` (ele contém a URL completa e quebra o link):
   - Confirmação de cadastro: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/minha-conta`
   - Recuperação de senha: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/redefinir-senha`

   Se a *Site URL* estiver correta e o template usar `{{ .SiteURL }}`, o link abre direto em `/auth/confirm` no seu domínio e segue para a página certa.
5. **SMTP:** para e-mails de autenticação com sua marca, configure o SMTP do Resend em Authentication › SMTP.

### Storage

- `order-files` — **privado**, 25 MB, só DOCX/PDF/XLSX/PPTX/imagens. Caminho `<pedido>/<uuid>-<nome>`. O upload usa URL assinada gerada pelo servidor após verificar que o pedido é do cliente e está pago; o servidor confirma o arquivo depois do envio. Downloads passam por `/api/arquivos/[id]`, que verifica o acesso via RLS e redireciona para uma URL assinada de 60 s.
- `catalog` — público, para imagens de serviços, banners, depoimentos e logo. Também guarda as **capas geradas**: `product-covers/<produto>/<arquivo>.png`.
- `product-files` — **privado**, arquivos de entrega dos produtos digitais (qualquer formato). Limite por arquivo definido por `NEXT_PUBLIC_MAX_PRODUCT_FILE_SIZE_MB` (padrão 50 MB) e pelo bucket. O gerenciamento (enviar, visualizar, editar rótulo, definir capa, regenerar prévia e excluir) fica **no painel de Produtos** — tanto na lista (`/admin/produtos`, onde você digita o nome de um produto novo — o título que aparece na loja/home — ou escolhe um existente, com seletor; ao enviar, o produto é criado/publicado automaticamente) quanto na edição (`/admin/produtos/editar/[id]`); não há página separada de arquivos. Upload múltiplo com arrastar-e-soltar e progresso por arquivo. O envio vai **direto** ao Storage por URL assinada (`createSignedUploadUrl`) e o servidor confirma o objeto depois; o download do cliente passa por `/api/downloads/[id]`, que valida a compra e o status ativo, registra em `downloads` e redireciona para uma URL assinada de 60 s. Somente arquivos **ativos** de produtos publicados são entregues.

> **Capa/preview automática.** Ao enviar qualquer arquivo, o servidor gera uma capa (PNG 1200×900) com `next/og` (sem dependências extras) e guarda em `catalog/product-covers/…`. Imagens (PNG/JPEG até 5 MB) entram embutidas e reduzidas com marca d'água; os demais formatos recebem uma capa de marca. O cadastro do arquivo **nunca** falha por causa da capa — em erro o status fica `failed` e o arquivo continua válido. A capa de um produto é definida na edição do produto (`product_files.preview_path` → `products.image_path`), não troca sozinha em novos uploads e é repontada automaticamente ao excluir o arquivo de origem. Geração e gestão em `src/lib/admin/product-covers.tsx`; operações de arquivo unificadas em `src/lib/admin/product-file-upload.ts`.

> O limite de upload é validado no servidor (`src/lib/admin/product-files.ts`). O limite global do projeto (Dashboard › Storage › *Upload file size limit*) precisa ser ≥ ao valor configurado, senão o Storage rejeita arquivos grandes.

> **Excluir produto.** Na lista de Produtos cada linha tem **Excluir** (confirmação em dois passos). A exclusão remove o produto e o material no Storage (arquivos, prévias e capa); as tabelas relacionadas caem por cascade, e itens de pedidos/testemunhos ficam com referência nula para preservar o histórico. Se o produto já tem **pedidos pagos**, a ação exige confirmação extra, pois remove o acesso de compras existentes. Lógica em `src/lib/admin/product-delete.ts`.

### Testar as políticas de RLS

`supabase/tests/rls_smoke.sql` cria usuários de teste e verifica, entre outros: cliente vê só os próprios pedidos; anônimo não lê cupons; cliente não altera preço nem o próprio papel; auditoria registra mudança de preço; cancelamento libera o cupom. Rode em um banco descartável — o script termina com `rollback`. Para testar num Postgres comum (sem Supabase), aplique antes `supabase/tests/supabase_stub.sql`, que emula os schemas `auth` e `storage`:

```bash
createdb cf_test
for f in supabase/tests/supabase_stub.sql supabase/migrations/*.sql supabase/seed.sql supabase/tests/rls_smoke.sql; do
  psql -v ON_ERROR_STOP=1 -d cf_test -f "$f"
done   # termina com "RLS OK"
```

---

## Asaas

### Sandbox (desenvolvimento)

1. Crie uma conta em [sandbox.asaas.com](https://sandbox.asaas.com) e gere a chave em Integrações.
2. `ASAAS_API_URL=https://api-sandbox.asaas.com/v3` e `ASAAS_API_KEY=$aact_hmlg_…`.
3. Para simular pagamentos Pix, use a opção de confirmar pagamento no painel do sandbox. Para cartão, use os cartões de teste da documentação do Asaas.

### Webhook

1. Gere um token aleatório (32+ caracteres), por exemplo `openssl rand -hex 32`, e coloque em `ASAAS_WEBHOOK_TOKEN`.
2. No Asaas: Integrações › Webhooks › novo webhook
   - URL: `https://SEU_DOMINIO/api/webhooks/asaas`
   - Token de autenticação: o mesmo valor
   - Eventos de cobrança: criada, confirmada, recebida, vencida, removida, estornada, recusada (captura e análise de risco), restaurada.
3. Localmente, exponha a porta com um túnel (ex.: `cloudflared tunnel --url http://localhost:3000`).

Como o processamento funciona:

- O token é comparado em tempo constante; sem token válido a resposta é 401.
- Cada evento é gravado em `payment_events` com o `id` do Asaas como chave única. Reentregas (o Asaas entrega “pelo menos uma vez”) respondem 200 sem reprocessar.
- A transição de status passa por uma máquina de estados (`src/lib/orders/state-machine.ts`): eventos fora de ordem não fazem o pagamento regredir.
- O navegador **nunca** marca um pedido como pago. A tela do pedido consulta o banco e, como reforço, o servidor consulta o Asaas diretamente.
- Dados de cartão vão do servidor direto ao Asaas e não são gravados nem registrados em log. O banco guarda só os 4 últimos dígitos e a bandeira.

### Indo para produção

1. Gere a chave de produção no painel do Asaas (`$aact_prod_…`).
2. Troque `ASAAS_API_URL=https://api.asaas.com/v3` e `ASAAS_API_KEY` no ambiente de produção da Vercel.
3. Cadastre um webhook **novo** no Asaas de produção (as configurações de sandbox e produção são independentes), com um token diferente do sandbox.
4. Faça um pedido real de valor baixo e confirme no painel que o status mudou sozinho.

---

## Vercel

1. Importe o repositório na Vercel (framework detectado automaticamente).
2. Cadastre as variáveis de ambiente em *Production* e *Preview* (use sandbox no Preview).
3. Após o primeiro deploy, atualize `NEXT_PUBLIC_APP_URL`, as URLs de Auth do Supabase e a URL do webhook do Asaas.

---

## Arquitetura

```
src/
  app/
    (store)/            site público, carrinho, checkout, pedido, auth, minha-conta
    admin/              painel (layout protegido por papel)
    api/
      webhooks/asaas    webhook de pagamento
      pedidos/[id]/status   status para a tela de pagamento
      arquivos/[id]     download com URL assinada
    auth/confirm        retorno de confirmação/recuperação
  components/
    ui/                 Button, Field, Badge, Alert, Skeleton…
    store/              header, footer, índice de serviços, painel de compra, carrinho…
    admin/              navegação e gráficos do painel
    brand/              logo (provisória)
  lib/
    pricing.ts          motor de preços e cupons (puro, testado)
    cart/               precificação do carrinho no servidor
    orders/             máquina de estados, criação e consultas de pedidos
    payments/           aplicação de status de pagamento (idempotente)
    asaas/              cliente isolado da API
    supabase/           clientes server, browser, public e admin
    auth/               sessão e autorização por papel
    email/              modelos e envio via Resend (registrado em notifications)
    validation/         schemas Zod (CPF/CNPJ, cartão, checkout)
    security/           rate limiting
  proxy.ts              renovação de sessão e bloqueio de áreas privadas
supabase/
  migrations/  seed.sql  tests/
```

Decisões principais:

- **Preço é sempre recalculado no servidor** a partir do banco. Valores enviados pelo navegador são ignorados.
- **Dinheiro em centavos** (inteiros) no banco e no código.
- **Cupom com reserva atômica** (`reserve_coupon` trava a linha do cupom), respeitando limite total e por cliente sob concorrência; é liberado se o pedido for cancelado.
- **Checkout de visitante:** o pedido fica ligado ao e-mail; quando a pessoa cria conta e confirma o e-mail, os pedidos são vinculados automaticamente. O link do pedido usa um token aleatório de 48 caracteres.
- **Páginas públicas estáticas com revalidação** (ISR de 5 min); o estado de login no header é lido no navegador para não tornar o site inteiro dinâmico.

## Segurança

- RLS em todas as tabelas; clientes só leem os próprios pedidos, pagamentos, arquivos e mensagens.
- Cupons não são legíveis publicamente (evita enumeração).
- Rotas privadas bloqueadas no `proxy.ts` e **reverificadas** no servidor (layout e cada Server Action).
- Validação Zod em todas as entradas; destino pós-login restrito a caminhos internos.
- Rate limiting em login, cadastro, cupom, checkout, upload e mensagens. O limitador atual é em memória por instância; com tráfego alto em várias instâncias, troque o `store` de `src/lib/security/rate-limit.ts` por Redis/Upstash mantendo a interface.
- Cabeçalhos de segurança em `next.config.ts`.

## Identidade visual

- Verde domina; laranja só em CTA de compra, preços promocionais, descontos e indicadores.
- Tipografia: **Literata** (serifada com eixo óptico, para títulos e textos editoriais) + **Hanken Grotesk** (interface), auto-hospedadas em `src/fonts`.
- A hero mostra uma página acadêmica real (margens ABNT, citação normalizada, correção, quadro) feita em HTML/CSS — sem imagens genéricas.
- **Logo provisória:** `src/components/brand/logo.tsx` e `src/app/icon.svg` são um placeholder (livro + capelo). Para usar a logo oficial, coloque o arquivo em `public/brand/` (SVG ou PNG com fundo transparente) e substitua o conteúdo de `Logo`/`LogoMark` e o `icon.svg`.

## Dados mockados

Preços, prazos e textos do catálogo de exemplo estão em `src/lib/demo/catalog-data.ts` e no `seed.sql`, marcados como mock. Não há CNPJ, telefone, endereço, depoimentos ou faturamento inventados: contatos e políticas ficam vazios até serem cadastrados (`site_settings`), e depoimentos só aparecem se forem criados pelo admin.

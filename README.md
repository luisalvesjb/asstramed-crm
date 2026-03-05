# Asstramed CRM

Projeto completo em `/Users/luisalves/Documents/workspace/personal/asstramed-crm`.

- `api`: Node.js + Express + TypeScript + Prisma + PostgreSQL
- `web`: React + TypeScript + Vite

## Entrega concluida

### Atualizacao 2026-03-02 (`isAdmin`)

- Flag `isAdmin` adicionada no modelo `User` (Prisma + migration).
- `isAdmin` agora eh a referencia principal para bypass de autorizacao no backend e frontend.
- Regras atualizadas:
  - middleware de permissao usa `req.user.isAdmin` (nao mais comparacao fixa de role)
  - token JWT carrega `isAdmin`
  - login/refresh/me resolvem permissoes efetivas considerando `isAdmin`
  - criacao/edicao de usuario sincroniza `isAdmin` automaticamente conforme perfil associado

### Atualizacao 2026-03-02 (perfis dinamicos com feature flags)

- Migracao de `roles` fixas para perfis dinamicos (`Profile` + `ProfilePermission`).
- Usuario agora referencia `profileId` e recebe no auth:
  - `profileId`
  - `profileKey`
  - `profileName`
  - `isAdmin`
- CRUD real de perfis implementado:
  - criar, editar, excluir perfil (quando nao for perfil de sistema e sem usuarios vinculados)
  - atribuir permissoes por perfil
- Perfis de sistema sincronizados automaticamente no bootstrap:
  - `ADMIN`, `GESTOR`, `TECNICO`, `FINANCEIRO`
- Tela de `Perfis` no frontend convertida para fluxo dinamico com modais:
  - modal de cadastro/edicao
  - modal de permissoes por perfil
- Tela de `Usuarios` convertida para selecionar `perfil` dinamico (em criacao/edicao), sem enum chumbada.

### Atualizacao 2026-03-01

- Frontend migrado para componentes `Ant Design` reutilizaveis com estado via `Redux Toolkit` nas telas de `Dashboard` e `Empresas`.
- Fonte global padronizada para `Montserrat` e reducao geral de tipografia.
- KPI cards padronizados no estilo solicitado (Dashboard, Empresa e Relatorios).
- Fluxos de `Empresas` convertidos para modal por aba (contato, endereco, documento, contrato e informacoes pessoais).
- Nova aba `Informacoes Pessoais` com upload de logo e recorte de imagem.
- Listagem de empresas e dashboard exibem logo e dados pessoais da empresa selecionada.
- Upload compartilhado de arquivos com drag-and-drop e restricao de tipos (`.doc`, `.docx`, `.pdf`).
- Documento sem categoria: agora usa `titulo` + `descricao`.
- Otimizacao de bundle:
  - code splitting de rotas (`React.lazy` + `Suspense`)
  - `manualChunks` no Vite para vendors
  - remocao de componente legado nao utilizado (`KpiCard` e tipo legado associado)
- Backend ajustado para:
  - salvar informacoes pessoais de empresa (`PUT /api/companies/:id/personal-info`)
  - aceitar uploads `.doc/.docx/.pdf` com validacao de extensao e MIME robusta
  - normalizar campos pessoais vazios para `null`
  - upload de documentos com ordem de `FormData` compativel com destino por `companyId`

### Atualizacao visual 2026-03-01 (tema `whiteblue`)

- Novo tema `whiteblue` definido como padrao via variaveis CSS globais.
- Shell principal alinhado ao template de referencia:
  - fundo com gradiente suave e blobs
  - frame externo com borda transluzida e radius alto
  - sidebar clara em formato de card, item ativo com gradiente azul e sombra
  - topo claro com campos arredondados e acoes circulares
- Estilo visual padronizado para componentes Ant:
  - `Button`, `Input`, `Select`, `DatePicker`, `Modal`, `Tabs`, `Table`, `Pagination`, `Tag`, `Upload.Dragger` e notificacoes.
- Cards/KPIs ajustados para o visual do template (radius, borda, sombra, hierarquia tipografica e destaque do primeiro card).
- Mantidas todas as funcionalidades ja implementadas nas telas (`Dashboard`, `Empresas`, `Detalhe da Empresa`, `Usuarios`, `Perfis`, `Relatorios`).
- Ajuste de layout para full screen (sem moldura/borda externa).
- Topo com dropdown do usuario (`Meu perfil` e `Sair`) e avatar real.
- Nova tela `Meu Perfil` com:
  - atualizacao de nome/e-mail
  - alteracao de senha
  - upload de avatar com recorte (mesmo cropper reutilizado)

### Atualizacao 2026-03-01 (modulo financeiro)

- Novo bloco `Financeiro` no sidebar, separado do bloco `CRM`.
- Menus financeiros adicionados:
  - `Lancamentos`
  - `Relatorios`
  - `Configuracoes Financeiras`
- Backend financeiro implementado com:
  - `Contas a pagar / lancamentos`
  - `Categorias`
  - `Centros de custo`
  - `Formas de pagamento`
  - `Relatorio diario`
  - `Filtro de saida por dia`
  - `Lancamento fixo com repeticao por ciclo` (`weekly`, `monthly`, `quarterly`, `semiannual`, `yearly`)
- Regras do modulo:
  - status financeiro: `PENDENTE`, `PAGO`, `VENCIDO`, `CANCELADO`
  - exclusao logica de lancamentos (`deletedAt`)
  - geracao automatica de recorrencias para lancamentos fixos
- Novas permissoes:
  - `finance.read`
  - `finance.write`
  - `finance.settings`
  - `finance.reports`
- Seed atualizado com configuracoes financeiras padrao:
  - categorias
  - centros de custo
  - formas de pagamento

### Backend (`api`)

Arquitetura modular implementada:

- `src/config`
- `src/db`
- `src/errors`
- `src/gateways`
- `src/middlewares`
- `src/modules`
- `src/routes`
- `src/services`
- `src/types`
- `src/utils`
- `src/validators`

Modulos entregues:

- `auth` (JWT + refresh token persistido)
- `users`
- `feature-flags`
- `profiles`
- `companies`
- `activities`
- `documents`
- `contracts`
- `dashboard`
- `reports`
- `audit-log`
- `financial-settings`
- `financial-entries`
- `financial-reports`

Regras principais implementadas:

- Perfis dinamicos com feature flags (incluindo perfis de sistema padrao).
- Permissoes granulares por feature flag (`permissions.manage`, `activities.finish`, etc).
- Atividades imutaveis na estrutura (sem editar/excluir), com mudanca de status e historico em `ActivityStatusHistory`.
- Upload local de documentos em `api/assets/documents/[companyId]/arquivo.ext`.
- Contrato com documento obrigatorio (`documentIds` minimo 1).
- Dashboard padrao com `date=hoje` e `status=PENDENTE`.
- Relatorios reais com CSV:
  - atividades por periodo
  - produtividade por tecnico
  - pendencias por empresa
  - contratos por vencimento

Seguranca de dados sensiveis:

- `companies/:id` e `contracts` mascaram dados conforme permissao.
- Sem `documents.read`: nao retorna documentos.
- Sem `contracts.read`: nao retorna contratos.
- Sem `contracts.values.read`: valor contratual retorna `null`.

### Frontend (`web`)

Telas conectadas com API real:

- Login
- Dashboard (KPIs, filtros reais, criar atividade, concluir atividade)
- Atividades (listar, filtrar, criar, atualizar status)
- Empresas (listar, filtrar, criar)
- Detalhe da empresa com abas funcionais:
  - Atividades
  - Contatos
  - Endereco
  - Documentos (upload e arquivamento)
  - Contrato & Pagamento
- Usuarios (listar, criar, alterar papel, gerenciar permissoes)
- Relatorios (consultas reais + export CSV)
- Financeiro > Lancamentos (CRUD + pagar + filtros)
- Financeiro > Relatorios (diario + saida por dia)
- Financeiro > Configuracoes Financeiras (abas de categoria, centro de custo e forma de pagamento)

Recursos de frontend:

- `AuthProvider` com `me` no bootstrap.
- Refresh token automatico por interceptor Axios.
- Guardas de rota por autenticacao e permissao.
- Menu lateral dinamico por permissao.
- Seletor global de empresa no topo.

## Endpoints principais

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET/POST /api/users`
- `PATCH /api/users/:id/profile`
- `PATCH /api/users/:id/active`
- `DELETE /api/users/:id`
- `GET /api/users/me/profile`
- `PATCH /api/users/me/profile`
- `PATCH /api/users/me/password`
- `PUT /api/users/me/avatar`
- `GET /api/financial/settings/categories`
- `POST /api/financial/settings/categories`
- `PATCH /api/financial/settings/categories/:id`
- `GET /api/financial/settings/cost-centers`
- `POST /api/financial/settings/cost-centers`
- `PATCH /api/financial/settings/cost-centers/:id`
- `GET /api/financial/settings/payment-methods`
- `POST /api/financial/settings/payment-methods`
- `PATCH /api/financial/settings/payment-methods/:id`
- `GET /api/financial/entries`
- `POST /api/financial/entries`
- `PATCH /api/financial/entries/:id`
- `PATCH /api/financial/entries/:id/pay`
- `DELETE /api/financial/entries/:id`
- `GET /api/financial/reports/daily`
- `GET /api/financial/reports/outflow-by-day`
- `GET /api/feature-flags/permissions`
- `GET/PUT /api/feature-flags/users/:userId`
- `GET /api/profiles`
- `GET /api/profiles/:id`
- `POST /api/profiles`
- `PATCH /api/profiles/:id`
- `PUT /api/profiles/:id/permissions`
- `DELETE /api/profiles/:id`
- `GET/POST /api/companies`
- `GET /api/companies/:id`
- `POST /api/companies/:id/contacts`
- `PUT /api/companies/:id/address`
- `PUT /api/companies/:id/personal-info`
- `GET/POST /api/activities`
- `PATCH /api/activities/:id/status`
- `GET /api/documents?companyId=...`
- `POST /api/documents/upload`
- `PATCH /api/documents/:id/archive`
- `GET/POST /api/contracts`
- `GET /api/dashboard/activities`
- `GET /api/reports/activities`
- `GET /api/reports/activities/csv`
- `GET /api/reports/productivity`
- `GET /api/reports/pending-by-company`
- `GET /api/reports/contracts-by-due`

## Como rodar

### 1) API

```bash
cd /Users/luisalves/Documents/workspace/personal/asstramed-crm/api
cp .env.example .env
npm install
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed:safe
npm run dev
```

### 2) Web

```bash
cd /Users/luisalves/Documents/workspace/personal/asstramed-crm/web
cp .env.example .env
npm install
npm run dev
```

## Seeds

Comandos disponiveis na API:

- `npm run prisma:seed` -> seed padrao
- `npm run prisma:seed:safe` -> idempotente, cria apenas o faltante
- `npm run prisma:seed:dry-run` -> simulacao sem escrita
- `npm run prisma:seed:demo` -> cria dados demo completos
- `npm run prisma:seed:demo:dry-run` -> simulacao do demo

Credenciais criadas pelo seed:

- `admin@asstramed.com` / `123456`
- `gestor@asstramed.com` / `123456`
- `tecnico@asstramed.com` / `123456`
- `financeiro@asstramed.com` / `123456`

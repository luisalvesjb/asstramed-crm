# Asstramed CRM

Projeto completo em `/Users/luisalves/Documents/workspace/personal/asstramed-crm`.

- `api`: Node.js + Express + TypeScript + Prisma + PostgreSQL
- `web`: React + TypeScript + Vite
- `site`: landing institucional React + Vite para `www.asstramed.com.br`

## Entrega concluida

### Atualizacao 2026-03-25 (landing institucional separada)

- Novo app `site/` criada no monorepo para a landing publica.
- `www.asstramed.com.br` deve apontar para `site/`.
- `crm.asstramed.com.br` continua apontando para `web/`.
- `site/` tem:
  - build proprio com Vite
  - Dockerfile proprio
  - Nginx proprio
  - pagina institucional baseada em `LandingPage.tsx`
- A landing ficou isolada do CRM para evitar acoplamento de rotas, auth e bundle.

### Atualizacao 2026-03-25 (cadastro unificado de empresa)

- Tela de `Empresas` agora usa um modal unificado para `cadastrar` e `editar`.
- O mesmo modal concentra:
  - dados principais da empresa
  - informacoes pessoais
  - endereco
  - contatos
  - logo com recorte
  - documentos (fila de upload + listagem/arquivamento no modo edicao)
- A edicao reutiliza exatamente o mesmo fluxo visual do cadastro, com pre-preenchimento dos dados atuais.
- `Contrato` foi mantido fora desse modal, por decisao de escopo, para nao fragilizar o fluxo.
- Ajustes de UX no modal unificado:
  - campo `Documento` renomeado para `CNPJ/CPF`, com mascara dinamica
  - telefone principal da empresa com mascara
  - `CEP` movido para o topo da aba de endereco
  - ao digitar `CEP`, o sistema consulta o ViaCEP, preenche logradouro/bairro/cidade/UF e foca em `Numero`
  - contatos agora usam mascara de celular e flag `WhatsApp`
- Backend ampliado para suportar o modal:
  - `PUT /api/companies/:id`
  - `PUT /api/companies/:id/contacts`
- Schema ampliado em `CompanyContact` com `hasWhatsapp`
- Migration adicionada:
  - `api/prisma/migrations/20260325093000_add_company_contact_whatsapp_flag`

### Atualizacao 2026-03-25 (atividades, usuarios, financeiro e relatorios)

- Tela de `Atividades`:
  - remove filtro de data obrigatorio do topo
  - listagem agora abre geral, sem restringir ao dia atual
  - periodo passou a ser filtro opcional (`Data inicial` e `Data final`)
- Dashboard:
  - bloco de `Ultimas mensagens` agora usa apenas a mensagem principal da atividade (`title` / `description`)
  - comentarios internos deixaram de contaminar o resumo do dashboard
  - `Detalhes` do bloco passa a navegar pela propria `atividade`
- Usuarios:
  - autenticacao migrada para `login`
  - tela de usuarios remove `e-mail` do fluxo e passa a usar `login`
  - `Meu perfil` e tela de `Login` atualizados para `login`
- Financeiro:
  - `FinancialEntry` agora possui `amount` e `amountPaid`
  - status `PAGO` deixa de depender do valor pago ser igual ao valor do lancamento
  - KPIs e relatorios financeiros usam `amountPaid` quando o lancamento estiver pago
  - formularios de lancamento/pagamento foram ajustados para labels acima dos campos
- Relatorios:
  - nova flag `Em aberto` nos relatorios de atividades / produtividade / exportacao CSV
- Migration adicionada:
  - `api/prisma/migrations/20260325113000_user_login_and_financial_paid_amount`

### Atualizacao 2026-03-17 (dashboard + mensagens + financeiro)

- Filtro de empresa do dashboard sincronizado com o seletor global (topbar):
  - ao selecionar empresa no topo, o dashboard respeita o filtro
  - ao sair da empresa no card, o filtro eh limpo e volta para visao geral
- Novo modulo de mensagens internas por empresa:
  - prioridade (`ALTA`, `MEDIA`, `BAIXA`)
  - destaque no dashboard (abertas por prioridade + ultimas 5)
  - exibe quem cadastrou e para quem foi direcionada
  - fluxo de conversa (thread): `Ver`, `Ver todas`, responder na propria mensagem
  - resolucao de mensagem (fica no topo ate ser resolvida)
- Codigo da empresa automatico no backend, sequencial a partir de `0001` (campo numerico `code` com exibicao formatada no frontend).
- Financeiro:
  - suporte a `chave` de pagamento (ex.: PIX)
  - anexo de boleto por lancamento
  - anexo de comprovante de pagamento
  - upload salvo em `assets/financial-entries/[entryId]/arquivo.ext`
  - forma de pagamento `Transferencia` descontinuada (bloqueada no backend)
- Configuracoes financeiras com exclusao logica (soft delete):
  - categorias, centros de custo e formas de pagamento agora podem ser “excluidos” via desativacao
  - filtro de `ativos/inativos/todos` na tela de configuracoes
  - inativos nao entram em novos lancamentos (so aparecem quando filtrado ou quando ja vinculados historicamente)
- Auditoria reforcada:
  - novas acoes de mensagens e anexos financeiros registradas em `AuditLog`.
- Migration adicionada:
  - `api/prisma/migrations/20260317143000_messages_financial_attachments_company_code`

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
- `DELETE /api/financial/settings/categories/:id`
- `GET /api/financial/settings/cost-centers`
- `POST /api/financial/settings/cost-centers`
- `PATCH /api/financial/settings/cost-centers/:id`
- `DELETE /api/financial/settings/cost-centers/:id`
- `GET /api/financial/settings/payment-methods`
- `POST /api/financial/settings/payment-methods`
- `PATCH /api/financial/settings/payment-methods/:id`
- `DELETE /api/financial/settings/payment-methods/:id`
- `GET /api/financial/entries`
- `POST /api/financial/entries`
- `PATCH /api/financial/entries/:id`
- `PATCH /api/financial/entries/:id/pay`
- `DELETE /api/financial/entries/:id`
- `POST /api/financial/entries/:id/bank-slip`
- `POST /api/financial/entries/:id/payment-receipt`
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
- `GET /api/activities/interactions`
- `GET /api/activities/:id`
- `POST /api/activities/:id/messages`
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

## Atualizacao 2026-03-17 (Atividades)

- Conversa interna agora pertence a `atividade` (nao ha mais modulo funcional de mensagens separado no fluxo principal).
- Regra de status da atividade:
  - somente o `criador` ou o `responsavel` da atividade pode alterar status.
- Dashboard e tela de atividades:
  - acao principal da lista passou para `Detalhes`.
  - no detalhe existe seletor de status e conversa da atividade.
- Prioridade adicionada na criacao de atividade (ALTA/MEDIA/BAIXA).
- Labels adicionadas acima dos campos do fluxo de atividades (sem dependencia de placeholder).
- Novo `.env` local do web configurado para desenvolvimento:
  - `VITE_API_URL=\"http://localhost:3333/api\"`

## Atualizacao 2026-03-18 (correcao do fluxo de atividade)

- `Detalhes da atividade` deixou de ser modal e passou a ser tela normal (`/atividades/:id`).
- Comentarios/mensagens agora sao interacoes da propria atividade:
  - todos os usuarios autenticados podem visualizar e comentar
  - ordem cronologica da mais antiga para a mais recente
  - sem rota de exclusao dessas mensagens
- Alteracao de status movida para o detalhe da atividade (seletor acima da secao de comentarios).
- Regra de alteracao de status mantida no backend:
  - apenas criador da atividade ou usuario direcionado (`assignedTo`) podem alterar.
- Listagens de atividades (dashboard, tela de atividades e empresa):
  - acao principal `Detalhes`
  - sem botoes de status na listagem principal.
- Campo exibido como `Direcionado a` no lugar de `Responsavel` no contexto de atividades.
- Dashboard atualizado com destaque de interacoes:
  - bloco `5 ultimas mensagens da empresa`
  - botao `Ver tudo`
  - indicador quando existir atividade aberta com prioridade alta.
- Modal `Nova tarefa` reorganizado em grid com labels acima de cada campo.
- Fluxo de atividades/Comentarios sem dependencia de permissao por feature flag (somente autenticacao + regra de status).

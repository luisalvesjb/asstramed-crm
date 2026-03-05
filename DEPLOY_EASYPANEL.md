# Deploy no EasyPanel (Monorepo API + WEB)

Repositorio:
- `git@github.com:luisalvesjb/asstramed-crm.git`

Estrutura:
- `api` -> Node/Express/Prisma
- `web` -> React/Vite (build estatico servido por Nginx)

## 1) Subir para o GitHub

```bash
cd /Users/luisalves/Documents/workspace/personal/asstramed-crm
git init
git add .
git commit -m "chore: deploy setup (docker + easypanel)"
git branch -M main
git remote add origin git@github.com:luisalvesjb/asstramed-crm.git
git push -u origin main
```

## 2) Criar banco PostgreSQL no EasyPanel

Crie um servico Postgres e copie a URL de conexao interna.

Exemplo:

```env
DATABASE_URL=postgresql://USER:PASSWORD@postgres:5432/asstramed_crm?schema=public
```

## 3) Criar APP da API no EasyPanel

- Tipo: App com Dockerfile
- Source: GitHub
- Repo: `git@github.com:luisalvesjb/asstramed-crm.git`
- Branch: `main`
- Context/Root Path: `api`
- Dockerfile path: `Dockerfile`
- Porta interna: `3333`
- Healthcheck path: `/api/health`

### Variaveis da API

Use como base `api/.env.example`:

```env
NODE_ENV=production
PORT=3333
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=troque-por-um-segredo-forte-com-32+chars
JWT_REFRESH_SECRET=troque-por-um-segredo-forte-com-32+chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SEED_ADMIN_NAME=Admin Asstramed
SEED_ADMIN_EMAIL=admin@asstramed.com
SEED_ADMIN_PASSWORD=123456
```

### Volume persistente (obrigatorio)

Para nao perder uploads em novos deploys:
- Mount path: `/app/assets`

## 4) Criar APP da WEB no EasyPanel

- Tipo: App com Dockerfile
- Source: GitHub
- Repo: `git@github.com:luisalvesjb/asstramed-crm.git`
- Branch: `main`
- Context/Root Path: `web`
- Dockerfile path: `Dockerfile`
- Porta interna: `80`
- Healthcheck path: `/health`

### Build ARG da WEB

Defina build arg para o Vite:

```env
VITE_API_URL=https://URL_PUBLICA_DA_API/api
```

## 5) Auto deploy por paths monitoradas

Crie dois apps separados e configure filtros de path:

- API app: `api/**`
- WEB app: `web/**`

Assim alteracoes no frontend nao redeployam API e vice-versa.

## 6) Migrations e seed

O container da API ja sobe com `prisma migrate deploy` no start (CMD do Dockerfile).

Depois do primeiro deploy da API, rode seed uma vez no terminal do app/API:

```bash
npm run prisma:seed:safe
```

## 7) Checklist rapido

- API responde: `GET /api/health`
- Web abre normalmente
- Login funciona
- Upload de documento/avatar funciona
- Arquivos continuam apos novo deploy (volume `/app/assets`)

## 8) Observacoes importantes

- Em producao, use sempre `prisma migrate deploy` (nao `prisma migrate dev`).
- Quando trocar para dominio oficial, atualize `VITE_API_URL` e redeploy da WEB.

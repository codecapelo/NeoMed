# NeoMed

Aplicação web para gestão clínica com:
- autenticação por email/senha
- gestão de pacientes, prontuários, prescrições e agendamentos
- sincronização local + servidor
- integração Mevo (com modo mock quando não configurada)

## Arquitetura Atual

- Frontend: React + TypeScript + MUI (`src/`)
- Backend produção: Netlify Function (`netlify/functions/api.js`) com PostgreSQL
- Backend local: Express (`../server.js`) compatível com as mesmas rotas principais
- Persistência no cliente: `localStorage` com chave por usuário (`neomed_<uid>_<tipo>`)

## Rotas principais da API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/ping`
- `POST /api/auth/logout`
- `GET /api/admin/users/count` (admin)
- `GET /api/admin/users` (admin)
- `GET /api/all`
- `POST /api/saveAll`
- `POST /api/integrations/mevo/emit`
- `GET /api/integrations/mevo/documents`

## Desenvolvimento local

### 1) API local
Na raiz do projeto (`app_NeoMed`):

```bash
node server.js
```

API disponível em `http://localhost:3001`.

### 2) Frontend
Na pasta `app_neomed`:

```bash
npm install
npm start
```

Frontend disponível em `http://localhost:3000`.

Se necessário, configure:
- `REACT_APP_API_BASE=http://localhost:3001`

## Variáveis de ambiente (produção)

Backend (Netlify Function):
- `NETLIFY_DATABASE_URL` (ou `NETLIFY_DATABASE_URL_UNPOOLED`/`DATABASE_URL`)
- `JWT_SECRET` (ou `NETLIFY_JWT_SECRET`)
- `JWT_EXPIRES_IN`

Mevo:
- `MEVO_API_URL` (ou `MEVO_BASE_URL`)
- `MEVO_ISSUE_PATH`
- `MEVO_API_TOKEN` ou `MEVO_API_KEY` ou `MEVO_CLIENT_ID` + `MEVO_CLIENT_SECRET`

## Observações

- O schema do banco em produção é criado automaticamente pela função `api.js`.
- O arquivo `docs/neomed_database.sql` é referência histórica e não representa mais o schema ativo de produção.

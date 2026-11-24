# API — Interativo

Base URL: `/api/v1`. Respostas: `{ data, error, meta }`. Auth via cookie httpOnly `access_token` (SSO com catálogo) ou Bearer.

## Auth
- `POST /auth/login` — body `{ email, password }` → `{ accessToken, refreshToken, user }` + cookies
- `POST /auth/register` — body `{ email, password, name }` → `{ user }`
- `GET /auth/users` — (auth) lista usuários
- `PATCH /auth/users/:id/role` — (auth) atualiza papel

## Conversão
- `POST /convert` — multipart `file` (.pdf/.idml/.indd) → `{ id, name, sourceFormat, createdAt, fileCount }`
- `GET /projects` — lista projetos
- `GET /projects/:id` — detalhe (meta)
- `GET /projects/:id/preview` — HTML do projeto
- `GET /projects/:id/preview/*` — arquivo estático do projeto
- `GET /projects/:id/download` — .zip do build web

## Health
- `GET /health` → `{ status: "ok" }`
PY
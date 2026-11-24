# Interativo — Conversor de Livros para Web

Aplicação web que converte arquivos `.pdf`, `.idml` (e `.indd` via exportação) em **projetos web interativos** (HTML, CSS, JavaScript), reaproveitando imagens e textos do material original e transformando-os em blocos editáveis (accordions, boxes, citações etc.), com exportação final em `.zip` (build web).

## Stack

- **Backend:** Node.js + Fastify + TypeScript + Prisma (SQL Server) + JWT (cookie httpOnly)
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Conversão:** `pdftotext` (poppler) para PDF; parser XML (fast-xml-parser) para IDML; ZIP via AdmZip
- **Auth compartilhada (SSO):** mesmo `JWT_SECRET` e cookie `access_token` do app `catalogo-recursos`, permitindo login único entre os dois apps.

## Funcionalidades (planejadas)

1. Upload de `.pdf` / `.idml` / `.indd`
2. Conversão automática em blocos editáveis (texto, imagens, seções)
3. Edição dos blocos (título, conteúdo, estilo: accordion, box, citação)
4. Preview interativo (iframe)
5. Exportação em `.zip` (build web estático: index.html, styles.css, script.js, assets/)

## Como rodar (dev)

```bash
# backend
cd backend && npm install && npm run dev:backend   # porta 3002

# frontend
cd frontend && npm install && npm run dev:frontend # porta 5173
```

Ou a partir da raiz: `npm run dev` (backend + frontend).

## Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env` e ajuste. `JWT_SECRET` deve ser idêntico ao do `catalogo-recursos` para SSO funcionar.

## Estrutura

```
Interativo/
  backend/   # Fastify API + conversores
  frontend/  # React/Vite UI
  PLANO.md   # planejamento detalhado
  README.md
```
PY
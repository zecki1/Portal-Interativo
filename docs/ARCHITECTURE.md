# Arquitetura — Interativo

## Visão geral

Aplicação web que converte livros (PDF/IDML/INDD) em projetos web interativos editáveis, com exportação em build web (.zip).

```mermaid
flowchart LR
  U[Usuário] --> FE[Frontend React+Vite+Tailwind]
  FE --> API[Backend Fastify/Node/TS]
  API --> CONV[Conversores: pdftotext / XML IDML]
  API --> FS[(Filesystem: data/projects)]
  API --> AUTH[JWT cookie httpOnly (SSO com catálogo)]
```

## Componentes

- **Frontend:** upload, lista de projetos, editor de blocos, preview (iframe), download.
- **Backend:** API REST `/api/v1`, conversores, geração de projeto web, zip de build.
- **Storage:** filesystem local (`backend/data/projects/<id>/`); DB opcional (Prisma) para metadados/edições.
- **Auth:** JWT compartilhado com `catalogo-recursos` (cookie `access_token`).

## Portas
- Backend: 3002
- Frontend: 5173
- Catálogo (SSO): backend 3001 / frontend 5173
PY
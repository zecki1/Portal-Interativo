# PLANO — Interativo

## Objetivo
Converter livros (PDF/IDML/INDD) em projetos web interativos editáveis, com exportação em build web (.zip).

## Fases

### Fase 1 — Planejamento (atual)
- [ ] Definir modelo de blocos (accordion, box, citação, imagem, título, parágrafo)
- [ ] Definir fluxo de edição e persistência (DB vs arquivo)
- [ ] Definir formato de exportação (zip estático)
- [ ] Validar com PDF de exemplo (ET_EF1_OD_ID1-17.pdf)

### Fase 2 — Backend (conversores)
- [x] Estrutura base (Fastify + Prisma) reaproveitada do catálogo
- [x] Rota de upload + conversão PDF (pdftotext)
- [x] Rota de conversão IDML (unzip + XML)
- [ ] Conversão .indd (via exportação IDML/PDF — mensagem orientativa)
- [ ] Persistência de projetos e blocos (Prisma models)
- [ ] Rotas de edição de blocos (CRUD)
- [ ] Exportação .zip (build) — implementado (AdmZip)
- [ ] SSO (cookie compartilhado) — implementado

### Fase 3 — Frontend
- [ ] Página de upload
- [ ] Lista de projetos
- [ ] Editor de blocos (drag/reorder, tipos)
- [ ] Preview interativo (iframe)
- [ ] Download do build

### Fase 4 — Polimento
- [ ] Testes (unit/e2e)
- [ ] Lint/format
- [ ] Documentação final
- [ ] (Opcional) repositório Git

## Decisões
- Reaproveitar stack e auth do `catalogo-recursos` para SSO.
- Portas: backend 3002, frontend 5173 (catálogo: 3001/5173).
- .indd não é parseado diretamente; orientar exportação para IDML/PDF.
PY
# PLANO — Interativo (Conversor de Livros em Blocos Web)

> Documento executivo de acompanhamento. Para a especificação completa com diagramas e ADRs, consulte [docs/PLANEJAMENTO_ARQUITETURA.md](file:///c:/Users/SS1111235/Documents/SESI/Interativo/docs/PLANEJAMENTO_ARQUITETURA.md).
>
> **Backlog de correções por demanda:** [docs/BACKLOG.md](file:///c:/Users/SS1111235/Documents/SESI/Interativo/docs/BACKLOG.md) — ordem: T2 paginação PDF → T3 layout → T4 IDML/imagens → T1 lote/progresso → T5 páginas → T6 blocos → T7 build.

## Objetivo
Converter livros e materiais didáticos (PDF / IDML / InDesign) em projetos web interativos, renderizando páginas em **blocos editáveis** (textos, imagens, sanfonas, abas, quizzes e vídeos) com editor drag & drop e exportação em pacote web (.zip) autônomo.

---

## Status das Fases

### Fase 1 — Planejamento & Arquitetura (Concluída)
- [x] Especificação da jornada do usuário (Login -> Upload -> Renderização de Páginas -> Decomposição em Blocos -> Edição D&D -> Enriquecimento Interativo -> Preview -> Exportação ZIP).
- [x] Definição do schema estruturado de dados em JSON (`project.json` com `pages`, `blocks` e `assets`).
- [x] Catálogo de blocos interativos (Heading, Paragraph, Image com Zoom/Link, Accordion, Tabs, Callout, Video, Quiz, External Embed).
- [x] Definição das ADRs (Modelo de Blocos, Extração Resiliente de PDF, Drag & Drop `@dnd-kit`, Vanilla JS para build estático final, SSO).

### Fase 2 — Backend & Pipeline de Extração de Blocos
- [x] Estrutura base Fastify + TypeScript + Prisma + JWT/SSO.
- [x] **T2 — Paginação real de PDF (concluída):** extração primária via `pdftotext -layout` com divisão por `\f` (1 página do PDF = 1 página do projeto), fallback para parser nativo; imagens JPEG via `/DCTDecode`. Validado com PDF de 6 páginas (`ET_EF1_ME_ID1-17.pdf` → `pageCount: 6`).
- [ ] Pipeline aprimorado de extração:
  - [ ] Extração de imagens de PDF (via `pdfimages` / `pdf-lib` / `pdfjs-dist`).
  - [ ] Extração de imagens e estilos de parágrafos de IDML (XML stories + `Resources/` + `Links/`).
  - [x] Decomposição automática do conteúdo em páginas e blocos no `project.json` (PDF).
  - [ ] Decomposição IDML por spreads reais (T4/T5).
- [ ] Endpoints da API de edição de blocos:
  - [ ] `GET /api/v1/projects/:id/document` — obtém a árvore de páginas e blocos.
  - [ ] `PUT /api/v1/projects/:id/document` — salva o estado completo editado.
  - [ ] `PATCH /api/v1/projects/:id/blocks/:blockId` — atualização atômica de bloco.
  - [ ] `POST /api/v1/projects/:id/assets` — upload de nova mídia manual.
- [ ] Gerador do Build Web final (compilação do `project.json` em `index.html`, `styles.css`, `script.js` e `assets/`).
- [x] Rota de download do ZIP (`GET /api/v1/projects/:id/download`).

### Fase 3 — Frontend: Editor Visual Drag & Drop (Estilo Elementor / WordPress)
- [ ] Tela de Autenticação / SSO e Dashboard de Projetos.
- [ ] Tela de Upload com indicador de progresso de processamento.
- [ ] Layout do Editor de 3 Colunas:
  - [ ] Coluna Esquerda: Navegador de Páginas + Gaveta de Blocos + Biblioteca de Mídias Extraídas.
  - [ ] Canvas Central: Renderização das páginas e blocos com `@dnd-kit` (arrastar para reordenar).
  - [ ] Coluna Direita: Painel de configurações e estilos do bloco selecionado.
- [ ] Edição in-place de textos (títulos e parágrafos ricos).
- [ ] Enriquecimento de mídias (arrastar imagem da biblioteca para substituir/inserir; adicionar zoom modal ou link externo).
- [ ] Adição e conversão de blocos interativos (Sanfona, Abas, Destaque, Quiz, Vídeo).
- [ ] Modo Preview responsivo (Desktop, Tablet e Mobile).

### Fase 4 — Validação, Testes e Polimento
- [ ] Validação prática com o PDF real `ET_EF1_OD_ID1-17.pdf`.
- [ ] Testes de acessibilidade no build final (navegação por teclado, leitor de tela, modo alto contraste).
- [ ] Testes de funcionamento offline do `.zip` descompactado.

# Backlog — Portal Interativo

> Ordem de execução: **uma tarefa por vez**, com critério de aceite validado antes de avançar.
> Base: relatório `docs/RELATORIO_ANALISE_ARQUIVOS.md` + feedback de uso real.

## T1 — Upload em lote + progresso (prioridade alta)
**Problema:** upload lento sem feedback; só funciona um arquivo por vez.
**Entregas:**
- [ ] T1.1 Backend: endpoint multipart com múltiplos arquivos + job assíncrono (status: `queued` → `uploading` → `processing` → `converting` → `done`/`error`).
- [ ] T1.2 Backend: endpoint `GET /jobs/:id` (polling) ou SSE `GET /jobs/:id/events` com percentual.
- [ ] T1.3 Frontend: aceitar seleção múltipla e drag-and-drop; lista por arquivo.
- [ ] T1.4 Frontend: barra/slider de progresso por arquivo + progresso global, com etapas visíveis.
**Aceite:** enviar 3 arquivos juntos; cada um mostra 0–100% e etapa; falha isolada não derruba os demais.

## T2 — PDF: paginação real e 100% das páginas (CONCLUÍDA)
**Problema:** PDF de ~300 páginas processa só 86.
**Entregas:**
- [x] T2.1 `pdftotext -layout -enc UTF-8 [...] -` + split por `\f` (1 página = 1 página).
- [x] T2.2 Contagem via `\f`; validado `ET_EF1_ME_ID1-17.pdf` → `pageCount: 6`.
- [x] T2.3 Fallback para o parser nativo quando `pdftotext` falha.
**Aceite:** PDF de 300 páginas gera 300 páginas; contador confere. (pendente teste com arquivo real de 300 páginas)

## T3 — Layout do texto nos cards (prioridade alta)
**Problema:** espaçamento entre linhas grande; texto vaza do card.
**Entregas:**
- [ ] T3.1 Revisar `line-height`, `margin`, `padding` e `white-space` no CSS gerado.
- [ ] T3.2 `overflow-wrap: anywhere` / `word-break` para não vazar.
- [ ] T3.3 Testar com parágrafos longos e títulos.
**Aceite:** texto permanece dentro do card em desktop e mobile, sem espaços excessivos.

## T4 — IDML: imagens e performance (prioridade alta)
**Problema:** não traz imagens; processamento trava.
**Entregas:**
- [ ] T4.1 Extrair imagens embutidas (`Resources/`) e resolver links relativos (`Links/`).
- [ ] T4.2 Limitar tamanho/tempo por arquivo e liberar memória (streaming).
- [ ] T4.3 Mapear spreads → páginas reais (não agrupar por quantidade fixa de parágrafos).
**Aceite:** IDML com imagens gera `assets/` com arquivos e blocos de imagem nas páginas corretas.

## T5 — Separação e verificação de páginas (média)
- [ ] T5.1 Página do projeto = spread/página do original.
- [ ] T5.2 Tela de diagnóstico por página (blocos, imagens, caracteres) antes de editar.
**Aceite:** conferir 3 páginas aleatórias contra o original.

## T6 — Tipos de bloco e decisão do usuário (média)
- [ ] T6.1 Classificação automática: título, parágrafo, imagem, box, citação.
- [ ] T6.2 No editor, permitir trocar o tipo do bloco e decidir se a imagem é interativa.
**Aceite:** alterar tipo de um bloco reflete no preview e na exportação.

## T7 — Exportação/build (média)
- [ ] T7.1 Validar `.zip` com HTML/CSS/JS/assets.
- [ ] T7.2 Botão "Exportar build" com feedback.
**Aceite:** zip abre localmente e o projeto funciona offline.

## Ordem recomendada
1. **T2** (paginação) → 2. **T3** (layout) → 3. **T4** (IDML) → 4. **T1** (lote/progresso) → 5. **T5** → 6. **T6** → 7. **T7**

> T2/T3/T4 resolvem os bugs atuais; T1 melhora a experiência; T5–T7 consolidam.
PY
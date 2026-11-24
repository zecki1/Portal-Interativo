# Backlog — Portal Interativo

> Ordem de execução: **uma tarefa por vez**, com critério de aceite validado antes de avançar.
> Base: relatório `docs/RELATORIO_ANALISE_ARQUIVOS.md` + feedback de uso real.

## T1 — Upload em lote + progresso (prioridade alta)
**Problema:** upload lento sem feedback; só funciona um arquivo por vez.
**Entregas:**
- [x] T1.1 Backend: `POST /convert/batch` multipart (máx 20, falha isolada por arquivo) + frontend envia em sequência com status ao vivo por arquivo. (job assíncrono/SSE fica para depois)
- [ ] T1.2 Backend: endpoint `GET /jobs/:id` (polling) ou SSE `GET /jobs/:id/events` com percentual.
- [x] T1.3 Frontend: seleção múltipla + drag-and-drop de vários arquivos; fila por arquivo com status (pendente/convertendo/ok/erro) e link "Abrir Editor" por projeto.
- [ ] T1.4 Frontend: barra/slider de progresso 0–100% por arquivo + progresso global (hoje: status por etapa).
**Aceite:** enviar 3 arquivos juntos; cada um mostra status; falha isolada não derruba os demais. ✅ validado (2 OK + 1 erro isolado).

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
- [x] T3.1 `line-height` 1.75→1.65 no build; canvas do editor agora renderiza o HTML real (antes mostrava `<br/>`/`<strong>` como texto cru no meio das palavras).
- [x] T3.2 `overflow-wrap: anywhere` em parágrafos/listas do build.
- [ ] T3.3 Testar com parágrafos longos e títulos (validação visual do usuário).
**Aceite:** texto permanece dentro do card em desktop e mobile, sem espaços excessivos.

## Correções 2026-11-24 (feedback de uso real)
- **Palavras "cortadas":** removidos caracteres invisíveis do InDesign (U+FEFF/BOM, zero-width, soft-hyphen) do texto e HTML; espaço restaurado entre frases em runs separados sem `<Br/>` (após pontuação final).
- **Seções erradas:** estilos SESI reconhecidos como títulos — `EAD_Peso1`→h2, `EAD_Peso2/Peso3`→h3, `P_meu-repertorio`→h3 ("steam", "Meu Repertório", "Faça Você Mesmo" etc. agora são headings).
- **Listas:** estilos `EAD_lista_marcador/numerada/alfabetica` viram `<ul>/<ol>` com `<li>` por item (antes: parágrafo com `<br/>`); build não embrulha lista em `<p>`.
- **Pacote .zip:** upload de ZIP contendo IDML + pasta `Links/` — as imagens vinculadas são resolvidas e extraídas (os IDMLs de exemplo não têm imagens embutidas; sem os arquivos de Links, só o placeholder aparece).
- **Lote:** ver T1.
- Removido `frontend/src/lib/store.tsx` (resto quebrado do catálogo, sem uso); `tsconfig.json` adicionado ao frontend.

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

## Blocos ProjetoX (2026-11-24)

Trazidos do ProjetoX para o editor (`frontend/src/features/editor/ProjxBlockPreview.tsx`,
`BlockSchemaEditor.tsx`) e para o build publicado
(`backend/src/services/blocks/projxBlocks.ts`):

**Conteúdo**
- [x] Capa/Hero (`cover`)
- [x] Flipcard (`flipcard`)
- [x] Linha do tempo (`timeline`)
- [x] Tabela responsiva (`table` — vira cartões no celular)
- [x] Galeria/carrossel (`gallery`)
- [x] Imagem + texto (`image-text-card`)
- [x] Faixa parallax (`parallax`)
- [x] Texto destacado (`highlight`, marca `==palavra==`)
- [x] Bloco de código (`code`)
- [x] Boxes ProjetoX no `callout`: Importante, Saiba Mais, Dica, Você Sabia, PDF, Vamos Refletir, Caixa (além de info/tip/warning/curiosity)

**Exercícios**
- [x] Múltipla escolha (uma ou várias corretas, tentativas)
- [x] Verdadeiro ou falso
- [x] Completar lacunas (banco de palavras)
- [x] Ordenar itens (arrastar + setas, acessível)
- [x] Relacionar colunas
- [x] Jogo da memória
- [x] Caça-palavras (grade gerada no build)
- [x] Palavras cruzadas (grade gerada no build)

**Imagem interativa**
- [x] Zonas de clique (`hotspots` com x/y/w/h em %) que abrem modal na publicação
- [x] Imagem vinculada ausente vira placeholder (`missing` + `fileName`) e pode ser vinculada no inspetor/Mídias

**Páginas**
- [x] "Juntar com a próxima página" (concatena os blocos e renumera)

**Ainda não trazido do ProjetoX**
- [ ] TextTranslator / i18n (PT/EN/ES) — troca de idioma no build e textos por idioma no editor
- [ ] VariableContent / ContentSwitchButton (alternância texto↔vídeo) — hoje coberto por Abas
- [ ] Seções/âncoras (`Section`/`Topic`) — hoje coberto por Títulos + sumário do build
- [ ] ImageZoomDownload (baixar imagem) — o zoom já existe no bloco de imagem
PY
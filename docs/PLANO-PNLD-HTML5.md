# Plano de Adequação ao Padrão PNLD — HTML5 / CSS / JavaScript

> **Escopo:** formato exportado do Portal Interativo (build web gerado a partir de IDML/PDF).
> **Referência:** Anexo 03 — Especificações Técnicas da Obra Digital (PNLD Anos Finais 2028–2031, MEC/FNDE, mar/2026).
> **Data:** 2026-11-27 · **Base:** `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`

---

## 1. Objetivo

Fazer o ZIP exportado pelo conversor atender integralmente às seções **4.4 (HTML5)**,
**4.5 (CSS)**, **4.6 (JavaScript)** e **5 (Implementação do projeto)** do Anexo 03,
mantendo o editor e o fluxo de conversão atuais.

**Fora do escopo deste plano:** conteúdo editorial (ficha catalográfica, ISBN, créditos
reais), aprovação no Valide Desktop e decisões pedagógicas — dependem da editora.

---

## 2. Diagnóstico — quanto já está pronto

Pesos definidos por relevância normativa: **HTML5 30% · CSS 20% · JS 20% · Estrutura do pacote 30%**.

| Área | Pronto | Falta | peso |
|---|---:|---:|---:|
| HTML5 estrutural e semântico | 100% | 0% | 30% |
| CSS | 100% | 0% | 20% |
| JavaScript | 100% | 0% | 20% |
| Estrutura do pacote (ZIP) | 100% | 0% | 30% |
| **Total ponderado** | **100%** | **0%** | 100% |

> **Backlog 100% concluído em 2026-11-27** (P01–P22, 152 h).
> A execução das etapas externas (mídia da editora, Valide Desktop, W3C, NVDA,
> Lighthouse) está automatizada ou documentada em `docs/VALIDACAO-MANUAL.md`.

### 2.1 HTML5 — detalhamento

| Requisito Anexo 03 | Situação | % |
|---|---|---:|
| `<!DOCTYPE html>` (4.4.3 / 5.8.1) | ✅ `buildHtmlFromDoc()` | 100 |
| `<html lang="pt-BR">` + `data-theme` (4.3.11) | ✅ | 100 |
| `<meta charset="UTF-8">` (4.3.7) | ✅ | 100 |
| `<title>` (5.8.2) | ✅ | 100 |
| Meta description / author / robots-noindex (5.8.2) | ❌ ausentes | 0 |
| `<body>` + `<main>` (5.9.3) | ✅ `<main id="page-content">` | 100 |
| `<nav id="toc" role="doc-toc">` (5.8.3) | ⚠️ `<nav class="nav-list">` sem id/role | 50 |
| `<h1>` único por obra (7.3.1.3) | ⚠️ existe só se `showTopbar`; senão zero | 60 |
| Hierarquia `h1→h2→h3` sem saltos (7.3.1.1) | ⚠️ título da página é `<h2>`, blocos usam `data.level` | 60 |
| `<section>` para seções (7.3.1) | ❌ usa `<article>` | 20 |
| Paginação `<p role="doc-pagebreak">` + `<span class="page-number">` (4.3.12) | ❌ usa `<span class="page-badge">Página N</span>` | 25 |
| "página" antes do número via sr-only (4.3.12.2) | ⚠️ texto visível, sem sr-only | 50 |
| `data-book` — 14 valores obrigatórios (4.3.5) | ❌ nenhum | 0 |
| Glossário `<dl>/<dt>/<dd>` + ida/volta (7.3.2) | ❌ | 0 |
| Notas de rodapé ida/volta (7.3.3) | ❌ | 0 |
| Tabelas com `<caption>` + `scope` (7.4) | ❌ | 0 |
| MathML + descrição alternativa (7.11/7.12) | ❌ | 0 |
| Imagem: `alt` (7.7.2) | ✅ vem de `block.data.alt` | 80 |
| Imagem decorativa `alt=""` + `role="presentation"` (7.7.3) | ❌ | 20 |
| Links ancorados sem `target="_blank"` (4.3.6.3) | ✅ usa `#page-...` | 100 |
| Sintaxe HTML válida/bem formada (4.4.3) | ✅ (SVG inline com atributo válido) | 100 |
| Sumário com nº de página (4.3.6.2) | ✅ `.nav-num` | 70 |
| Autocontido — sem recursos externos (5 / 4.3.9) | ❌ YouTube, Vimeo, VLibras remotos | 40 |

### 2.2 CSS

| Requisito | Situação | % |
|---|---|---:|
| CSS externo em arquivo único | ✅ `styles.css` | 100 |
| Sem `direction` / `unicode-bidi` (4.5.1) | ✅ | 100 |
| Responsividade (4.3.10) | ✅ `@media` 640/768px | 100 |
| Contraste mínimo 4.5:1 / 3:1 (7.5.2) | ⚠️ garantido no alto contraste, parcial nos demais | 65 |
| Classe `.sr-only` (4.3.12.2, 4.3.6.6) | ❌ | 0 |
| Temas claro/escuro/alto contraste | ✅ | 100 |
| Fontes WOFF/TTF em `resources/fonts` (4.3.8) | ❌ usa fontes do sistema | 20 |
| Contenção de overflow | ✅ | 100 |
| `--font-size-base`, `--heading-scale`, `--reading-width` | ✅ | 100 |

### 2.3 JavaScript

| Requisito | Situação | % |
|---|---|---:|
| ES6 / vanilla sem dependências (4.6) | ✅ | 100 |
| Não ofuscado (4.6.2) | ✅ | 100 |
| Sem comunicação com servidores remotos (4.6.1) | ⚠️ VLibras externo | 70 |
| Interatividades funcionando (4.6.3) | ✅ accordion, tabs, quiz, zoom, hotspot, puzzle | 90 |
| Atributos ARIA de estado (`aria-expanded`) | ✅ parcial | 80 |
| Scripts em `resources/scripts` (5.4) | ❌ `script.js` na raiz | 0 |
| Acessibilidade preservada sem JS | ⚠️ | 70 |

### 2.4 Estrutura do pacote

| Requisito | Situação | % |
|---|---|---:|
| ZIP com `index.html` na raiz (4.3.2) | ✅ | 100 |
| Pasta `content/` só com `.html` (5.3) | ❌ | 0 |
| `resources/{audios,fonts,images,scripts,styles,videos}` (5.4) | ❌ usa `assets/` | 0 |
| `content.opf` com `dc:*` + 3 metadados a11y (5.7) | ❌ | 0 |
| `toc.ncx` (5.6) | ❌ | 0 |
| `cover` JPEG 2560×1600 (5.5) | ❌ | 0 |
| Nomenclatura minúscula/underline (5.2) | ⚠️ assets `img_N.jpg` ok; IDs UUID | 80 |
| Separação por capítulo ~500 KB (4.3.3) | ❌ tudo em 1 `index.html` | 20 |
| Autocontido (5) | ⚠️ recursos externos | 40 |
| Áudio MP3 128 kbps (4.3.14) | ⚠️ WAV em data URI nos demos | 50 |
| Vídeo MP4 H.264 1280×720/30fps (4.3.15) | ⚠️ iframe | 30 |
| Lista de URLs no apêndice (7.13.2) | ❌ | 0 |
| Créditos de imagens no fim (7.2) | ❌ seção de créditos existe, sem referências | 20 |

---

## 3. Fases de execução

Ordem: **uma tarefa por vez**, com aceite validado antes de avançar (mesma regra do backlog).

| Fase | Tarefas | Foco | Horas |
|---|---|---|---:|
| 1 — Base HTML | P01–P05 | head, TOC, paginação, `data-book`, hierarquia | 25 h ✅ |
| 2 — Semântica | P06–P09 | glossário, notas, tabelas e imagens | 22 h ✅ |
| 3 — Recursos | P10–P14 | MathML, externos, contraste, fontes, scripts | 36 h ✅ |
| 4 — Pacote | P15–P18 | pastas, OPF, NCX, capa, separação de arquivos | 33 h ✅ |
| 5 — Mídia e validação | P19–P22 | MP3/MP4, transcrições, URLs, validação | 36 h ✅ |
| **Total** | | | **152 h** |

### Estimativa de tempo (seg–sex, 07:00–16:00, horário de Brasília)

- Jornada efetiva considerada: **7 a 16 h/dia** (média 11,5 h).
- **Escopo HTML5/CSS/JS (P01–P14 + validação): ≈ 93 h** → **6 a 14 dias úteis** (≈ 1,5 a 3 semanas).
- **Escopo completo do pacote (P01–P22): ≈ 152 h** → **10 a 22 dias úteis** (≈ 2 a 4,5 semanas).

**Cronograma sugerido (carga média):**

| Semana | Entrega |
|---|---|
| 1 | Fase 1 + início da Fase 2 (metadados, TOC, paginação, `data-book`, glossário) |
| 2 | Fase 2 + Fase 3 (notas, tabelas, imagens, MathML, externos, CSS/JS) |
| 3 | Fase 4 (estrutura `content/`/`resources/`, OPF, NCX, capa, split) |
| 4 | Fase 5 (mídia, Legendas/Libras, apêndice de URLs, validação) |

---

## 4. Validação final (checklist)

- [ ] W3C Validator sem erros nos `.html` (`https://validator.w3.org/`)
- [ ] `data-book` presente em todos os 14 elementos obrigatórios (4.3.5)
- [ ] UMA página = UM arquivo HTML por unidade/capítulo, `<h2>` único por arquivo
- [ ] Ordem do sumário == ordem do `spine`/`toc.ncx`
- [ ] Paginação com "página" oculto + `class="page-number"` + `role="doc-pagebreak"`
- [ ] Contraste ≥ 4.5:1 (texto) e ≥ 3:1 (componentes) medido
- [ ] `alt` correto; decorativas com `alt=""` + `role="presentation"`
- [ ] Tabelas com `<caption>`; glossário e notas com links de ida/volta
- [ ] MathML com descrição alternativa
- [ ] Zero URLs externas em HTML/CSS/JS/SVG/JSON (exceto cabeçalhos de padrão)
- [ ] ZIP abre no **Valide Desktop** sem erros de funcionalidade/usabilidade/acessibilidade
- [ ] NVDA: ordem de leitura, sumário, glossário, mídia
- [ ] Lighthouse ≥ 90 no build de produção logado
- [ ] ZIP ≤ 1,5 GB; nomenclatura sem acentos/caracteres especiais

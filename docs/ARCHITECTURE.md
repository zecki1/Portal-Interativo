# Arquitetura — Build HTML5 exportado (Portal Interativo)

> Foco: **formato entregue** (HTML5 + CSS + JavaScript), não a interface do editor.
> Referência normativa: **Anexo 03 — Especificações Técnicas da Obra Digital**, PNLD Anos Finais 2028–2031.
> Atualizado: 2026-11-27

---

## 1. Pipeline de exportação

```
.pdf / .idml / .zip(IDML+Links/)
        │
        ▼
  convertFile()                         converterService.ts:444
        │  extractFromPdf / extractFromIdml
        ▼
  ProjectDocument                       (project.json + meta.json)
        │
        ├── buildHtmlFromDoc()  ──►  index.html     :1251
        ├── buildCssFromDoc()   ──►  styles.css     :1541
        ├── buildJsFromDoc()    ──►  script.js      :2124
        └── assets/                                (:466)
        │
        ▼
  refreshProjectBuild()                 :1154
        │
        ▼
  zipProject() ──► <id>.zip             :1162
        (AdmZip.addLocalFolder do projectDir, exceto versions/)
```

**Ponto central:** todo o HTML/CSS/JS do livro é gerado por três funções em
`backend/src/services/converterService.ts`. Qualquer mudança no padrão PNLD
passa por elas (e pelos módulos de bloco/a11y que elas importam).

### Arquivos envolvidos

| Arquivo | Papel no build |
|---|---|
| `backend/src/services/converterService.ts` | Gera `index.html`, `styles.css`, `script.js`, empacota ZIP |
| `backend/src/services/pnld/semantics.ts` | Helpers normativos: `pageBreakHtml`, `srOnly`, `pageBookRole`, `titleBookRole`, `escapeAttr`, `toRoman`, `contrastRatio`, `INTERACTIVE_BLOCK_TYPES` |
| `backend/src/services/pnld/package.ts` | `ensurePackageDirs`, `copyAssets`, `writeCover`, `buildPageFileHtml`, `buildContentOpf`, `buildTocNcx` |
| `backend/src/services/pnld/validate.ts` | `validatePackage()` — checa arquivos, URLs externas, `<h1>` único, `data-book`, `dc:*`, spine vs navMap, capa, alt, tabelas, tamanho |
| `backend/src/services/pnld/contrast.ts` | `auditAllThemes()` — contraste WCAG dos 7 temas claro/escuro |
| `backend/scripts/media.ts` | `pnld:audio`, `pnld:video`, `pnld:probe` — conversão/validação com ffmpeg |
| `backend/scripts/validate-pnld.ts` | `pnld:validate <id>` — relatório do validador |
| `backend/src/services/blocks/projxBlocks.ts` | `renderProjxBlock()`, `PROJX_CSS`, `PROJX_JS` (30 tipos de bloco) |
| `backend/src/services/blocks/a11yHub.ts` | `A11Y_HTML`, `A11Y_CSS`, `A11Y_JS` (widget de acessibilidade + VLibras) |
| `backend/src/services/blocks/icons.ts` | `svgIcon()`, `ICON_CSS` (SVG inline) |
| `backend/src/services/themes.ts` | `buildThemeCss()`, `tokensForMode()`, `resolveThemeForProject()` |
| `backend/src/services/textUtils.ts` | `cleanParagraphHtml()` (sanitização de parágrafos) |
| `backend/src/services/idml/importIdml.ts` | Importação por geometria real (layout opcional) |

---

## 2. Saída atual (baseline)

```
<id>/
├── index.html      ← visão unificada (usada pelo preview do editor)
├── cover.jpg       ← 1600×2560 gerado com título/editora
├── content.opf     ← dc:*, metadados de acessibilidade, manifest, spine
├── toc.ncx         ← navMap na ordem do spine
├── content/
│   └── pagina_NNN.html  ← 1 arquivo por página, <h2> único
├── resources/
│   ├── audios/  fonts/  images/  interactivities/  scripts/  styles/  videos/
│   ├── styles/styles.css
│   └── scripts/script.js   ← vanilla ES6 (accordion, tabs, quiz, zoom, hotspot, puzzle)
├── assets/         ← originais extraídos (mantidos para o editor)
├── meta.json       ← metadados do projeto
├── project.json    ← documento completo (páginas, blocos, tema)
└── versions/       ← histórico (excluído do ZIP)
```

`writePnldPackage()` é chamada por `saveProjectDocument`, `restoreProjectVersion` e
`refreshProjectBuild` — o ZIP sempre reflete o pacote completo.

### 2.1 Estrutura do `index.html` gerado

- `<!DOCTYPE html>` + `<html lang="pt-BR" data-theme="..." data-style="...">`
- `<head>`: `charset`, `viewport`, `<title>`, `description`, `author`, `robots`, `link styles.css`
- `<body>` → `.app-layout` → `.top-bar` (título em `<span>`) → `.main-container`
  - `<aside id="sidebar-nav">` → `<nav id="toc" role="doc-toc" data-book="sumario">` com `.nav-num` (prefixo "página" em `.sr-only`) e badge `.nav-od`
  - `<main id="page-content">` → `<h1 class="sr-only">` (único) + `<section id="page-...">` por página
    - `<header class="page-header">` → `<p role="doc-pagebreak" data-book="pagina">` (com `.sr-only` + `.page-number`) + `<h2 class="page-title" data-book=...>`
    - `renderPageContentHtml()` → blocos (fluxo) ou `.idml-canvas` (layout opt-in)
- Modais de zoom/hotspot + `A11Y_HTML` + `<button id="btn-top">` + `<script src="resources/scripts/script.js">`
- Blocos semânticos PNLD: `glossary`, `footnotes`, `math` (todos com `data-book` e descrição alternativa)
- Recursos externos recusados: vídeo sem `localSrc` e `external-embed` com URL http(s) viram `.resource-warning`; VLibras carrega de `resources/scripts/vlibras-plugin.js`
- `@font-face` gerado a partir de `ProjectDocument.fonts[]`, sempre com URL relativa

### 2.2 Modelo de dados (resumo)

```ts
ProjectDocument {
  id, title, locale, pages[], theme, layoutMode, useIdmlLayout,
  showNav, showTopbar, isExemplo
}
ProjectPage {
  id, title, pageNumber, role, blocks[], width?, height?
}
Block {
  id, type, data, style?, layout?
}
```

`Block.type` inclui: `heading`, `paragraph`, `image`, `video`, `audio`, `quiz`,
`tabs`, `accordion`, `hotspot`, `crossword`, `wordsearch`, `puzzle`,
`external-embed`, `html-custom`, `columns`, `divider`, `spacer`, entre outros.

### 2.3 Tema e acessibilidade no build

- `buildThemeCss()` injeta tokens (`--brand-red`, `--bg-page`, `--text-main`, ...).
- Modos: `light` / `dark` / `high-contrast`. Alto contraste força branco/preto/azul `#0033cc`.
- `previewCss` aplica `--font-size-base`, `--heading-scale`, `--line-height`,
  `--reading-width` (vindo de `modeOverrides`).
- Widget `a11yHub`: FAB única, painel com Claro/Escuro/Alto Contraste, filtros,
  fonte, dislexia e VLibras; regra `[hidden]{display:none!important}`.

---

## 3. Alvo PNLD — diferenças estruturais

| Item exigido | Hoje | Alvo |
|---|---|---|
| `index.html` na raiz | ✅ | manter |
| Pasta `content/` (só `.html`) | ❌ | criar; ~500 KB por arquivo, 1 `<h2>` por arquivo |
| Pasta `resources/{audios,fonts,images,scripts,styles,videos}` | ❌ | criar e realocar |
| `content.opf` (`dc:*` + 3 metadados a11y) | ❌ | gerar |
| `toc.ncx` na raiz | ❌ | gerar |
| `cover` (JPEG 2560×1600 / 1600×2560) | ❌ | gerar |
| `data-book` (20 valores) | ✅ nos elementos gerados; `glossario-termo`/`nota` escritos no HTML do parágrafo | manter |
| `<nav id="toc" role="doc-toc" data-book="sumario">` | ✅ | manter |
| Paginação `<p role="doc-pagebreak">` + `<span class="page-number">` | ✅ (helpers + `.sr-only`) | manter |
| `<head>`: description, author, robots/noindex | ✅ | manter |
| Glossário `<dl>/<dt>/<dd>` + links bidirecionais | ❌ | implementar bloco |
| Notas de rodapé bidirecionais | ❌ | implementar bloco |
| Tabelas com `<caption>` e escopo | ❌ | implementar |
| MathML + descrição alternativa | ❌ | implementar bloco `math` |
| `sr-only` (utility CSS) | ❌ | adicionar |
| Fontes WOFF2 em `resources/fonts` | ❌ | incorporar |
| `script.js` em `resources/scripts` | ❌ está na raiz | realocar |
| Recursos externos (YouTube/Vimeo/VLibras) | ⚠️ presentes | substituir por locais |
| Áudio MP3 128 kbps / Vídeo MP4 H.264 1280×720 | ⚠️ WAV data URI / iframes | converter |

---

## 4. Pontos de extensão (onde mexer)

1. **Cabeçalho/metadados** — `buildHtmlFromDoc()` (~:1279–1286).
2. **Sumário/TOC** — `navItems` (~:1256) e `<aside>` (~:1305).
3. **Paginação** — `pagesHtml` (~:1266–1277), trocar `.page-badge`.
4. **`data-book`** — `renderBlockHtml()` (:1349), `renderPageContentHtml()` (:1193) e `buildHtmlFromDoc()`.
5. **CSS utilitário** — `buildCssFromDoc()` (:1541), adicionar `.sr-only`.
6. **JS** — `buildJsFromDoc()` (:2124); mover saída para `resources/scripts`.
7. **Estrutura do ZIP** — `zipProject()` (:1162) e `refreshProjectBuild()` (:1154).
8. **Novos geradores** — criar `buildContentOpf()`, `buildTocNcx()`, `buildCover()` em módulo separado (ex.: `backend/src/services/pnld/package.ts`).

---

## 5. Decisões de arquitetura

- **Gerar, não editar à mão:** o ZIP é reflexo do `ProjectDocument`. Nenhum arquivo
  do pacote deve ser editado diretamente no servidor — sempre via `refreshProjectBuild()`.
- **Pacote autocontido:** nenhum `<iframe>` de terceiros, nenhum script remoto.
  VLibras e mídias precisam virar arquivos locais dentro de `resources/`.
- **Compatibilidade:** o editor continua usando o mesmo `ProjectDocument`; as
  mudanças são no *build*, sem alterar o schema de blocos salvo (exceto por novos tipos: `math`, `glossary`, `footnote`).
- **Validação obrigatória:** W3C Validator + Valide Desktop + NVDA + Lighthouse.

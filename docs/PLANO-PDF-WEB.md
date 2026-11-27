# Plano — Web fiel ao PDF com blocos interativos

> Objetivo: o arquivo web deve **parecer o PDF** (mesma página, mesma hierarquia
> visual), trocando **apenas** os pontos que viram interatividade pelos nossos
> blocos. Base: `Anexo 03 — Especificações Técnicas da Obra Digital`
> (`docs/Anexo_03___Especificacoes_Tecnicas_da_Obra_Digital.pdf`).

## 1. Princípio de equivalência

- A página do PDF é a **referência de layout**: dimensão, margens, colunas,
  posição de títulos/imagens e paginação são preservadas no HTML.
- O texto continua **texto real** (não só imagem): `pdfjs-dist` extrai cada
  fragmento com coordenadas e `getTextContent()`; linhas do mesmo trecho são
  agrupadas em blocos `paragraph` com `layout.x/y/w/h` em pontos.
- A página inteira é rasterizada (`pdf-to-png-converter`) em
  `assets/pagina_NNN.png` e entra como fundo `aria-hidden="true"`. O texto
  fica numa camada posicionada em `%` com `font-size` em `cqw`, então a
  geometria acompanha a largura da página. Texto não editado é transparente
  (o fundo já o mostra); ao editar, o bloco ganha fundo branco e cobre o original.
- `pdftotext -layout` continua apenas como **fallback** se a extração fiel falhar.
- Cada página do PDF vira uma `ProjectPage`; **unir páginas** no editor soma as
  larguras, desloca as coordenadas da página seguinte e mantém as imagens em
  `backgroundLayers[]` (spread lado a lado, sem perder a referência visual).
- Só os componentes marcados são substituídos: botão/link do PDF → bloco
  `quiz`, `accordion`, `tabs`, `audio`, `video`, `glossary`, `footnotes`,
  `math`, `hotspot` etc. Todo o resto permanece estático e fiel ao impresso.

## 2. Estrutura visual (reescrita necessária)

```
.pagina (proporção A4 do PDF)
├── .pagina-fundo        -> imagem/vetor de referência da página
├── .camada-texto        -> texto extraído, semântico e acessível
│   ├── h2 da unidade/capítulo (1 por arquivo HTML)
│   ├── h3 dos títulos de bloco
│   └── p role="doc-pagebreak" + span.page-number
└── .camada-interativa   -> blocos nos lugares dos botões do PDF
    └── .bloco[data-block][data-pdf-region]
```

- `data-pdf-region="x,y,w,h"` guarda a coordenada original do PDF para
  auditar a posição do bloco substituto; `data-block-id` liga o texto ao bloco
  editável do `project.json`.
- O editor mostra essa mesma página por cima da folha: clique no texto para
  editar (`edited: true`). O seletor de layout inclui `Página do PDF`.
- A camada de texto usa `position` relativa ao layout original; o fundo é
  `aria-hidden="true"` para não duplicar leitura no leitor de tela.
- Temas continuam aplicáveis, mas **não podem mudar a geometria**: tokens
  alteram cor/tipografia dentro da caixa da página, não o fluxo entre páginas.

## 3. Agrupamento de páginas (Anexo 03, 4.3.3)

| Regra | Como será implementado |
|---|---|
| 4.3.3.1 separar por unidade/capítulo/segmento | 1 HTML por unidade, capítulo ou tema |
| 4.3.3.2 ~500 KB por HTML | agrupar páginas até ~500 KB; se estourar, abrir novo HTML do mesmo segmento |
| 4.3.3.3 pré-textuais separados | capa, folha de rosto, ficha catalográfica e apresentação em `content/pre-textuais.html` |
| 4.3.3.3 sem múltiplas unidades no mesmo HTML | `segmentId` é a chave de agrupamento; nunca misturar segmentos |
| 4.3.3.4 `<h2>` único por arquivo | o `<h2>` do segmento abre o arquivo; títulos internos viram `<h3>` |
| 4.3.3.5 leitura vertical dentro, horizontal entre | páginas do segmento empilhadas; navegação entre segmentos no `<nav>` |

**Critério prático de agrupamento:** `n` páginas de um mesmo segmento enquanto
`soma(html das páginas + CSS compartilhado) ≤ 500 KB`; `n ≥ 1`. Páginas com
vídeo/áudio pesado contam o HTML de referência, não o binário (que fica em
`resources/`). O agrupamento é determinístico e auditável no `meta.json`.

> Isso **supersede** a regra atual de P18 (1 HTML por página). `index.html`
> continua como visão unificada para o preview do editor; OPF/NCX/spine passam
> a apontar para os HTMLs agrupados.

## 4. Substituição de componentes

| Elemento no PDF | Bloco do Portal | Observação |
|---|---|---|
| Botão "assista"/"ouça" | `video` / `audio` | mídia local em `resources/`, transcrição e legendas |
| Link para glossário | `glossary` | `data-book="glossario"` + retorno |
| Nota de rodapé | `footnotes` | `data-book="notas-rodape"` + retorno |
| Questão de múltipla escolha | `quiz` | feedback textual, sem recurso externo |
| Abas / sanfona | `tabs` / `accordion` | ARIA próprio, teclado |
| Fórmula | `math` | MathML + descrição |
| QR/link curto | `urlList` | apêndice `data-book="lista-urls"` |

Cada substituição registra `blockId`, `pdfPage` e `pdfRegion` no `project.json`.

## 5. Pacote entregue (Anexo 03, 5.10)

- PDF interativo na **raiz** do ZIP, ponto de entrada único.
- Estrutura raiz: `content/`, `resources/{audios,fonts,images,scripts,styles,videos}/`,
  `interactivities/`, `content.opf`, `toc.ncx`, `cover.jpg` (2560×1600 vertical), `index.html`.
- Nomenclatura ASCII, pastas minúsculas: **proibido** `contente/`, `contente.opf`,
  `resources/áudios/`, `resources/vídeos/`, `infográfico/` e `resources/interactivities/`.
- `interactivities/<od>/content/*.html` e `interactivities/<od>/resources/`.
- ODs com diretório próprio; sem HTML fora de `content/` nem recurso fora de
  `resources/`.
- Sem URL externa: mídia, fontes, JS, CSS e VLibras embutidos no pacote.
- Sem duplicação de recurso visual idêntico (5.10.3.3).

## 6. Validação de paridade

0. Smoke já executado: conversão do Anexo 03 gerou 38 páginas com fundo + camada
   de texto (`layoutMode: pdf`), e restauração via aba Logs recriou o projeto
   com os 38 PNGs intactos.
1. Renderizar cada página do PDF em PNG e o HTML agrupado em
   screenshot no mesmo tamanho; comparar por diferença percentual (`pixelmatch`
   ou ImageMagick `compare`).
2. Checklist manual: margens, colunas, quebra de linha, ordem de leitura,
   paginação e nenhum bloco sobrepondo texto.
3. Validar grupos: tamanho ≤500 KB, 1 `<h2>` por arquivo, pré-textuais
   separados, `spine`/`navMap` coerentes.
4. Acessibilidade: W3C, Valide Desktop, NVDA e Lighthouse no build logado.

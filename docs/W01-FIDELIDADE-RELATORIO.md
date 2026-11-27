# W01 — Diagnóstico de fidelidade PDF → web

Status: **parcial (automação/local pronta; comparação visual com obra real pendente)**

## Evidências locais

- Importação PDF usa modo `layoutMode: "pdf"` com fundo raster por página e camada de texto posicionada (`backend/src/services/pdfFidelity.ts`, `converterService.ts`).
- CSS de fidelidade: `.pdf-page`, `.pdf-page-layers`, `.pdf-page-bg`, `.pdf-text-layer`, `.pdf-text`, `.pdf-text.is-edited` (`converterService.ts`, `PDF_FIDELITY_CSS`).
- Editor: `BlockCanvas` renderiza fundo/camadas; `EditorPage` suporta união de páginas preservando `backgroundLayers`.
- Smoke anterior registrado na memória/backlog: Anexo 03 gerou 38 páginas com `pagina_001.png`; restauração preservou PNG.

## Divergências conhecidas (a confirmar na obra real)

| Área | Risco | Prioridade | Como validar |
|---|---|---:|---|
| Tipografia/fonte fallback | Texto real pode ter métrica diferente do raster | Alta | Comparar screenshot HTML x PNG do PDF no mesmo viewport |
| Quebra/kerning de linha | `pdfjs` fragmenta texto; agrupamento pode juntar/separar errado | Alta | Revisar páginas densas, tabelas e legendas |
| Margens/crop de página | Diferença entre MediaBox/CropBox | Média | Conferir páginas com sangria/margens irregulares |
| Camadas ao unir páginas | deslocamento/escala em spreads com larguras diferentes | Média | Usar "Unir páginas" em páginas com tamanhos distintos |
| Elementos não textuais | vetores/raster ficam no fundo; só texto editável é separado | Alta | Checklist por página: imagem, gráfico, fórmula, botão |
| Temas afetando geometria | tokens podem alterar fonte/line-height dentro da página | Alta | Comparar light/dark/high-contrast sem mover caixas |

## Próximos passos

1. Rodar conversão na obra real `ET_EF1_OD_ID1-17.pdf`.
2. Capturar PNG por página do PDF e screenshot do build no mesmo tamanho.
3. Comparar por diff percentual (pixelmatch/ImageMagick) e registrar achados por página.
4. Classificar divergência: aceitável, corrigir CSS/extração, ou substituir por bloco interativo (W03).

## Bloqueio

- Comparação visual final depende da obra/PDF real e ambiente com browser/screenshot disponível.

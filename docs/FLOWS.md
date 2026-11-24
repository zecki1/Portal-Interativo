# Fluxos — Interativo

## Fluxo A — Upload → Conversão → Preview

1. Usuário seleciona arquivo (`.pdf`, `.idml`, `.indd`).
2. Frontend valida tipo/tamanho e envia `POST /api/v1/convert` (multipart).
3. Backend detecta formato:
   - PDF: `pdftotext -layout` → texto por página → blocos.
   - IDML: unzip + parse XML (Stories) + extração de imagens → blocos.
   - INDD: retorna erro orientando exportação para IDML/PDF.
4. Backend gera projeto em `data/projects/<id>/` (index.html, styles.css, script.js, assets/) e `meta.json`.
5. Frontend lista projetos e permite preview (iframe) e download (.zip).

## Fluxo B — Edição de blocos (planejado)

1. Usuário abre projeto no editor.
2. Edita blocos (título, conteúdo, tipo: accordion/box/citação/imagem).
3. `PATCH /api/v1/projects/:id/blocks/:blockId`.
4. Preview atualiza em tempo real.

## Fluxo C — Exportação (build)

1. Usuário clica "Exportar".
2. Backend gera `.zip` com arquivos estáticos.
3. Download do build web.
PY
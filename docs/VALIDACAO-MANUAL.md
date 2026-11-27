# Validação manual obrigatória — PNLD (Anexo 03, item 7.10)

A validação automática cobre estrutura, ausência de recursos externos, `data-book`,
metadados, contraste e tamanho de arquivos:

```bash
cd C:\Users\SS1111235\Documents\SESI\Interativo\backend
npx tsx scripts/validate-pnld.ts <projectId>
```

Ela **não substitui** as etapas abaixo, que exigem a obra de produção e ferramentas externas.

## 1. Preparar mídia (ffmpeg/ffprobe no servidor)

```bash
npm run pnld:audio -- "entrada.wav" "resources/audios/audio.mp3"
npm run pnld:video -- "entrada.mov" "resources/videos/video.mp4"
npm run pnld:probe -- "resources/videos/video.mp4"
```

Conferir: áudio MP3 128 kbps; vídeo MP4 H.264 1280×720 30fps, áudio estéreo 128 kbps.
Criar faixas WebVTT de legendas (`kind="captions"`) e audiodescrição (`kind="descriptions"`).

## 2. W3C Validator

- Abrir `https://validator.w3.org/#validate_by_uri+with_options`
- Validar cada `.html` do ZIP (raiz e `content/`)
- Critério: zero erros (item 4.4.3 / 7.10.1.2)

## 3. Valide Desktop (leitor oficial)

- Baixar em `https://pnld-valide.nees.ufal.br/login`
- Abrir o ZIP exportado e conferir:
  - capa → 2ª/3ª/4ª capa → pré-textuais → conteúdo → pós-textuais (4.3.4)
  - sumário e índice levam ao destino correto (7.6.1/7.6.2)
  - navegação vertical dentro do capítulo e horizontal entre capítulos (4.3.3.5)
  - fluidez e responsividade (4.3.10)
  - interatividades e VLibras funcionando (4.6.3 / 7.8.5)
- Critério: nenhum erro de funcionalidade, usabilidade ou acessibilidade (7.14)

## 4. NVDA (leitores de tela)

- Ordem de leitura igual à visual (7.1.4)
- "página N" anunciado antes da numeração (4.3.12.2)
- Glossário e notas com ida/volta (7.3.2/7.3.3)
- Tabelas com `<caption>` e títulos de linha/coluna (7.4)
- Áudio/vídeo com transcrição, legendas, audiodescrição e Libras (7.8)

## 5. Lighthouse (produção, logado)

```bash
cd ..
npm run build
npm run preview
```

- Abrir a aplicação, fazer login e medir a página de preview
- Critério interno: acessibilidade ≥ 90, performance ≥ 90

## 6. Pacote final

- ZIP ≤ 1,5 GB (4.2)
- Nomenclatura sem acentos/caracteres especiais, pastas em minúsculas (5.2)
- `content.opf` e `toc.ncx` com a mesma ordem (4.3.4)
- Arquivos em `content/` com ~500 KB cada (4.3.3.2)
- `FONT-LICENSES.md` preenchido com a documentação de direitos (4.3.8.2)

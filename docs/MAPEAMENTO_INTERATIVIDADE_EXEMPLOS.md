# Análise dos Exemplos e Mapeamento de Interatividade (Desktop e Mobile)

> Baseado na inspeção direta dos **10 arquivos** em `exemplos/` (8 `.idml` e 2 `.indd`) e nos tipos de bloco já suportados pelo editor e pelo build estático.

---

## 1. Perfis de IDML identificados em `exemplos/`

| Perfil | Arquivos | Páginas | Características estruturais observadas |
| :--- | :--- | :---: | :--- |
| **Capas (`ME_C*`)** | `ET_EF1_ME_C2.idml`, `ET_EF1_ME_C4.idml` | 2 pág. cada | Conteúdo principal dentro de `MasterSpreads/` (`A-Capa`), título (`Nivel`: `1º`, `CADERNO 2`/`4`), fundo colorido (`FillColor`) e links de marca (`AdobeStock_513273264.jpeg`, `Marca_SESI_negativo.ai` via Creative Cloud Libraries). |
| **Material do Estudante (`ME_ID*`)** | `ET_EF1_ME_ID1-17.idml` | 6 pág. | Spreads com múltiplas molduras, listas alfabéticas (`EAD_lista_alfabetica`), vinhetas (`H1_meu-repertorio`, `H4_para-ampliar-saberes`, `H1_<codificando>`), 8 links de mídia (`.jpeg`, `.png`, `.ai`, `cclibraries:`), 4 `<Table>` e 13 URLs externas. |
| **Orientações Didáticas (`OD_ID*`)** | `ET_EF1_OD_ID384.idml`, `ET_EF1_OD_ID386.idml`, `ET_EF1_OD_ID387.idml`, `ET_EF1_OD_ID393.idml`, `ET_EF1_OD_ID542.idml` | 10–12 pág. cada | Layout editorial em 2 colunas (`651.97 × 878.74 pt`), com páginas do Material do Estudante vinculadas (`.indd`) de um lado e encaminhamentos docentes do outro; tabelas de habilidades SESI (`ET-DE`, `ET-LD`, `ET-IC`, `ET-PC`) e fichas de avaliação; ícones vetoriais de ação (`.ai`); caixas de tempo/local (`Q3_Painel_box-tempo`); listas marcadas/numeradas; até 62 `HyperlinkURLDestination` no `designmap.xml`. |
| **Binário proprietário (`.indd`)** | `ET_EF1_ME_A.indd` (9,01 MB), `ET_EF1_ME_C2.indd` (5,46 MB) | — | Formato fechado da Adobe; referencia vínculos externos (`Marca_SESI_*.ai`, `ET_EF1_ME_ID*.indd`, `.pdf`, `.jpg`). Exige exportação prévia para `.idml` ou `.pdf` no InDesign. |

---

## 2. Inventário de recursos e links por arquivo

| Arquivo | Links de mídia / vetores detectados | Tabelas no XML | Hiperlinks no `designmap` | Recursos pedagógicos estáticos predominantes |
| :--- | :--- | :---: | :---: | :--- |
| `ET_EF1_ME_C2.idml` | `AdobeStock_513273264.jpeg`, `Marca_SESI_negativo.ai` (em `MasterSpread`) | 0 | 0 | Capa de caderno (`1º`, `CADERNO 2`). |
| `ET_EF1_ME_C4.idml` | Links em `MasterSpread` | 0 | 0 | Capa de caderno (`1º`, `CADERNO 4`). |
| `ET_EF1_ME_ID1-17.idml` | `ET_EF1_ME_ID1-17_fig01.jpeg`, `fig02.jpeg`, `fig03.ai`, `fig05.ai`, `ET_EF1_ME_ID381_Fig02.ai`, `faça-você-mesmo-F1-F2.png`, `desenhar_8.ai`, `cclibraries` | 4 | 13 URLs | Abertura ilustrada, texto narrativo ("O Quarto Desorganizado de João"), listas alfabéticas (`EAD_lista_alfabetica`), atividades "Classificação de blocos" e "Ilha Deserta", seções `meu repertório`, `<codificando>`, `Para ampliar saberes`. |
| `ET_EF1_OD_ID384.idml` | `ET_EF1_ME_ID384_Fig01.jpeg`, `ET_EF1_ME_ID384.indd`, `00-video_filme_24.ai` | 12 (8 com conteúdo) | 62 URLs | "Organizando a bicharada": tabelas de habilidades (`ET-DE06`, `ET-DE08`), listas de perguntas disparadoras, ficha de avaliação docente, chamada para vídeo (`00-video_filme_24.ai`). |
| `ET_EF1_OD_ID386.idml` | `ET_EF1_ME_ID386_Fig01.jpeg`, `ET_EF1_ME_ID386.indd`, `00-leitura_31.ai`, `plugado_1.ai`, `podcast_audio.ai` | 5 (2 com conteúdo) | 50 URLs | "Dança Maluca" (STEAM): painel de tempo (`100 min`), tabela de habilidades (`ET-PC09..17`), seções `MEU REPERTÓRIO` / `FAÇA VOCÊ MESMO` / `PARA AMPLIAR SABERES`, chamadas para podcast (`curt.link/podcast386`), código (`curt.link/code386`) e texto (`curt.link/texto386`). |
| `ET_EF1_OD_ID387.idml` | `ET_EF1_ME_ID387_Fig01.jpeg`, `ET_EF1_ME_ID387.indd`, `importante.ai`, `00-video_filme_15.ai` | 12 (8 com conteúdo) | 49 URLs | "Criando um robô": tabelas de habilidades (`ET-DE07`, `ET-DE08`, `ET-DE13`), caixa `importante.ai`, perguntas de lateralidade (lado direito/esquerdo), chamada de vídeo (`00-video_filme_15.ai`). |
| `ET_EF1_OD_ID393.idml` | `ET_EF1_ME_ID393_Fig01.jpeg`, `ET_EF1_ME_ID393.indd`, `00-video_filme_10.ai` | 4 (3 com conteúdo) | 51 URLs | "Desenho com Algoritmos": descritores avaliativos, habilidades (`ET-PC15`, `ET-PC22`, `ET-LD07`), chamada de vídeo (`00-video_filme_10.ai`). |
| `ET_EF1_OD_ID542.idml` | `ET_EF1_ME_ID542_Fig01.jpeg`, `ET_EF1_ME_ID542.indd`, `link_clicável_1.ai` | 3 (2 com conteúdo) | 52 URLs | "Encontre o tesouro": instruções passo a passo com **setas vetoriais inline** (`Ande 5 passos para →`), listas numeradas, habilidades (`ET-PC11..13`), links externos (`computacional.com.br/algocards`, `curt.link/*`). |

---

## 3. Mapeamento: Estático (IDML) → Interativo (Web Desktop e Mobile)

| Elemento estático encontrado nos IDMLs | Bloco / Componente Web sugerido | Comportamento no **Desktop** | Comportamento no **Mobile** |
| :--- | :--- | :--- | :--- |
| **Capas (`A-Capa` em `MasterSpread`, `Titulo_abertura` + imagem principal)** | `cover` (Capa / Hero) | Banner em largura total com imagem de fundo sólida/overlay, título, subtítulo e botão `#page-content` que rola até o conteúdo. | Altura e padding reduzidos (`220px`), tipografia fluida (`clamp`), botão acessível com toque confortável. |
| **Página espelhada `.indd` dentro do `OD` (`ET_EF1_ME_ID386.indd` ao lado da coluna docente)** | `image` com `hotspots` + `enableZoom` | Layout em 2 colunas (`Layout: Fiel ao IDML`), com a página do aluno à esquerda/direita e pontos clicáveis (`+`) explicando cada parte ou abrindo zoom. | Empilha em coluna única: primeiro o texto/orientação e logo abaixo a imagem em largura total com zoom por toque e modal de hotspots. |
| **Ícones de ação `.ai` (`00-video_filme_*.ai`, `podcast_audio.ai`, `link_clicável_1.ai`, `00-leitura_31.ai`, `plugado_1.ai`)** | `video` / `external-embed` / `callout` (`box-pdf`, `saiba-mais`) | Incorpora o player do YouTube/MP4, áudio/podcast ou link clicável diretamente no fluxo, sem depender de ícone estático impresso. | Player responsivo `16:9` (`aspect-ratio` fluido) ou botão de abertura em largura total. |
| **Tabelas de Habilidades (`ET-DE`, `ET-PC09..17`, Descritores avaliativos)** | `table` (Tabela responsiva) + `accordion` opcional | Tabela estruturada em colunas com cabeçalho vermelho e linhas zebradas. | Converte automaticamente cada linha em um **cartão vertical** (`td::before` com `data-label`), eliminando rolagem horizontal. |
| **Fichas de avaliação / Registro docente (`nome`, `Escola`, `Turma`, escalas `Insuficiente..Excelente`)** | `true-false` / `multiple-choice` / `callout` (`vamos-refletir`) | Checklist interativo com feedback imediato ou caixa de reflexão/autoavaliação para o professor/aluno. | Botões grandes empilhados e fáceis de marcar com o polegar (`min-height: 36px`). |
| **Caixas coloridas (`Q3_Painel_box-tempo`, `local indicado`, `Desafio`, `importante.ai`)** | `callout` (`importante`, `dica`, `saiba-mais`, `vamos-refletir`, `voce-sabia`) | Caixa com borda lateral destacada, ícone vetorial inline e fundo suave preservando a cor do tema. | Layout em 1 coluna (`grid-template-columns: 1fr`), texto com `overflow-wrap: anywhere` sem vazamento. |
| **Listas de perguntas disparadoras e etapas (`EAD_lista_marcador`, `EAD_lista_numerada`)** | `accordion` / `tabs` / `ordering` | Perguntas agrupadas em sanfonas revelando dicas pedagógicas ao clicar, ou exercício de **Ordenar itens** para algoritmos ("Ande 5 passos → ..."). | Itens expansíveis em largura total; no `ordering`, botões ↑/↓ acessíveis além do arrastar e soltar. |
| **Atividades de classificação / associação / vocabulário (ex.: "Organizando a bicharada", "Classificação de blocos", "Reconhecendo Padrões")** | `matching`, `memory-game`, `fill-blanks`, `word-search`, `crossword` | Grade em 2 colunas ou tabuleiro completo lado a lado com banco de palavras e dicas. | `matching` empilha item + seletor em coluna única; `word-search` e `crossword` reduzem células para `24×24 px` com scroll suave quando necessário. |
| **Parágrafos com definições-chave (`PADRÃO É ALGUMA CARACTERÍSTICA QUE SE REPETE`)** | `highlight` + `flipcard` | Conceito destacado (`<mark>`) e cartão frente/verso para revisão rápida do termo. | Cartão centralizado com área de toque inteira clicável e foco visível via teclado. |
| **Seções `<codificando>` e links para código (`curt.link/code386`)** | `code` + `external-embed` | Bloco de código formatado com linguagem/nome de arquivo e simulador/IDE incorporada abaixo. | Bloco de código com rolagem horizontal isolada (`overflow-x: auto`) sem quebrar a largura da página. |
| **Referências e Recursos Complementares (`HyperlinkTextSource` + `U+2028`)** | `paragraph` com `<a href>` + `tabs` | Links externos preservados e clicáveis em nova aba (`target="_blank"`), podendo ser organizados em abas ("Para ler", "Vídeos", "Referências"). | Abas com quebra automática (`flex-wrap: wrap`) e links quebrando linha com segurança. |
| **Navegação entre páginas (`10–12` páginas por módulo `OD`)** | Sumário lateral (Desktop) + Drawer de Páginas (Mobile) | Barra lateral fixa (`280px`) destacando a página atual. | Botão **"Páginas"** no cabeçalho superior abrindo o sumário em tela cheia no celular. |

---

## 4. Boas práticas para suportar qualquer tipo de IDML

1. **Sempre importar via `.zip` quando houver pasta `Links/`:** arquivos `.idml` isolados costumam apontar para imagens externas (`.jpeg`, `.png`, `.ai`, `.indd`). No `.zip` com `Links/`, o importador resolve e extrai automaticamente.
2. **Pages vazias com `MasterSpread`:** capas como `ET_EF1_ME_C2.idml` e `ET_EF1_ME_C4.idml` guardam texto e imagens na página-mestra — o importador agora aplica fallback automático para `MasterSpreads/`.
3. **Layout editorial vs. Fluxo contínuo:** para materiais com diagramação em 2 colunas (`ET_EF1_OD_ID386.idml`), manter `Layout: Fiel ao IDML` no desktop e deixar o `@media (max-width: 768px)` empilhar automaticamente os frames no mobile; após substituir as imagens faltantes na aba **Mídias**, basta publicar ou exportar o `.zip`.
4. **Versionamento antes de grandes edições:** salvar uma versão manual antes de trocar muitas imagens ou reorganizar páginas permite fazer rollback seguro a qualquer momento.

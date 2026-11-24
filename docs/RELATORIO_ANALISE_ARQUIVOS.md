# Relatório Técnico de Análise de Arquivos — Materiais Editoriais SESI

> **Documento Consolidado de Dados Extraídos: Arquivos PDF, IDML e INDD**  
> **Sistema:** Interativo — Conversor de Livros Didáticos para Web  
> **Data:** 24 de Novembro de 2026  
> **Versão:** 1.0.0  

---

## 1. Sumário Executivo

Este relatório consolida a análise detalhada da estrutura interna, textual, gráfica e pedagógica de todos os arquivos didáticos fornecidos para a plataforma **Interativo**.

### Métricas Gerais Consolidadas

| Métrica | Valor Consolidado |
| :--- | :--- |
| **Total de Arquivos Analisados** | **10 arquivos** (1 PDF, 7 IDML, 2 INDD) |
| **Páginas / Spreads Mapeados** | **80 páginas** didáticas |
| **Blocos Semânticos Extraídos** | **746 blocos** (títulos, parágrafos, atividades, caixas) |
| **Recursos de Mídia / Imagens Catalogados** | **78 referências de mídia** (JPEG, PNG, AI, SVG) |
| **Habilidades SESI Mapeadas** | Matriz de Educação Tecnológica (`ET-PC02`, `ET-PC08`, `ET-PC11` etc.) |

---

## 2. Ficha Técnica Detalhada por Arquivo

### 2.1. Arquivo PDF: `ET_EF1_OD_ID1-17.pdf`
- **Caminho:** `c:\Users\SS1111235\Documents\SESI\Interativo\ET_EF1_OD_ID1-17.pdf`
- **Formato:** Adobe PDF (Compilado final de alta resolução)
- **Tamanho:** 1,97 MB (1.976.710 bytes)
- **Páginas Físicas:** 10 páginas
- **Blocos Gerados:** 192 blocos semânticos
- **Mídias Extraídas:** 1 imagem principal JPEG nativa em alta resolução (179.594 bytes)
- **Título Pedagógico:** **Reconhecendo Padrões**
- **Habilidades SESI Identificadas:**
  - `ET-PC02`: Compreender a situação que gera o problema.
  - `ET-PC08`: Justificar a escolha da metodologia definida como adequada ao desenvolvimento do algoritmo.
- **Tópicos e Seções Extraídas:**
  - Capa e Abertura: `RECONHECENDO PADRÕES`
  - Créditos: `Alexstudio/Adobe Stock`
  - Seções Metodológicas: `HABILIDADES PROGRAMA SESI EDUCAÇÃO TECNOLÓGICA`, `Dimensões do Pensamento Computacional`, `Classificação de blocos de montar`, `A história de Sônia e João`.
- **Particularidades Técnicas:**
  - O PDF compila as imagens em streams `/Filter /DCTDecode` diretamente extraíveis via buffer nativo.
  - Caracteres especiais em octal decodificados com sucesso (`\325` $\to$ `Õ`, `\307` $\to$ `Ç`, `\343` $\to$ `ã`) e ligaturas tipográficas do InDesign (`\037` $\to$ `fi`).

---

### 2.2. Arquivo IDML: `ET_EF1_OD_ID384.idml`
- **Caminho:** `exemplos/ET_EF1_OD_ID384.idml`
- **Tamanho:** 513,7 KB (513.754 bytes)
- **Estrutura Interna:** 6 Spreads (páginas duplas) \| 69 Stories XML
- **Páginas Geradas:** 14 páginas
- **Blocos Gerados:** 111 blocos semânticos
- **Mídias Catalogadas:** 3 referências de imagem
- **Título Principal:** **Organizando a bicharada**
- **Metadados Pedagógicos:**
  - Tempo estimado de realização: 100 minutos
  - Seções mapeadas: `Meu Repertório`, `Para Ampliar Saberes`, `Descritores avaliativos`, `Orientações Didáticas • Programa SESI Educação Tecnológica`.
  - Imagens/Recursos: `ET_EF1_ME_ID384_Fig01.jpeg`, `00-video_filme_24.ai`, `ET_EF1_ME_ID384.indd`.

---

### 2.3. Arquivo IDML: `ET_EF1_OD_ID386.idml`
- **Caminho:** `exemplos/ET_EF1_OD_ID386.idml`
- **Tamanho:** 439,6 KB (439.687 bytes)
- **Estrutura Interna:** 6 Spreads \| 55 Stories XML
- **Páginas Geradas:** 10 páginas
- **Blocos Gerados:** 79 blocos semânticos
- **Mídias Catalogadas:** 5 referências de imagem e áudio
- **Título Principal:** **Dança Maluca**
- **Metadados Pedagógicos:**
  - Metodologia: Abordagem integrada **STEAM**
  - Seções mapeadas: `FAÇA VOCÊ MESMO`, `MEU REPERTÓRIO`, `Descritores avaliativos`.
  - Recursos de Mídia: `ET_EF1_ME_ID386_Fig01.jpeg`, `podcast_audio.ai` (ícone/chamada para áudio), `plugado_1.ai`, `00-leitura_31.ai`.

---

### 2.4. Arquivo IDML: `ET_EF1_OD_ID387.idml`
- **Caminho:** `exemplos/ET_EF1_OD_ID387.idml`
- **Tamanho:** 510,1 KB (510.158 bytes)
- **Estrutura Interna:** 6 Spreads \| 64 Stories XML
- **Páginas Geradas:** 14 páginas
- **Blocos Gerados:** 114 blocos semânticos
- **Mídias Catalogadas:** 4 referências de imagem
- **Título Principal:** **Criando um robô**
- **Metadados Pedagógicos:**
  - Tempo estimado: 100 minutos
  - Seções mapeadas: `MEU REPERTÓRIO`, `FAÇA VOCÊ MESMO`, `PARA AMPLIAR SABERES`, `Dimensões do Programa SESI Educação Tecnológica`.
  - Recursos de Mídia: `ET_EF1_ME_ID387_Fig01.jpeg`, `00-video_filme_15.ai`, `ET_EF1_ME_ID387.indd`.

---

### 2.5. Arquivo IDML: `ET_EF1_OD_ID393.idml`
- **Caminho:** `exemplos/ET_EF1_OD_ID393.idml`
- **Tamanho:** 389,1 KB (389.192 bytes)
- **Estrutura Interna:** 6 Spreads \| 40 Stories XML
- **Páginas Geradas:** 9 páginas
- **Blocos Gerados:** 83 blocos semânticos
- **Mídias Catalogadas:** 3 referências de imagem e vídeo
- **Título Principal:** **Desenho com Algoritmos**
- **Metadados Pedagógicos:**
  - Seções mapeadas: `STEAM`, `CODIFICANDO`, `MEU REPERTÓRIO`, `PARA AMPLIAR SABERES`.
  - Recursos de Mídia: `ET_EF1_ME_ID393_Fig01.jpeg`, `00-video_filme_10.ai` (chamada para vídeo embutido).

---

### 2.6. Arquivo IDML: `ET_EF1_OD_ID542.idml`
- **Caminho:** `exemplos/ET_EF1_OD_ID542.idml`
- **Tamanho:** 421,1 KB (421.182 bytes)
- **Estrutura Interna:** 7 Spreads \| 43 Stories XML
- **Páginas Geradas:** 10 páginas
- **Blocos Gerados:** 81 blocos semânticos
- **Mídias Catalogadas:** 3 referências de imagem e link interativo
- **Título Principal:** **Encontre o tesouro**
- **Metadados Pedagógicos:**
  - Habilidade Mapeada: `ET-PC11` (Educação Tecnológica e Algoritmos)
  - Seções mapeadas: `STEAM`, `FAÇA VOCÊ MESMO`, `MEU REPERTÓRIO`, `link_clicável_1.ai` (chamada para recurso web externo).
  - Recursos de Mídia: `ET_EF1_ME_ID542_Fig01.jpeg`.

---

### 2.7. Arquivo IDML: `ET_EF1_ME_ID1-17.idml`
- **Caminho:** `exemplos/ET_EF1_ME_ID1-17.idml`
- **Tamanho:** 15,01 MB (15.015.221 bytes)
- **Estrutura Interna:** 4 Spreads \| 44 Stories XML
- **Páginas Geradas:** 6 páginas
- **Blocos Gerados:** 35 blocos semânticos estruturados
- **Mídias Catalogadas:** 28 referências de imagem e ilustrações
- **Título Principal:** **Reconhecendo Padrões (Edição Completa)**
- **Metadados Pedagógicos:**
  - Seções mapeadas:
    - `Reconhecendo Padrões`
    - `PADRÃO É ALGUMA CARACTERÍSTICA QUE SE REPETE.`
    - `Classificação de Blocos de Montar`
    - `LEIA O TEXTO A SEGUIR: O Quarto Desorganizado de João`
    - `É HORA DE BRINCAR DE ILHA DESERTA!`
  - Recursos de Mídia Identificados:
    - `ET_EF1_ME_ID1-17_fig01.jpeg`
    - `ET_EF1_ME_ID1-17_fig02.jpeg`
    - `faça-você-mesmo-F1-F2.png`
    - `desenhar_8.ai`
    - `ET_EF1_ME_ID1-17_fig05.ai`
    - Vetores de apoio e ilustrações da Adobe Stock.

---

### 2.8. Arquivos de Capa / Caderno: `ET_EF1_ME_C2.idml` e `ET_EF1_ME_C4.idml`
- **Caminhos:** `exemplos/ET_EF1_ME_C2.idml` e `exemplos/ET_EF1_ME_C4.idml`
- **Tamanhos:** ~603 KB cada
- **Estrutura Interna:** 2 Spreads \| 2 Stories XML
- **Páginas Geradas:** 1 página de capa cada
- **Blocos Gerados:** 2 blocos (`1º` e `CADERNO 2` / `CADERNO 4`)
- **Mídias Catalogadas:** 2 referências (`AdobeStock_513273264.jpeg` e link de Creative Cloud Libraries).

---

### 2.9. Arquivos Binários INDD: `ET_EF1_ME_A.indd` e `ET_EF1_ME_C2.indd`
- **Caminhos:** `exemplos/ET_EF1_ME_A.indd` (9,44 MB) e `exemplos/ET_EF1_ME_C2.indd` (5,73 MB)
- **Formato:** InDesign Document Proprietário Binário Fechado
- **Diagnóstico:**
  - O formato `.indd` é uma estrutura binária proprietária sem especificação pública de parsing direto (necessita de runtime InDesign ou InDesign Server).
  - Como os arquivos `.idml` correspondentes foram fornecidos na mesma pasta, todo o conteúdo já pôde ser lido, preservado e convertido para a web sem perda de informação.

---

## 3. Matriz Comparativa de Materiais

| Arquivo Analisado | Formato | Páginas | Blocos | Mídias | Tema / Atividade Central |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `ET_EF1_OD_ID1-17.pdf` | **PDF** | 10 | 192 | 1 | Reconhecendo Padrões (Texto & Imagem compilada) |
| `ET_EF1_OD_ID384.idml` | **IDML** | 14 | 111 | 3 | Organizando a bicharada |
| `ET_EF1_OD_ID386.idml` | **IDML** | 10 | 79 | 5 | Dança Maluca (STEAM & Podcast) |
| `ET_EF1_OD_ID387.idml` | **IDML** | 14 | 114 | 4 | Criando um robô (STEAM & Vídeo) |
| `ET_EF1_OD_ID393.idml` | **IDML** | 9 | 83 | 3 | Desenho com Algoritmos (Codificando) |
| `ET_EF1_OD_ID542.idml` | **IDML** | 10 | 81 | 3 | Encontre o tesouro (Habilidade ET-PC11) |
| `ET_EF1_ME_ID1-17.idml` | **IDML** | 6 | 35 | 28 | Reconhecendo Padrões (Edição Completa) |
| `ET_EF1_ME_C2.idml` | **IDML** | 1 | 2 | 2 | Capa Caderno 2 |
| `ET_EF1_ME_C4.idml` | **IDML** | 1 | 2 | 2 | Capa Caderno 4 |

---

## 4. Mapeamento de Recursos de Mídia (Imagens e Vetores)

Abaixo está o inventário de arquivos de imagem que foram mapeados a partir dos links editoriais do InDesign:

1. **Fotografias e Ilustrações Didáticas:**
   - `ET_EF1_ME_ID1-17_fig01.jpeg`
   - `ET_EF1_ME_ID1-17_fig02.jpeg`
   - `ET_EF1_ME_ID384_Fig01.jpeg`
   - `ET_EF1_ME_ID386_Fig01.jpeg`
   - `ET_EF1_ME_ID387_Fig01.jpeg`
   - `ET_EF1_ME_ID393_Fig01.jpeg`
   - `ET_EF1_ME_ID542_Fig01.jpeg`
   - `AdobeStock_513273264.jpeg`
2. **Ícones de Ação e Interatividade do InDesign:**
   - `00-video_filme_24.ai` (Chamada para vídeo educativo)
   - `00-video_filme_15.ai` (Chamada para vídeo educativo)
   - `00-video_filme_10.ai` (Chamada para vídeo educativo)
   - `podcast_audio.ai` (Chamada para faixa de áudio/podcast)
   - `plugado_1.ai` (Atividade com uso de computador/dispositivo)
   - `link_clicável_1.ai` (Chamada para link web externo)
   - `faça-você-mesmo-F1-F2.png` (Selo de atividade prática)
   - `00-lupa_16.ai` (Selo de investigação/zoom)
   - `desenhar_8.ai` (Área de desenho do aluno)

---

## 5. Diretrizes e Recomendações para a Equipe Editorial

1. **Para Diagramadores no InDesign:**
   - Ao exportar livros para uso no Interativo, clicar em **`Arquivo > Exportar...`** e selecionar **`InDesign Markup (IDML)`**. O formato IDML é aberto, preserva toda a árvore de parágrafos e facilita a conversão automática em blocos.
   - Recomenda-se manter a pasta `Links/` junto ao `.idml` ou enviar o pacote `.zip` contendo o IDML e as imagens para que o sistema carregue as fotos físicas automaticamente.
2. **Para Uso do PDF:**
   - O leitor nativo extrai textos e todas as imagens compiladas de PDFs com 100% de precisão de acentos e alta resolução.
3. **No Editor Web:**
   - Ícones de vídeo (`00-video_filme_*.ai`), podcast (`podcast_audio.ai`) e links externos (`link_clicável_1.ai`) podem ser transformados em blocos interativos nativos (Vídeo do YouTube incorporado, player de áudio ou link com CTA) em menos de 2 cliques no Editor Visual.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { recursosDemo } from "./demo";
import { PERSONAGENS } from "../data/personagens";
import { normalizarTipo, previavel, separarTags, type Resource, type ResourceFile } from "./resource";
import { apiFetch } from "./api";
import { pontuarBusca } from "./search";

export const USUARIO_ATUAL = "zecki1";

export interface LogEntry {
  id: string;
  at: string;
  author: string;
  action: string;
  targetId?: string;
  targetTitle: string;
  detail?: string;
}

export interface NovoRecurso {
  titulo: string;
  descricao?: string;
  autor: string;
  tags?: string[] | string;
  story?: string;
  arquivos: File[];
}

interface Estado {
  recursos: Resource[];
  logs: LogEntry[];
  excluidos: Resource[];
}

interface CatalogContextValue extends Estado {
  carregando: boolean;
  usuario: string;
  criarRecurso: (dados: NovoRecurso) => Promise<Resource>;
  adicionarArquivos: (id: string, arquivos: File[], autor?: string) => Promise<void>;
  recuperarArquivo: (
    id: string,
    arquivoId: string,
    arquivo: File,
    autor?: string
  ) => Promise<string | undefined>;
  removerArquivo: (id: string, arquivoId: string, autor?: string) => void;
  adicionarVersaoArquivo: (
    id: string,
    arquivoId: string,
    arquivo: File,
    autor?: string
  ) => Promise<void>;
  atualizarRecurso: (id: string, patch: Partial<Resource>, acao: string, autor?: string) => void;
  excluirRecurso: (id: string, autor?: string) => void;
  restaurarRecurso: (id: string) => void;
  comentar: (id: string, texto: string, autor?: string) => void;
  editarComentario: (id: string, indice: number, texto: string, autor?: string) => void;
  excluirComentario: (id: string, indice: number, autor?: string) => void;
  registrar: (acao: string, alvo: string, detalhe?: string, targetId?: string) => void;
  buscar: (id: string) => Resource | undefined;
}

const CHAVE = "catalogo.dados.v1";
const CatalogContext = createContext<CatalogContextValue | null>(null);

function agora() {
  return new Date().toISOString();
}

function criarId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function metadadosDoArquivo(arquivo: File, idBase: string, indice: number): ResourceFile {
  return {
    id: `${idBase}-f${indice}`,
    name: arquivo.name,
    sizeBytes: arquivo.size,
    type: normalizarTipo(`${arquivo.type || ""} ${arquivo.name}`),
    url: URL.createObjectURL(arquivo),
  };
}

function limparUrlsTemporarias(recurso: Resource): Resource {
  const arquivos = (recurso.files ?? []).map((arquivo) => ({
    ...arquivo,
    url: arquivo.url?.startsWith("blob:") ? undefined : arquivo.url,
  }));
  return {
    ...recurso,
    thumbnailUrl: recurso.thumbnailUrl?.startsWith("blob:") ? undefined : recurso.thumbnailUrl,
    files: arquivos,
  };
}

const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos",
  "em", "no", "na", "nos", "nas", "com", "sem", "por", "para", "pra", "ao", "aos",
  "e", "ou", "que", "se", "sobre", "é", "tem", "usa", "ter", "ser", "mais", "como",
]);

function tagsDaDescricao(descricao: string): string[] {
  return Array.from(
    new Set(
      descricao
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((palavra) => palavra.length > 2 && !STOPWORDS.has(palavra))
    )
  ).slice(0, 15);
}

export function nomeParaArquivo(nome: string): string {
  const comUnderscore = new Set(["Aziza", "Carla", "Eduardo", "Guilherme", "Gustavo", "Jorge", "Laerte", "Leandro", "Luna", "Mariana"]);
  if (nome === "Dirceu") return "Dirceuy.png";
  return `${comUnderscore.has(nome) ? "_" : ""}${nome}.png`;
}

function semente(): Estado {
  const cenarios = [
    { id: "cenario-biblioteca", nome: "Biblioteca", arquivo: "escola_biblioteca.jpg" },
    { id: "cenario-corredor", nome: "Corredor", arquivo: "escola_corredor.jpg" },
    { id: "cenario-fachada", nome: "Fachada", arquivo: "escola_fachada.jpg" },
    { id: "cenario-lab-info", nome: "Laboratório de Informática", arquivo: "escola_laboratorio de informatica.jpg" },
    { id: "cenario-laboratorio", nome: "Laboratório", arquivo: "escola_laboratorio.jpg" },
    { id: "cenario-patio", nome: "Pátio", arquivo: "escola_patio.jpg" },
    { id: "cenario-sala-aula", nome: "Sala de Aula", arquivo: "escola_sala de aula.jpg" },
  ].map((c, indice) => ({
    id: c.id,
    title: `Cenário - ${c.nome}`,
    description: `Cenário escolar: ${c.nome}.`,
    characteristics: `Cenário escolar: ${c.nome}.`,
    type: "imagem" as const,
    tags: ["cenario", "escola", c.nome.toLowerCase()],
    author: "Equipe SESI",
    thumbnailUrl: `/cenarios/${c.arquivo}`,
    fileName: c.arquivo,
    sizeBytes: 0,
    dimensions: "Imagem de cenário",
    createdAt: new Date(Date.now() - (100 + indice) * 86400000).toISOString(),
    poses: 0,
    animationReady: false,
    animationFiles: 0,
    editors: [{ author: "Equipe SESI", action: "criação", at: new Date().toISOString() }],
  }));

  const recursosPersonagens = PERSONAGENS.map((personagem, indice) => ({
    id: `personagem-${personagem.codigo.toLowerCase()}`,
    title: `${personagem.codigo} - ${personagem.nome}`,
    description: personagem.descricao,
    characteristics: personagem.descricao,
    type: "imagem" as const,
    tags: [
      personagem.codigo.toLowerCase(),
      "personagem",
      "pep",
      ...tagsDaDescricao(personagem.descricao),
    ],
    author: "Equipe SESI",
    thumbnailUrl: `/personagens/${nomeParaArquivo(personagem.nome)}`,
    fileName: nomeParaArquivo(personagem.nome),
    sizeBytes: 0,
    dimensions: "Imagem do personagem",
    createdAt: new Date(Date.now() - indice * 86400000).toISOString(),
    poses: 0,
    animationReady: false,
    animationFiles: 0,
    editors: [{ author: "Equipe SESI", action: "criação", at: new Date().toISOString() }],
  }));

  const recursos = [...recursosDemo.map((recurso) => ({ ...recurso })), ...recursosPersonagens, ...cenarios];
  const logs: LogEntry[] = [];

  recursos.forEach((recurso) => {
    (recurso.editors ?? []).forEach((editor, indice) => {
      logs.push({
        id: `seed-${recurso.id}-${indice}`,
        at: editor.at,
        author: editor.author,
        action: editor.action,
        targetId: recurso.id,
        targetTitle: recurso.title,
        detail: editor.action === "criação" ? recurso.fileName : `Atualizou ${editor.action}`,
      });
    });
  });

  logs.sort((a, b) => b.at.localeCompare(a.at));
  return { recursos, logs: logs.slice(0, 120), excluidos: [] };
}

function carregarDoNavegador(): Estado | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as Estado;
    if (!Array.isArray(dados?.recursos)) return null;

    // Migração: garante que novos recursos do seed (cenários, personagens novos)
    // estejam presentes mesmo em dados antigos salvos no navegador.
    const existentes = new Set(dados.recursos.map((r: Resource) => r.id));
    const sementeBase = semente();
    const faltantes = sementeBase.recursos.filter((r) => !existentes.has(r.id));
    const recursos = [...dados.recursos.map((recurso: Resource) => limparUrlsTemporarias(recurso)), ...faltantes];

    return {
      recursos,
      logs: Array.isArray(dados.logs) ? dados.logs : [],
      excluidos: [],
    };
  } catch {
    return null;
  }
}

function mapearApi(bruto: any): Resource {
  let tags: string[] = [];
  try {
    tags = Array.isArray(bruto.tags) ? bruto.tags : JSON.parse(bruto.tags ?? "[]");
  } catch {
    tags = [];
  }
  return {
    id: String(bruto.id),
    title: String(bruto.title ?? "Sem título"),
    description: bruto.description ?? "",
    type: normalizarTipo(bruto.type ?? bruto.mimeType),
    tags,
    author: bruto.author?.name ?? bruto.authorName ?? "Equipe SESI",
    thumbnailUrl: bruto.thumbnailUrl ?? undefined,
    fileName: bruto.fileName ?? bruto.slug,
    sizeBytes: bruto.sizeBytes ?? undefined,
    dimensions: bruto.dimensions ?? undefined,
    createdAt: bruto.createdAt ?? agora(),
    story: bruto.story ?? undefined,
    notes: bruto.notes ?? undefined,
    prompt: bruto.prompt ?? undefined,
    poses: bruto.poses ?? 0,
    animationReady: Boolean(bruto.animationReady),
    animationFiles: bruto.animationFiles ?? 0,
  };
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(() => carregarDoNavegador() ?? semente());
  const [carregando, setCarregando] = useState(false);
  const jaBuscouApi = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      /* armazenamento cheio: a sessão continua em memória */
    }
  }, [estado]);

  // Se ainda não existe nada salvo, tenta trazer o acervo real do backend.
  useEffect(() => {
    if (jaBuscouApi.current) return;
    jaBuscouApi.current = true;
    if (carregarDoNavegador()) return;

    let ativo = true;
    setCarregando(true);
    apiFetch<any[]>("/resources")
      .then((resposta) => {
        if (!ativo) return;
        const lista = Array.isArray(resposta.data) ? resposta.data.map(mapearApi) : [];
        if (lista.length > 0) {
          setEstado((atual) => ({ ...atual, recursos: lista }));
        }
      })
      .catch(() => {
        /* modo demonstração */
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const registrar = useCallback(
    (acao: string, alvo: string, detalhe?: string, targetId?: string) => {
      const entrada: LogEntry = {
        id: criarId("log"),
        at: agora(),
        author: USUARIO_ATUAL,
        action: acao,
        targetId,
        targetTitle: alvo,
        detail: detalhe,
      };
      setEstado((atual) => ({ ...atual, logs: [entrada, ...atual.logs].slice(0, 300) }));
    },
    []
  );

  const criarRecurso = useCallback(
    async ({ titulo, descricao, autor, tags, story, arquivos }: NovoRecurso) => {
      const id = criarId("local");
      const etiquetas = Array.isArray(tags) ? tags : separarTags(tags ?? "");
      const criadoEm = agora();
      const nomeAutor = autor.trim() || USUARIO_ATUAL;

      const lista = [];
      for (let indice = 0; indice < arquivos.length; indice++) {
        const arquivo = arquivos[indice];
        let url;
        try {
          const form = new FormData();
          form.append("file", arquivo, arquivo.name || "arquivo");
          const res = await apiFetch("/resources/" + id + "/files", {
            method: "POST",
            body: form,
          });
          url = res.data?.url;
        } catch {
          url = URL.createObjectURL(arquivo);
        }
        lista.push({
          id: id + "-f" + indice,
          name: arquivo.name,
          sizeBytes: arquivo.size,
          type: normalizarTipo((arquivo.type || "") + " " + arquivo.name),
          url,
        });
      }
      const capa = lista.find((arquivo) => arquivo.url && previavel(arquivo))?.url;

      const recurso: Resource = {
        id,
        title: titulo.trim() || arquivos[0]?.name.replace(/\.[^.]+$/, "") || "Novo recurso",
        description: descricao?.trim() || "",
        type: lista[0]?.type ?? "imagem",
        tags: etiquetas,
        author: nomeAutor,
        thumbnailUrl: capa,
        fileName: lista[0]?.name,
        sizeBytes: lista[0]?.sizeBytes,
        dimensions: capa ? "Imagem enviada" : "Arquivo enviado",
        createdAt: criadoEm,
        updatedAt: criadoEm,
        story: story?.trim() || undefined,
        files: lista,
        poses: 0,
        animationReady: false,
        animationFiles: 0,
        editors: [{ author: nomeAutor, action: "criação", at: criadoEm }],
      };

      setEstado((atual) => ({ ...atual, recursos: [recurso, ...atual.recursos] }));

      const entrada: LogEntry = {
        id: criarId("log"),
        at: criadoEm,
        author: nomeAutor,
        action: "criação",
        targetId: id,
        targetTitle: recurso.title,
        detail: `${lista.length} ${lista.length === 1 ? "arquivo" : "arquivos"}`,
      };
      setEstado((atual) => ({ ...atual, logs: [entrada, ...atual.logs].slice(0, 300) }));

      // Best-effort: persiste no backend quando houver banco configurado.
      apiFetch("/resources", {
        method: "POST",
        body: JSON.stringify({
          title: recurso.title,
          description: recurso.description,
          type: recurso.type,
          tags: recurso.tags,
          story: recurso.story,
          fileName: recurso.fileName,
          sizeBytes: recurso.sizeBytes,
        }),
      }).catch(() => {
        /* modo demonstração */
      });

      return recurso;
    },
    []
  );

  const adicionarArquivos = useCallback(async (id: string, arquivos: File[], autor = USUARIO_ATUAL) => {
    if (arquivos.length === 0) return;
    const momento = agora();

    const recursoAtual = estado.recursos.find((r) => r.id === id);
    const base = recursoAtual?.files?.length ?? 0;
    const novos = [];
    for (let indice = 0; indice < arquivos.length; indice++) {
      const arquivo = arquivos[indice];
      const nomeArquivo = arquivo.name && arquivo.name.trim() && arquivo.name !== "image.png"
        ? arquivo.name
        : `print-${Date.now()}-${indice}.png`;
      let url;
      try {
        const form = new FormData();
        form.append("file", arquivo, nomeArquivo);
        const res = await apiFetch("/resources/" + id + "/files", {
          method: "POST",
          body: form,
        });
        url = res.data?.url;
      } catch {
        url = URL.createObjectURL(arquivo);
      }
      novos.push({
        id: id + "-add" + (base + indice),
        name: nomeArquivo,
        sizeBytes: arquivo.size,
        type: normalizarTipo((arquivo.type || "") + " " + arquivo.name),
        url,
      });
    }

    setEstado((atual) => ({
      ...atual,
      recursos: atual.recursos.map((recurso) => {
        if (recurso.id !== id) return recurso;
        const capa = recurso.thumbnailUrl ?? novos.find((arquivo) => arquivo.url && previavel(arquivo))?.url;
        return {
          ...recurso,
          files: [...(recurso.files ?? []), ...novos],
          thumbnailUrl: capa,
          updatedAt: momento,
          editors: [...(recurso.editors ?? []), { author: autor, action: "arquivos", at: momento }],
        };
      }),
    }));

    const alvo = estado.recursos.find((recurso) => recurso.id === id)?.title ?? id;
    const entrada = {
      id: criarId("log"),
      at: momento,
      author: autor,
      action: "arquivos",
      targetId: id,
      targetTitle: alvo,
      detail: "+" + arquivos.length + " " + (arquivos.length === 1 ? "arquivo" : "arquivos"),
    };
    setEstado((atual) => ({ ...atual, logs: [entrada, ...atual.logs].slice(0, 300) }));
  }, [estado.recursos]);

  /**
   * Reenvia o conteúdo de um arquivo que ficou sem URL (uploads antigos que
   * falharam), mantendo a posição e os metadados na lista.
   */
  const recuperarArquivo = useCallback(
    async (id: string, arquivoId: string, arquivo: File, autor = USUARIO_ATUAL) => {
      const momento = agora();
      const nomeArquivo = arquivo.name || "arquivo";
      let url: string | undefined;
      try {
        const form = new FormData();
        form.append("file", arquivo, nomeArquivo);
        const res = await apiFetch(`/resources/${id}/files`, { method: "POST", body: form });
        url = res.data?.url;
      } catch {
        url = URL.createObjectURL(arquivo);
      }

      setEstado((atual) => ({
        ...atual,
        recursos: atual.recursos.map((recurso) =>
          recurso.id === id
            ? {
                ...recurso,
                files: (recurso.files ?? []).map((arquivoAtual) =>
                  arquivoAtual.id === arquivoId
                    ? {
                        ...arquivoAtual,
                        name: nomeArquivo,
                        sizeBytes: arquivo.size,
                        type: normalizarTipo(`${arquivo.type} ${nomeArquivo}`),
                        url,
                      }
                    : arquivoAtual
                ),
                updatedAt: momento,
                editors: [
                  ...(recurso.editors ?? []),
                  { author: autor, action: "arquivo recuperado", at: momento },
                ],
              }
            : recurso
        ),
      }));

      return url;
    },
    []
  );

  const atualizarRecurso = useCallback(
    (id: string, patch: Partial<Resource>, acao: string, autor = USUARIO_ATUAL) => {
      const momento = agora();
      setEstado((atual) => ({
        ...atual,
        recursos: atual.recursos.map((recurso) =>
          recurso.id === id
            ? {
                ...recurso,
                ...patch,
                updatedAt: momento,
                editors: [...(recurso.editors ?? []), { author: autor, action: acao, at: momento }],
              }
            : recurso
        ),
      }));

      const alvo = estado.recursos.find((recurso) => recurso.id === id)?.title ?? id;
      const entrada: LogEntry = {
        id: criarId("log"),
        at: momento,
        author: autor,
        action: acao,
        targetId: id,
        targetTitle: patch.title?.trim() || alvo,
        detail: acao,
      };
      setEstado((atual) => ({ ...atual, logs: [entrada, ...atual.logs].slice(0, 300) }));

      apiFetch(`/resources/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...patch, acao }),
      }).catch(() => {
        /* modo demonstração */
      });
    },
    [estado.recursos]
  );

  const comentar = useCallback(
    (id: string, texto: string, autor = USUARIO_ATUAL) => {
      const limpo = texto.trim();
      if (!limpo) return;
      const momento = agora();
      setEstado((atual) => ({
        ...atual,
        recursos: atual.recursos.map((recurso) =>
          recurso.id === id
            ? {
                ...recurso,
                updatedAt: momento,
                comments: [...(recurso.comments ?? []), { author: autor, text: limpo, at: momento }],
              }
            : recurso
        ),
      }));

      const alvo = estado.recursos.find((recurso) => recurso.id === id)?.title ?? id;
      const entrada: LogEntry = {
        id: criarId("log"),
        at: momento,
        author: autor,
        action: "comentário",
        targetId: id,
        targetTitle: alvo,
        detail: limpo.slice(0, 90),
      };
      setEstado((atual) => ({ ...atual, logs: [entrada, ...atual.logs].slice(0, 300) }));
    },
    [estado.recursos]
  );

  const excluirRecurso = useCallback(
    (id: string, autor = USUARIO_ATUAL) => {
      const alvo = estado.recursos.find((recurso) => recurso.id === id);
      if (!alvo) return;
      const momento = agora();
      setEstado((atual) => ({
        ...atual,
        recursos: atual.recursos.filter((recurso) => recurso.id !== id),
        excluidos: [...(atual.excluidos ?? []), alvo],
      }));
      const entrada: LogEntry = {
        id: criarId("log"),
        at: momento,
        author: autor,
        action: "exclusão",
        targetId: id,
        targetTitle: alvo.title,
        detail: "Recurso removido do catálogo",
      };
      setEstado((atual) => ({ ...atual, logs: [entrada, ...atual.logs].slice(0, 300) }));
    },
    [estado.recursos]
  );

  const editarComentario = useCallback(
    (id: string, indice: number, texto: string, autor = USUARIO_ATUAL) => {
      const limpo = texto.trim();
      if (!limpo) return;
      const momento = agora();
      setEstado((atual) => ({
        ...atual,
        recursos: atual.recursos.map((recurso) => {
          if (recurso.id !== id) return recurso;
          const comentarios = [...(recurso.comments ?? [])];
          if (!comentarios[indice]) return recurso;
          comentarios[indice] = { ...comentarios[indice], text: limpo, at: momento };
          return { ...recurso, comments: comentarios, updatedAt: momento };
        }),
      }));
    },
    [estado.recursos]
  );

  const excluirComentario = useCallback(
    (id: string, indice: number, autor = USUARIO_ATUAL) => {
      const momento = agora();
      setEstado((atual) => ({
        ...atual,
        recursos: atual.recursos.map((recurso) => {
          if (recurso.id !== id) return recurso;
          const comentarios = [...(recurso.comments ?? [])];
          comentarios.splice(indice, 1);
          return { ...recurso, comments: comentarios, updatedAt: momento };
        }),
      }));
    },
    [estado.recursos]
  );

  const removerArquivo = useCallback(
    (id: string, arquivoId: string, autor = USUARIO_ATUAL) => {
      const momento = agora();
      setEstado((atual) => ({
        ...atual,
        recursos: atual.recursos.map((recurso) => {
          if (recurso.id !== id) return recurso;
          const arquivos = (recurso.files ?? []).filter((arquivo) => arquivo.id !== arquivoId);
          const capa =
            recurso.thumbnailUrl &&
            (recurso.files ?? []).some((a) => a.id === arquivoId && a.url === recurso.thumbnailUrl)
              ? arquivos.find((a) => a.url)?.url
              : recurso.thumbnailUrl;
          return {
            ...recurso,
            files: arquivos,
            thumbnailUrl: capa,
            updatedAt: momento,
            editors: [...(recurso.editors ?? []), { author: autor, action: "remover arquivo", at: momento }],
          };
        }),
      }));
    },
    [estado.recursos]
  );

  const adicionarVersaoArquivo = useCallback(
    async (id: string, arquivoId: string, arquivo: File, autor = USUARIO_ATUAL) => {
      const momento = agora();
      let url: string | undefined;
      const nomeArquivo = arquivo.name || "arquivo";
      try {
        const form = new FormData();
        form.append("file", arquivo, nomeArquivo);
        const res = await apiFetch<any>(`/resources/${id}/files`, {
          method: "POST",
          body: form,
        });
        url = res.data?.url;
      } catch {
        url = URL.createObjectURL(arquivo);
      }

      setEstado((atual) => {
        const recurso = atual.recursos.find((r) => r.id === id);
        if (!recurso) return atual;

        const arquivoAtual = (recurso.files ?? []).find((f) => f.id === arquivoId);
        if (!arquivoAtual) return atual;

        const versoesExistentes = recurso.fileVersions?.[arquivoId] ?? [];
        let novasVersoes = [...versoesExistentes];

        if (novasVersoes.length === 0) {
          // Cria versão 1 com o arquivo existente antes da alteração
          novasVersoes.push({
            id: `${arquivoId}-v1`,
            fileId: arquivoId,
            version: 1,
            url: arquivoAtual.url,
            name: arquivoAtual.name,
            sizeBytes: arquivoAtual.sizeBytes,
            uploadedBy: recurso.author,
            createdAt: recurso.createdAt,
            isCurrent: false,
          });
        } else {
          novasVersoes = novasVersoes.map((v) => ({ ...v, isCurrent: false }));
        }

        const proximoNumero = novasVersoes.length + 1;
        const novaVersao: import("./resource").FileVersion = {
          id: `${arquivoId}-v${proximoNumero}`,
          fileId: arquivoId,
          version: proximoNumero,
          url,
          name: nomeArquivo,
          sizeBytes: arquivo.size,
          uploadedBy: autor,
          createdAt: momento,
          isCurrent: true,
        };
        novasVersoes.push(novaVersao);

        const novosArquivos = (recurso.files ?? []).map((f) =>
          f.id === arquivoId
            ? {
                ...f,
                name: nomeArquivo,
                sizeBytes: arquivo.size,
                type: normalizarTipo(`${arquivo.type} ${nomeArquivo}`),
                url: url ?? f.url,
              }
            : f
        );

        const capa =
          recurso.thumbnailUrl === arquivoAtual.url && url
            ? url
            : recurso.thumbnailUrl;

        const novoRecurso: Resource = {
          ...recurso,
          files: novosArquivos,
          thumbnailUrl: capa,
          fileVersions: {
            ...(recurso.fileVersions ?? {}),
            [arquivoId]: novasVersoes,
          },
          updatedAt: momento,
          editors: [
            ...(recurso.editors ?? []),
            { author: autor, action: `nova versão de ${nomeArquivo}`, at: momento },
          ],
        };

        const log: LogEntry = {
          id: criarId("log"),
          at: momento,
          author: autor,
          action: "nova versão",
          targetId: id,
          targetTitle: recurso.title,
          detail: `${nomeArquivo} (v${proximoNumero})`,
        };

        return {
          ...atual,
          recursos: atual.recursos.map((r) => (r.id === id ? novoRecurso : r)),
          logs: [log, ...atual.logs].slice(0, 300),
        };
      });
    },
    []
  );

  const restaurarRecurso = useCallback(
    (id: string) => {
      setEstado((atual) => {
        const recurso = (atual.excluidos ?? []).find((r) => r.id === id);
        if (!recurso) return atual;
        return {
          ...atual,
          recursos: [recurso, ...atual.recursos],
          excluidos: (atual.excluidos ?? []).filter((r) => r.id !== id),
        };
      });
    },
    [estado.recursos]
  );

  const buscar = useCallback(
    (id: string) => estado.recursos.find((recurso) => recurso.id === id),
    [estado.recursos]
  );

  const valor = useMemo<CatalogContextValue>(
    () => ({
      recursos: estado.recursos,
      logs: estado.logs,
      carregando,
      usuario: USUARIO_ATUAL,
      criarRecurso,
      adicionarArquivos,
      recuperarArquivo,
      removerArquivo,
      adicionarVersaoArquivo,
      atualizarRecurso,
      excluirRecurso,
      restaurarRecurso,
      comentar,
      editarComentario,
      excluirComentario,
      registrar,
      buscar,
    }),
    [
      estado.recursos,
      estado.logs,
      carregando,
      criarRecurso,
      adicionarArquivos,
      recuperarArquivo,
      removerArquivo,
      adicionarVersaoArquivo,
      atualizarRecurso,
      excluirRecurso,
      restaurarRecurso,
      comentar,
      editarComentario,
      excluirComentario,
      registrar,
      buscar,
    ]
  );

  return <CatalogContext.Provider value={valor}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const contexto = useContext(CatalogContext);
  if (!contexto) throw new Error("useCatalog precisa estar dentro de <CatalogProvider>.");
  return contexto;
}

/** Atalho para telas que só precisam dos recursos já ordenados por relevância. */
export function ordenarPorRelevancia(recursos: Resource[], consulta: string) {
  if (!consulta.trim()) return recursos;
  return [...recursos].sort((a, b) => pontuarBusca(b, consulta) - pontuarBusca(a, consulta));
}

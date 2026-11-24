import { describe, expect, it } from "vitest";
import { combinarBusca, pontuarBusca } from "./search";
import type { Resource } from "./resource";

const recurso: Resource = {
  id: "1",
  title: "Moça de pele morena com óculos sentada",
  description: "Ilustração de uma jovem negra sentada.",
  type: "imagem",
  tags: ["mulher", "negra", "óculos", "sentada", "diversidade"],
  author: "Fabiano Souza",
  createdAt: "2026-11-12T14:20:00.000Z",
};

describe("combinarBusca", () => {
  it("encontra por frase completa sem acento", () => {
    expect(combinarBusca(recurso, "moca de pele morena com oculos sentada")).toBe(true);
  });

  it("encontra por conjunto de palavras", () => {
    expect(combinarBusca(recurso, "mulher negra sentada")).toBe(true);
  });

  it("trata vírgulas como alternativas", () => {
    expect(combinarBusca(recurso, "cachorro, diversidade")).toBe(true);
  });

  it("encontra pelo autor", () => {
    expect(combinarBusca(recurso, "Fabiano")).toBe(true);
  });

  it("encontra por sinal de uso e anotações", () => {
    const comSinais = {
      ...recurso,
      cues: ["alerta" as const],
      notes: "Evitar recorte que esconda as mãos.",
    };
    expect(combinarBusca(comSinais, "alerta")).toBe(true);
    expect(combinarBusca(comSinais, "recorte")).toBe(true);
  });

  it("retorna falso quando nenhum termo existe", () => {
    expect(combinarBusca(recurso, "foguete espacial")).toBe(false);
  });

  it("consulta vazia retorna tudo", () => {
    expect(combinarBusca(recurso, "   ")).toBe(true);
  });

  it("ignora palavras de ligação em frases longas", () => {
    // "em" não pode zerar o resultado: diversidade precisa continuar encontrando.
    expect(combinarBusca(recurso, "diversidade em familia")).toBe(true);
    expect(combinarBusca(recurso, "a moça de óculos")).toBe(true);
  });

  it("coloca primeiro o recurso que tem mais termos", () => {
    const familia = { ...recurso, id: "2", tags: ["diversidade", "familia"], title: "Família reunida" };
    expect(pontuarBusca(familia, "diversidade familia")).toBeGreaterThan(
      pontuarBusca(recurso, "diversidade familia")
    );
  });

  it("mantém vírgula como alternativa mesmo com palavras vazias", () => {
    expect(combinarBusca(recurso, "foguete, mulher de óculos")).toBe(true);
  });
});

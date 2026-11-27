import fs from "node:fs/promises";
import path from "node:path";
import { convertFile } from "../src/services/converterService.js";

const EXEMPLOS = "C:/Users/SS1111235/Downloads/Livro-interativo/ET_EF1/Livro EF1 - Pacote/ET_EF1_ME";
const LIMIT = 3;

async function main() {
  const files = await fs.readdir(EXEMPLOS);
  const alvos = files.filter((f) => /\.(pdf|idml)$/i.test(f)).slice(0, LIMIT);
  for (const f of alvos) {
    const full = path.join(EXEMPLOS, f);
    try {
      const meta = await convertFile(full, f);
      console.log("OK", meta.name, meta.sourceFormat, meta.id);
    } catch (e) {
      console.error("FAIL", f, e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
PY
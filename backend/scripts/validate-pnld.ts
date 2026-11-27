/**
 * Validação automatizada do pacote PNLD de um projeto.
 * Uso: npx tsx scripts/validate-pnld.ts <projectId>
 *
 * Complementa as etapas manuais obrigatórias: W3C Validator, Valide Desktop,
 * NVDA e Lighthouse (ver docs/VALIDACAO-MANUAL.md).
 */

import { getProjectDir } from "../src/services/converterService.js";
import { validatePackage } from "../src/services/pnld/validate.js";

const id = process.argv[2];
if (!id) {
  console.error("Uso: npx tsx scripts/validate-pnld.ts <projectId>");
  process.exit(1);
}

async function main() {
  const result = await validatePackage(await getProjectDir(id));
  if (result.ok) {
    console.log(`Pacote PNLD de ${id}: OK (${result.issues.length} problemas).`);
  } else {
    console.error(`Pacote PNLD de ${id}: ${result.issues.length} problema(s):`);
    for (const issue of result.issues) console.error(` - ${issue}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

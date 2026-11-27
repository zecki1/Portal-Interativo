/** Limpa HTML de parágrafo: remove <br/> iniciais/finais e colapsa quebras excessivas. */
export function cleanParagraphHtml(html: string): string {
  return html
    .replace(/^(<br\s*\/?>\s*)+/i, "")
    .replace(/(<br\s*\/?>\s*)+$/i, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br/><br/>");
}

import { pdfToPng } from "pdf-to-png-converter";
const out = await pdfToPng(process.argv[2], { viewportScale: 2.0, pagesToProcess: [1], outputFolder: "C:/Users/SS1111235/AppData/Local/Temp/opencode/p2t", returnPageContent: false });
console.log("pages", out.length, out[0]?.name, out[0]?.content?.length);

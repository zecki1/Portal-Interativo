import { pdfToPng } from "pdf-to-png-converter";
const out = await pdfToPng(process.argv[2], { viewportScale: 1.5, pagesToProcess: [1], outputFolder: "C:/Users/SS1111235/AppData/Local/Temp/opencode/aipng", returnPageContent: false });
console.log("ok", out[0]?.name);

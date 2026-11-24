import { XMLParser } from "fast-xml-parser";
import AdmZip from "adm-zip";
const zip = new AdmZip("C:/Users/SS1111235/Downloads/Livro-interativo/ET_EF1/Livro EF1 - Pacote/ET_EF1_ME/ET_EF1_ME_ID1-17.idml");
const xml = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:"", preserveOrder:true, trimValues:false, parseTagValue:false, parseAttributeValue:false, allowBooleanAttributes:true });
const doc = xml.parse(zip.getEntry("Spreads/Spread_u5a88.xml").getData().toString("utf8"));
const tagOf=(n)=>{for(const k of Object.keys(n||{})) if(k!==":@"&&k!=="#text") return k; return null;};
const kids=(n)=>{const t=tagOf(n); return t&&Array.isArray(n[t])?n[t]:[];};
function find(nodes, tag, out=[], d=0){ if(d>15) return out; for(const n of nodes){ if (tagOf(n)===tag) out.push(n); find(kids(n), tag, out, d+1);} return out;}
const tfs = find(doc, "TextFrame");
console.log("tfs", tfs.length);
const first = tfs[0];
const pg = find([tfs[0]], "PathGeometry");
console.log("pathgeom", pg.length);
console.log(JSON.stringify(pg[0]).slice(0,400));
const pp = find([tfs[0]], "PathPoint");
console.log("points", pp.length, JSON.stringify(pp[0]?.[":@"]));

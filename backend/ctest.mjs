import { createCanvas } from "@napi-rs/canvas";
const c = createCanvas(200,100); const ctx=c.getContext("2d");
ctx.fillStyle="#f00"; ctx.fillRect(0,0,200,100);
const b = await c.encode("png"); console.log("png bytes", b.length);

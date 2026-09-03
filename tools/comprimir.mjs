// Recomprime las imágenes de img/p mayores de un umbral usando el canvas de Chrome headless (sin instalar nada).
// Uso: node comprimir.mjs [umbralKB=100] [maxLado=900] [calidad=0.82]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const P = path.join(ROOT, "img", "p");
const UMBRAL = Number(process.argv[2] || 100) * 1024, MAX = Number(process.argv[3] || 900), Q = Number(process.argv[4] || 0.82);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9347; const BASE = "http://127.0.0.1:8140";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const files = fs.readdirSync(P).filter(f => f.endsWith(".jpg") && fs.statSync(path.join(P, f)).size > UMBRAL);
console.log("a comprimir:", files.length);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(DIR, "_chromeprofile5")}`, "about:blank"], { stdio: "ignore" });
let info = null;
for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Page.navigate", { url: BASE + "/index.html" }); await sleep(1500);
let antes = 0, despues = 0, hechas = 0;
for (const f of files) {
  const src = `${BASE}/img/p/${f}?raw=1`;
  const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `new Promise((res, rej) => { const im = new Image(); im.onload = () => { const k = Math.min(1, ${MAX} / Math.max(im.naturalWidth, im.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', ${Q})); }; im.onerror = () => rej(new Error('no carga')); im.src = ${JSON.stringify(src)}; })` });
  if (r.exceptionDetails) { console.log("ERR", f); continue; }
  const b = Buffer.from(r.result.value.split(",")[1], "base64");
  const s0 = fs.statSync(path.join(P, f)).size;
  if (b.length < s0 * 0.9) { fs.writeFileSync(path.join(P, f), b); antes += s0; despues += b.length; hechas++; }
}
ws.close(); chrome.kill();
console.log(`comprimidas ${hechas}/${files.length}: ${(antes / 1e6).toFixed(1)} MB → ${(despues / 1e6).toFixed(1)} MB`);

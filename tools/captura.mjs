// Captura una URL a un ancho dado: node captura.mjs "http://127.0.0.1:8140/catalogo.html#p=roCA6424" 390 salida.png [scrollY]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const [url, wS, out, scrollS] = process.argv.slice(2);
const w = Number(wS || 390), scroll = Number(scrollS || 0);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9349;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(DIR, "_chromeprofile7")}`, "about:blank"], { stdio: "ignore" });
let info = null;
for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: w, height: w < 700 ? 844 : 900, deviceScaleFactor: w < 700 ? 2 : 1, mobile: w < 700 });
await send("Page.navigate", { url }); await sleep(2500);
await send("Runtime.evaluate", { expression: "document.fonts.ready.then(()=>1)", awaitPromise: true });
if (scroll) { await send("Runtime.evaluate", { expression: `(document.querySelector('.modal-caja')||document.documentElement).scrollTop=${scroll};1` }); await sleep(400); }
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(DIR, out || "_captura.png"), Buffer.from(shot.data, "base64"));
ws.close(); chrome.kill();
console.log("->", out);

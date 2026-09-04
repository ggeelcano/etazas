// Abre el chat de una web en Chrome headless y guarda captura + textos del widget.
// Uso: node espia-chat.mjs "https://euroserigrafia.com/es/" _euro-chat.png
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const [url, out] = process.argv.slice(2);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9352;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(DIR, "_chromeprofile9")}`, "about:blank"], { stdio: "ignore" });
let info = null;
for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, x => x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async expr => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 950, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url }); await sleep(9000);
// texto de todos los iframes y del documento, y scripts de terceros cargados
const datos = await ev(`(() => {
  const scripts = [...document.querySelectorAll('script[src]')].map(s=>s.src).filter(s=>!s.includes(location.host));
  const ifr = [...document.querySelectorAll('iframe')].map(f=>({src:f.src,id:f.id,cls:(f.className||'').toString().slice(0,60),w:f.getBoundingClientRect().width,h:f.getBoundingClientRect().height}));
  const cand = [...document.querySelectorAll('[class*="chat" i],[id*="chat" i],[class*="noctane" i],[id*="noctane" i]')].slice(0,40).map(e=>({tag:e.tagName,id:e.id,cls:(e.className||'').toString().slice(0,80),txt:(e.innerText||'').trim().slice(0,300)}));
  return {scripts, ifr, cand, titulo: document.title};
})()`);
fs.writeFileSync(path.join(DIR, "_espia.json"), JSON.stringify(datos, null, 1));
console.log("scripts externos:", datos.scripts.join("\n  "));
console.log("iframes:", JSON.stringify(datos.ifr));
console.log("candidatos chat:", JSON.stringify(datos.cand, null, 1).slice(0, 3000));
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(DIR, out || "_espia.png"), Buffer.from(shot.data, "base64"));
ws.close(); chrome.kill();
console.log("->", out);

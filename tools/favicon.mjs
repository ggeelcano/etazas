// Recorta la taza del logo (img/logo.png, 293x77) en un cuadrado y genera img/favicon-32.png y img/favicon-180.png con Chrome headless.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9348; const BASE = "http://127.0.0.1:8140";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(DIR, "_chromeprofile6")}`, "about:blank"], { stdio: "ignore" });
let info = null;
for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Page.navigate", { url: BASE + "/index.html" }); await sleep(1500);
for (const size of [32, 180]) {
  const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    // la taza ocupa aprox. los primeros 77 px de ancho del logo (293x77)
    const c = document.createElement('canvas'); c.width = ${size}; c.height = ${size}; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, ${size}, ${size}); x.imageSmoothingQuality = 'high';
    const src = 71, pad = ${size} * 0.05; x.drawImage(im, 0, 0, src, im.naturalHeight, pad, pad, ${size} - 2 * pad, ${size} - 2 * pad);
    res(c.toDataURL('image/png')); }; im.onerror = () => rej(new Error('no carga')); im.src = '${BASE}/img/logo.png?f=1'; })` });
  const b = Buffer.from(r.result.value.split(",")[1], "base64");
  fs.writeFileSync(path.join(ROOT, "img", `favicon-${size}.png`), b);
  console.log(`img/favicon-${size}.png`, b.length, "bytes");
}
ws.close(); chrome.kill();

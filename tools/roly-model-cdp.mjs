// Ficha de modelo roly.eu (SPA) por CDP: texto de la página + imágenes de modelo. Uso: node roly-model-cdp.mjs CA6424 SU1087 ...
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT = path.join(DIR, "..", "data", "roly-models.json");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9342;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function conectar() {
  const perfil = path.join(DIR, "_chromeprofile2");
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--mute-audio", "--no-first-run", "--disable-extensions",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`, "--window-size=1400,1000", "about:blank"], { stdio: "ignore" });
  let info = null;
  for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
  if (!info) throw new Error("Chrome no arrancó");
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(method + ": " + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, cerrar: () => { try { ws.close(); } catch {} chrome.kill(); } };
}
const codes = process.argv.slice(2);
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const cdp = await conectar();
await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
for (const code of codes) {
  if (prev[code] && !prev[code].error) { console.log(code, "ya"); continue; }
  try {
    await cdp.send("Page.navigate", { url: `https://roly.eu/es/model_${code}` });
    await sleep(8000);
    for (let i = 0; i < 4; i++) { await cdp.send("Runtime.evaluate", { expression: "window.scrollBy(0, 900)" }); await sleep(500); }
    const r = await cdp.send("Runtime.evaluate", { returnByValue: true, expression: `
      (() => {
        const txt = document.body.innerText.replace(/\\n{2,}/g, '\\n').slice(0, 6000);
        const imgs = [...new Set([...document.images].map(i => i.currentSrc || i.src).filter(s => /images\\/models\\//.test(s)))];
        const h1 = document.querySelector('h1') ? document.querySelector('h1').innerText : '';
        const swatches = [...document.querySelectorAll('[class*="color"], [class*="swatch"]')].map(e => (e.getAttribute('title') || e.getAttribute('aria-label') || e.getAttribute('data-name') || '')).filter(Boolean);
        return { title: document.title, h1, txt, imgs: imgs.slice(0, 40), swatches: [...new Set(swatches)].slice(0, 40) };
      })()` });
    prev[code] = r.result.value;
    console.log(code, "h1:", r.result.value.h1, "imgs:", r.result.value.imgs.length, "txt:", r.result.value.txt.length);
  } catch (e) { prev[code] = { error: e.message }; console.log(code, "ERR", e.message); }
  fs.writeFileSync(OUT, JSON.stringify(prev, null, 1));
}
cdp.cerrar();
console.log("OK ->", OUT);

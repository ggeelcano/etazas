// Renderiza páginas de roly.eu (SPA Nuxt) en Chrome headless por CDP, captura las respuestas de la API
// de productos y extrae las tarjetas del DOM. Uso: node roly-cdp.mjs cam_po sud gor ...
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUTDIR = path.join(DIR, "..", "data");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9341;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function conectar() {
  const perfil = path.join(DIR, "_chromeprofile");
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--mute-audio", "--no-first-run", "--disable-extensions",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`, "--window-size=1400,900", "about:blank"], { stdio: "ignore" });
  let info = null;
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {}
  }
  if (!info) throw new Error("Chrome no arrancó");
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const listeners = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method) listeners.forEach(f => f(m)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(method + ": " + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, on: f => listeners.push(f), cerrar: () => { try { ws.close(); } catch {} chrome.kill(); } };
}

const cats = process.argv.slice(2);
const cdp = await conectar();
await cdp.send("Network.enable");
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
const apiResp = [];
cdp.on(m => {
  if (m.method === "Network.responseReceived") {
    const u = m.params.response.url;
    if (/gorfactory|roly\.eu\/api|api\./.test(u) && /json/.test(m.params.response.mimeType || "")) apiResp.push({ requestId: m.params.requestId, url: u });
  }
});
fs.mkdirSync(OUTDIR, { recursive: true });
const result = {};
for (const cat of cats) {
  apiResp.length = 0;
  await cdp.send("Page.navigate", { url: `https://roly.eu/es/category/${cat}` });
  await sleep(9000);
  // scroll para forzar lazy load
  for (let i = 0; i < 6; i++) { await cdp.send("Runtime.evaluate", { expression: "window.scrollBy(0, 1200)" }); await sleep(700); }
  await sleep(1500);
  const dom = await cdp.send("Runtime.evaluate", { returnByValue: true, expression: `
    (() => {
      const cards = [...document.querySelectorAll('a[href*="/model_"]')];
      const seen = new Set(); const out = [];
      for (const a of cards) {
        const href = a.getAttribute('href'); if (seen.has(href)) continue; seen.add(href);
        const root = a.closest('article, li, .card, .product, div') || a;
        const img = root.querySelector('img');
        out.push({ href, text: (a.innerText || '').trim().replace(/\\s+/g,' ').slice(0,120), img: img ? (img.currentSrc || img.src || img.getAttribute('data-src')) : null, alt: img ? img.alt : null, rootText: (root.innerText||'').trim().replace(/\\s+/g,' ').slice(0,200) });
      }
      return { title: document.title, n: cards.length, out, imgs: [...document.images].map(i => i.currentSrc || i.src).filter(s => /models/.test(s)).slice(0, 200) };
    })()` });
  const apis = [];
  for (const r of apiResp) {
    try { const b = await cdp.send("Network.getResponseBody", { requestId: r.requestId }); apis.push({ url: r.url, body: b.body.slice(0, 400000) }); } catch (e) { apis.push({ url: r.url, err: e.message }); }
  }
  result[cat] = { dom: dom.result.value, apis };
  console.log(cat, "title:", dom.result.value.title, "links:", dom.result.value.n, "cards:", dom.result.value.out.length, "imgs:", dom.result.value.imgs.length, "apis:", apis.map(a => a.url.slice(0, 120)));
}
fs.writeFileSync(path.join(OUTDIR, "roly-cdp-raw.json"), JSON.stringify(result, null, 1));
cdp.cerrar();
console.log("OK ->", path.join(OUTDIR, "roly-cdp-raw.json"));

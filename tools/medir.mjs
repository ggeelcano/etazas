// Mide la demo en móvil de verdad por CDP: desbordes, elementos fuera de pantalla, sticky, errores JS, y capturas.
// Uso: node medir.mjs [urlBase=http://127.0.0.1:8140]  → informe en tools/_medidas.json y capturas tools/_cap-*.png
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const BASE = process.argv[2] || "http://127.0.0.1:8140";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9345;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function conectar() {
  const perfil = path.join(DIR, "_chromeprofile3");
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--mute-audio", "--no-first-run", "--disable-extensions", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
  let info = null;
  for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
  if (!info) throw new Error("Chrome no arrancó");
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const errores = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errores.push(m.params.entry.text + " " + (m.params.entry.url || "")); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(method + ": " + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, errores, cerrar: () => { try { ws.close(); } catch {} chrome.kill(); } };
}
const ev = async (cdp, expr) => { const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error("JS: " + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
const SONDA = `(() => {
  const de = document.documentElement, cw = de.clientWidth;
  const fuera = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.cajon, .modal, .filtros, .aviso, .skip, [hidden], .navcat ul, .minis, .chips')) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect(); if (r.width === 0) continue;
    if (r.right > cw + 1 || r.left < -1) fuera.push({ tag: el.tagName.toLowerCase(), cls: (el.className && el.className.baseVal === undefined ? el.className : '').toString().slice(0, 40), id: el.id, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
    if (fuera.length > 12) break;
  }
  const cab = document.querySelector('.cab'); const cr = cab ? cab.getBoundingClientRect() : null;
  return { cw, sw: de.scrollWidth, bodySw: document.body.scrollWidth, fuera, cabTop: cr ? Math.round(cr.top) : null, cabH: cr ? Math.round(cr.height) : null, title: document.title, imgsRotas: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src).length, imgsTotal: document.images.length, fuentes: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v, i, a) => a.indexOf(v) === i) };
})()`;
const cdp = await conectar();
await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Log.enable");
const informe = [];
const casos = [
  { url: "/", nombre: "portada" }, { url: "/catalogo.html", nombre: "catalogo" }, { url: "/catalogo.html?cat=tazas", nombre: "cat-tazas" }, { url: "/catalogo.html?q=bolsa%20algodon", nombre: "busqueda" },
];
for (const w of [320, 360, 390, 430, 768, 1280]) {
  const h = w < 700 ? 844 : 900;
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: w < 700 ? 2 : 1, mobile: w < 700 });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: w < 700 });
  for (const c of casos) {
    cdp.errores.length = 0;
    await cdp.send("Page.navigate", { url: BASE + c.url }); await sleep(2200);
    await ev(cdp, "document.fonts.ready.then(()=>1)");
    const arriba = await ev(cdp, SONDA);
    if (c.nombre === "portada" || c.nombre === "catalogo") { const s0 = await cdp.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(DIR, `_cap-${c.nombre}-${w}-top.png`), Buffer.from(s0.data, "base64")); }
    // scroll real y sticky
    await ev(cdp, "document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0, 900); 1"); await sleep(400);
    const abajo = await ev(cdp, SONDA);
    let ficha = null, cajon = null;
    if (c.nombre !== "portada") {
      // abrir primera ficha y medir
      const hayFicha = await ev(cdp, "(()=>{const a=document.querySelector('[data-ficha]'); if(!a) return false; a.click(); return true;})()");
      if (hayFicha) { await sleep(700); ficha = await ev(cdp, `(() => { const m = document.querySelector('.modal-caja'); if (!m) return null; const r = m.getBoundingClientRect(); const fuera=[...m.querySelectorAll('*')].filter(el=>{if(el.closest('.minis')) return false; const b=el.getBoundingClientRect();return b.width>0 && b.right>r.right+1;}).slice(0,6).map(el=>el.tagName+'.'+(el.className||'').toString().slice(0,30)); return { w: Math.round(r.width), h: Math.round(r.height), sw: m.scrollWidth, cw: m.clientWidth, fuera, calc: !!m.querySelector('#calc'), tiers: m.querySelectorAll('.tiers button').length }; })()`);
        await ev(cdp, "(()=>{const b=document.querySelector('[data-add-ficha]'); if(b) b.click(); return 1})()"); await sleep(300);
        await ev(cdp, "(()=>{document.querySelector('[data-cerrar]').click(); document.querySelector('[data-abrir-cajon]').click(); return 1})()"); await sleep(500);
        cajon = await ev(cdp, `(() => { const c = document.querySelector('.cajon'); const r = c.getBoundingClientRect(); return { w: Math.round(r.width), cw: c.clientWidth, sw: c.scrollWidth, lineas: c.querySelectorAll('.linea').length, total: (document.querySelector('#cajon-total')||{}).textContent, wa: (document.querySelector('#cajon-wa')||{}).href }; })()`);
        await ev(cdp, "(()=>{document.querySelector('[data-cerrar-cajon]').click(); return 1})()"); await sleep(300);
      }
    }
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const archivo = path.join(DIR, `_cap-${c.nombre}-${w}.png`); fs.writeFileSync(archivo, Buffer.from(shot.data, "base64"));
    informe.push({ w, caso: c.nombre, arriba, abajo: { sw: abajo.sw, fuera: abajo.fuera, cabTop: abajo.cabTop }, ficha, cajon, errores: cdp.errores.slice(0, 5), captura: path.basename(archivo) });
    const ok = arriba.sw <= arriba.cw && abajo.sw <= arriba.cw && !arriba.fuera.length && !abajo.fuera.length && !cdp.errores.length && (abajo.cabTop === 0 || abajo.cabTop === null);
    console.log(`${String(w).padStart(4)} ${c.nombre.padEnd(10)} ${ok ? "OK " : "MAL"} cw=${arriba.cw} sw=${arriba.sw}/${abajo.sw} fuera=${arriba.fuera.length}/${abajo.fuera.length} sticky=${abajo.cabTop} imgsRotas=${arriba.imgsRotas}/${arriba.imgsTotal} fuentes=${arriba.fuentes.join("|")} errores=${cdp.errores.length}${ficha ? ` ficha=${ficha.w}x${ficha.h} sw=${ficha.sw}/${ficha.cw} fuera=${ficha.fuera.length} tiers=${ficha.tiers}` : ""}${cajon ? ` cajon=${cajon.w} lineas=${cajon.lineas} total=${cajon.total}` : ""}`);
    if (arriba.fuera.length || abajo.fuera.length) console.log("   fuera:", JSON.stringify((arriba.fuera.length ? arriba.fuera : abajo.fuera).slice(0, 4)));
    if (cdp.errores.length) console.log("   errores:", cdp.errores.slice(0, 3));
    if (ficha && ficha.fuera.length) console.log("   ficha fuera:", ficha.fuera);
  }
}
fs.writeFileSync(path.join(DIR, "_medidas.json"), JSON.stringify(informe, null, 1));
cdp.cerrar();
console.log("informe -> tools/_medidas.json");

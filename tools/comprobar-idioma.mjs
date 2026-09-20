// Comprueba la demo en los dos idiomas por CDP (Chrome headless): <html lang>, selector ES|CA visible, título, errores JS,
// desbordes horizontales y, en catalán, que no quede castellano a la vista (portada, catálogo, ficha, cajón y chat). Capturas en tools/_ca-*.png.
// Uso: node tools/comprobar-idioma.mjs [urlBase=http://127.0.0.1:8140]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const BASE = process.argv[2] || "http://127.0.0.1:8140";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9351;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function conectar() {
  const perfil = path.join(DIR, "_chromeprofile12");
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--mute-audio", "--no-first-run", "--disable-extensions", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
  let info = null;
  for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch { } }
  if (!info) throw new Error("Chrome no arrancó");
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const errores = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errores.push(m.params.entry.text + " " + (m.params.entry.url || "")); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(method + ": " + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, errores, cerrar: () => { try { ws.close(); } catch { } chrome.kill(); } };
}
const ev = async (cdp, expr) => { const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error("JS: " + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
const foto = async (cdp, nombre) => { const s = await cdp.send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(DIR, nombre), Buffer.from(s.data, "base64")); };

// Palabras que en catalán no existen: si aparecen en texto visible, se ha colado castellano.
const CASTELLANO = /\b(presupuesto|añadir|añade|catálogo|tazas?|bolsas?|camisetas?|desde|cantidad|buscar|ver el|ver todo|precio|pedir|enviar por|sin marcar|más pedid|cómo funciona|técnicas|nuestro|unidades|uds|elige|escríbenos|cerrar|marcaje|colores del|referencias|productos|resultados|filtros|ordenar|nombre|todo el|con tu logo|taller de serigrafía|sudadera|bidón|bolígrafo|libreta|mochila|paraguas|delantal|posavasos|dudas|atención al cliente|mensaje|escribe)\b/i;
const SONDA = `(() => {
  const de = document.documentElement;
  const vis = el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const textoDe = root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (!t) continue; const el = n.parentElement; if (!el || el.closest('script,style,[hidden],[aria-hidden="true"]')) continue; if (el.closest('.cajon[aria-hidden="true"], .modal:not([open]), .chat-panel:not([data-on])')) continue; if (!vis(el)) continue; out.push(t); } return out; };
  const sel = document.querySelector('.idioma'); const sr = sel ? sel.getBoundingClientRect() : null;
  const cab = document.querySelector('.cab'); const cr = cab ? cab.getBoundingClientRect() : null;
  return { lang: de.lang, dataLang: de.getAttribute('data-lang'), title: document.title, cw: de.clientWidth, sw: de.scrollWidth, bodySw: document.body.scrollWidth,
    selector: sr ? { x: Math.round(sr.left), right: Math.round(sr.right), y: Math.round(sr.top), w: Math.round(sr.width), h: Math.round(sr.height), texto: sel.textContent.trim(), actual: (sel.querySelector('[aria-current]')||{}).textContent, hrefs: [...sel.querySelectorAll('a')].map(a => a.getAttribute('href')) } : null,
    cabH: cr ? Math.round(cr.height) : null, textos: textoDe(document.body), placeholders: [...document.querySelectorAll('[placeholder]')].map(i => i.placeholder), arias: [...document.querySelectorAll('[aria-label]')].map(i => i.getAttribute('aria-label')),
    navCats: [...document.querySelectorAll('#navcat a')].slice(0, 4).map(a => a.textContent), metaDesc: (document.querySelector('meta[name=description]')||{}).content };
})()`;
const cdp = await conectar();
await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Log.enable");
const informe = []; let fallos = 0;
const casos = [{ url: "/", nombre: "portada" }, { url: "/catalogo.html", nombre: "catalogo" }, { url: "/catalogo.html?cat=tazas&q=bossa", nombre: "cat-busq" }, { url: "/legal.html", nombre: "legal" }];
for (const lang of ["ca", "es"]) {
  for (const w of [320, 390, 1280]) {
    const h = w < 700 ? 844 : 900;
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: w < 700 ? 2 : 1, mobile: w < 700 });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: w < 700 });
    for (const c of casos) {
      cdp.errores.length = 0;
      const sep = c.url.includes("?") ? "&" : "?";
      await cdp.send("Page.navigate", { url: BASE + c.url + sep + "lang=" + lang }); await sleep(2000);
      await ev(cdp, "document.fonts.ready.then(()=>1)");
      const s = await ev(cdp, SONDA);
      const colados = lang === "ca" ? [...s.textos, ...s.placeholders, ...s.arias, s.title, s.metaDesc || ""].filter(t => CASTELLANO.test(t)).slice(0, 8) : [];
      let ficha = null, cajon = null, chat = null, wa = null;
      if (c.nombre === "catalogo" && (w === 390 || w === 1280)) {
        await ev(cdp, "(()=>{const a=document.querySelector('[data-ficha]'); a && a.click(); return 1})()"); await sleep(600);
        ficha = await ev(cdp, `(() => { const m = document.querySelector('.modal[open] .modal-caja'); if (!m) return null; const t = m.innerText; return { titulo: (m.querySelector('#ficha-titulo')||{}).textContent, specs: [...m.querySelectorAll('.specs dt')].map(d => d.textContent), marcajes: [...m.querySelectorAll('.tramos thead th')].map(d => d.textContent), btn: (m.querySelector('[data-add-ficha]')||{}).textContent, wa: (m.querySelector('#calc-wa')||{}).href, nota: (m.querySelector('.nota')||{}).textContent, colados: ${lang === "ca"} ? t.split('\\n').filter(l => ${CASTELLANO.toString()}.test(l)).slice(0, 5) : [] }; })()`);
        if (lang === "ca") await foto(cdp, `_ca-ficha-${w}.png`);
        await ev(cdp, "(()=>{const b=document.querySelector('[data-add-ficha]'); b && b.click(); return 1})()"); await sleep(300);
        await ev(cdp, "(()=>{document.querySelector('[data-cerrar]').click(); document.querySelector('[data-abrir-cajon]').click(); return 1})()"); await sleep(500);
        cajon = await ev(cdp, `(() => { const c = document.querySelector('.cajon'); const t = c.innerText; const a = c.querySelector('#cajon-wa'); return { lineas: c.querySelectorAll('.linea').length, texto: t.replace(/\\s+/g, ' ').slice(0, 200), wa: a && a.href ? decodeURIComponent(a.href.split('text=')[1] || '') : null, colados: ${lang === "ca"} ? t.split('\\n').filter(l => ${CASTELLANO.toString()}.test(l)).slice(0, 5) : [] }; })()`);
        if (lang === "ca") await foto(cdp, `_ca-cajon-${w}.png`);
        await ev(cdp, "(()=>{document.querySelector('[data-cerrar-cajon]').click(); return 1})()"); await sleep(300);
        await ev(cdp, "(()=>{document.querySelector('#chat-fab').click(); return 1})()"); await sleep(500);
        chat = await ev(cdp, `(() => { const p = document.querySelector('.chat-panel'); const t = p.innerText; return { titulo: (p.querySelector('.titulo')||{}).textContent, saludo: (p.querySelector('.msg.bot')||{}).textContent, chips: [...p.querySelectorAll('.chat-chips button')].map(b => b.textContent), ph: (p.querySelector('#chat-in')||{}).placeholder, colados: ${lang === "ca"} ? t.split('\\n').filter(l => ${CASTELLANO.toString()}.test(l)).slice(0, 5) : [] }; })()`);
        if (lang === "ca") await foto(cdp, `_ca-chat-${w}.png`);
        await ev(cdp, "(()=>{document.querySelector('.chat-panel .cerrar').click(); return 1})()"); await sleep(200);
        // limpiar el presupuesto para la siguiente vuelta
        await ev(cdp, "localStorage.removeItem('etazas_presu_v1'); 1");
      }
      if (c.nombre === "portada" && lang === "ca" && (w === 390 || w === 1280)) { await foto(cdp, `_ca-portada-${w}.png`); await ev(cdp, "document.documentElement.style.scrollBehavior='auto'; document.querySelector('#presupuesto').scrollIntoView(); 1"); await sleep(400); await foto(cdp, `_ca-presu-${w}.png`); }
      if (c.nombre === "legal" && lang === "ca" && w === 390) await foto(cdp, `_ca-legal-390.png`);
      const selOk = s.selector && s.selector.right <= s.cw && s.selector.x >= 0 && s.selector.y < 140 && s.selector.actual === lang.toUpperCase();
      const ok = s.lang === lang && selOk && s.sw <= s.cw && !cdp.errores.length && !colados.length && !(ficha && ficha.colados.length) && !(cajon && cajon.colados.length) && !(chat && chat.colados.length);
      if (!ok) fallos++;
      console.log(`${lang} ${String(w).padStart(4)} ${c.nombre.padEnd(9)} ${ok ? "OK " : "MAL"} lang=${s.lang} sel=${s.selector ? `${s.selector.texto}@${s.selector.x}-${s.selector.right}/${s.cw} y${s.selector.y} actual=${s.selector.actual}` : "NO"} sw=${s.sw}/${s.cw} err=${cdp.errores.length} title="${s.title}" nav=${s.navCats.slice(0, 2).join("|")}`);
      if (colados.length) console.log("   castellano colado:", JSON.stringify(colados));
      if (cdp.errores.length) console.log("   errores:", cdp.errores.slice(0, 3));
      if (ficha) console.log(`   ficha: ${ficha.titulo} · specs=${ficha.specs.join(",")} · th=${ficha.marcajes.join(",")} · btn=${(ficha.btn || "").trim()}${ficha.colados.length ? " · COLADO: " + JSON.stringify(ficha.colados) : ""}`);
      if (ficha && lang === "ca") console.log(`   ficha wa: ${decodeURIComponent((ficha.wa || "").split("text=")[1] || "").slice(0, 160)}`);
      if (cajon) console.log(`   cajón: ${cajon.lineas} líneas · ${cajon.texto.slice(0, 120)}${cajon.colados.length ? " · COLADO: " + JSON.stringify(cajon.colados) : ""}`);
      if (cajon && cajon.wa && lang === "ca") console.log(`   cajón wa: ${cajon.wa.replace(/\n/g, " / ").slice(0, 220)}`);
      if (chat) console.log(`   chat: ${chat.titulo} · ph="${chat.ph}" · chips=${chat.chips.join("|")} · saludo=${(chat.saludo || "").slice(0, 90)}${chat.colados.length ? " · COLADO: " + JSON.stringify(chat.colados) : ""}`);
      informe.push({ lang, w, caso: c.nombre, ok, sonda: { ...s, textos: undefined, arias: undefined, placeholders: undefined }, colados, ficha, cajon, chat, errores: cdp.errores.slice(0, 5) });
    }
  }
}
fs.writeFileSync(path.join(DIR, "_idioma.json"), JSON.stringify(informe, null, 1));
cdp.cerrar();
console.log(`\n${fallos ? fallos + " casos MAL" : "todo OK"} · informe en tools/_idioma.json`);
process.exitCode = fallos ? 1 : 0;

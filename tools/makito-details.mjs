// Ficha de producto makito.eu: material, composición, capacidad, medidas, técnicas, colores, galería.
// Uso: node makito-details.mjs [porCategoria=14]  → data/makito-details.json
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const RAW = JSON.parse(fs.readFileSync(path.join(DIR, "..", "data", "makito-raw.json"), "utf8"));
const OUT = path.join(DIR, "..", "data", "makito-details.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const N = Number(process.argv[2] || 14);
const CONC = 6;

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const byCat = {};
for (const p of RAW) (byCat[p.cat] ||= []).push(p);
const todo = Object.values(byCat).flatMap(l => l.slice(0, N)).filter(p => !prev[p.url]);
console.log("fichas a bajar:", todo.length, "ya hechas:", Object.keys(prev).length);

function unesc(s) { return s.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\\//g, "/").replace(/\\n/g, "\n").replace(/\\"/g, '"'); }
function parse(html) {
  const out = {};
  // atributos: bloque JSON "additional-attributes-wrapper","value":" ... "
  const i = html.indexOf('additional-attributes-wrapper","value":"');
  if (i > 0) {
    const raw = html.slice(i + 40, i + 12000);
    const end = raw.indexOf('"}');
    const txt = unesc(raw.slice(0, end > 0 ? end : 6000)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // pares "Etiqueta valor" separados: lo devolvemos crudo y también parseado por etiquetas conocidas
    out.attrsRaw = txt.slice(0, 1500);
    const keys = ["Material", "Referencia ERP", "Composición", "Capacidad ml", "Capacidad", "Técnicas de impresión", "Alto", "Ancho", "Largo", "Diámetro", "Medidas", "Peso", "Printcodes", "Características", "Talla", "Tallas", "Gramaje"];
    for (const k of keys) {
      const m = txt.match(new RegExp(k + "\\s+(.+?)(?=\\s+(?:" + keys.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + "|Observaciones|URL 360|Más información)\\b|$)"));
      if (m && !out[k]) out[k] = m[1].trim().slice(0, 200);
    }
  }
  // descripción corta (meta og:description o bloque description)
  const og = html.match(/<meta property="og:description" content="([^"]*)"/);
  if (og) out.desc = og[1].trim();
  const d = html.match(/class="product attribute overview"[\s\S]*?<div class="value"[^>]*>([\s\S]*?)<\/div>/);
  if (d) out.desc2 = d[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  // galería
  const g = html.indexOf('"mage/gallery/gallery"');
  if (g > 0) {
    const seg = html.slice(g, g + 20000);
    const imgs = [...new Set([...seg.matchAll(/"img":"([^"]+)"/g)].map(m => unesc(m[1])))].filter(u => /\.(jpg|png)$/i.test(u));
    out.imgs = imgs.slice(0, 8);
  }
  // colores
  const c = html.match(/colores:\s*(\d+)/i);
  if (c) out.nColores = Number(c[1]);
  const sw = [...new Set([...html.matchAll(/class="swatch-option[^"]*"[^>]*data-option-label="([^"]+)"/g)].map(m => m[1]))];
  if (sw.length) out.colores = sw.slice(0, 20);
  return out;
}
async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "es-ES,es;q=0.9" }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
}
let done = 0, fails = 0;
async function worker(q) {
  while (q.length) {
    const p = q.shift();
    try {
      const html = await get(p.url);
      prev[p.url] = { ...parse(html), ref: p.ref, name: p.name, cat: p.cat };
      done++;
    } catch (e) { fails++; prev[p.url] = { error: e.message, ref: p.ref, name: p.name, cat: p.cat }; }
    if ((done + fails) % 10 === 0) { console.log(`${done + fails}/${todo.length} (fallos ${fails})`); fs.writeFileSync(OUT, JSON.stringify(prev, null, 1)); }
  }
}
const q = [...todo];
await Promise.all(Array.from({ length: CONC }, () => worker(q)));
fs.writeFileSync(OUT, JSON.stringify(prev, null, 1));
console.log("OK fichas:", Object.keys(prev).length, "fallos:", fails, "->", OUT);

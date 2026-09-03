// Scraper del catálogo público de makito.eu (Magento): categorías → productos (nombre, ref, imagen, url)
// Uso: node makito-scrape.mjs  → escribe data/makito-raw.json
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT = path.join(DIR, "..", "data", "makito-raw.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const BASE = "https://www.makito.eu/es/productos/";

// categoría Etazas → páginas de makito.eu (ruta relativa a /es/productos/) y nº de páginas a leer
const CATS = {
  tazas: ["drinkware/tazas/tazas-1.html", "drinkware/tazas/tazas-termicas.html"],
  bidones: ["drinkware/bidones/bidones-1.html", "drinkware/bidones/bidones-termicos.html"],
  termos: ["drinkware/termos/termos-1.html", "drinkware/vasos/vasos-termicos.html"],
  bolsas: ["bolsas/segun-material-de-la-bolsa/bolsas-de-algodon.html", "bolsas/segun-material-de-la-bolsa/bolsas-de-algodon-organico.html", "bolsas/segun-material-de-la-bolsa/brosas-non-woven.html", "bolsas/segun-formato-de-la-bolsa/bolsas-plegables.html"],
  mochilas: ["mochilas-2/mochilas-de-cuerdas/algodon.html", "mochilas-2/mas-mochilas.html"],
  boligrafos: ["escritura/boligrafos/boligrafos-1.html", "escritura/boligrafos/boligrafos-rollers.html", "escritura/lapices/lapices-1.html"],
  libretas: ["blocs-libretas-y-notas-adeshivas/libretas/libretas-1.html", "blocs-libretas-y-notas-adeshivas/sets-de-blocs-y-libretas/sets-de-blocs-y-libretas-1.html"],
  paraguas: ["lluvia-y-frio/lluvia/paraguas.html"],
  delantales: ["decoracion-y-hogar/accesorios-para-cocinca/delantales-y-manoplas.html"],
  gorras: ["gorras-y-sombreros/gorras/gorras-adulto.html", "gorras-y-sombreros/gorras/gorras-invantil.html"],
  neceseres: ["cuidado-personal-y-pharma/cuidad-personal-y-pharma/neceseres.html", "escritura/accesorios-de-escritura/estuches.html"],
  lanyards: ["eventos-y-fiesta/fiesta/lanyard-e-identificadores.html"],
  posavasos: ["decoracion-y-hogar/decoracion-del-hogar/posavasos.html"],
};
const PAGES = 2;

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "es-ES,es;q=0.9" }, signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
}
function parse(html) {
  return html.split(/<li class="item product product-item">/).slice(1).map(it => ({
    url: (it.match(/class="product-item-link"\s+href="([^"]+)"/) || [])[1],
    name: ((it.match(/class="product-item-link"[^>]*>\s*([^<]+?)\s*<\/a>/) || [])[1] || "").trim(),
    img: (it.match(/(https:\/\/www\.makito\.eu\/media\/catalog\/product[^"]+\.(?:jpg|png))/) || [])[1],
    ref: (it.match(/\/(\d{3,6})-[A-Za-z]\.(?:jpg|png)/) || [])[1],
  })).filter(p => p.url && p.img);
}
const all = [];
for (const [cat, paths] of Object.entries(CATS)) {
  for (const p of paths) {
    for (let page = 1; page <= PAGES; page++) {
      const url = BASE + p + (page > 1 ? `?p=${page}` : "");
      try {
        const html = await get(url);
        const total = (html.match(/toolbar-number">(\d+)</) || [])[1];
        const items = parse(html).map(x => ({ ...x, cat, src: p }));
        console.log(`${cat} ${p} p${page}: ${items.length} items (total ${total || "?"})`);
        all.push(...items);
        if (!html.includes(`?p=${page + 1}`)) break;
      } catch (e) {
        console.log(`ERR ${url}: ${e.message}`);
      }
    }
  }
}
// dedupe por url
const seen = new Set();
const out = all.filter(p => !seen.has(p.url) && seen.add(p.url));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log("TOTAL", out.length, "->", OUT);

// Une candidatos + curado/*.json + roly-models.json → data/catalogo.json (fuente) y data/catalogo.js (para la web)
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const D = path.join(ROOT, "data");
const cands = JSON.parse(fs.readFileSync(path.join(D, "candidatos.json"), "utf8"));
const rolyModels = fs.existsSync(path.join(D, "roly-models.json")) ? JSON.parse(fs.readFileSync(path.join(D, "roly-models.json"), "utf8")) : {};
const curDir = path.join(D, "curado");
const curados = fs.readdirSync(curDir).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(curDir, f), "utf8")));

const CATS = [
  ["tazas", "Tazas y vasos"], ["bolsas", "Bolsas de tela"], ["camisetas", "Camisetas"], ["bidones", "Bidones y botellas"],
  ["boligrafos", "Bolígrafos y lápices"], ["libretas", "Libretas y agendas"], ["sudaderas", "Sudaderas"], ["polos", "Polos"],
  ["abrigos", "Chaquetas y chalecos"], ["gorras", "Gorras"], ["termos", "Termos y vasos térmicos"], ["mochilas", "Mochilas y bolsas de deporte"], ["paraguas", "Paraguas"],
  ["delantales", "Delantales"], ["neceseres", "Neceseres y estuches"], ["lanyards", "Lanyards"], ["posavasos", "Posavasos"],
];
// reclasificación por nombre: prendas que no son camisetas/sudaderas y sets que no son libretas
const NO_PRENDA = /pantal|falda|malla|leggin|\btop\b|body|bodies|bañador|banador|short|bermuda|calcet|ropa interior|boxer|slip/i;
const ABRIGO = /parka|chaleco|softshell|polar|chaqueta|cortavientos|chubasquero|anorak|abrigo|plum[ií]fero/i;
const SET_NO_LIBRETA = /^set\b.*(termo|botella|paraguas|powerbank|bid[oó]n|taza)/i;
const GADGET = /calentador|altavoz|cargador|powerbank|inal[aá]mbric/i;
const TEC_MAP = { "SERIGRAFÍA": "Serigrafía", "TAMPOGRAFÍA": "Tampografía", "BORDADO": "Bordado", "TRANSFER SERIGRÁFICO": "Transfer", "TRANSFER DIGITAL": "Transfer digital", "SUBLIMACIÓN": "Sublimación", "LASER": "Láser", "GRABACIÓN": "Láser", "IMPRESIÓN DIGITAL": "Impresión digital", "UV": "Impresión UV", "DTF": "DTF", "DOMING": "Doming", "OFFSET": "Offset", "GOFRADO": "Gofrado", "TERMOGRABADO": "Termograbado", "IMPRESIÓN DIGITAL UV": "Impresión UV" };
function tecnicas(s) {
  if (!s) return [];
  const out = new Set();
  for (const t of s.split(/,\s*/)) {
    const k = t.trim().toUpperCase().replace(/\s+[A-Z]?\d+$/, "").replace(/\s+\(.*\)$/, "");
    for (const [key, val] of Object.entries(TEC_MAP)) if (k.startsWith(key)) { out.add(val); break; }
  }
  return [...out];
}
const COLORES = { BLANCO: "#ffffff", NEGRO: "#1a1a1a", MARINO: "#1e2a4a", ROJO: "#c8102e", ROYAL: "#2457c5", "GRIS VIGORE": "#9a9a9a", "VERDE BOTELLA": "#1f4d3a", AMARILLO: "#f2c400", NARANJA: "#f26522", ROSA: "#e97fb3", "ROSA CLARO": "#f4b6cc", CELESTE: "#8fc7ea", TURQUESA: "#2ab5b1", GRANATE: "#6b1a2b", PURPURA: "#6a2c91", CHOCOLATE: "#4a2c1a", "VERDE MILITAR": "#4b5a2f", "VERDE IRISH": "#2e8b57", "VERDE GRASS": "#57a639", "PLOMO OSCURO": "#4a4a4a", PLOMO: "#6f6f6f", "AZUL DENIM": "#3b5a86", "AZUL OCEANO": "#1b6ca8", ROSETON: "#d64f8a", NOGAL: "#7b5a3a", ARENA: "#d9c7a8", BEIGE: "#d9c7a8", CRUDO: "#efe6d2", NATURAL: "#e8dcc3", ORO: "#c9a227", VERDE: "#2e8b57", AZUL: "#2457c5", GRIS: "#9a9a9a", MORADO: "#6a2c91", "VERDE LIMA": "#9ccc3c", "AMARILLO FLUOR": "#e8ff00", "NARANJA FLUOR": "#ff6a00", LILA: "#b48ad0", CORAL: "#ff6f61", BURDEOS: "#6b1a2b", "VERDE BOSQUE": "#1f4d3a", "AZUL CIELO": "#8fc7ea", "GRIS PERLA": "#c9c9c9", KAKI: "#8a7d4a", MOSTAZA: "#d9a400", MENTA: "#98d8c1", "VERDE MENTA": "#98d8c1", "AZUL ELECTRICO": "#1f3fbf", "ROSA FLUOR": "#ff3fa4", "VERDE FLUOR": "#7CFC00", "GRIS PIEDRA": "#8a8580", "AZUL LAGO": "#3a86c8", "VERDE HELECHO": "#5f8f3e", "VERDE OASIS": "#3fa37c", "AZUL AGUA": "#63c5da", "ROJO VINO": "#7a1f2b", "MELOCOTON": "#f8b195", "SALMON": "#ff8c69", "TURQUESA CLARO": "#6fd7d1", "MARMOL": "#d8d4cf", "GRIS OSCURO": "#4a4a4a", "AMARILLO GIRASOL": "#ffcc00", "AZUL MARINO": "#1e2a4a" };
const hex = n => COLORES[n] || COLORES[n.replace(/É/g, "E").replace(/Ó/g, "O")] || null;

const byId = {};
for (const list of Object.values(cands)) for (const p of list) byId[p.id] = p;
const nombres = {}; const picks = {};
for (const c of curados) {
  for (const n of c.nombres) nombres[n.id] = n;
  for (const p of c.picks) picks[p.id] = p;
}
// entradas curadas con id roto ("mkundefined", del scraper antiguo): se casan por el nombre de modelo (última palabra del nombre fuente)
const rotos = [];
for (const c of curados) { for (const n of c.nombres) if (n.id === "mkundefined") rotos.push(n); for (const p of c.picks) if (p.id === "mkundefined") rotos.push({ ...p, _pick: true }); }
const porModelo = (src) => { const mod = src.nombre.trim().split(/\s+/).pop().toLowerCase(); return rotos.find(r => r.nombre.toLowerCase().split(/\s+/).pop() === mod && (r.catFinal === src.cat || src.cat === "eco")); };
const productos = [];
let sinNombre = 0;
for (const [id, src] of Object.entries(byId)) {
  let n = nombres[id]; let pk = picks[id];
  if (!n && !pk) { const r = porModelo(src); if (r) { if (r._pick) pk = r; else n = r; } }
  if (!n && !pk) sinNombre++;
  let catFinal = (pk && pk.catFinal) || (n && n.catFinal) || (src.cat === "eco" ? "camisetas" : src.cat);
  const nombreFinal = (pk && pk.nombre) || (n && n.nombre) || src.nombre;
  const textoClas = nombreFinal + " " + src.nombre + " " + (src.desc || "").slice(0, 80);
  if (["camisetas", "sudaderas", "polos"].includes(catFinal) && NO_PRENDA.test(nombreFinal)) continue;           // pantalones, mallas, tops...
  if (["camisetas", "sudaderas", "polos"].includes(catFinal) && ABRIGO.test(nombreFinal)) catFinal = "abrigos";     // parkas, chalecos, softshell, polares
  if (catFinal === "libretas" && SET_NO_LIBRETA.test(nombreFinal)) continue;                                          // sets con termo/botella/paraguas
  if (!/^[A-Za-z0-9_-]+$/.test(id)) continue;
  const rm = src.marca === "Roly" ? rolyModels[src.ref] : null;
  let material = src.material || "", medidas = src.medidas || "", tallas = [], coloresNombres = [], galeriaSrc = src.imgs && src.imgs.length ? src.imgs.slice() : [src.img];
  if (rm && !rm.error) {
    const mat = rm.txt.match(/Material:\s*([^\n]+)/); if (mat) material = mat[1].trim().replace(/\.$/, "");
    const tl = [...rm.txt.matchAll(/^(XS|S|M|L|XL|2XL|3XL|4XL|5XL|\d{1,2}|\d+\/\d+|[0-9]{1,2} ?(?:AÑOS|años))\t/gm)].map(m => m[1]);
    tallas = [...new Set(tl)];
    coloresNombres = rm.swatches.filter(s => /^[A-ZÁÉÍÓÚÑ ]{3,}$/.test(s) && !/PREVISUALIZAR/.test(s));
    const views = rm.imgs.filter(u => u.includes(`/models/${src.ref.replace(/\D/g, "")}/`));
    if (views.length) galeriaSrc = [...new Set([src.img, ...views])];
  }
  const p = {
    id, marca: src.marca, ref: src.ref, cat: catFinal, sub: (pk && pk.sub) || (n && n.sub) || "",
    nombre: nombreFinal,
    img: `img/p/${id}.jpg`, imgSrc: src.img,
    galeria: [`img/p/${id}.jpg`], galeriaSrc,
    desc: (pk && pk.blurb) || (src.marca === "Roly" ? src.desc : ""),
    material: material || src.composicion || "", capacidad: src.capacidad || "", medidas: medidas.replace(/(\d+),(\d\d)/g, "$1,$2 cm").replace(/,00 cm/g, " cm"),
    tecnicas: src.marca === "Roly" ? (catFinal === "abrigos" ? ["Bordado", "Transfer"] : catFinal === "gorras" ? ["Bordado", "Serigrafía", "Transfer"] : ["Serigrafía", "Transfer", "Bordado", "Vinilo"]) : tecnicas(src.tecnicas),
    colores: src.marca === "Roly" ? (coloresNombres.length || null) : (src.nColores || null),
    coloresNombres, coloresHex: coloresNombres.map(c => { const h = hex(c); return h && /^#[0-9a-f]{6}$/i.test(h) ? h : ""; }),
    tallas, eco: !!((pk && pk.eco) || (n && n.eco) || src.eco || /org[aá]nic|recicl|rpet|bamb|corcho|kraft/i.test(material + " " + src.composicion + " " + src.nombre)),
    base: pk ? pk.base : null, desde: pk ? pk.desde : null, pick: !!(pk && !GADGET.test(textoClas)), destacado: !!(pk && pk.destacado && !GADGET.test(textoClas)), portada: false,
  };
  if (!p.pick) { p.base = null; p.desde = null; }
  if (p.pick && p.galeriaSrc.length > 1) p.galeria = p.galeriaSrc.slice(0, 6).map((u, i) => i === 0 ? `img/p/${id}.jpg` : `img/p/${id}-${i}.jpg`);
  // solo rutas con fichero descargado (la principal siempre se publica; si falta, se baja con download-images)
  p.galeria = p.galeria.filter((g, i) => i === 0 || fs.existsSync(path.join(ROOT, g)));
  productos.push(p);
}
// los no-pick no llevan precio (la web muestra "a consultar"): nada de precios inventados
// portada: 5 destacados variados (una categoría cada uno)
const usadas = new Set();
for (const slug of ["tazas", "bolsas", "camisetas", "bidones", "sudaderas", "boligrafos"]) {
  const p = productos.find(x => x.cat === slug && x.destacado && !usadas.has(slug)); if (p) { p.portada = true; usadas.add(slug); }
  if (usadas.size === 5) break;
}
const orden = Object.fromEntries(CATS.map(([s], i) => [s, i]));
productos.sort((a, b) => (orden[a.cat] ?? 99) - (orden[b.cat] ?? 99) || (b.destacado - a.destacado) || (b.pick - a.pick) || a.nombre.localeCompare(b.nombre, "es"));
const categorias = CATS.map(([slug, nombre]) => { const l = productos.filter(p => p.cat === slug); const d = l.find(p => p.destacado) || l[0]; return { slug, nombre, n: l.length, img: d ? d.img : "" }; }).filter(c => c.n > 0);
const cat = { generado: process.env.FECHA || "", categorias, productos };
fs.writeFileSync(path.join(D, "catalogo.json"), JSON.stringify(cat, null, 1));
// versión web sin campos vacíos ni URLs de origen (menos peso)
const web = { categorias, productos: productos.map(p => { const o = {}; for (const [k, v] of Object.entries(p)) { if (k === "imgSrc" || k === "galeriaSrc") continue; if (v === "" || v === null || v === false || (Array.isArray(v) && v.length === 0)) continue; if (k === "galeria" && v.length === 1) continue; if (k === "coloresHex" && !v.some(Boolean)) continue; o[k] = v; } return o; }) };
fs.writeFileSync(path.join(D, "catalogo.js"), "window.CATALOGO=" + JSON.stringify(web) + ";");
console.log("productos:", productos.length, "picks:", productos.filter(p => p.pick).length, "destacados:", productos.filter(p => p.destacado).length, "sin nombre curado:", sinNombre);
console.log(categorias.map(c => `${c.slug}:${c.n}`).join("  "));
console.log("catalogo.js", (fs.statSync(path.join(D, "catalogo.js")).size / 1024).toFixed(0), "KB");

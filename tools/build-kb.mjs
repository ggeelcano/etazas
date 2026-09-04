// Genera worker/catalogo-kb.js (conocimiento del catálogo para el asistente IA) a partir de data/catalogo.js.
// Sale en bloques por categoría: el worker manda al modelo solo los que pide el cliente, para no pasarse de contexto.
// Uso: node tools/build-kb.mjs   (volver a ejecutar y redesplegar el worker si cambia el catálogo)
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const window = {};
eval(fs.readFileSync(path.join(ROOT, "data/catalogo.js"), "utf8"));
const { categorias: CATS, productos: P } = window.CATALOGO;
const IVA = 0.21;
const eur = n => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const neto = x => Math.round(x / (1 + IVA) * 100) / 100;
const unit = (p, q, f) => { const u = q >= 250 ? p.desde : p.base * Math.pow(p.desde / p.base, Math.log(Math.max(1, q)) / Math.log(250)); return Math.round(neto(u) * f * 100) / 100; };
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const REGLA = `Todos los precios son POR UNIDAD, SIN IVA, orientativos, con marcaje a 1 tinta incluido y sin envío. Se dan por tramos: 1 / 25 / 50 / 100 / 250 unidades. A partir de 250, precio cerrado en el presupuesto. Recargos sobre el precio con 1 tinta: sin marcar -12 %, 2 tintas +8 %, todo color +15 %.`;

const INDICE = `CATÁLOGO: ${P.length} referencias de los catálogos Makito y Roly en ${CATS.length} categorías.\n${REGLA}\nCategorías (nombre, nº de modelos, precio más bajo, enlace):\n` +
  CATS.map(c => {
    const en = P.filter(p => p.cat === c.slug);
    const picks = en.filter(p => p.desde);
    const min = picks.length ? Math.min(...picks.map(p => neto(p.desde))) : null;
    return `- ${c.nombre}: ${en.length} modelos${min ? `, desde ${eur(min)} + IVA` : ""} → catalogo.html?cat=${c.slug}`;
  }).join("\n");

const BLOQUES = {}, CLAVES = {};
for (const c of CATS) {
  const en = P.filter(p => p.cat === c.slug);
  const picks = en.filter(p => p.desde);
  let t = `## ${c.nombre} (${en.length} modelos). Enlace: catalogo.html?cat=${c.slug}\n`;
  for (const p of picks) {
    const extra = [p.material, p.capacidad, p.medidas].filter(Boolean).join(", ");
    const marc = (p.tecnicas || []).join("/");
    const tallas = p.tallas && p.tallas.length ? `tallas ${p.tallas[0]}-${p.tallas[p.tallas.length - 1]}` : "";
    const cols = p.colores ? `${p.colores} color${p.colores > 1 ? "es" : ""}` : "";
    t += `- ${p.nombre} (ref. ${p.ref}, ${p.marca}${p.eco ? ", eco" : ""}): 1 ud ${eur(unit(p, 1, 1))} · 25 uds ${eur(unit(p, 25, 1))} · 50 uds ${eur(unit(p, 50, 1))} · 100 uds ${eur(unit(p, 100, 1))} · 250 uds ${eur(unit(p, 250, 1))}, + IVA. ${[extra, marc ? "marcaje: " + marc : "", tallas, cols].filter(Boolean).join("; ")}. Enlace: catalogo.html#p=${p.id}\n`;
  }
  const otros = en.filter(p => !p.desde);
  if (otros.length) t += `- Otros modelos sin precio en la web (precio a consultar): ${otros.map(p => p.nombre.slice(0, 44)).join("; ")}\n`;
  BLOQUES[c.slug] = t;
  // palabras clave para elegir el bloque según lo que escriba el cliente
  const kw = new Set();
  norm(c.nombre).split(/[^a-z0-9]+/).filter(w => w.length > 3).forEach(w => kw.add(w));
  en.forEach(p => {
    norm(p.sub).split(/[^a-z0-9]+/).filter(w => w.length > 3).forEach(w => kw.add(w));
    norm(p.nombre).split(/[^a-z0-9]+/).filter(w => w.length > 4).slice(0, 3).forEach(w => kw.add(w));
    if (p.eco) kw.add("ecologic"), kw.add("sostenib"), kw.add("reciclad");
  });
  CLAVES[c.slug] = [...kw].slice(0, 60);
}
const total = INDICE.length + Object.values(BLOQUES).reduce((a, b) => a + b.length, 0);
fs.mkdirSync(path.join(ROOT, "worker"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "worker/catalogo-kb.js"),
  "// GENERADO por tools/build-kb.mjs a partir de data/catalogo.js. No editar a mano.\n" +
  "export const KB_INDICE = " + JSON.stringify(INDICE) + ";\n" +
  "export const KB_BLOQUES = " + JSON.stringify(BLOQUES) + ";\n" +
  "export const KB_CLAVES = " + JSON.stringify(CLAVES) + ";\n");
console.log("worker/catalogo-kb.js:", Math.round(total / 1024), "KB en total · índice", Math.round(INDICE.length / 1024), "KB · bloque mayor", Math.round(Math.max(...Object.values(BLOQUES).map(b => b.length)) / 1024), "KB ·", P.filter(p => p.desde).length, "productos con precio");

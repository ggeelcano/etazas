// Genera data/catalogo-ca.js (capa de traducción al catalán del catálogo) a partir de data/ca/*.json.
// Uso: node tools/build-ca.mjs   → escribe data/catalogo-ca.js y comprueba que no falte ningún producto.
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const CA = path.join(ROOT, "data", "ca");

const src = fs.readFileSync(path.join(ROOT, "data", "catalogo.js"), "utf8");
const D = JSON.parse(src.slice(src.indexOf("{")).replace(/;\s*$/, ""));

const productos = {};
for (const f of fs.readdirSync(CA).filter(f => /^ca-lote\d+\.json$/.test(f)).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(CA, f), "utf8"));
  for (const [id, t] of Object.entries(j)) productos[id] = { nombre: String(t.nombre || "").trim(), desc: String(t.desc || "").trim() };
}
const unicos = JSON.parse(fs.readFileSync(path.join(CA, "ca-unicos.json"), "utf8"));

const categorias = {
  tazas: "Tasses i gots", bolsas: "Bosses de roba", camisetas: "Samarretes", bidones: "Bidons i ampolles", boligrafos: "Bolígrafs i llapis",
  libretas: "Llibretes i agendes", sudaderas: "Dessuadores", polos: "Polos", abrigos: "Jaquetes i armilles", gorras: "Gorres",
  termos: "Termos i gots tèrmics", mochilas: "Motxilles i bosses d'esport", paraguas: "Paraigües", delantales: "Davantals",
  neceseres: "Necessers i estoigs", lanyards: "Lanyards", posavasos: "Posagots",
};
const tecnicas = { "Láser": "Làser", "Serigrafía": "Serigrafia", "Sublimación": "Sublimació", "Tampografía": "Tampografia", "Bordado": "Brodat", "Transfer": "Transfer", "Transfer digital": "Transfer digital", "DTF": "DTF", "Vinilo": "Vinil", "Doming": "Doming" };
const medidas = { alto: "alçada", ancho: "amplada", largo: "llargada", fondo: "fons", grosor: "gruix", "diámetro": "diàmetre" };

// Comprobaciones
const faltan = D.productos.filter(p => !productos[p.id] || !productos[p.id].nombre);
const sinDesc = D.productos.filter(p => p.desc && !(productos[p.id] || {}).desc);
const sobran = Object.keys(productos).filter(id => !D.productos.some(p => p.id === id));
const catsSin = D.categorias.filter(c => !categorias[c.slug]);
const tecSin = [...new Set(D.productos.flatMap(p => p.tecnicas || []))].filter(t => !tecnicas[t]);
const subSin = [...new Set(D.productos.map(p => p.sub).filter(Boolean))].filter(s => !unicos.sub[s]);
const matSin = [...new Set(D.productos.map(p => p.material).filter(Boolean))].filter(s => !unicos.material[s]);
const colSin = [...new Set(D.productos.flatMap(p => p.coloresNombres || []))].filter(s => !unicos.colores[s]);
// pistas de castellano que se ha colado en la traducción (palabras que no existen en catalán)
const pista = /\b(taza|tazas|bolsa|bolsas|camiseta|camisetas|botella|botellas|bidón|bidon|bidones|sudadera|sudaderas|mochila|mochilas|libreta|libretas|bolígrafo|boligrafo|bolígrafos|paraguas|delantal|con tu logo|para|desde|algodón|acero|cerámica|reciclado|vidrio|madera|cartón|plástico|corcho|y|con|uno|los|las|hasta|también|tiene|lleva|viene|se marca|pequeño|pequeña|tamaño|colores de)\b/i;
const sospechosos = Object.entries(productos).filter(([, t]) => pista.test(t.nombre) || pista.test(t.desc)).map(([id, t]) => id + ": " + (pista.test(t.nombre) ? t.nombre : t.desc).slice(0, 90));

const out = { categorias, tecnicas, medidas, sub: unicos.sub, material: unicos.material, colores: unicos.colores, productos };
const js = "// Catálogo en catalán: capa que js/i18n.js aplica sobre window.CATALOGO cuando el idioma es «ca». Generado con tools/build-ca.mjs a partir de data/ca/.\nwindow.CATALOGO_CA=" + JSON.stringify(out) + ";\n";
fs.writeFileSync(path.join(ROOT, "data", "catalogo-ca.js"), js);
console.log(`catalogo-ca.js: ${Object.keys(productos).length} productos, ${(js.length / 1024).toFixed(0)} KB`);
console.log(`faltan nombre: ${faltan.length} ${faltan.slice(0, 5).map(p => p.id).join(" ")}`);
console.log(`faltan desc: ${sinDesc.length} ${sinDesc.slice(0, 5).map(p => p.id).join(" ")}`);
console.log(`sobran: ${sobran.length} · categorías sin traducir: ${catsSin.length} · técnicas: ${tecSin.join(",") || 0} · sub: ${subSin.length} · material: ${matSin.length} · colores: ${colSin.length}`);
console.log(`sospechosos de castellano: ${sospechosos.length}`); sospechosos.slice(0, 40).forEach(s => console.log("  " + s));
if (faltan.length || sinDesc.length || catsSin.length || tecSin.length) process.exitCode = 1;

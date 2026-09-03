// Une makito-details.json + roly-cdp-*.json en data/candidatos.json (por categoría Etazas) para la curación
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const D = path.join(DIR, "..", "data");
const det = JSON.parse(fs.readFileSync(path.join(D, "makito-details.json"), "utf8"));
const raw = JSON.parse(fs.readFileSync(path.join(D, "makito-raw.json"), "utf8"));
const rolyFiles = fs.readdirSync(D).filter(f => /^roly-cdp.*\.json$/.test(f));

const cands = {};
const push = (cat, p) => (cands[cat] ||= []).push(p);

// Makito: solo los que tienen ficha
for (const p of raw) {
  const d = det[p.url];
  if (!d || d.error) continue;
  const clean = s => (s || "").replace(/\s+/g, " ").trim();
  // ref: del nombre de fichero de la imagen (22005-W_01.jpg, 1828-001-P.jpg, 21803-w_1.jpg) o de la Referencia ERP
  const ref = p.ref || (p.img.split("/").pop().match(/^(\d{3,6})[-_]/) || [])[1] || clean(d["Referencia ERP"]) || p.url.split("/").pop().replace(".html", "");
  push(p.cat, {
    id: "mk" + ref, marca: "Makito", ref, nombre: p.name, cat: p.cat, url: p.url, img: p.img, imgs: d.imgs || [],
    material: clean(d["Material"]), composicion: clean(d["Composición"]), capacidad: clean(d["Capacidad ml"] || d["Capacidad"]),
    medidas: [d["Alto"] && "alto " + d["Alto"], d["Ancho"] && "ancho " + d["Ancho"], d["Largo"] && "largo " + d["Largo"], d["Diámetro"] && "Ø " + d["Diámetro"], d["Medidas"]].filter(Boolean).join(", "),
    tecnicas: clean(d["Técnicas de impresión"]), nColores: d.nColores || null, desc: clean(d.desc2 || d.desc || "").slice(0, 400),
  });
}
// Roly: rootText = "NOMBRE CODIGO descripción"
const ROLY_CAT = { cam_po: "camisetas", cam: "camisetas", cat: "camisetas", basic: "camisetas", swe_h: "sudaderas", swe_sh: "sudaderas", pmc: "polos", gor: "gorras", horecadelantal: "delantales", moc: "mochilas", rolyeco: "eco" };
const seenRoly = new Set();
for (const f of rolyFiles) {
  const j = JSON.parse(fs.readFileSync(path.join(D, f), "utf8"));
  for (const [code, v] of Object.entries(j)) {
    for (const c of v.dom.out) {
      const m = c.rootText.match(/^(.+?)\s+([A-Z]{2}\d{4})\s+(.*)$/);
      if (!m) continue;
      const ref = m[2];
      if (seenRoly.has(ref)) continue;
      seenRoly.add(ref);
      const catE = ROLY_CAT[code] || code;
      push(catE, { id: "ro" + ref, marca: "Roly", ref, nombre: m[1].trim(), cat: catE, sub: code, url: "https://roly.eu" + c.href, img: c.img, imgs: [c.img], desc: m[3].trim().slice(0, 400), eco: code === "rolyeco" });
    }
  }
}
for (const [k, v] of Object.entries(cands)) console.log(k.padEnd(12), v.length);
fs.writeFileSync(path.join(D, "candidatos.json"), JSON.stringify(cands, null, 1));
console.log("->", path.join(D, "candidatos.json"));

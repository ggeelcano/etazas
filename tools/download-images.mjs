// Descarga a img/p/ las imágenes del catálogo final (data/catalogo.json): principal de todos + galería de destacados
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "catalogo.json"), "utf8"));
const OUTDIR = path.join(ROOT, "img", "p");
fs.mkdirSync(OUTDIR, { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const jobs = [];
for (const p of CAT.productos) {
  jobs.push({ url: p.imgSrc, file: `${p.id}.jpg` });
  if (p.destacado && p.galeriaSrc) p.galeriaSrc.forEach((u, i) => { if (i > 0) jobs.push({ url: u, file: `${p.id}-${i}.jpg` }); });
}
let ok = 0, skip = 0, fail = 0;
async function worker(q) {
  while (q.length) {
    const j = q.shift();
    const f = path.join(OUTDIR, j.file);
    if (fs.existsSync(f) && fs.statSync(f).size > 1000) { skip++; continue; }
    try {
      const r = await fetch(j.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length < 1000) throw new Error("vacía");
      fs.writeFileSync(f, b); ok++;
    } catch (e) { fail++; console.log("FALLO", j.file, j.url, e.message); }
    if ((ok + fail) % 50 === 0) console.log(`${ok + skip + fail}/${jobs.length}`);
  }
}
const q = [...jobs];
await Promise.all(Array.from({ length: 8 }, () => worker(q)));
console.log(`OK ${ok} descargadas, ${skip} ya estaban, ${fail} fallos, de ${jobs.length}`);

// Prepara fotos reales (recorte + reescalado + JPG) con el canvas de Chrome headless, sin instalar nada.
// Uso: node fotos-reales.mjs trabajos.json
// trabajos.json = [{ "src": "ruta absoluta origen", "dest": "img/t/nombre.jpg", "max": 1200, "q": 0.84, "crop": { "x": 0, "y": 0.1, "w": 1, "h": 0.6 } }]
// crop en fracciones del original (opcional). "ar" (p.ej. "16:9") recorta centrado a esa proporción si no hay crop.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const JOBS = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), "utf8"));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9351;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(DIR, "_chromeprofile11")}`, "about:blank"], { stdio: "ignore" });
let info = null;
for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
if (!info) throw new Error("Chrome no arrancó");
const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
const mime = f => /\.png$/i.test(f) ? "image/png" : /\.gif$/i.test(f) ? "image/gif" : /\.webp$/i.test(f) ? "image/webp" : "image/jpeg";
for (const j of JOBS) {
  const buf = fs.readFileSync(j.src);
  const dataUrl = `data:${mime(j.src)};base64,${buf.toString("base64")}`;
  const max = j.max || 1200, q = j.q || 0.84;
  const expr = `new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    let sx = 0, sy = 0, sw = im.naturalWidth, sh = im.naturalHeight;
    const crop = ${JSON.stringify(j.crop || null)}; const ar = ${JSON.stringify(j.ar || null)};
    if (crop) { sx = Math.round(crop.x * sw); sy = Math.round(crop.y * sh); sw = Math.round(crop.w * im.naturalWidth); sh = Math.round(crop.h * im.naturalHeight); }
    else if (ar) { const [a, b] = ar.split(':').map(Number); const want = a / b; if (sw / sh > want) { const nw = Math.round(sh * want); sx = Math.round((sw - nw) / 2); sw = nw; } else { const nh = Math.round(sw / want); sy = Math.round((sh - nh) / 2); sh = nh; } }
    const k = Math.min(1, ${max} / Math.max(sw, sh));
    const rot = ${Number(j.rot) || 0};
    const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high';
    if (rot) { x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180); x.translate(-c.width / 2, -c.height / 2); }
    x.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
    res({ d: c.toDataURL('image/jpeg', ${q}), w: c.width, h: c.height }); };
    im.onerror = () => rej(new Error('no carga')); im.src = ${JSON.stringify(dataUrl)}; })`;
  const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: expr });
  if (r.exceptionDetails) { console.log("ERR", j.src, JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text)); continue; }
  const out = path.join(ROOT, j.dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const b = Buffer.from(r.result.value.d.split(",")[1], "base64");
  fs.writeFileSync(out, b);
  console.log(`${j.dest}  ${r.result.value.w}x${r.result.value.h}  ${Math.round(b.length / 1024)} KB`);
}
ws.close(); chrome.kill();

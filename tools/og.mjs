// Genera img/og.jpg (1200×630) para el preview de WhatsApp: logo + 4 productos destacados + claim. Usa Chrome headless.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.join(DIR, "..");
const BASE = process.argv[2] || "http://127.0.0.1:8140";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9346;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "catalogo.json"), "utf8"));
const top = cat.productos.filter(p => p.portada).slice(0, 4);
const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Instrument+Sans:wght@500;600&display=swap">
<style>body{margin:0;width:1200px;height:630px;background:#faf9f7;font-family:"Instrument Sans",Arial,sans-serif;color:#2b1f2e;overflow:hidden}
.g{display:grid;grid-template-columns:1fr 1fr;height:630px}.t{padding:64px 0 64px 72px;display:flex;flex-direction:column;justify-content:center}
.t img{height:64px;width:auto;margin-bottom:34px}h1{font-family:"Bricolage Grotesque",Arial,sans-serif;font-weight:800;font-size:58px;line-height:1.02;margin:0 0 20px;letter-spacing:-.02em}
h1 em{font-style:normal;color:#d91e63}p{font-size:22px;color:#4a3a4c;margin:0;max-width:22em}.f{margin-top:28px;display:flex;gap:18px;font-size:16px;font-weight:600;color:#6e6270}
.m{position:relative;overflow:hidden}.m img{width:100%;height:100%;object-fit:cover;object-position:center 60%;display:block}
.m span{position:absolute;left:18px;bottom:18px;background:rgba(43,31,46,.82);color:#fff;font-size:15px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:8px 14px;border-radius:999px}</style></head><body><div class="g"><div class="t"><img src="${BASE}/img/logo.png" alt=""><h1>Tu logo en tazas, bolsas y camisetas. <em>Desde 1 unidad.</em></h1><p>Taller de serigrafía en Premià de Dalt. Urgentes en 24-48 h.</p><div class="f"><span>Sin cantidad mínima</span><span>·</span><span>Precio al momento</span><span>·</span><span>Makito y Roly</span></div></div>
<div class="m"><img src="${BASE}/img/t/tazas-asa-dorada-og.jpg" alt=""><span>Hecho en nuestro taller</span></div></div></body></html>`;
fs.writeFileSync(path.join(ROOT, "tools", "_og.html"), html);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(DIR, "_chromeprofile4")}`, "--window-size=1200,630", "about:blank"], { stdio: "ignore" });
let info = null;
for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, m => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: BASE + "/tools/_og.html" }); await sleep(3500);
const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 88 });
fs.writeFileSync(path.join(ROOT, "img", "og.jpg"), Buffer.from(shot.data, "base64"));
ws.close(); chrome.kill();
console.log("img/og.jpg", fs.statSync(path.join(ROOT, "img", "og.jpg")).size, "bytes");

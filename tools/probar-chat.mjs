// Abre la demo, abre el chat, escribe una pregunta y captura la conversación (con las fichas de producto).
// Uso: node probar-chat.mjs "quiero 100 tazas con mi logo" _chat.png [ancho]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const [preg, out, wS] = process.argv.slice(2);
const w = Number(wS || 1280);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9354;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(DIR, "_chromeprofile10")}`, "about:blank"], { stdio: "ignore" });
let info = null;
for (let i = 0; i < 80; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); info = l.find(t => t.type === "page"); if (info) break; } catch {} }
const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); const errores = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, x => x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result)); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async expr => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: w, height: w < 700 ? 844 : 900, deviceScaleFactor: w < 700 ? 2 : 1, mobile: w < 700 });
await send("Page.navigate", { url: "http://127.0.0.1:8140/index.html" }); await sleep(2500);
await ev(`document.getElementById('chat-fab').click(); 1`);
await sleep(600);
await ev(`(()=>{const i=document.getElementById('chat-in'); i.value=${JSON.stringify(preg)}; document.getElementById('chat-form').dispatchEvent(new Event('submit',{cancelable:true})); return 1;})()`);
for (let i = 0; i < 40; i++) { await sleep(1000); const listo = await ev(`!document.querySelector('.escribiendo')`); if (listo) break; }
await sleep(700);
const conv = await ev(`[...document.querySelectorAll('.chat-cuerpo .msg, .chat-cuerpo .chat-fichas')].map(e=>(e.classList.contains('chat-fichas')?'[FICHAS] ':(e.classList.contains('yo')?'[YO] ':'[BOT] '))+e.innerText.replace(/\\n+/g,' | ')).join('\\n')`);
console.log(conv);
if (errores.length) console.log("ERRORES JS:", errores.join(" | "));
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(DIR, out || "_chat.png"), Buffer.from(shot.data, "base64"));
ws.close(); chrome.kill();
console.log("->", out);

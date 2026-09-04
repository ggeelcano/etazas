/* eTazas demo — chat de atención al cliente flotante con IA (worker etazas-ia). Si el worker no responde, contesta con las respuestas locales de data/chat-data.js. */
(function () {
  "use strict";
  const API = "https://etazas-ia.josugarciandia.workers.dev/api/chat";
  const WA = "https://wa.me/34670266434";
  const DATA = window.CHAT_DATA || { saludo: [], chips: [], respuestas: [], fallback: "" };

  const $ = (s, r) => (r || document).querySelector(s);
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // La IA contesta en texto con **negritas** y enlaces [texto](url). Solo se admiten enlaces internos, WhatsApp, correo y teléfono.
  const urlOk = u => /^(catalogo\.html|index\.html|legal\.html|#|https:\/\/wa\.me\/|mailto:|tel:)/.test(u);
  function render(t) {
    let h = esc(t);
    h = h.replace(/\[([^\]]{1,120})\]\(([^)\s]{1,200})\)/g, (m, txt, url) => urlOk(url) ? `<a href="${url}"${/^https:/.test(url) ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>` : txt);
    h = h.replace(/(\s*(?:por|a través de|en)?\s*WhatsApp)?[\s(]*\(?(https:\/\/wa\.me\/[\w?=%.-]+)\)?/gi, (m, _pre, url) => `<a class="msg-wa" href="${url}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2"/></svg>Escribir por WhatsApp</a>`);
    h = h.replace(/\*\*([^*]{1,80})\*\*/g, "<b>$1</b>");
    h = h.replace(/^\s*[-•*]\s+/gm, "· ");
    return h.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
  }

  const raiz = document.createElement("div");
  raiz.className = "chat-raiz";
  raiz.innerHTML = `<button class="chat-fab" type="button" id="chat-fab" aria-haspopup="dialog" aria-expanded="false" aria-controls="chat-panel" aria-label="Abrir el chat de atención al cliente">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12c0 4.1-4 7.5-9 7.5-1.4 0-2.8-.3-4-.8L3 20l1.4-3.6C3.5 15.1 3 13.6 3 12c0-4.1 4-7.5 9-7.5s9 3.4 9 7.5z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>
      <span class="notif" aria-hidden="true">1</span><span class="tip" aria-hidden="true">¿Dudas? Pregúntanos</span></button>`;
  const panel = document.createElement("div");
  panel.className = "chat-panel"; panel.id = "chat-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat de atención al cliente de eTazas");
  panel.innerHTML = `<div class="chat-cab"><div class="avatar"><img src="img/favicon-32.png" alt="" width="30" height="30"></div><div class="info"><div class="titulo">Atención al cliente</div><div class="estado">eTazas · respondemos al momento</div></div><button class="cerrar" type="button" aria-label="Cerrar el chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="chat-cuerpo" id="chat-cuerpo" role="log" aria-live="polite" aria-label="Mensajes"></div>
    <div class="chat-chips" id="chat-chips" aria-label="Preguntas frecuentes"></div>
    <form class="chat-form" id="chat-form"><label class="visually-hidden" for="chat-in">Escribe tu pregunta</label><textarea id="chat-in" rows="1" placeholder="Escribe aquí tu pregunta…" autocomplete="off"></textarea><button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-2-6-8-2z"/></svg></button></form>
    <div class="chat-nota">Asistente con IA sobre el catálogo y los datos de eTazas. Para precio cerrado, pide presupuesto.</div>`;
  document.body.appendChild(raiz); document.body.appendChild(panel);

  const fab = $("#chat-fab"), cuerpo = $("#chat-cuerpo"), chips = $("#chat-chips"), form = $("#chat-form"), inp = $("#chat-in"), cerrar = $(".cerrar", panel), enviarBtn = $("button[type=submit]", form);
  let saludado = false, abridor = null, ocupado = false;
  const historial = [];

  function msg(html, quien) { const d = document.createElement("div"); d.className = "msg " + quien; d.innerHTML = html; cuerpo.appendChild(d); cuerpo.scrollTop = cuerpo.scrollHeight; return d; }
  // Fichas de producto dentro de la conversación (como el chat de las tiendas grandes): foto, precio y botón de añadir.
  function fichasDe(texto) {
    const E = window.ETAZAS; if (!E) return null;
    const ids = [...new Set([...String(texto).matchAll(/catalogo\.html#p=([A-Za-z0-9]+)/g)].map(m => m[1]))].filter(id => E.byId[id]).slice(0, 3);
    if (!ids.length) return null;
    const d = document.createElement("div");
    d.className = "chat-fichas";
    d.innerHTML = ids.map(id => {
      const p = E.byId[id]; const desde = E.desdeNeto(p);
      return `<article class="chat-ficha"><button class="cf-img" type="button" data-ver="${E.esc(id)}" aria-label="Ver la ficha de ${E.esc(p.nombre)}"><img src="${E.esc(p.img)}" alt="" loading="lazy"></button>
        <div class="cf-txt"><b>${E.esc(p.nombre)}</b><span>${desde ? "desde " + E.eur(desde) + " + IVA" : "precio a consultar"}</span></div>
        <button class="cf-add" type="button" data-anadir="${E.esc(id)}" aria-label="Añadir ${E.esc(p.nombre)} al presupuesto, 50 unidades a 1 tinta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></article>`;
    }).join("");
    return d;
  }
  function escribiendo() { const d = document.createElement("div"); d.className = "msg bot"; d.innerHTML = '<span class="escribiendo" role="status" aria-label="Escribiendo"><i></i><i></i><i></i></span>'; cuerpo.appendChild(d); cuerpo.scrollTop = cuerpo.scrollHeight; return d; }
  function respuestaLocal(texto) {
    const t = norm(texto);
    for (const r of DATA.respuestas || []) if ((r.match || []).some(m => t.includes(norm(m)))) return r.reply;
    return DATA.fallback || `No tengo ese dato a mano. Escríbenos por <a href="${WA}" target="_blank" rel="noopener">WhatsApp</a> o a <a href="mailto:info@etazas.com">info@etazas.com</a> y te lo confirmamos.`;
  }
  async function preguntarIA(texto) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: historial.slice(-10).concat([{ role: "user", content: texto }]) }), signal: ctrl.signal });
      if (!r.ok) throw new Error("http " + r.status);
      const j = await r.json();
      if (!j || !j.reply || j.engine === "fallback") throw new Error("sin respuesta");
      return j.reply;
    } finally { clearTimeout(t); }
  }
  async function enviar(texto) {
    const t = String(texto || "").trim(); if (!t || ocupado) return;
    ocupado = true; enviarBtn.disabled = true;
    msg(esc(t), "yo"); inp.value = ""; inp.style.height = "";
    const e = escribiendo();
    let html, ia = false;
    try { html = render(await preguntarIA(t)); ia = true; } catch (err) { html = respuestaLocal(t); }
    e.remove(); msg(html, "bot");
    const f = fichasDe(html); if (f) { cuerpo.appendChild(f); cuerpo.scrollTop = cuerpo.scrollHeight; }
    historial.push({ role: "user", content: t }, { role: "assistant", content: ia ? html.replace(/<[^>]+>/g, "") : "" });
    if (!ia) historial.pop(), historial.pop();
    ocupado = false; enviarBtn.disabled = false; inp.focus();
  }
  function abrir() {
    abridor = document.activeElement;
    raiz.setAttribute("data-abierto", ""); panel.setAttribute("data-on", ""); fab.setAttribute("aria-expanded", "true");
    const n = $(".notif", fab); if (n) n.hidden = true;
    if (!saludado) { saludado = true; (DATA.saludo || []).forEach(s => msg(s, "bot")); chips.innerHTML = (DATA.chips || []).map(c => `<button type="button" data-q="${esc(c.q)}">${esc(c.label)}</button>`).join(""); }
    setTimeout(() => inp.focus(), 50);
  }
  function cerrarChat() {
    if (!panel.hasAttribute("data-on")) return;
    panel.removeAttribute("data-on"); raiz.removeAttribute("data-abierto"); fab.setAttribute("aria-expanded", "false");
    (abridor && abridor.focus ? abridor : fab).focus(); abridor = null;
  }
  fab.addEventListener("click", abrir);
  cerrar.addEventListener("click", cerrarChat);
  form.addEventListener("submit", e => { e.preventDefault(); enviar(inp.value); });
  inp.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(inp.value); } });
  inp.addEventListener("input", () => { inp.style.height = "auto"; inp.style.height = Math.min(inp.scrollHeight, 100) + "px"; });
  chips.addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (b) enviar(b.dataset.q); });
  cuerpo.addEventListener("click", e => {
    const E = window.ETAZAS; if (!E) return;
    const v = e.target.closest("[data-ver]"); if (v) { E.abrirFicha(v.dataset.ver); cerrarChat(); return; }
    const a = e.target.closest("[data-anadir]"); if (a) { E.anadir(a.dataset.anadir, 50, "t1", "", false); a.classList.add("hecho"); a.setAttribute("aria-label", "Añadido al presupuesto"); }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.hasAttribute("data-on")) { e.stopPropagation(); cerrarChat(); } }, true);
  // foco encerrado en el panel mientras está abierto
  panel.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const f = Array.from(panel.querySelectorAll("button, textarea, a[href]")).filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  window.ETAZAS_CHAT = { abrir, cerrar: cerrarChat, enviar };
})();

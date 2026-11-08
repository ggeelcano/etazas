/* eTazas — página de selección de productos (seleccion.html). Sin dependencias.
   La selección es un mapa de bits de los productos en el orden de data/catalogo.js (1 = se queda), en base64url:
   658 productos → 83 bytes → 111 caracteres en ?s=. Se guarda también en localStorage para hacerlo en varios ratos. */
(function () {
  "use strict";
  const D = window.CATALOGO || { categorias: [], productos: [] };
  const P = D.productos, CATS = D.categorias, N = P.length;
  const WEB = (window.SELECCION_WEB && window.SELECCION_WEB.coincidencias) || {};
  const KEY = "etazas_seleccion_v1";
  const CORREO = "josugarciandia@ggelcano.com";
  const MAX = 1500; // caracteres máximos del mensaje de WhatsApp
  const BASE = location.origin + location.pathname;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const eur = n => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
  const escribir = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } };

  /* ---------- Codificación del mapa de bits ---------- */
  const sel = new Uint8Array(N).fill(1);
  function codificar() {
    const b = new Uint8Array(Math.ceil(N / 8));
    for (let i = 0; i < N; i++) if (sel[i]) b[i >> 3] |= 0x80 >> (i & 7);
    let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodificar(txt) {
    try {
      let s = String(txt || "").replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const bin = atob(s);
      if (bin.length !== Math.ceil(N / 8)) return false; // enlace de otro catálogo: no se aplica
      for (let i = 0; i < N; i++) sel[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Estado inicial: enlace > lo guardado > todo marcado ---------- */
  const param = new URLSearchParams(location.search).get("s");
  const guardado = leer();
  let desdeEnlace = false;
  if (param && decodificar(param)) desdeEnlace = true;
  else if (guardado && guardado.s) decodificar(guardado.s);

  /* ---------- Pintar ---------- */
  const grupos = CATS.map(c => ({ c, idx: P.map((p, i) => (p.cat === c.slug ? i : -1)).filter(i => i >= 0) })).filter(g => g.idx.length);
  const desdeNeto = p => (p.desde ? Math.round(p.desde / 1.21 * 100) / 100 : null);
  function tarjeta(i) {
    const p = P[i], d = desdeNeto(p), ya = WEB[p.id];
    return `<label class="sc${sel[i] ? "" : " fuera"}" data-i="${i}">
      <input type="checkbox" class="sc-chk" data-i="${i}"${sel[i] ? " checked" : ""}>
      <span class="sc-img"><img src="img/sel/${esc(p.id)}.webp" data-src2="${esc(p.img)}" alt="" loading="lazy" decoding="async" width="240" height="240"></span>
      <span class="sc-txt"><span class="sc-n">${esc(p.nombre)}</span><span class="sc-ref">${esc(p.marca)} · ${esc(p.ref)}</span>${d ? `<span class="sc-precio">desde ${eur(d)} + IVA</span>` : ""}${ya ? `<span class="sc-ya" title="${esc("En etazas.com: " + ya.map(x => x.nombre).join(" · "))}">Ya lo tenéis en etazas.com</span>` : ""}</span>
      <span class="sc-estado" aria-hidden="true">Quitado</span>
    </label>`;
  }
  $("#cats").innerHTML = grupos.map(g => `<section class="sel-cat" id="cat-${esc(g.c.slug)}" aria-labelledby="h-${esc(g.c.slug)}">
    <div class="sel-cat-cab"><h2 id="h-${esc(g.c.slug)}">${esc(g.c.nombre)}</h2><span class="sel-cuenta" data-cuenta="${esc(g.c.slug)}"></span>
      <div class="sel-cat-btns"><button type="button" class="btn btn-s" data-todos="0" data-cat="${esc(g.c.slug)}">Quitar todos</button><button type="button" class="btn btn-s" data-todos="1" data-cat="${esc(g.c.slug)}">Marcar todos</button></div></div>
    <div class="sel-grid">${g.idx.map(tarjeta).join("")}</div>
    <p class="sel-arriba"><a href="#indice">Volver al índice</a></p>
  </section>`).join("");
  $("#indice-lista").innerHTML = grupos.map(g => `<li><a href="#cat-${esc(g.c.slug)}"><span>${esc(g.c.nombre)}</span><span class="n" data-cuenta-i="${esc(g.c.slug)}"></span></a></li>`).join("");
  $("#n-total").textContent = N;
  if (desdeEnlace) $("#aviso-enlace").hidden = false;
  // si falta la miniatura, la foto grande
  $("#cats").addEventListener("error", e => { const im = e.target; if (im.tagName === "IMG" && im.dataset.src2 && im.src.indexOf(im.dataset.src2) < 0) im.src = im.dataset.src2; }, true);

  /* ---------- Contadores, resumen y botones ---------- */
  const total = () => sel.reduce((a, v) => a + v, 0);
  const quitadosPorCat = () => grupos.map(g => [g.c, g.idx.filter(i => !sel[i]).length]).filter(x => x[1] > 0);
  function textoResumen() {
    const q = quitadosPorCat(), n = total();
    return `Nos quedamos con ${n} de ${N}` + (q.length ? `. Quitamos: ${q.map(([c, k]) => `${c.nombre.toLowerCase()} ${k}`).join(", ")}.` : ". No quitamos ninguno.");
  }
  function mensaje() {
    const enlace = BASE + "?s=" + codificar();
    const cab = `Hola Josu, esta es nuestra selección de productos para la tienda.\n${textoResumen()}\nSelección completa: ${enlace}`;
    const falta = $("#falta").value.trim();
    if (!falta) return { texto: cab, enlace, recortado: false, libres: MAX - cab.length - 20 };
    const pre = "\n\nEchamos en falta: ";
    const sitio = MAX - cab.length - pre.length;
    let f = falta, recortado = false;
    if (f.length > sitio) { f = f.slice(0, Math.max(0, sitio - 1)).trimEnd() + "…"; recortado = true; }
    return { texto: cab + pre + f, enlace, recortado, libres: sitio - falta.length };
  }
  function pintarCuentas() {
    const n = total();
    $("#total").innerHTML = `Os quedáis con <b>${n}</b> de ${N}`;
    grupos.forEach(g => {
      const k = g.idx.filter(i => sel[i]).length, t = `${k} de ${g.idx.length}`;
      const a = $(`[data-cuenta="${g.c.slug}"]`); if (a) a.textContent = t;
      const b = $(`[data-cuenta-i="${g.c.slug}"]`); if (b) { b.textContent = t; b.closest("a").classList.toggle("con-quitados", k < g.idx.length); }
      const q = $(`[data-todos="0"][data-cat="${g.c.slug}"]`), m = $(`[data-todos="1"][data-cat="${g.c.slug}"]`);
      if (q) q.disabled = k === 0; if (m) m.disabled = k === g.idx.length;
    });
    pintarEnvio();
  }
  function pintarEnvio() {
    const m = mensaje();
    $("#resumen").innerHTML = `<p><b>${esc(textoResumen())}</b></p>`;
    const qd = $("#quedan");
    if (m.recortado) { qd.textContent = "Vuestro texto es largo y en el mensaje de WhatsApp va recortado. Si hace falta, pegad el resto aparte en el chat."; qd.className = "sel-quedan aviso"; }
    else if ($("#falta").value.trim()) { qd.textContent = `Os quedan unos ${Math.max(0, m.libres)} caracteres para que quepa todo en el mensaje.`; qd.className = "sel-quedan"; }
    else { qd.textContent = ""; qd.className = "sel-quedan"; }
    $("#btn-wa").href = "https://wa.me/?text=" + encodeURIComponent(m.texto);
    $("#btn-mail").href = `mailto:${CORREO}?subject=${encodeURIComponent("Selección de productos para la tienda eTazas")}&body=${encodeURIComponent(m.texto)}`;
  }
  let tocado = desdeEnlace;
  function guardar() {
    const s = codificar();
    escribir({ s, falta: $("#falta").value, fecha: new Date().toISOString() });
    // el enlace de la barra de direcciones refleja siempre la selección (si se copia, va bien)
    if (tocado) history.replaceState(null, "", location.pathname + "?s=" + s + location.hash);
  }

  /* ---------- Eventos ---------- */
  $("#cats").addEventListener("change", e => {
    const c = e.target; if (!c.classList.contains("sc-chk")) return;
    const i = Number(c.dataset.i); sel[i] = c.checked ? 1 : 0;
    c.closest(".sc").classList.toggle("fuera", !c.checked);
    tocado = true; pintarCuentas(); guardar();
  });
  $("#cats").addEventListener("click", e => {
    const b = e.target.closest("[data-todos]"); if (!b) return;
    const on = b.dataset.todos === "1", g = grupos.find(x => x.c.slug === b.dataset.cat); if (!g) return;
    g.idx.forEach(i => { sel[i] = on ? 1 : 0; const c = $(`.sc-chk[data-i="${i}"]`); if (c) { c.checked = on; c.closest(".sc").classList.toggle("fuera", !on); } });
    tocado = true; pintarCuentas(); guardar();
    // el foco pasa al otro botón, que es el que queda activo
    const otro = $(`[data-todos="${on ? "0" : "1"}"][data-cat="${g.c.slug}"]`); if (otro) otro.focus();
  });
  let tTexto;
  $("#falta").addEventListener("input", () => { pintarEnvio(); clearTimeout(tTexto); tTexto = setTimeout(guardar, 400); });
  if (guardado && guardado.falta && !desdeEnlace) $("#falta").value = guardado.falta;
  $("#btn-copiar").addEventListener("click", async () => {
    const enlace = mensaje().enlace, ok = $("#copiado");
    try { await navigator.clipboard.writeText(enlace); ok.textContent = "Enlace copiado. Pegadlo donde queráis."; }
    catch (e) {
      const t = document.createElement("textarea"); t.value = enlace; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
      let hecho = false; try { hecho = document.execCommand("copy"); } catch (x) { }
      t.remove(); ok.textContent = hecho ? "Enlace copiado. Pegadlo donde queráis." : "No se ha podido copiar. Este es el enlace: " + enlace;
    }
  });
  // la barra pegada tapa los títulos al saltar desde el índice
  const ajustar = () => { const b = $("#barra"); if (b) document.documentElement.style.scrollPaddingTop = (b.offsetHeight + 10) + "px"; };
  window.addEventListener("resize", ajustar); ajustar();

  pintarCuentas();
  // para las pruebas automáticas
  window.SELECCION = { codificar, decodificar, total, mensaje, N };
})();

/* eTazas demo — lógica compartida (portada y catálogo). Sin dependencias. */
(function () {
  "use strict";
  const D = window.CATALOGO || { categorias: [], productos: [] };
  const P = D.productos;
  const CATS = D.categorias;
  const byId = Object.fromEntries(P.map(p => [p.id, p]));
  const WA = "34670266434";
  const QTYS = [1, 10, 25, 50, 100, 250];
  const MARCAJE = { t1: { n: "1 tinta", f: 1 }, t2: { n: "2 tintas", f: 1.08 }, tc: { n: "Todo color", f: 1.15 } };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const eur = n => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const catName = slug => (CATS.find(c => c.slug === slug) || {}).nombre || slug;
  const entero = v => Math.max(1, Math.round(Number(v)) || 1);
  const colorNombre = (p, i) => (p.coloresNombres || [])[i] ? String(p.coloresNombres[i]).toLowerCase() : "";

  // precio unitario por cantidad: interpolación geométrica entre base (1 ud) y desde (250 uds)
  function unitario(p, q, marc) {
    const f = (MARCAJE[marc] || MARCAJE.t1).f;
    if (!p || !p.base || !p.desde) return null;
    const u = q >= 250 ? p.desde : p.base * Math.pow(p.desde / p.base, Math.log(Math.max(1, q)) / Math.log(250));
    return Math.round(u * f * 100) / 100;
  }

  /* ---------- Presupuesto (localStorage) ---------- */
  const KEY = "etazas_presu_v1";
  let presu = [];
  try { presu = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { presu = []; }
  if (!Array.isArray(presu)) presu = [];
  presu = presu.filter(l => l && byId[l.id]).map(l => ({ id: l.id, marc: MARCAJE[l.marc] ? l.marc : "t1", q: entero(l.q), color: typeof l.color === "string" ? l.color.slice(0, 40) : "" }));
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(presu)); } catch (e) { } pintarCuenta(); }
  function pintarCuenta() { $$(".cuenta").forEach(el => { el.textContent = presu.length; el.hidden = presu.length === 0; }); }
  function anadir(id, q, marc, color, sustituir) {
    const p = byId[id]; if (!p) return;
    const l = presu.find(x => x.id === id && x.marc === marc && (x.color || "") === (color || ""));
    if (l) { if (sustituir) { l.q = q; aviso(`Cantidad actualizada: ${q} uds de ${p.nombre}`); } else aviso("Ya está en tu presupuesto. Cambia la cantidad en «Mi presupuesto»."); }
    else { presu.push({ id, q: entero(q || 50), marc: marc || "t1", color: color || "" }); aviso(`Añadidas ${entero(q || 50)} uds de ${p.nombre}. Cambia la cantidad en «Mi presupuesto».`); }
    guardar(); pintarCajon();
  }
  function quitar(i) { presu.splice(i, 1); guardar(); pintarCajon(); }
  function totalPresu() { return presu.reduce((a, l) => { const u = unitario(byId[l.id], l.q, l.marc); return a + (u || 0) * l.q; }, 0); }
  function lineaTexto(l) { const p = byId[l.id]; const u = unitario(p, l.q, l.marc); return `• ${l.q} × ${p.nombre} (ref. ${p.ref}${l.color ? ", color " + l.color : ""}, ${MARCAJE[l.marc].n.toLowerCase()})${u ? " ≈ " + eur(u) + "/ud" : ", precio a consultar"}`; }
  function textoPresu() {
    const lineas = presu.map(lineaTexto);
    const tot = totalPresu();
    return `Hola eTazas, quiero presupuesto para:\n${lineas.join("\n")}\n${tot ? "Total orientativo: " + eur(tot) + " (IVA incl., sin envío)\n" : ""}Os paso el logo por aquí.`;
  }
  function pintarPie() {
    const t = $("#cajon-total"); if (t) t.textContent = eur(totalPresu());
    const wa = $("#cajon-wa"), em = $("#cajon-mail"); const vacio = !presu.length;
    [wa, em].forEach(a => { if (!a) return; if (vacio) { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.tabIndex = -1; } else { a.removeAttribute("aria-disabled"); a.tabIndex = 0; } });
    if (wa && !vacio) wa.href = `https://wa.me/${WA}?text=${encodeURIComponent(textoPresu())}`;
    if (em && !vacio) em.href = `mailto:info@etazas.com?subject=${encodeURIComponent("Presupuesto merchandising")}&body=${encodeURIComponent(textoPresu())}`;
    presu.forEach((l, i) => { const s = $(`.linea[data-i="${i}"] small`); if (s) { const u = unitario(byId[l.id], l.q, l.marc); s.textContent = `Ref. ${byId[l.id].ref}${l.color ? " · " + l.color : ""} · ${MARCAJE[l.marc].n}${u ? " · " + eur(u) + "/ud" : ""}`; } });
  }
  function pintarCajon() {
    const lista = $("#cajon-lista"); if (!lista) return;
    if (!presu.length) lista.innerHTML = '<p class="vacio">Todavía no has añadido nada. Elige un producto y pulsa «Añadir al presupuesto».</p>';
    else lista.innerHTML = presu.map((l, i) => { const p = byId[l.id]; return `<div class="linea" data-i="${i}"><img src="${esc(p.img)}" alt=""><div><b>${esc(p.nombre)}</b><small></small><div class="q"><label class="visually-hidden" for="q-${i}">Cantidad de ${esc(p.nombre)}</label><input id="q-${i}" type="number" min="1" step="1" value="${l.q}" inputmode="numeric" data-i="${i}"></div></div><button class="x" type="button" data-quitar="${i}" aria-label="Quitar ${esc(p.nombre)}">×</button></div>`; }).join("");
    pintarPie();
  }
  let abridorCajon = null;
  function abrirCajon(on) {
    const c = $("#cajon"), f = $("#cajon-fondo"); if (!c) return;
    if (on) { abridorCajon = document.activeElement; c.setAttribute("aria-hidden", "false"); f.setAttribute("data-on", ""); pintarCajon(); bloquearFondo(true); const b = $("[data-cerrar-cajon]", c); b && b.focus(); }
    else { const estaba = c.getAttribute("aria-hidden") === "false"; c.setAttribute("aria-hidden", "true"); f.removeAttribute("data-on"); if (estaba) { bloquearFondo(false); abridorCajon && abridorCajon.focus && abridorCajon.focus(); abridorCajon = null; } }
  }
  function bloquearFondo(on) { $$("header.cab, main, footer.pie").forEach(el => { el.inert = on; }); }

  let avisoT; function aviso(msg) { const a = $("#aviso"); if (!a) return; a.textContent = msg; a.setAttribute("data-on", ""); clearTimeout(avisoT); avisoT = setTimeout(() => a.removeAttribute("data-on"), 2600); }

  /* ---------- Tarjeta ---------- */
  function tarjeta(p) {
    const etq = [p.destacado ? '<span class="top">Más pedido</span>' : "", p.eco ? '<span class="eco">Eco</span>' : ""].join("");
    const hex = (p.coloresHex || []).filter(Boolean);
    const col = p.colores ? `<span class="colores">${hex.slice(0, 4).map(h => `<i style="--c:${esc(h)}"></i>`).join("")}${p.colores} ${p.colores === 1 ? "color" : "colores"}</span>` : "";
    const desde = p.desde ? `<div class="precio"><small>desde</small><b class="num">${eur(p.desde)}<i>/ud</i></b></div>` : `<div class="precio"><small>precio</small><b class="consultar">a consultar</b></div>`;
    return `<article class="card" data-id="${esc(p.id)}">
      <div class="card-img"><img src="${esc(p.img)}" alt="${esc(p.nombre)}" loading="lazy" width="700" height="700"></div>
      <div class="card-b"><div class="etq">${etq}<span class="card-sub">${esc(p.sub || catName(p.cat))}</span></div>
        <h3><a href="#p=${esc(p.id)}" data-ficha="${esc(p.id)}">${esc(p.nombre)}</a></h3>
        <span class="card-ref"><span class="marca">${esc(p.marca)}</span><span>${esc(p.ref)}</span>${col}</span>
        <div class="card-pie">${desde}<button class="add" type="button" data-add="${esc(p.id)}" aria-label="Añadir ${esc(p.nombre)} al presupuesto" title="Añadir al presupuesto (50 uds, 1 tinta)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>
      </div></article>`;
  }

  /* ---------- Ficha ---------- */
  let fichaQ = 50, fichaMarc = "t1", fichaId = null, fichaColor = "", abridorFicha = null;
  function abrirFicha(id) {
    const p = byId[id]; const m = $("#modal"); if (!p || !m) return;
    const yaAbierta = m.hasAttribute("open");
    if (!yaAbierta) abridorFicha = document.activeElement;
    fichaId = id; fichaQ = 50; fichaMarc = "t1"; fichaColor = colorNombre(p, 0);
    const gal = (p.galeria && p.galeria.length ? p.galeria : [p.img]);
    const hex = p.coloresHex || [];
    const conMuestras = hex.filter(Boolean).length > 1;
    const specs = [["Material", p.material], ["Capacidad", p.capacidad], ["Medidas", p.medidas], ["Marcaje", (p.tecnicas || []).join(", ")],
      ["Colores", p.colores ? (conMuestras ? p.colores + " (elige abajo)" : p.colores + (p.colores > 1 ? " colores, se ven en las fotos" : " color")) : ""],
      ["Disponibilidad", "Stock del proveedor (" + p.marca + "), se confirma al pedir"], ["Referencia", p.ref + " · " + p.marca]].filter(x => x[1]);
    $("#modal .modal-caja").innerHTML = `<button class="ficha-cerrar" type="button" data-cerrar aria-label="Cerrar ficha"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="ficha">
        <div class="galeria"><div class="principal"><img id="gal-img" src="${esc(gal[0])}" alt="${esc(p.nombre)}"></div>
          ${gal.length > 1 ? `<div class="minis" role="group" aria-label="Fotos del producto">${gal.map((g, i) => `<button type="button" data-gal="${esc(g)}" aria-current="${i === 0}" aria-label="Foto ${i + 1} de ${gal.length}"><img src="${esc(g)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</div>
        <div class="ficha-info">
          <div><span class="eyebrow">${esc(catName(p.cat))}${p.sub ? " · " + esc(p.sub) : ""}</span><h2 id="ficha-titulo">${esc(p.nombre)}</h2><div class="ref">Ref. ${esc(p.ref)}${p.eco ? " · <b style='color:var(--verde)'>Eco</b>" : ""}</div></div>
          ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
          <dl class="specs">${specs.map(s => `<dt>${s[0]}</dt><dd>${esc(s[1])}</dd>`).join("")}</dl>
          ${p.tallas && p.tallas.length ? `<div><div class="card-sub" style="margin-bottom:6px">Tallas (nos dices cuántas de cada al confirmar)</div><div class="tallas">${p.tallas.map(t => `<span>${esc(t)}</span>`).join("")}</div></div>` : ""}
          ${conMuestras ? `<div><div class="card-sub" style="margin-bottom:6px">Color: <b id="color-sel" style="text-transform:none;letter-spacing:0">${esc(fichaColor)}</b></div><div class="paleta" role="group" aria-label="Elige el color">${hex.map((h, i) => h ? `<button type="button" class="sw" data-color="${esc(colorNombre(p, i))}" aria-pressed="${i === 0}" style="--c:${esc(h)}" aria-label="${esc(colorNombre(p, i) || "color " + (i + 1))}" title="${esc(colorNombre(p, i))}"></button>` : "").join("")}</div></div>` : ""}
          <div class="calc" id="calc"></div>
        </div></div>`;
    pintarCalc();
    if (!yaAbierta) { m.setAttribute("open", ""); document.body.style.overflow = "hidden"; bloquearFondo(true); }
    $("#modal .ficha-cerrar").focus();
    if (location.hash !== "#p=" + id) history.replaceState(null, "", "#p=" + id);
  }
  function waFicha(p) { return `https://wa.me/${WA}?text=${encodeURIComponent(`Hola eTazas, quiero presupuesto de ${fichaQ} uds de ${p.nombre} (ref. ${p.ref}${fichaColor ? ", color " + fichaColor : ""}), ${MARCAJE[fichaMarc].n.toLowerCase()}. Os paso el logo por aquí.`)}`; }
  function pintarCalc(focoA) {
    const p = byId[fichaId]; const c = $("#calc"); if (!p || !c) return;
    const u = unitario(p, fichaQ, fichaMarc);
    c.innerHTML = `<div class="fila"><label>Cantidad<input type="number" id="calc-q" min="1" step="1" value="${fichaQ}" inputmode="numeric"></label>
      <label>Marcaje<select id="calc-m">${Object.entries(MARCAJE).map(([k, v]) => `<option value="${k}" ${k === fichaMarc ? "selected" : ""}>${v.n}${k === "t1" ? " (incluido)" : ""}</option>`).join("")}</select></label></div>
      ${p.base ? `<div class="tiers" role="group" aria-label="Precio por unidad según cantidad">${QTYS.map(q => `<button type="button" data-q="${q}" aria-pressed="${q === fichaQ}"><small>${q} ud${q > 1 ? "s" : ""}</small><b class="num">${eur(unitario(p, q, fichaMarc))}</b></button>`).join("")}</div>
      <div class="total"><div class="ud">Precio unidad <b class="num" id="calc-ud">${eur(u)}</b></div><div class="sum"><b class="num" id="calc-sum">${eur(u * fichaQ)}</b><small id="calc-n">${fichaQ} uds · IVA incluido</small></div></div>
      <p class="nota">Precio orientativo con marcaje ${MARCAJE[fichaMarc].n.toLowerCase()} incluido y sin envío. Te confirmamos precio cerrado, plazo y envío cuando nos pases el logo. Urgencias en 24-48 h.</p>` : `<p class="nota">Precio según cantidad y marcaje: te lo pasamos junto con el plazo y el envío. Pídenos presupuesto por WhatsApp o correo.</p>`}
      <div class="calc-btns"><button class="btn btn-p" type="button" data-add-ficha><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Añadir al presupuesto</button>
      <a class="btn btn-s" id="calc-wa" target="_blank" rel="noopener" href="${waFicha(p)}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2"/></svg>Pedir por WhatsApp</a></div>`;
    if (focoA) { const el = $(focoA, c); el && el.focus(); }
  }
  function refrescarCalc() {
    const p = byId[fichaId]; const c = $("#calc"); if (!p || !c) return;
    $$(".tiers button", c).forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.q) === fichaQ));
    const u = unitario(p, fichaQ, fichaMarc);
    if (u) { $("#calc-ud").textContent = eur(u); $("#calc-sum").textContent = eur(u * fichaQ); $("#calc-n").textContent = `${fichaQ} uds · IVA incluido`; }
    const wa = $("#calc-wa"); if (wa) wa.href = waFicha(p);
  }
  function cerrarFicha() {
    const m = $("#modal"); if (!m || !m.hasAttribute("open")) return;
    m.removeAttribute("open"); document.body.style.overflow = ""; bloquearFondo(false);
    if (/^#p=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
    abridorFicha && abridorFicha.focus && abridorFicha.focus(); abridorFicha = null;
  }

  /* ---------- Cabecera común ---------- */
  function pintarNav() {
    const ul = $("#navcat"); if (!ul) return;
    const cur = new URLSearchParams(location.search).get("cat");
    ul.innerHTML = `<li><a class="todo" href="catalogo.html">Todo el catálogo</a></li>` + CATS.map(c => `<li><a href="catalogo.html?cat=${esc(c.slug)}" ${cur === c.slug ? 'aria-current="page"' : ""}>${esc(c.nombre)}</a></li>`).join("");
  }
  function busqueda() {
    $$("form.busca").forEach(f => f.addEventListener("submit", e => { const q = f.querySelector("input").value.trim(); if (document.body.dataset.pagina !== "catalogo") { e.preventDefault(); location.href = "catalogo.html?q=" + encodeURIComponent(q); } }));
    const mb = $("#menu-btn"); if (mb) mb.addEventListener("click", () => { const b = $("form.busca"); b.classList.toggle("abierta"); const on = b.classList.contains("abierta"); mb.setAttribute("aria-expanded", on); if (on) b.querySelector("input").focus(); });
  }
  function ajustarScroll() { const cab = $(".cab"); if (cab) document.documentElement.style.scrollPaddingTop = (cab.offsetHeight + 12) + "px"; }

  /* ---------- Portada ---------- */
  function portada() {
    const tiles = $("#cats"); if (tiles) tiles.innerHTML = CATS.map(c => `<a class="cat" href="catalogo.html?cat=${esc(c.slug)}"><img src="${esc(c.img)}" alt="" loading="lazy" width="76" height="76"><span><b>${esc(c.nombre)}</b><span>${c.n} referencias</span></span></a>`).join("");
    const mos = $("#mosaico"); if (mos) { const top = P.filter(p => p.portada).slice(0, 4); mos.innerHTML = top.map((p, i) => `<a href="catalogo.html#p=${esc(p.id)}"><img src="${esc(p.img)}" alt="${esc(p.nombre)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="700" height="700"><span>${esc(catName(p.cat))}</span></a>`).join(""); }
    const mas = $("#mas-pedidos"); if (mas) mas.innerHTML = P.filter(p => p.destacado).slice(0, 8).map(tarjeta).join("");
    const sel = $("#f-producto"); if (sel) sel.innerHTML = `<option value="">Elige una categoría</option>` + CATS.map(c => `<option>${esc(c.nombre)}</option>`).join("") + `<option>Otro / varios</option>`;
    const f = $("#form-presu"); if (f) f.addEventListener("submit", e => {
      e.preventDefault(); const v = k => (f.elements[k] && f.elements[k].value || "").trim();
      if (!v("nombre") || !v("contacto")) { const ok = $("#form-ok"); if (ok) { ok.hidden = false; ok.textContent = "Necesitamos tu nombre y un teléfono o correo para responderte."; } (f.elements[v("nombre") ? "contacto" : "nombre"]).focus(); return; }
      const arch = f.elements.logo && f.elements.logo.files && f.elements.logo.files[0];
      const msg = `Hola eTazas, soy ${v("nombre")}${v("empresa") ? " (" + v("empresa") + ")" : ""}. Contacto: ${v("contacto")}.\nQuiero presupuesto: ${v("producto") || "varios productos"}, ${v("cantidad") || "?"} uds, ${v("tintas")}.${v("mensaje") ? "\n" + v("mensaje") : ""}${arch ? "\nOs paso el logo (" + arch.name + ") por aquí." : "\nOs paso el logo por aquí."}`;
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      const ok = $("#form-ok"); if (ok) { ok.hidden = false; ok.textContent = "Se ha abierto WhatsApp con tu solicitud. Adjunta ahí el logo (PDF, AI o PNG) o mándalo a info@etazas.com."; }
    });
    const inp = $("#f-logo"); if (inp) inp.addEventListener("change", () => { const t = $("#f-logo-txt"); if (t) t.textContent = inp.files[0] ? inp.files[0].name + " (te lo pediremos por WhatsApp)" : "Elige tu logo (PDF, AI o PNG)"; });
  }

  /* ---------- Catálogo ---------- */
  const PAG = 48;
  function catalogo() {
    const url = new URLSearchParams(location.search);
    const cat0 = url.get("cat") || "";
    const st = { cat: CATS.some(c => c.slug === cat0) ? cat0 : "", q: (url.get("q") || "").trim(), marca: [], eco: url.get("eco") === "1", tec: [], orden: "rel", pag: 1 };
    const inpQ = $("form.busca input"); if (inpQ && st.q) inpQ.value = st.q;
    const tecs = {}; P.forEach(p => (p.tecnicas || []).forEach(t => tecs[t] = (tecs[t] || 0) + 1));
    const TEC = Object.entries(tecs).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $("#filtros").innerHTML = `
      <fieldset class="filtro"><legend>Categoría</legend><label><input type="radio" name="cat" value="" ${!st.cat ? "checked" : ""}> Todas <span class="n">${P.length}</span></label>${CATS.map(c => `<label><input type="radio" name="cat" value="${esc(c.slug)}" ${st.cat === c.slug ? "checked" : ""}> ${esc(c.nombre)} <span class="n">${c.n}</span></label>`).join("")}</fieldset>
      <fieldset class="filtro"><legend>Catálogo de origen</legend>${["Makito", "Roly"].map(m => `<label><input type="checkbox" name="marca" value="${m}"> ${m} <span class="n">${P.filter(p => p.marca === m).length}</span></label>`).join("")}</fieldset>
      <fieldset class="filtro"><legend>Sostenible</legend><label><input type="checkbox" name="eco" ${st.eco ? "checked" : ""}> Solo productos eco <span class="n">${P.filter(p => p.eco).length}</span></label></fieldset>
      <fieldset class="filtro"><legend>Marcaje</legend>${TEC.map(([t, n]) => `<label><input type="checkbox" name="tec" value="${esc(t)}"> ${esc(t)} <span class="n">${n}</span></label>`).join("")}</fieldset>
      <div class="conectado"><i></i><span>Catálogo sincronizado con Makito y Roly: ${P.length} referencias con las fotos y los datos del proveedor.</span></div>
      <button class="btn btn-p" id="filtros-cerrar" type="button" hidden>Ver resultados</button>`;
    const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function filtrar() {
      const toks = norm(st.q).split(/\s+/).filter(Boolean);
      let r = P.filter(p => (!st.cat || p.cat === st.cat) && (!st.marca.length || st.marca.includes(p.marca)) && (!st.eco || p.eco) && (!st.tec.length || st.tec.some(t => (p.tecnicas || []).includes(t))));
      if (toks.length) r = r.filter(p => { const h = norm([p.nombre, p.ref, p.sub, catName(p.cat), p.material, p.desc, p.marca, (p.tecnicas || []).join(" ")].join(" ")); return toks.every(t => h.includes(t)); });
      if (st.orden === "asc") r.sort((a, b) => (a.desde || 9e9) - (b.desde || 9e9));
      else if (st.orden === "desc") r.sort((a, b) => (b.desde || 0) - (a.desde || 0));
      else if (st.orden === "nom") r.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      else r.sort((a, b) => (b.destacado - a.destacado) || (b.pick - a.pick) || 0);
      return r;
    }
    function pintar() {
      const r = filtrar();
      $("#cat-titulo").textContent = st.q ? `Resultados para «${st.q}»` : (st.cat ? catName(st.cat) : "Todo el catálogo");
      $("#cat-n").textContent = `${r.length} ${r.length === 1 ? "producto" : "productos"}${cat0 && !st.cat ? ` · la categoría «${cat0}» no existe, te enseñamos todo` : ""}`;
      document.title = (st.cat ? catName(st.cat) + " con tu logo" : "Catálogo") + " · eTazas";
      const chips = []; if (st.q) chips.push(["q", "Búsqueda: " + st.q]); if (st.cat) chips.push(["cat", catName(st.cat)]); st.marca.forEach(m => chips.push(["marca:" + m, m])); if (st.eco) chips.push(["eco", "Eco"]); st.tec.forEach(t => chips.push(["tec:" + t, t]));
      $("#chips").innerHTML = chips.map(c => `<button class="chip" type="button" data-chip="${esc(c[0])}" aria-label="Quitar filtro ${esc(c[1])}">${esc(c[1])}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`).join("");
      $("#grid").innerHTML = r.length ? r.slice(0, st.pag * PAG).map(tarjeta).join("") : `<div class="vacio" style="grid-column:1/-1">No hay productos con esos filtros. Prueba a quitar alguno o escríbenos.</div>`;
      $("#mas").hidden = r.length <= st.pag * PAG;
      const u = new URLSearchParams(); if (st.cat) u.set("cat", st.cat); if (st.q) u.set("q", st.q); if (st.eco) u.set("eco", "1");
      history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : "") + location.hash);
      $$("#navcat a").forEach(a => { const on = !!st.cat && a.getAttribute("href").endsWith("cat=" + st.cat); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    }
    $("#filtros").addEventListener("change", e => {
      const t = e.target; st.pag = 1;
      if (t.name === "cat") st.cat = t.value;
      if (t.name === "marca") st.marca = $$('input[name="marca"]:checked').map(i => i.value);
      if (t.name === "eco") st.eco = t.checked;
      if (t.name === "tec") st.tec = $$('input[name="tec"]:checked').map(i => i.value);
      pintar();
    });
    $("#chips").addEventListener("click", e => {
      const b = e.target.closest("[data-chip]"); if (!b) return; const k = b.dataset.chip; st.pag = 1;
      if (k === "q") { st.q = ""; if (inpQ) inpQ.value = ""; } else if (k === "cat") { st.cat = ""; $('input[name="cat"][value=""]').checked = true; }
      else if (k === "eco") { st.eco = false; $('input[name="eco"]').checked = false; }
      else if (k.startsWith("marca:")) { const m = k.slice(6); st.marca = st.marca.filter(x => x !== m); $$('input[name="marca"]').forEach(i => { if (i.value === m) i.checked = false; }); }
      else if (k.startsWith("tec:")) { const m = k.slice(4); st.tec = st.tec.filter(x => x !== m); $$('input[name="tec"]').forEach(i => { if (i.value === m) i.checked = false; }); }
      pintar();
    });
    $("#orden").addEventListener("change", e => { st.orden = e.target.value; st.pag = 1; pintar(); });
    $("#mas button").addEventListener("click", () => { st.pag++; pintar(); });
    const fb = $("#filtros-btn"), ff = $("#filtros"), fc = $("#filtros-cerrar");
    const cerrarFiltros = () => { ff.removeAttribute("data-on"); fc.hidden = true; fb.setAttribute("aria-expanded", "false"); fb.focus(); };
    if (fb) fb.addEventListener("click", () => { ff.setAttribute("data-on", ""); fc.hidden = false; fb.setAttribute("aria-expanded", "true"); const first = $("input", ff); first && first.focus(); });
    if (fc) fc.addEventListener("click", cerrarFiltros);
    window.cerrarFiltros = () => { if (ff && ff.hasAttribute("data-on")) cerrarFiltros(); };
    $("form.busca").addEventListener("submit", e => { e.preventDefault(); st.q = inpQ.value.trim(); st.pag = 1; pintar(); });
    if (inpQ) inpQ.addEventListener("input", () => { st.q = inpQ.value.trim(); st.pag = 1; pintar(); });
    pintar();
  }

  /* ---------- Eventos globales ---------- */
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-ficha]"); if (a) { e.preventDefault(); abrirFicha(a.dataset.ficha); return; }
    const ad = e.target.closest("[data-add]"); if (ad) { anadir(ad.dataset.add, 50, "t1", "", false); return; }
    if (e.target.closest("[data-add-ficha]")) { anadir(fichaId, fichaQ, fichaMarc, fichaColor, true); return; }
    if (e.target.closest("[data-cerrar]") || e.target.classList.contains("modal-fondo")) { cerrarFicha(); return; }
    const g = e.target.closest("[data-gal]"); if (g) { $("#gal-img").src = g.dataset.gal; $$(".minis button").forEach(b => b.setAttribute("aria-current", b === g)); return; }
    const sw = e.target.closest(".sw[data-color]"); if (sw) { fichaColor = sw.dataset.color; $$(".sw").forEach(b => b.setAttribute("aria-pressed", b === sw)); const cs = $("#color-sel"); if (cs) cs.textContent = fichaColor; refrescarCalc(); return; }
    const tq = e.target.closest(".tiers [data-q]"); if (tq) { fichaQ = Number(tq.dataset.q); const qi = $("#calc-q"); if (qi) qi.value = fichaQ; refrescarCalc(); return; }
    if (e.target.closest("[data-abrir-cajon]")) { e.preventDefault(); abrirCajon(true); return; }
    if (e.target.closest("[data-cerrar-cajon]") || e.target.id === "cajon-fondo") { abrirCajon(false); return; }
    const qt = e.target.closest("[data-quitar]"); if (qt) { const i = Number(qt.dataset.quitar); quitar(i); const sig = $(`.linea[data-i="${Math.min(i, presu.length - 1)}"] .x`) || $("[data-cerrar-cajon]"); sig && sig.focus(); return; }
    if (e.target.closest('[aria-disabled="true"]')) { e.preventDefault(); aviso("Añade algún producto antes de enviar."); }
  });
  document.addEventListener("input", e => {
    if (e.target.id === "calc-q") { fichaQ = entero(e.target.value); refrescarCalc(); }
    if (e.target.matches(".linea input")) { const i = Number(e.target.dataset.i); if (presu[i]) { presu[i].q = entero(e.target.value); guardar(); pintarPie(); } }
  });
  document.addEventListener("change", e => { if (e.target.id === "calc-m") { fichaMarc = e.target.value; pintarCalc("#calc-m"); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { cerrarFicha(); abrirCajon(false); if (window.cerrarFiltros) window.cerrarFiltros(); } });
  window.addEventListener("hashchange", () => { const m = location.hash.match(/^#p=(.+)$/); if (!m) { cerrarFicha(); return; } if (byId[m[1]]) abrirFicha(m[1]); else cerrarFicha(); });
  window.addEventListener("resize", ajustarScroll);

  pintarNav(); busqueda(); pintarCuenta(); ajustarScroll();
  if (document.body.dataset.pagina === "catalogo") catalogo(); else portada();
  const m0 = location.hash.match(/^#p=(.+)$/); if (m0 && byId[m0[1]]) abrirFicha(m0[1]);
  window.ETAZAS = { P, CATS, unitario };
})();

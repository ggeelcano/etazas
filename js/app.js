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
  const COLORES = { BLANCO: "#ffffff", NEGRO: "#1a1a1a", MARINO: "#1e2a4a", ROJO: "#c8102e", ROYAL: "#2457c5", "AZUL ROYAL": "#2457c5", "GRIS VIGORE": "#9a9a9a", "GRIS VIGORÉ": "#9a9a9a", "VERDE BOTELLA": "#1f4d3a", AMARILLO: "#f2c400", NARANJA: "#f26522", ROSA: "#e97fb3", "ROSA CLARO": "#f4b6cc", CELESTE: "#8fc7ea", TURQUESA: "#2ab5b1", GRANATE: "#6b1a2b", PURPURA: "#6a2c91", CHOCOLATE: "#4a2c1a", "VERDE MILITAR": "#4b5a2f", "VERDE IRISH": "#2e8b57", "VERDE GRASS": "#57a639", "PLOMO OSCURO": "#4a4a4a", PLOMO: "#6f6f6f", "AZUL DENIM": "#3b5a86", "AZUL OCEANO": "#1b6ca8", ROSETON: "#d64f8a", NOGAL: "#7b5a3a", ARENA: "#d9c7a8", BEIGE: "#d9c7a8", CRUDO: "#efe6d2", NATURAL: "#e8dcc3", ORO: "#c9a227", VERDE: "#2e8b57", AZUL: "#2457c5", GRIS: "#9a9a9a", MORADO: "#6a2c91", "VERDE LIMA": "#9ccc3c", "AMARILLO FLUOR": "#e8ff00", "NARANJA FLUOR": "#ff6a00", LILA: "#b48ad0", CORAL: "#ff6f61", BURDEOS: "#6b1a2b", AZUL_MARINO: "#1e2a4a", BLANCO_ROTO: "#f4efe6", "VERDE BOSQUE": "#1f4d3a", "AZUL CIELO": "#8fc7ea", "GRIS PERLA": "#c9c9c9", KAKI: "#8a7d4a", MOSTAZA: "#d9a400", MENTA: "#98d8c1", "VERDE MENTA": "#98d8c1" };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const eur = n => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const catName = slug => (CATS.find(c => c.slug === slug) || {}).nombre || slug;

  // precio unitario por cantidad: interpolación geométrica entre base (1 ud) y desde (250 uds)
  function unitario(p, q, marc) {
    const f = (MARCAJE[marc] || MARCAJE.t1).f;
    if (!p.base || !p.desde) return null;
    let u = q >= 250 ? p.desde : p.base * Math.pow(p.desde / p.base, Math.log(Math.max(1, q)) / Math.log(250));
    return Math.round(u * f * 100) / 100;
  }

  /* ---------- Presupuesto (localStorage) ---------- */
  const KEY = "etazas_presu_v1";
  let presu = [];
  try { presu = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { presu = []; }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(presu)); } catch (e) { } pintarCuenta(); }
  function pintarCuenta() { $$(".cuenta").forEach(el => { const n = presu.reduce((a, l) => a + 1, 0); el.textContent = n; el.hidden = n === 0; }); }
  function anadir(id, q, marc) {
    const l = presu.find(x => x.id === id && x.marc === marc);
    if (l) l.q = q; else presu.push({ id, q: q || 50, marc: marc || "t1" });
    guardar(); aviso("Añadido a tu presupuesto"); pintarCajon();
  }
  function quitar(i) { presu.splice(i, 1); guardar(); pintarCajon(); }
  function totalPresu() { return presu.reduce((a, l) => { const p = byId[l.id]; const u = p ? unitario(p, l.q, l.marc) : 0; return a + (u || 0) * l.q; }, 0); }
  function textoPresu() {
    const lineas = presu.map(l => { const p = byId[l.id]; if (!p) return ""; const u = unitario(p, l.q, l.marc); return `• ${l.q} × ${p.nombre} (ref. ${p.ref}, ${MARCAJE[l.marc].n})${u ? " ≈ " + eur(u) + "/ud" : ""}`; }).filter(Boolean);
    return `Hola eTazas, quiero presupuesto para:\n${lineas.join("\n")}\nTotal orientativo: ${eur(totalPresu())} (IVA incl.)\nOs paso el logo por aquí.`;
  }
  function pintarCajon() {
    const lista = $("#cajon-lista"); if (!lista) return;
    if (!presu.length) { lista.innerHTML = '<p class="vacio">Todavía no has añadido nada. Elige un producto y pulsa «Añadir al presupuesto».</p>'; }
    else lista.innerHTML = presu.map((l, i) => { const p = byId[l.id]; if (!p) return ""; const u = unitario(p, l.q, l.marc); return `<div class="linea"><img src="${esc(p.img)}" alt=""><div><b>${esc(p.nombre)}</b><small>Ref. ${esc(p.ref)} · ${MARCAJE[l.marc].n}${u ? " · " + eur(u) + "/ud" : ""}</small><div class="q"><input type="number" min="1" value="${l.q}" aria-label="Cantidad de ${esc(p.nombre)}" data-i="${i}"></div></div><button class="x" data-quitar="${i}" aria-label="Quitar ${esc(p.nombre)}">×</button></div>`; }).join("");
    const t = $("#cajon-total"); if (t) t.textContent = eur(totalPresu());
    const wa = $("#cajon-wa"); if (wa) { wa.href = `https://wa.me/${WA}?text=${encodeURIComponent(textoPresu())}`; wa.classList.toggle("btn-s", !presu.length); wa.classList.toggle("btn-p", !!presu.length); }
    const em = $("#cajon-mail"); if (em) em.href = `mailto:info@etazas.com?subject=${encodeURIComponent("Presupuesto merchandising")}&body=${encodeURIComponent(textoPresu())}`;
  }
  function abrirCajon(on) { const c = $("#cajon"), f = $("#cajon-fondo"); if (!c) return; c.setAttribute("aria-hidden", on ? "false" : "true"); if (on) { f.setAttribute("data-on", ""); pintarCajon(); $("#cajon .ficha-cerrar") && $("#cajon .ficha-cerrar").focus(); } else f.removeAttribute("data-on"); }

  let avisoT; function aviso(msg) { let a = $("#aviso"); if (!a) { a = document.createElement("div"); a.id = "aviso"; a.className = "aviso"; a.setAttribute("role", "status"); document.body.appendChild(a); } a.textContent = msg; a.setAttribute("data-on", ""); clearTimeout(avisoT); avisoT = setTimeout(() => a.removeAttribute("data-on"), 2200); }

  /* ---------- Tarjeta ---------- */
  function tarjeta(p) {
    const etq = [p.destacado ? '<span class="top">Más pedido</span>' : "", p.eco ? '<span class="eco">Eco</span>' : ""].join("");
    const col = p.colores ? `<span class="colores">${(p.coloresHex || []).slice(0, 4).map(h => `<i style="--c:${h}"></i>`).join("")}${p.colores} ${p.colores === 1 ? "color" : "colores"}</span>` : "";
    const desde = p.desde ? `<div class="precio"><small>desde</small><b class="num">${eur(p.desde)}<i>/ud</i></b></div>` : `<div class="precio"><small>precio</small><b>a consultar</b></div>`;
    return `<article class="card" data-id="${p.id}">
      <div class="etq">${etq}</div>
      <div class="card-img"><img src="${esc(p.img)}" alt="${esc(p.nombre)}" loading="lazy" width="700" height="700"></div>
      <div class="card-b"><span class="card-sub">${esc(catName(p.cat))}${p.sub ? " · " + esc(p.sub) : ""}</span>
        <h3><a href="#p=${p.id}" data-ficha="${p.id}">${esc(p.nombre)}</a></h3>
        <span class="card-ref"><span class="marca">${esc(p.marca)}</span> ${esc(p.ref)}${col ? " · " : ""}${col}</span>
        <div class="card-pie">${desde}<button class="add" data-add="${p.id}" aria-label="Añadir ${esc(p.nombre)} al presupuesto" title="Añadir al presupuesto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>
      </div></article>`;
  }

  /* ---------- Ficha ---------- */
  let fichaQ = 50, fichaMarc = "t1", fichaId = null;
  function abrirFicha(id) {
    const p = byId[id]; const m = $("#modal"); if (!p || !m) return;
    fichaId = id; fichaQ = 50; fichaMarc = "t1";
    const gal = (p.galeria && p.galeria.length ? p.galeria : [p.img]);
    const specs = [["Material", p.material], ["Capacidad", p.capacidad], ["Medidas", p.medidas], ["Marcaje", (p.tecnicas || []).join(", ")], ["Colores", p.colores ? p.colores + (p.coloresNombres && p.coloresNombres.length ? " (" + p.coloresNombres.slice(0, 8).join(", ").toLowerCase() + (p.coloresNombres.length > 8 ? "…" : "") + ")" : "") : ""], ["Proveedor", p.marca + " · ref. " + p.ref]].filter(x => x[1]);
    $("#modal .modal-caja").innerHTML = `<button class="ficha-cerrar" data-cerrar aria-label="Cerrar ficha"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="ficha">
        <div class="galeria"><div class="principal"><img id="gal-img" src="${esc(gal[0])}" alt="${esc(p.nombre)}"></div>
          ${gal.length > 1 ? `<div class="minis">${gal.map((g, i) => `<button data-gal="${esc(g)}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"><img src="${esc(g)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</div>
        <div class="ficha-info">
          <div><span class="eyebrow">${esc(catName(p.cat))}${p.sub ? " · " + esc(p.sub) : ""}</span><h2>${esc(p.nombre)}</h2><div class="ref">Ref. ${esc(p.ref)} · ${esc(p.marca)}${p.eco ? " · <b style='color:var(--verde)'>Eco</b>" : ""}</div></div>
          ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
          <dl class="specs">${specs.map(s => `<dt>${s[0]}</dt><dd>${esc(s[1])}</dd>`).join("")}</dl>
          ${p.tallas && p.tallas.length ? `<div><div class="card-sub" style="margin-bottom:6px">Tallas</div><div class="tallas">${p.tallas.map(t => `<span>${esc(t)}</span>`).join("")}</div></div>` : ""}
          ${p.coloresHex && p.coloresHex.length > 1 ? `<div class="paleta" aria-label="Colores disponibles">${p.coloresHex.map((h, i) => `<i style="--c:${h}" title="${esc((p.coloresNombres || [])[i] || "")}"></i>`).join("")}</div>` : ""}
          <div class="calc" id="calc"></div>
        </div></div>`;
    pintarCalc();
    m.setAttribute("open", ""); document.body.style.overflow = "hidden";
    $("#modal .ficha-cerrar").focus();
    if (location.hash !== "#p=" + id) history.replaceState(null, "", "#p=" + id);
  }
  function pintarCalc() {
    const p = byId[fichaId]; const c = $("#calc"); if (!p || !c) return;
    const u = unitario(p, fichaQ, fichaMarc);
    c.innerHTML = `<div class="fila"><label>Cantidad<input type="number" id="calc-q" min="1" value="${fichaQ}" inputmode="numeric"></label>
      <label>Marcaje<select id="calc-m">${Object.entries(MARCAJE).map(([k, v]) => `<option value="${k}" ${k === fichaMarc ? "selected" : ""}>${v.n}${k === "t1" ? " (incluido)" : ""}</option>`).join("")}</select></label></div>
      ${p.base ? `<div class="tiers" role="group" aria-label="Precio por unidad según cantidad">${QTYS.map(q => `<button data-q="${q}" aria-pressed="${q === fichaQ}"><small>${q} ud${q > 1 ? "s" : ""}</small><b class="num">${eur(unitario(p, q, fichaMarc))}</b></button>`).join("")}</div>
      <div class="total"><div class="ud">Precio unidad <b class="num">${eur(u)}</b></div><div class="sum"><b class="num">${eur(u * fichaQ)}</b><small>${fichaQ} uds · IVA incluido</small></div></div>
      <p class="nota">Precio orientativo con marcaje ${MARCAJE[fichaMarc].n.toLowerCase()} incluido. Te confirmamos el precio cerrado con tu logo en menos de 24 h.</p>` : `<p class="nota">Precio según cantidad y marcaje. Pídenos presupuesto y te lo mandamos en menos de 24 h.</p>`}
      <div class="calc-btns"><button class="btn btn-p" data-add-ficha><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Añadir al presupuesto</button>
      <a class="btn btn-s" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent(`Hola eTazas, quiero presupuesto de ${fichaQ} uds de ${p.nombre} (ref. ${p.ref}), ${MARCAJE[fichaMarc].n.toLowerCase()}. Os paso el logo por aquí.`)}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2"/></svg>Pedir por WhatsApp</a></div>`;
  }
  function cerrarFicha() { const m = $("#modal"); if (!m) return; m.removeAttribute("open"); document.body.style.overflow = ""; if (/^#p=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search); }

  /* ---------- Cabecera común ---------- */
  function pintarNav() {
    const ul = $("#navcat"); if (!ul) return;
    const cur = new URLSearchParams(location.search).get("cat");
    ul.innerHTML = `<li><a class="todo" href="catalogo.html">Todo el catálogo</a></li>` + CATS.map(c => `<li><a href="catalogo.html?cat=${c.slug}" ${cur === c.slug ? 'aria-current="page"' : ""}>${esc(c.nombre)}</a></li>`).join("");
  }
  function busqueda() {
    $$("form.busca").forEach(f => f.addEventListener("submit", e => { const q = f.querySelector("input").value.trim(); if (document.body.dataset.pagina !== "catalogo") { e.preventDefault(); location.href = "catalogo.html?q=" + encodeURIComponent(q); } }));
    const mb = $("#menu-btn"); if (mb) mb.addEventListener("click", () => { const b = $("form.busca"); b.classList.toggle("abierta"); if (b.classList.contains("abierta")) b.querySelector("input").focus(); });
  }

  /* ---------- Portada ---------- */
  function portada() {
    const tiles = $("#cats"); if (tiles) tiles.innerHTML = CATS.map(c => `<a class="cat" href="catalogo.html?cat=${c.slug}"><img src="${esc(c.img)}" alt="" loading="lazy" width="76" height="76"><span><b>${esc(c.nombre)}</b><span>${c.n} referencias</span></span></a>`).join("");
    const mos = $("#mosaico"); if (mos) { const top = P.filter(p => p.portada).slice(0, 5); mos.innerHTML = top.map((p, i) => `<a href="catalogo.html#p=${p.id}"><img src="${esc(p.img)}" alt="${esc(p.nombre)}" ${i ? 'loading="lazy"' : ""}><span>${esc(catName(p.cat))}</span></a>`).join(""); }
    const mas = $("#mas-pedidos"); if (mas) mas.innerHTML = P.filter(p => p.destacado).slice(0, 8).map(tarjeta).join("");
    const eco = $("#eco-grid"); if (eco) eco.innerHTML = P.filter(p => p.eco && p.pick).slice(0, 4).map(tarjeta).join("");
    const sel = $("#f-producto"); if (sel) sel.innerHTML = `<option value="">Elige una categoría</option>` + CATS.map(c => `<option>${esc(c.nombre)}</option>`).join("") + `<option>Otro / varios</option>`;
    const f = $("#form-presu"); if (f) f.addEventListener("submit", e => {
      e.preventDefault(); const v = k => (f.elements[k] && f.elements[k].value || "").trim();
      const arch = f.elements.logo && f.elements.logo.files && f.elements.logo.files[0];
      const msg = `Hola eTazas, soy ${v("nombre")}${v("empresa") ? " (" + v("empresa") + ")" : ""}.\nQuiero presupuesto: ${v("producto") || "varios productos"}, ${v("cantidad") || "?"} uds, ${v("tintas")}.${v("mensaje") ? "\n" + v("mensaje") : ""}${arch ? "\nOs paso el logo (" + arch.name + ") por aquí." : "\nOs paso el logo por aquí."}`;
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      const ok = $("#form-ok"); if (ok) { ok.hidden = false; ok.textContent = "Se ha abierto WhatsApp con tu solicitud. Si prefieres correo: info@etazas.com"; }
    });
    const inp = $("#f-logo"); if (inp) inp.addEventListener("change", () => { const t = $("#f-logo-txt"); if (t) t.textContent = inp.files[0] ? inp.files[0].name : "Arrastra o elige tu logo (PDF, AI, PNG)"; });
  }

  /* ---------- Catálogo ---------- */
  const PAG = 48;
  function catalogo() {
    const url = new URLSearchParams(location.search);
    const st = { cat: url.get("cat") || "", q: url.get("q") || "", marca: [], eco: url.get("eco") === "1", tec: [], orden: "rel", pag: 1 };
    const inpQ = $("form.busca input"); if (inpQ && st.q) inpQ.value = st.q;
    const tecs = {}; P.forEach(p => (p.tecnicas || []).forEach(t => tecs[t] = (tecs[t] || 0) + 1));
    const TEC = Object.entries(tecs).sort((a, b) => b[1] - a[1]).slice(0, 7);
    $("#filtros").innerHTML = `
      <div class="filtro"><h3>Categoría</h3><label><input type="radio" name="cat" value="" ${!st.cat ? "checked" : ""}> Todas <span class="n">${P.length}</span></label>${CATS.map(c => `<label><input type="radio" name="cat" value="${c.slug}" ${st.cat === c.slug ? "checked" : ""}> ${esc(c.nombre)} <span class="n">${c.n}</span></label>`).join("")}</div>
      <div class="filtro"><h3>Proveedor</h3>${["Makito", "Roly"].map(m => `<label><input type="checkbox" name="marca" value="${m}"> ${m} <span class="n">${P.filter(p => p.marca === m).length}</span></label>`).join("")}</div>
      <div class="filtro"><h3>Sostenible</h3><label><input type="checkbox" name="eco" ${st.eco ? "checked" : ""}> Solo productos eco <span class="n">${P.filter(p => p.eco).length}</span></label></div>
      <div class="filtro"><h3>Técnica de marcaje</h3>${TEC.map(([t, n]) => `<label><input type="checkbox" name="tec" value="${esc(t)}"> ${esc(t)} <span class="n">${n}</span></label>`).join("")}</div>
      <div class="conectado"><i></i><span>Catálogo sincronizado con Makito y Roly: ${P.length} referencias, stock y fotos del proveedor.</span></div>`;
    const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function filtrar() {
      const q = norm(st.q); const toks = q.split(/\s+/).filter(Boolean);
      let r = P.filter(p => (!st.cat || p.cat === st.cat) && (!st.marca.length || st.marca.includes(p.marca)) && (!st.eco || p.eco) && (!st.tec.length || st.tec.every(t => (p.tecnicas || []).includes(t))));
      if (toks.length) r = r.filter(p => { const h = norm([p.nombre, p.ref, p.sub, catName(p.cat), p.material, p.desc].join(" ")); return toks.every(t => h.includes(t)); });
      if (st.orden === "asc") r.sort((a, b) => (a.desde || 9e9) - (b.desde || 9e9));
      else if (st.orden === "desc") r.sort((a, b) => (b.desde || 0) - (a.desde || 0));
      else if (st.orden === "nom") r.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      else r.sort((a, b) => (b.destacado - a.destacado) || (b.pick - a.pick) || 0);
      return r;
    }
    function pintar() {
      const r = filtrar();
      $("#cat-titulo").textContent = st.q ? `Resultados para «${st.q}»` : (st.cat ? catName(st.cat) : "Todo el catálogo");
      $("#cat-n").textContent = `${r.length} ${r.length === 1 ? "producto" : "productos"}`;
      document.title = (st.cat ? catName(st.cat) + " personalizadas" : "Catálogo") + " · eTazas";
      const chips = []; if (st.q) chips.push(["q", "Búsqueda: " + st.q]); if (st.cat) chips.push(["cat", catName(st.cat)]); st.marca.forEach(m => chips.push(["marca:" + m, m])); if (st.eco) chips.push(["eco", "Eco"]); st.tec.forEach(t => chips.push(["tec:" + t, t]));
      $("#chips").innerHTML = chips.map(c => `<button class="chip" data-chip="${esc(c[0])}" aria-label="Quitar filtro ${esc(c[1])}">${esc(c[1])}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`).join("");
      const g = $("#grid");
      g.innerHTML = r.length ? r.slice(0, st.pag * PAG).map(tarjeta).join("") : `<div class="vacio" style="grid-column:1/-1">No hay productos con esos filtros. Prueba a quitar alguno o escríbenos: seguro que lo tenemos.</div>`;
      $("#mas").hidden = r.length <= st.pag * PAG;
      const u = new URLSearchParams(); if (st.cat) u.set("cat", st.cat); if (st.q) u.set("q", st.q); if (st.eco) u.set("eco", "1");
      history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : "") + location.hash);
      $$("#navcat a").forEach(a => a.toggleAttribute("aria-current", a.getAttribute("href").endsWith("cat=" + st.cat) && !!st.cat));
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
      else if (k.startsWith("marca:")) { const m = k.slice(6); st.marca = st.marca.filter(x => x !== m); $(`input[name="marca"][value="${m}"]`).checked = false; }
      else if (k.startsWith("tec:")) { const m = k.slice(4); st.tec = st.tec.filter(x => x !== m); $$('input[name="tec"]').forEach(i => { if (i.value === m) i.checked = false; }); }
      pintar();
    });
    $("#orden").addEventListener("change", e => { st.orden = e.target.value; st.pag = 1; pintar(); });
    $("#mas button").addEventListener("click", () => { st.pag++; pintar(); });
    const fb = $("#filtros-btn"), ff = $("#filtros"), fc = $("#filtros-cerrar");
    if (fb) fb.addEventListener("click", () => { ff.setAttribute("data-on", ""); fc.hidden = false; fc.focus(); });
    if (fc) fc.addEventListener("click", () => { ff.removeAttribute("data-on"); fc.hidden = true; fb.focus(); });
    $("form.busca").addEventListener("submit", e => { e.preventDefault(); st.q = inpQ.value.trim(); st.pag = 1; pintar(); });
    if (inpQ) inpQ.addEventListener("input", () => { st.q = inpQ.value.trim(); st.pag = 1; pintar(); });
    pintar();
  }

  /* ---------- Eventos globales ---------- */
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-ficha]"); if (a) { e.preventDefault(); abrirFicha(a.dataset.ficha); return; }
    const ad = e.target.closest("[data-add]"); if (ad) { anadir(ad.dataset.add, 50, "t1"); return; }
    if (e.target.closest("[data-add-ficha]")) { anadir(fichaId, fichaQ, fichaMarc); return; }
    if (e.target.closest("[data-cerrar]") || e.target.classList.contains("modal-fondo")) { cerrarFicha(); return; }
    const g = e.target.closest("[data-gal]"); if (g) { $("#gal-img").src = g.dataset.gal; $$(".minis button").forEach(b => b.setAttribute("aria-current", b === g)); return; }
    const tq = e.target.closest(".tiers [data-q]"); if (tq) { fichaQ = Number(tq.dataset.q); pintarCalc(); return; }
    if (e.target.closest("[data-abrir-cajon]")) { e.preventDefault(); abrirCajon(true); return; }
    if (e.target.closest("[data-cerrar-cajon]") || e.target.id === "cajon-fondo") { abrirCajon(false); return; }
    const qt = e.target.closest("[data-quitar]"); if (qt) { quitar(Number(qt.dataset.quitar)); return; }
  });
  document.addEventListener("input", e => {
    if (e.target.id === "calc-q") { fichaQ = Math.max(1, Number(e.target.value) || 1); const c = $("#calc"); $$(".tiers button", c).forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.q) === fichaQ)); const p = byId[fichaId]; const u = unitario(p, fichaQ, fichaMarc); if (u) { $(".total .ud b", c).textContent = eur(u); $(".total .sum b", c).textContent = eur(u * fichaQ); $(".total .sum small", c).textContent = `${fichaQ} uds · IVA incluido`; } }
    if (e.target.matches(".linea input")) { const i = Number(e.target.dataset.i); presu[i].q = Math.max(1, Number(e.target.value) || 1); guardar(); const t = $("#cajon-total"); if (t) t.textContent = eur(totalPresu()); const wa = $("#cajon-wa"); if (wa) wa.href = `https://wa.me/${WA}?text=${encodeURIComponent(textoPresu())}`; }
  });
  document.addEventListener("change", e => { if (e.target.id === "calc-m") { fichaMarc = e.target.value; pintarCalc(); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { cerrarFicha(); abrirCajon(false); const ff = $("#filtros"); if (ff && ff.hasAttribute("data-on")) { ff.removeAttribute("data-on"); $("#filtros-cerrar").hidden = true; } } });
  window.addEventListener("hashchange", () => { const m = location.hash.match(/^#p=(.+)$/); if (m) abrirFicha(m[1]); });

  pintarNav(); busqueda(); pintarCuenta();
  if (document.body.dataset.pagina === "catalogo") catalogo(); else portada();
  const m0 = location.hash.match(/^#p=(.+)$/); if (m0 && byId[m0[1]]) abrirFicha(m0[1]);
  window.ETAZAS = { P, CATS, unitario };
})();

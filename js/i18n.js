/* eTazas demo — idioma (castellano / catalán). Va en <head>, antes del CSS, para fijar <html lang> cuanto antes.
   Orden de preferencia: ?lang=ca|es en la URL (se recuerda) > lo recordado en el navegador > idioma del navegador > castellano. */
(function () {
  "use strict";
  var KEY = "etazas_lang", lang = null;
  try {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "ca" || q === "es") { lang = q; try { localStorage.setItem(KEY, q); } catch (e) { } }
    else { try { lang = localStorage.getItem(KEY); } catch (e) { } }
  } catch (e) { }
  if (lang !== "ca" && lang !== "es") lang = /^ca\b/i.test(navigator.language || "") ? "ca" : "es";
  document.documentElement.lang = lang;
  document.documentElement.setAttribute("data-lang", lang);

  var TX = window.TEXTOS || { es: {}, ca: {} };
  function T(clave, vars) {
    var s = (TX[lang] || {})[clave];
    if (s == null) s = (TX.es || {})[clave];
    if (s == null) return clave;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }

  // Sustituye solo el último nodo de texto con contenido (respeta iconos SVG y espacios de los extremos).
  function setTexto(el, s) {
    var nodos = [], i, n;
    for (i = 0; i < el.childNodes.length; i++) { n = el.childNodes[i]; if (n.nodeType === 3 && n.nodeValue.trim()) nodos.push(n); }
    if (!nodos.length) { if (!el.children.length) el.textContent = s; else el.appendChild(document.createTextNode(s)); return; }
    n = nodos[nodos.length - 1];
    var v = n.nodeValue, pre = v.match(/^\s*/)[0], post = v.match(/\s*$/)[0];
    n.nodeValue = pre + s + post;
  }
  function aplicarDom(root) {
    root = root || document;
    if (lang !== "es") {
      var i, el, lista;
      lista = root.querySelectorAll("[data-i18n]");
      for (i = 0; i < lista.length; i++) { el = lista[i]; var s = T(el.getAttribute("data-i18n")); if (s !== el.getAttribute("data-i18n")) setTexto(el, s); }
      lista = root.querySelectorAll("[data-i18n-html]");
      for (i = 0; i < lista.length; i++) { el = lista[i]; var h = T(el.getAttribute("data-i18n-html")); if (h !== el.getAttribute("data-i18n-html")) el.innerHTML = h; }
      lista = root.querySelectorAll("[data-i18n-attr]");
      for (i = 0; i < lista.length; i++) {
        el = lista[i];
        el.getAttribute("data-i18n-attr").split(";").forEach(function (par) {
          var p = par.indexOf(":"); if (p < 0) return;
          var a = par.slice(0, p).trim(), k = par.slice(p + 1).trim(), v = T(k);
          if (a && v !== k) el.setAttribute(a, v);
        });
      }
    }
    selector();
  }
  // Selector ES | CA. Con barra de categorías va en las dos: en la cabecera (visible en ordenador) y a la derecha de la barra
  // (visible en móvil); el CSS enseña solo uno. Sin barra, solo en las acciones de la cabecera.
  function urlIdioma(l) { var u = new URL(location.href); u.searchParams.set("lang", l); return u.pathname + u.search + u.hash; }
  function selector() {
    if (document.querySelector(".idioma")) return;
    var enlace = function (l, nombre) { return '<a href="' + urlIdioma(l) + '" lang="' + l + '" hreflang="' + l + '" title="' + nombre + '"' + (l === lang ? ' aria-current="true"' : "") + ">" + l.toUpperCase() + "</a>"; };
    var html = function (cls) { return '<div class="idioma' + cls + '" role="group" aria-label="' + T("idioma.aria") + '">' + enlace("es", T("idioma.es")) + enlace("ca", T("idioma.ca")) + "</div>"; };
    var nav = document.querySelector(".navcat .wrap"), acc = document.querySelector(".cab .acciones");
    if (nav) { nav.insertAdjacentHTML("beforeend", html(" idioma-nav")); if (acc) acc.insertAdjacentHTML("afterbegin", html(" idioma-cab")); }
    else if (acc) acc.insertAdjacentHTML("afterbegin", html(""));
  }
  // Catálogo en catalán: se aplica sobre los datos en memoria antes de que app.js los lea. Guarda el texto castellano para que el buscador encuentre las dos lenguas.
  function aplicarCatalogo(D, CA) {
    if (lang !== "ca" || !D || !CA) return;
    var i, p, t;
    (D.categorias || []).forEach(function (c) { if (CA.categorias && CA.categorias[c.slug]) { c.nombreEs = c.nombre; c.nombre = CA.categorias[c.slug]; } });
    var tec = CA.tecnicas || {}, sub = CA.sub || {}, mat = CA.material || {}, col = CA.colores || {}, med = CA.medidas || {}, prod = CA.productos || {};
    for (i = 0; i < (D.productos || []).length; i++) {
      p = D.productos[i]; t = prod[p.id];
      p.busqEs = [p.nombre, p.sub, p.desc, p.material].filter(Boolean).join(" ");
      if (t) { if (t.nombre) p.nombre = t.nombre; if (t.desc) p.desc = t.desc; }
      if (p.sub && sub[p.sub]) p.sub = sub[p.sub];
      if (p.material && mat[p.material]) p.material = mat[p.material];
      if (p.tecnicas) p.tecnicas = p.tecnicas.map(function (x) { return tec[x] || x; });
      if (p.coloresNombres) p.coloresNombres = p.coloresNombres.map(function (x) { return col[x] || x; });
      if (p.medidas) p.medidas = p.medidas.replace(/\b(alto|ancho|largo|fondo|grosor|diámetro)\b/g, function (m) { return med[m] || m; });
    }
  }
  window.I18N = { lang: lang, T: T, aplicarDom: aplicarDom, aplicarCatalogo: aplicarCatalogo, urlIdioma: urlIdioma, otro: lang === "ca" ? "es" : "ca" };
})();

/* =====================================================================
   CONTIDELICIAS — Utilidades de interfaz compartidas
   ===================================================================== */
(function () {
  "use strict";

  /* ---- Toast / notificaciones ---- */
  function toast(msg, type) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "toast " + (type || "");
    const ico = type === "ok" ? "✅" : type === "error" ? "⛔" : type === "warn" ? "⚠️" : "🔔";
    t.innerHTML = `<span>${ico}</span><span>${msg}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, 3200);
  }

  /* ---- Formato de dinero (Bolivianos) ---- */
  function bs(n) { return Number(n).toFixed(2) + " Bs"; }

  /* ---- Escapar HTML ---- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  /* ---- Generador de "QR" decorativo (SVG determinístico por semilla) ---- */
  function fakeQR(seed, size) {
    size = size || 21;                       // módulos por lado
    let h = 0; const str = String(seed || "CN");
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
    const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    const cell = 100 / size;
    let rects = "";
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Marcadores de posición en las tres esquinas
        const corner = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
        let on;
        if (corner) {
          const cx = x >= size - 7 ? x - (size - 7) : x;
          const cy = y >= size - 7 ? y - (size - 7) : y;
          const ring = cx === 0 || cx === 6 || cy === 0 || cy === 6;
          const core = cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4;
          on = ring || core;
        } else {
          on = rnd() > 0.5;
        }
        if (on) rects += `<rect x="${(x*cell).toFixed(2)}" y="${(y*cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
      }
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="#fff"/><g fill="#1c1712">${rects}</g></svg>`;
  }

  window.UI = { toast, bs, esc, fakeQR };
})();

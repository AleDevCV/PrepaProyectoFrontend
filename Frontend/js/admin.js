/* =====================================================================
   CONTIDELICIAS — Panel del Administrador
   B) Gestión de Producción y Pagos
   Pestañas: Pedidos Pendientes · Agenda de Producción · Validación de Pagos
   ===================================================================== */
(function () {
  "use strict";
  const { toast, bs, esc } = window.UI;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const ESTADOS = [
    { v: "recibido",  t: "Recibido" },
    { v: "en_cocina", t: "En Producción" },
    { v: "listo",     t: "Listo para Recojo" },
    { v: "entregado", t: "Entregado" },
  ];
  const badgePago = {
    aprobado:  '<span class="badge badge-green">Aprobado</span>',
    pendiente: '<span class="badge badge-amber">Por validar</span>',
    rechazado: '<span class="badge badge-red">Rechazado</span>',
  };
  const badgeProd = {
    recibido:  '<span class="badge badge-blue">Recibido</span>',
    en_cocina: '<span class="badge badge-amber">En Producción</span>',
    listo:     '<span class="badge badge-green">Listo</span>',
    entregado: '<span class="badge badge-gray">Entregado</span>',
  };

  /* ---------------- Pestañas ---------------- */
  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    ["pedidos", "agenda", "pagos"].forEach(id =>
      $("#tab-" + id).classList.toggle("hidden", id !== tab.dataset.tab));
  }));

  /* ---------------- Barra de capacidad (Hoy) ---------------- */
  function renderCapacity() {
    const cap = Store.capacidadDia(Store.HOY);
    $("#capacityBar").innerHTML = `
      <span class="cap-title">⚠️ Control de Producción Diaria</span>
      <span class="cap-item">Capacidad Máxima Diaria: <b>${cap.max} Cajas</b></span>
      <span class="cap-item">Reservada Hoy (${Store.nombreDia(Store.HOY)}): <b>${cap.usadas} Cajas (${cap.pct}%)</b></span>
      <div class="cap-meter"><span style="width:${cap.pct}%"></span></div>`;
  }

  /* ---------------- Pestaña: Pedidos Pendientes ---------------- */
  function renderPedidos() {
    const pedidos = Store.getPedidos().filter(p => p.estadoPago !== "rechazado" && p.estadoPedido !== "entregado");
    const total = pedidos.length;
    const enProd = pedidos.filter(p => p.estadoPedido === "en_cocina").length;
    const listos = pedidos.filter(p => p.estadoPedido === "listo").length;
    const recaudado = pedidos.reduce((a, p) => a + (p.montoPagado || 0), 0);

    const kpis = `
      <div class="kpi-row">
        <div class="card kpi"><span class="kpi-ico">📦</span><div class="kpi-val">${total}</div><div class="kpi-lbl">Pedidos activos</div></div>
        <div class="card kpi"><span class="kpi-ico">👨‍🍳</span><div class="kpi-val">${enProd}</div><div class="kpi-lbl">En producción</div></div>
        <div class="card kpi"><span class="kpi-ico">✅</span><div class="kpi-val">${listos}</div><div class="kpi-lbl">Listos para recojo</div></div>
        <div class="card kpi"><span class="kpi-ico">💰</span><div class="kpi-val" style="font-size:1.35rem">${bs(recaudado)}</div><div class="kpi-lbl">Recaudado (activos)</div></div>
      </div>`;

    let content;
    if (!total) {
      content = `<div class="empty"><div class="em-ico">📋</div><p>No hay pedidos pendientes en este momento.</p></div>`;
    } else {
      const rows = pedidos.map(p => `
        <tr>
          <td><span class="mono">${esc(p.code)}</span></td>
          <td>${esc(p.cliente)}<div style="font-size:.78rem;color:var(--muted)">${esc(p.telefono || "")}</div></td>
          <td>${esc(p.detalle)}<div style="font-size:.78rem;color:var(--muted)">${p.cajas} caja(s)</div></td>
          <td>${Store.nombreDia(p.fechaEntrega)} ${Store.fechaCorta(p.fechaEntrega)}<div style="font-size:.78rem;color:var(--muted)">${esc(p.horaEntrega)}</div></td>
          <td>${badgePago[p.estadoPago]}</td>
          <td>
            <select class="state-select" data-state="${esc(p.code)}" ${p.estadoPago !== "aprobado" ? "disabled title='Requiere pago aprobado'" : ""}>
              ${ESTADOS.map(s => `<option value="${s.v}" ${s.v === p.estadoPedido ? "selected" : ""}>${s.t}</option>`).join("")}
            </select>
            ${p.estadoPago !== "aprobado" ? '<div style="font-size:.72rem;color:var(--amber-600);margin-top:.2rem">⏳ Esperando validación de pago</div>' : ""}
          </td>
        </tr>`).join("");
      content = `<div class="table-wrap"><table class="data">
        <thead><tr><th>Código</th><th>Cliente</th><th>Detalle</th><th>Entrega</th><th>Pago</th><th>Estado de Producción</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    }
    $("#tab-pedidos").innerHTML = `<h2 class="panel-title">Gestión de Pedidos</h2>${kpis}${content}`;

    $$("[data-state]").forEach(sel => sel.addEventListener("change", () => {
      Store.updatePedido(sel.dataset.state, { estadoPedido: sel.value });
      toast(`Pedido ${sel.dataset.state} → ${ESTADOS.find(e => e.v === sel.value).t}`, "ok");
      renderAll();
    }));
  }

  /* ---------------- Pestaña: Agenda de Producción ---------------- */
  function renderAgenda() {
    const pedidos = Store.getPedidos().filter(p => p.estadoPago !== "rechazado" && p.estadoPedido !== "entregado");
    const fechas = [...new Set(pedidos.map(p => p.fechaEntrega))].sort();
    let content;
    if (!fechas.length) {
      content = `<div class="empty"><div class="em-ico">📅</div><p>La agenda de producción está vacía.</p></div>`;
    } else {
      content = `<div class="agenda-grid">${fechas.map(iso => {
        const cap = Store.capacidadDia(iso);
        const cls = cap.pct >= 100 ? "full" : cap.pct >= 70 ? "mid" : "ok";
        const delDia = pedidos.filter(p => p.fechaEntrega === iso);
        return `<div class="card day-card">
          <div class="day-head">
            <span class="day-name">${Store.nombreDia(iso)}</span>
            <span class="day-date">${Store.fechaCorta(iso)}</span>
          </div>
          <div class="day-load">${cap.usadas} de ${cap.max} cajas · <b>${cap.pct}%</b></div>
          <div class="day-meter ${cls}"><span style="width:${cap.pct}%"></span></div>
          <div class="day-orders">${delDia.map(p => `
            <div class="day-order">
              <span><span class="mono" style="font-size:.8rem">${esc(p.code)}</span> · ${esc(p.cliente)}</span>
              <span>${p.cajas}📦 ${badgeProd[p.estadoPedido]}</span>
            </div>`).join("")}</div>
        </div>`;
      }).join("")}</div>`;
    }
    $("#tab-agenda").innerHTML = `<h2 class="panel-title">Agenda de Producción · Capacidad máxima ${Store.CAPACIDAD_MAXIMA_DIARIA} cajas/día</h2>${content}`;
  }

  /* ---------------- Pestaña: Registro de Pagos ---------------- */
  function renderPagos() {
    const pagos = Store.getPedidos().filter(p => p.estadoPago !== "rechazado");
    const recaudado = pagos.reduce((a, p) => a + (p.montoPagado || 0), 0);

    const resumen = `
      <div class="kpi-row">
        <div class="card kpi"><span class="kpi-ico">💳</span><div class="kpi-val">${pagos.length}</div><div class="kpi-lbl">Pagos registrados</div></div>
        <div class="card kpi"><span class="kpi-ico">💰</span><div class="kpi-val" style="font-size:1.35rem">${bs(recaudado)}</div><div class="kpi-lbl">Total recaudado</div></div>
        <div class="card kpi"><span class="kpi-ico">⚡</span><div class="kpi-val">Automática</div><div class="kpi-lbl">Aprobación de pagos</div></div>
      </div>`;

    let content;
    if (!pagos.length) {
      content = `<div class="empty"><div class="em-ico">💳</div><p>Aún no hay pagos registrados.</p></div>`;
    } else {
      const rows = pagos.map(p => `
        <tr>
          <td><span class="mono">${esc(p.code)}</span></td>
          <td>${esc(p.cliente)}</td>
          <td><span class="card-tag">💳 ${esc(p.metodoPago)}</span><div style="font-size:.74rem;color:var(--muted)">${esc(p.ref || "")}</div></td>
          <td><b>${bs(p.montoPagado)}</b><div style="font-size:.74rem;color:var(--muted)">${esc(p.tipoPago)}</div></td>
          <td>${esc(p.fechaSubida)}</td>
          <td><span class="badge badge-green">✓ Aprobado</span></td>
        </tr>`).join("");
      content = `<div class="table-wrap"><table class="data">
        <thead><tr><th>Código</th><th>Cliente</th><th>Método</th><th>Monto</th><th>Fecha / hora</th><th>Estado</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    }
    $("#tab-pagos").innerHTML = `<h2 class="panel-title">Registro de Pagos · Pasarela automática</h2>${resumen}${content}`;
  }

  /* ---------------- Reiniciar demo ---------------- */
  $("#resetBtn").addEventListener("click", () => {
    if (confirm("¿Restaurar los datos de demostración a su estado inicial?")) {
      Store.reset(); renderAll(); toast("Datos de demostración reiniciados", "ok");
    }
  });

  /* ---------------- Render global ---------------- */
  function renderAll() { renderCapacity(); renderPedidos(); renderAgenda(); renderPagos(); }
  renderAll();
})();

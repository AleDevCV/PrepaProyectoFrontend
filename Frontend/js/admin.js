/* =====================================================================
   CONTIDELICIAS — Panel del Administrador
   B) Gestión de Producción y Pagos
   Pestañas: Pedidos Pendientes · Agenda de Producción · Validación de Pagos
   ===================================================================== */
(function () {
  "use strict";
  const { toast, bs, esc, fakeQR } = window.UI;
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
    const porValidar = pedidos.filter(p => p.estadoPago === "pendiente").length;

    const kpis = `
      <div class="kpi-row">
        <div class="card kpi"><span class="kpi-ico">📦</span><div class="kpi-val">${total}</div><div class="kpi-lbl">Pedidos activos</div></div>
        <div class="card kpi"><span class="kpi-ico">👨‍🍳</span><div class="kpi-val">${enProd}</div><div class="kpi-lbl">En producción</div></div>
        <div class="card kpi"><span class="kpi-ico">✅</span><div class="kpi-val">${listos}</div><div class="kpi-lbl">Listos para recojo</div></div>
        <div class="card kpi"><span class="kpi-ico">⏳</span><div class="kpi-val">${porValidar}</div><div class="kpi-lbl">Pagos por validar</div></div>
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

  /* ---------------- Pestaña: Validación de Pagos ---------------- */
  function renderPagos() {
    const pendientes = Store.getPedidos().filter(p => p.estadoPago === "pendiente");
    $("#pagosBadge").textContent = pendientes.length;
    $("#pagosBadge").style.display = pendientes.length ? "" : "none";

    let content;
    if (!pendientes.length) {
      content = `<div class="empty"><div class="em-ico">💲</div><p>No hay comprobantes pendientes de validación. ¡Todo al día!</p></div>`;
    } else {
      content = pendientes.map(p => `
        <div class="card pay-card">
          <div class="pay-main">
            <div class="pay-info">
              <div class="pay-code">Pedido: ${esc(p.code)}</div>
              <div class="pay-line">Cliente: <b>${esc(p.cliente)}</b></div>
              <div class="pay-line">Monto: <span class="pay-amount">${bs(p.montoPagado)}</span> <span style="color:var(--muted)">(${esc(p.tipoPago)})</span></div>
            </div>
            <div class="pay-qr">${fakeQR(p.code + p.metodoPago)}</div>
            <a class="view-proof" data-proof="${esc(p.code)}">🖼️ Ver Comprobante<br><small style="font-weight:400">(${esc(p.comprobante)})</small></a>
            <div class="pay-actions">
              <button class="btn btn-green btn-sm" data-approve="${esc(p.code)}">✓ Aprobar</button>
              <button class="btn btn-red btn-sm" data-reject="${esc(p.code)}">✕ Rechazar</button>
            </div>
          </div>
          <div class="pay-foot">
            <span>📅 Subido: <b>${esc(p.fechaSubida)}</b></span>
            <span>🏦 Método: <b>${esc(p.metodoPago)}</b></span>
            <span>Estado: <span class="st-pending">Pendiente de validación</span></span>
          </div>
        </div>`).join("");
    }
    $("#tab-pagos").innerHTML = `<h2 class="panel-title">Lista de Comprobantes por Verificar</h2>${content}`;

    $$("[data-approve]").forEach(b => b.addEventListener("click", () => {
      Store.updatePedido(b.dataset.approve, { estadoPago: "aprobado", estadoPedido: "en_cocina" });
      toast(`Pago del pedido ${b.dataset.approve} aprobado · producción iniciada`, "ok");
      renderAll();
    }));
    $$("[data-reject]").forEach(b => b.addEventListener("click", () => {
      Store.updatePedido(b.dataset.reject, { estadoPago: "rechazado" });
      toast(`Comprobante del pedido ${b.dataset.reject} rechazado`, "error");
      renderAll();
    }));
    $$("[data-proof]").forEach(a => a.addEventListener("click", () => openProof(a.dataset.proof)));
  }

  /* ---------------- Modal: ver comprobante ---------------- */
  const proofOverlay = $("#proofOverlay"), proofModal = $("#proofModal");
  proofModal.style.transition = "transform .22s ease, opacity .22s ease";
  proofModal.style.opacity = "0"; proofModal.style.visibility = "hidden"; proofModal.style.pointerEvents = "none";
  function openProof(code) {
    const p = Store.getPedido(code); if (!p) return;
    $("#proofTitle").textContent = "Comprobante · " + p.code;
    $("#proofBody").innerHTML = `
      <div style="width:200px;height:200px;margin:.5rem auto 1rem;background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px">${fakeQR(p.code + p.metodoPago, 25)}</div>
      <p style="margin:.2rem 0;font-weight:700;color:var(--brown-800)">${esc(p.metodoPago)}</p>
      <p style="margin:.2rem 0;color:var(--muted);font-size:.9rem">${esc(p.comprobante)} · ${bs(p.montoPagado)}</p>
      <p style="margin:.6rem 0;font-size:.82rem;color:var(--muted)">Comprobante simulado para demostración del prototipo.</p>`;
    proofOverlay.classList.add("open");
    proofModal.style.transform = "translate(-50%,-50%) scale(1)";
    proofModal.style.opacity = "1"; proofModal.style.visibility = "visible"; proofModal.style.pointerEvents = "auto";
  }
  function closeProof() {
    proofOverlay.classList.remove("open");
    proofModal.style.transform = "translate(-50%,-50%) scale(.95)";
    proofModal.style.opacity = "0"; proofModal.style.visibility = "hidden"; proofModal.style.pointerEvents = "none";
  }
  $("#closeProof").addEventListener("click", closeProof);
  proofOverlay.addEventListener("click", closeProof);

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

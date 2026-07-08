/* =====================================================================
   CONTIDELICIAS — Interfaz del Cliente
   A) Consulta y Trazabilidad de Pedidos  +  Catálogo / Carrito / Pago
   ===================================================================== */
(function () {
  "use strict";
  const { toast, bs, esc, fakeQR } = window.UI;
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------------- Carrito (localStorage aparte) ---------------- */
  const CART_KEY = "contidelicias_cart_v1";
  let cart = load();
  function load() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; } }
  function persist() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCount(); }
  function prod(id) { return Store.PRODUCTOS.find(p => p.id === id); }
  function cartItems() { return Object.keys(cart).map(id => ({ ...prod(id), cantidad: cart[id] })).filter(x => x.id); }
  function cartTotal() { return cartItems().reduce((a, it) => a + it.precio * it.cantidad, 0); }
  function cartCajas() { return cartItems().reduce((a, it) => a + it.cajas * it.cantidad, 0); }
  function cartCount() { return cartItems().reduce((a, it) => a + it.cantidad, 0); }
  function updateCount() { $("#cartCount").textContent = cartCount(); }

  /* ---------------- Catálogo ---------------- */
  function iconClass(tipo) {
    return tipo === "choco" ? "choco" : tipo === "dulce" ? "dulce" : tipo === "big" ? "big" : "";
  }
  function renderCatalog() {
    $("#productGrid").innerHTML = Store.PRODUCTOS.map(p => `
      <article class="card product">
        <div class="thumb"><div class="alfajor-icon ${iconClass(p.tipo)}"></div></div>
        <div class="body">
          <div class="p-name">${esc(p.nombre)}</div>
          <div class="p-desc">${esc(p.desc)}</div>
          <div class="p-foot">
            <div><span class="p-price">${bs(p.precio)}</span></div>
            <button class="btn btn-gold btn-sm" data-add="${p.id}">＋ Agregar</button>
          </div>
        </div>
      </article>`).join("");
  }
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const id = add.dataset.add;
      cart[id] = (cart[id] || 0) + 1;
      persist();
      toast(`${prod(id).nombre} agregado al carrito`, "ok");
    }
  });

  /* ---------------- Drawer (carrito → checkout → pago → éxito) ---------------- */
  const overlay = $("#overlay"), drawer = $("#drawer");
  let view = "cart";
  let draft = null; // pedido en construcción

  function openDrawer(v) { view = v || "cart"; renderDrawer(); overlay.classList.add("open"); drawer.classList.add("open"); }
  function closeDrawer() { overlay.classList.remove("open"); drawer.classList.remove("open"); }
  $("#cartBtn").addEventListener("click", () => openDrawer("cart"));
  $("#openCartBtn2").addEventListener("click", () => openDrawer("cart"));
  $("#closeDrawer").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);

  function renderDrawer() {
    const body = $("#drawerBody"), foot = $("#drawerFoot"), title = $("#drawerTitle");
    if (view === "cart")     { title.textContent = "🛒 Mi Carrito";        renderCart(body, foot); }
    if (view === "checkout") { title.textContent = "📝 Datos del Pedido";   renderCheckout(body, foot); }
    if (view === "payment")  { title.textContent = "💳 Pago del Pedido";    renderPayment(body, foot); }
    if (view === "success")  { title.textContent = "✅ Pedido Confirmado";  renderSuccess(body, foot); }
  }

  function renderCart(body, foot) {
    const items = cartItems();
    if (!items.length) {
      body.innerHTML = `<div class="empty" style="margin-top:2rem"><div class="em-ico">🛒</div><p>Tu carrito está vacío.<br>Agrega alfajores desde el catálogo.</p></div>`;
      foot.innerHTML = `<button class="btn btn-ghost btn-block" id="keepShopping">Ver catálogo</button>`;
      $("#keepShopping").onclick = () => { closeDrawer(); location.hash = "#catalogo"; };
      return;
    }
    body.innerHTML = items.map(it => `
      <div class="cart-item">
        <div class="ci-ico">🥮</div>
        <div class="ci-main">
          <div class="ci-name">${esc(it.nombre)}</div>
          <div class="ci-price">${bs(it.precio)} c/u · ${bs(it.precio * it.cantidad)}</div>
          <div class="qty">
            <button data-dec="${it.id}">−</button><span>${it.cantidad}</span><button data-inc="${it.id}">＋</button>
          </div>
        </div>
        <button class="ci-remove" data-rm="${it.id}">Quitar</button>
      </div>`).join("");
    foot.innerHTML = `
      <div class="cart-summary"><span>Total</span><strong>${bs(cartTotal())}</strong></div>
      <p style="font-size:.8rem;color:var(--muted);margin:0 0 .8rem">${cartCajas()} caja(s) · Recojo en Comercial Chiriguano</p>
      <button class="btn btn-gold btn-block btn-lg" id="toCheckout">Realizar Pedido →</button>`;
    $("#toCheckout").onclick = () => { view = "checkout"; renderDrawer(); };
  }

  // Delegación de eventos del carrito
  $("#drawerBody").addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), rm = e.target.closest("[data-rm]");
    if (inc) { cart[inc.dataset.inc]++; persist(); renderDrawer(); }
    if (dec) { const id = dec.dataset.dec; cart[id]--; if (cart[id] <= 0) delete cart[id]; persist(); renderDrawer(); }
    if (rm)  { delete cart[rm.dataset.rm]; persist(); renderDrawer(); }
  });

  function renderCheckout(body, foot) {
    const cajas = cartCajas();
    const fechaISO = Store.proximaFechaDisponible(cajas);
    draft = draft || {};
    draft.fechaEntrega = fechaISO;
    body.innerHTML = `
      <div class="field"><label>Nombre y Apellido</label><input id="fNombre" placeholder="Ej: Ana Apaza" value="${esc(draft.cliente || "")}"></div>
      <div class="field"><label>Teléfono (WhatsApp)</label><input id="fTel" placeholder="Ej: 700-12345" value="${esc(draft.telefono || "")}"></div>
      <div class="field">
        <label>Fecha de entrega asignada por capacidad</label>
        <input value="${Store.fechaLarga(fechaISO)}" disabled>
        <p style="font-size:.78rem;color:var(--muted);margin:.3rem 0 0">📅 Asignada automáticamente según la producción diaria disponible (${cajas} caja(s)).</p>
      </div>
      <div class="field-row">
        <div class="field"><label>Hora de recojo</label>
          <select id="fHora"><option>09:00</option><option>11:00</option><option selected>16:00</option><option>18:00</option></select>
        </div>
        <div class="field"><label>Adelanto</label>
          <select id="fPago"><option value="50">50% Adelanto</option><option value="100">100% Total</option></select>
        </div>
      </div>
      <div class="field"><label>Método de pago (QR)</label>
        <select id="fMetodo">
          <option>QR - Mercantil Santa Cruz</option>
          <option>QR - Banco Unión</option>
          <option>QR - BCP</option>
        </select>
      </div>`;
    foot.innerHTML = `
      <div class="cart-summary"><span>Total del pedido</span><strong>${bs(cartTotal())}</strong></div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-ghost" id="backCart">← Volver</button>
        <button class="btn btn-gold" style="flex:1" id="toPayment">Continuar al pago →</button>
      </div>`;
    $("#backCart").onclick = () => { view = "cart"; renderDrawer(); };
    $("#toPayment").onclick = () => {
      const nombre = $("#fNombre").value.trim();
      const tel = $("#fTel").value.trim();
      if (!nombre) return toast("Ingresa tu nombre para continuar", "warn");
      if (!tel)    return toast("Ingresa un teléfono de contacto", "warn");
      draft.cliente = nombre; draft.telefono = tel;
      draft.horaEntrega = $("#fHora").value;
      draft.pct = Number($("#fPago").value);
      draft.metodoPago = $("#fMetodo").value;
      view = "payment"; renderDrawer();
    };
  }

  function renderPayment(body, foot) {
    const total = cartTotal();
    const aPagar = draft.pct === 100 ? total : Math.round(total * 0.5 * 100) / 100;
    body.innerHTML = `
      <p style="margin-top:0;color:var(--muted);font-size:.9rem">Escanea el QR con tu app bancaria y sube la captura del comprobante. El administrador validará el pago antes de iniciar la producción.</p>
      <div class="qr-box">
        <div class="qr-code">${fakeQR(draft.metodoPago + total)}</div>
        <div>
          <div style="font-size:.82rem;color:var(--muted)">${esc(draft.metodoPago)}</div>
          <div style="font-weight:800;font-size:1.4rem;color:var(--brown-800)">${bs(aPagar)}</div>
          <div style="font-size:.8rem;color:var(--muted)">${draft.pct === 100 ? "Pago total" : "Adelanto 50%"} · Total ${bs(total)}</div>
        </div>
      </div>
      <div class="field" style="margin-top:1rem">
        <label>Comprobante de pago</label>
        <label class="filedrop" id="fileDrop">
          <input type="file" id="fFile" accept="image/*" hidden>
          <span id="fileLabel">📎 Toca para subir la imagen del comprobante</span>
        </label>
      </div>`;
    foot.innerHTML = `
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-ghost" id="backCheckout">← Volver</button>
        <button class="btn btn-green" style="flex:1" id="confirmOrder">Confirmar Pedido ✓</button>
      </div>`;
    const fileInput = $("#fFile"), fileDrop = $("#fileDrop"), fileLabel = $("#fileLabel");
    fileInput.onchange = () => {
      if (fileInput.files[0]) {
        draft.comprobante = fileInput.files[0].name;
        fileDrop.classList.add("has-file");
        fileLabel.textContent = "✅ " + fileInput.files[0].name;
      }
    };
    $("#backCheckout").onclick = () => { view = "checkout"; renderDrawer(); };
    $("#confirmOrder").onclick = () => {
      if (!draft.comprobante) return toast("Sube tu comprobante de pago para confirmar", "warn");
      confirmarPedido(aPagar);
    };
  }

  function confirmarPedido(aPagar) {
    const items = cartItems();
    const total = cartTotal();
    const detalle = items.map(it => `${it.cantidad} × ${it.nombre.replace(/\s*\(.*\)/, "")}`).join(", ");
    const now = new Date();
    const hh = now.getHours(), mm = String(now.getMinutes()).padStart(2, "0");
    const ampm = hh < 12 ? "a.m." : "p.m.";
    const pedido = {
      code: Store.nuevoCodigo(),
      cliente: draft.cliente, telefono: draft.telefono,
      items: items.map(it => ({ id: it.id, nombre: it.nombre, cantidad: it.cantidad, precio: it.precio })),
      detalle,
      total, montoPagado: aPagar, tipoPago: draft.pct === 100 ? "100% Total" : "50% Adelanto",
      metodoPago: draft.metodoPago, comprobante: draft.comprobante,
      fechaSubida: `${Store.fechaCorta(Store.HOY)} - ${((hh % 12) || 12)}:${mm} ${ampm}`,
      fechaEntrega: draft.fechaEntrega, horaEntrega: draft.horaEntrega,
      cajas: cartCajas(), estadoPago: "pendiente", estadoPedido: "recibido",
    };
    Store.addPedido(pedido);
    cart = {}; persist();
    draft = { _code: pedido.code };
    view = "success"; renderDrawer();
    toast("¡Pedido registrado! Código " + pedido.code, "ok");
  }

  function renderSuccess(body, foot) {
    const code = draft._code;
    body.innerHTML = `
      <div class="success-box">
        <div class="success-ring">✓</div>
        <h3 style="color:var(--brown-800);margin:0">¡Gracias por tu pedido!</h3>
        <p style="color:var(--muted)">Guarda tu código único de seguimiento:</p>
        <div class="big-code">${esc(code)}</div>
        <p style="font-size:.86rem;color:var(--muted)">Tu comprobante quedó registrado y está <b>en validación</b>. Podrás seguir el avance de tu producción en tiempo real con este código.</p>
      </div>`;
    foot.innerHTML = `
      <button class="btn btn-navy btn-block" id="goTrack">🔍 Seguir mi pedido</button>
      <button class="btn btn-ghost btn-block" style="margin-top:.5rem" id="keepShopping2">Seguir comprando</button>`;
    $("#goTrack").onclick = () => { closeDrawer(); consultar(code); };
    $("#keepShopping2").onclick = () => { closeDrawer(); location.hash = "#catalogo"; };
  }

  /* ---------------- Trazabilidad (Interfaz A) ---------------- */
  const STAGE = { recibido: 0, en_cocina: 1, listo: 2, entregado: 3 };
  const STEPS = [
    { icoActive: "📥", label: "Paso 1: Recibido" },
    { icoActive: "👨‍🍳", label: "Paso 2: En Cocina" },
    { icoActive: "📦", label: "Paso 3: Listo para Recojo" },
  ];

  function estadoBadge(p) {
    if (p.estadoPago === "rechazado") return `<span class="badge badge-red">Pago Rechazado</span>`;
    switch (p.estadoPedido) {
      case "recibido":  return `<span class="badge badge-blue">Pedido Recibido</span>`;
      case "en_cocina": return `<span class="badge badge-amber">En Producción</span>`;
      case "listo":     return `<span class="badge badge-green">Listo para Recojo</span>`;
      case "entregado": return `<span class="badge badge-gray">Entregado</span>`;
      default:          return "";
    }
  }
  function pagoLinea(p) {
    if (p.estadoPago === "aprobado")  return `<span style="color:var(--green-700);font-weight:700">✓ Pago verificado</span>`;
    if (p.estadoPago === "rechazado") return `<span style="color:var(--red-700);font-weight:700">✕ Comprobante rechazado</span>`;
    return `<span style="color:var(--amber-600);font-weight:700">⏳ En validación</span>`;
  }

  function renderTimeline(p) {
    const stage = STAGE[p.estadoPedido];
    return `<div class="timeline">${STEPS.map((s, i) => {
      let cls = "", ico = s.icoActive;
      if (i < stage) { cls = "done"; ico = "✓"; }
      else if (i === stage && p.estadoPedido !== "entregado") { cls = "active"; }
      else if (p.estadoPedido === "entregado") { cls = "done"; ico = "✓"; }
      return `<div class="tl-step ${cls}"><div class="tl-dot">${ico}</div>
        <div class="tl-label">${s.label}</div></div>`;
    }).join("")}</div>`;
  }

  function consultar(code) {
    $("#trackInput").value = code;
    const p = Store.getPedido(code);
    const box = $("#trackResult");
    if (!p) {
      box.innerHTML = `<div class="empty-track">😕 No encontramos ningún pedido con el código <b>${esc(code)}</b>.<br>Verifica que esté escrito correctamente.</div>`;
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    box.innerHTML = `
      <div class="card result-card">
        <div class="result-head">
          <div>
            <div style="font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Pedido</div>
            <div class="result-code">${esc(p.code)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.8rem;color:var(--muted);margin-bottom:.3rem">Estado actual</div>
            ${estadoBadge(p)}
          </div>
        </div>
        <div class="result-meta">
          <div class="meta-row"><span class="ico">📦</span><span class="lbl">Detalle</span><span class="val">${esc(p.detalle)}</span></div>
          <div class="meta-row"><span class="ico">👤</span><span class="lbl">Cliente</span><span class="val">${esc(p.cliente)}</span></div>
          <div class="meta-row"><span class="ico">📅</span><span class="lbl">Entrega comprometida</span><span class="val">${Store.fechaLarga(p.fechaEntrega)} · ${esc(p.horaEntrega)}</span></div>
          <div class="meta-row"><span class="ico">💳</span><span class="lbl">Pago (${esc(p.tipoPago)})</span><span class="val">${bs(p.montoPagado)} — ${pagoLinea(p)}</span></div>
        </div>
        ${renderTimeline(p)}
      </div>`;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("#trackForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = $("#trackInput").value.trim();
    if (!code) return toast("Ingresa tu código de seguimiento", "warn");
    consultar(code);
  });
  document.querySelectorAll(".chip-code").forEach(ch => ch.addEventListener("click", () => consultar(ch.dataset.code)));

  /* ---------------- Inicio ---------------- */
  renderCatalog();
  updateCount();
})();

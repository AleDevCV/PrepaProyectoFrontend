/* =====================================================================
   CONTIDELICIAS — Interfaz del Cliente
   A) Consulta y Trazabilidad de Pedidos  +  Catálogo / Carrito / Pago
   ===================================================================== */
(function () {
  "use strict";
  const { toast, bs, esc } = window.UI;
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
      view = "payment"; renderDrawer();
    };
  }

  // Detecta la marca de la tarjeta por el primer dígito
  function marcaTarjeta(num) {
    const d = num.replace(/\D/g, "");
    if (/^4/.test(d)) return "Visa";
    if (/^5/.test(d) || /^2/.test(d)) return "Mastercard";
    if (/^3/.test(d)) return "Amex";
    if (/^6/.test(d)) return "Discover";
    return "Tarjeta";
  }

  function renderPayment(body, foot) {
    const total = cartTotal();
    const aPagar = draft.pct === 100 ? total : Math.round(total * 0.5 * 100) / 100;
    body.innerHTML = `
      <div class="pay-secure">🔒 Pago en línea seguro · procesado automáticamente</div>
      <div class="amount-box">
        <span>Total a pagar ahora</span>
        <strong>${bs(aPagar)}</strong>
        <small>${draft.pct === 100 ? "Pago total" : "Adelanto 50%"} · Pedido: ${bs(total)}</small>
      </div>
      <div class="card-visual">
        <div class="cv-top"><span class="cv-chip"></span><span class="cv-brand" id="cvBrand">TARJETA</span></div>
        <div class="cv-number" id="cvNumber">•••• •••• •••• ••••</div>
        <div class="cv-row"><span id="cvName">NOMBRE APELLIDO</span><span id="cvExp">MM/AA</span></div>
      </div>
      <div class="field"><label>Número de tarjeta</label>
        <input id="ccNum" inputmode="numeric" maxlength="19" autocomplete="cc-number" placeholder="1234 5678 9012 3456"></div>
      <div class="field"><label>Nombre en la tarjeta</label>
        <input id="ccName" autocomplete="cc-name" placeholder="Como aparece en la tarjeta"></div>
      <div class="field-row">
        <div class="field"><label>Vencimiento</label><input id="ccExp" maxlength="5" autocomplete="cc-exp" placeholder="MM/AA"></div>
        <div class="field"><label>CVV</label><input id="ccCvv" inputmode="numeric" maxlength="4" autocomplete="cc-csc" placeholder="123"></div>
      </div>
      <p class="pay-hint">💳 Modo demostración: usa cualquier número, por ejemplo <b>4242 4242 4242 4242</b>.</p>`;
    foot.innerHTML = `
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-ghost" id="backCheckout">← Volver</button>
        <button class="btn btn-green" style="flex:1" id="payBtn">🔒 Pagar ${bs(aPagar)}</button>
      </div>`;

    const num = $("#ccNum"), name = $("#ccName"), exp = $("#ccExp"), cvv = $("#ccCvv");
    // Formateo en vivo del número (grupos de 4) + marca + espejo en la tarjeta visual
    num.oninput = () => {
      let d = num.value.replace(/\D/g, "").slice(0, 16);
      num.value = d.replace(/(.{4})/g, "$1 ").trim();
      $("#cvNumber").textContent = (num.value || "•••• •••• •••• ••••").padEnd(19, "•");
      $("#cvBrand").textContent = marcaTarjeta(d).toUpperCase();
    };
    name.oninput = () => { $("#cvName").textContent = name.value.toUpperCase() || "NOMBRE APELLIDO"; };
    exp.oninput = () => {
      let d = exp.value.replace(/\D/g, "").slice(0, 4);
      if (d.length >= 3) d = d.slice(0, 2) + "/" + d.slice(2);
      exp.value = d;
      $("#cvExp").textContent = d || "MM/AA";
    };
    cvv.oninput = () => { cvv.value = cvv.value.replace(/\D/g, ""); };

    $("#backCheckout").onclick = () => { view = "checkout"; renderDrawer(); };
    $("#payBtn").onclick = () => {
      const digits = num.value.replace(/\D/g, "");
      if (digits.length < 13)                return toast("Ingresa un número de tarjeta válido", "warn");
      if (!name.value.trim())                return toast("Ingresa el nombre de la tarjeta", "warn");
      if (!/^\d{2}\/\d{2}$/.test(exp.value)) return toast("Ingresa el vencimiento (MM/AA)", "warn");
      if (cvv.value.length < 3)              return toast("Ingresa el CVV", "warn");

      // Simulación de pasarela de pago automática
      const btn = $("#payBtn");
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-spin"></span> Procesando pago…`;
      draft.metodoPago = `${marcaTarjeta(digits)} ····${digits.slice(-4)}`;
      setTimeout(() => confirmarPedido(aPagar), 1500);
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
      metodoPago: draft.metodoPago, ref: "TX-" + Date.now().toString().slice(-7),
      fechaSubida: `${Store.fechaCorta(Store.HOY)} - ${((hh % 12) || 12)}:${mm} ${ampm}`,
      fechaEntrega: draft.fechaEntrega, horaEntrega: draft.horaEntrega,
      // Pago automático: se aprueba al instante (pasarela simulada)
      cajas: cartCajas(), estadoPago: "aprobado", estadoPedido: "recibido",
    };
    Store.addPedido(pedido);
    cart = {}; persist();
    draft = { _code: pedido.code };
    view = "success"; renderDrawer();
    toast("¡Pago aprobado! Pedido " + pedido.code, "ok");
  }

  function renderSuccess(body, foot) {
    const code = draft._code;
    body.innerHTML = `
      <div class="success-box">
        <div class="success-ring">✓</div>
        <h3 style="color:var(--brown-800);margin:0">¡Gracias por tu pedido!</h3>
        <p style="color:var(--muted)">Guarda tu código único de seguimiento:</p>
        <div class="big-code">${esc(code)}</div>
        <p style="font-size:.86rem;color:var(--muted)">Tu pago fue <b>aprobado automáticamente</b> y tu pedido entró a la cola de producción. Podrás seguir el avance en tiempo real con este código.</p>
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

/* =====================================================================
   CONTIDELICIAS — Asistente Virtual (Widget de chat SIMULADO)
   Motor basado en reglas (intenciones por palabras clave). No usa IA
   real: las respuestas están predefinidas, pero puede consultar el
   estado REAL de un pedido leyéndolo del almacén (Store).
   Para migrar a IA real, ver README / responderChatbot().
   ===================================================================== */
(function () {
  "use strict";
  const { esc } = window.UI;

  /* ---------- Construcción del widget ---------- */
  const el = document.createElement("div");
  el.innerHTML = `
    <button class="chat-fab" id="chatFab" aria-label="Abrir asistente virtual">
      💬<span class="fab-dot">1</span>
    </button>
    <section class="chat-panel" id="chatPanel" aria-live="polite">
      <header class="chat-header">
        <div class="ch-avatar">🤖</div>
        <div>
          <div class="ch-name">Asistente Virtual</div>
          <div class="ch-status">En línea · Contidelicias</div>
        </div>
        <button class="ch-close" id="chatClose" aria-label="Cerrar">×</button>
      </header>
      <div class="chat-msgs" id="chatMsgs"></div>
      <div class="chat-quick" id="chatQuick"></div>
      <form class="chat-input-row" id="chatForm">
        <input id="chatInput" placeholder="Escribe tu mensaje…" autocomplete="off" />
        <button class="chat-send" type="submit" aria-label="Enviar">➤</button>
      </form>
    </section>`;
  document.body.appendChild(el);

  const fab = document.getElementById("chatFab");
  const panel = document.getElementById("chatPanel");
  const msgs = document.getElementById("chatMsgs");
  const quick = document.getElementById("chatQuick");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");

  const QUICK = [
    "📦 Estado de mi pedido", "🍪 Ver precios", "🕐 Horarios",
    "📍 Ubicación", "💳 Métodos de pago", "🛒 ¿Cómo hago un pedido?",
  ];
  quick.innerHTML = QUICK.map(q => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("");

  let opened = false, greeted = false;
  function toggle(open) {
    opened = open == null ? !opened : open;
    panel.classList.toggle("open", opened);
    fab.querySelector(".fab-dot")?.remove();
    if (opened && !greeted) { greeted = true; botSay(saludoInicial()); }
    if (opened) setTimeout(() => input.focus(), 250);
  }
  fab.addEventListener("click", () => toggle());
  document.getElementById("chatClose").addEventListener("click", () => toggle(false));
  quick.addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]"); if (!b) return;
    userSay(b.dataset.q); respond(b.dataset.q);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = input.value.trim(); if (!t) return;
    input.value = ""; userSay(t); respond(t);
  });

  /* ---------- Render de mensajes ---------- */
  function hora() { const d = new Date(); return `${(d.getHours()%12)||12}:${String(d.getMinutes()).padStart(2,"0")} ${d.getHours()<12?"a.m.":"p.m."}`; }
  function userSay(text) {
    const m = document.createElement("div");
    m.className = "msg user";
    m.innerHTML = `${esc(text)}<span class="m-time">${hora()}</span>`;
    msgs.appendChild(m); scroll();
  }
  function botSay(html) {
    const typing = document.createElement("div");
    typing.className = "chat-typing"; typing.innerHTML = "<span></span><span></span><span></span>";
    msgs.appendChild(typing); scroll();
    setTimeout(() => {
      typing.remove();
      const m = document.createElement("div");
      m.className = "msg bot";
      m.innerHTML = `${html}<span class="m-time">${hora()}</span>`;
      msgs.appendChild(m); scroll();
    }, 650);
  }
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }

  /* ---------- Normalización de texto ---------- */
  function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function has(t, arr) { return arr.some(k => t.includes(k)); }

  /* ---------- Respuestas ---------- */
  function saludoInicial() {
    return `¡Hola! 👋 Soy el <b>Asistente Virtual de Contidelicias</b>. ` +
      `Estoy aquí para ayudarte 24/7. Puedes preguntarme por el <b>estado de tu pedido</b>, ` +
      `<b>precios</b>, <b>horarios</b>, <b>ubicación</b> o <b>métodos de pago</b>. 😊`;
  }

  function respuestaCatalogo() {
    const items = Store.PRODUCTOS.map(p => `• <b>${esc(p.nombre)}</b> — ${p.precio.toFixed(2)} Bs`).join("<br>");
    return `Estos son nuestros alfajores artesanales 🍪:<br><br>${items}<br><br>¿Deseas agregar alguno al carrito? Usa el catálogo de la página. 🛒`;
  }

  function respuestaPedido(codeMatch) {
    if (codeMatch) {
      const p = Store.getPedido(codeMatch);
      if (!p) return `No encontré ningún pedido con el código <b>${esc(codeMatch)}</b>. 😕 Revisa que esté bien escrito (formato: <b>CN-XXXXX</b>).`;
      const estados = {
        recibido: "🟦 <b>Pedido Recibido</b> — tu orden fue registrada.",
        en_cocina: "👨‍🍳 <b>En Producción</b> — ¡lo estamos preparando!",
        listo: "✅ <b>Listo para Recojo</b> — puedes pasar a retirarlo.",
        entregado: "📦 <b>Entregado</b> — ¡gracias por tu compra!",
      };
      const pago = p.estadoPago === "aprobado" ? "✔ Pago verificado"
        : p.estadoPago === "rechazado" ? "✖ Comprobante rechazado" : "⏳ Pago en validación";
      return `Pedido <b>${esc(p.code)}</b> de ${esc(p.cliente)}:<br><br>` +
        `${estados[p.estadoPedido]}<br>` +
        `🧾 ${esc(p.detalle)}<br>` +
        `📅 Entrega: ${Store.fechaLarga(p.fechaEntrega)} · ${esc(p.horaEntrega)}<br>` +
        `💳 ${pago}`;
    }
    return `¡Con gusto reviso tu pedido! 📦 Escríbeme tu <b>código de seguimiento</b> ` +
      `(formato <b>CN-XXXXX</b>). Por ejemplo: <i>"Estado del pedido CN-87X92"</i>.`;
  }

  function respuestaEntrega() {
    const cap = Store.capacidadDia(Store.HOY);
    return `⏱️ Preparamos cada pedido de forma artesanal según nuestra <b>capacidad diaria</b> ` +
      `(máx. ${Store.CAPACIDAD_MAXIMA_DIARIA} cajas/día). Al hacer tu pedido, el sistema te asigna ` +
      `automáticamente la <b>fecha de entrega disponible</b> más próxima.<br><br>` +
      `Hoy llevamos ${cap.usadas}/${cap.max} cajas reservadas (${cap.pct}%).`;
  }

  // Intenciones ordenadas (la primera que coincide, responde)
  const INTENTS = [
    { keys: ["hola","buenas","buenos dias","buen dia","hey","saludos","que tal","holi"], reply: saludoInicial },
    { keys: ["como hago","como hacer","como pido","como pedir","hacer un pedido","hacer pedido","quiero pedir","quiero comprar","realizar pedido","encargar","ordenar"],
      reply: () => `Hacer un pedido es muy fácil 🛒:<br><br>1️⃣ Elige tus alfajores en el <b>catálogo</b> y agrégalos al carrito.<br>2️⃣ Presiona <b>"Realizar Pedido"</b> y completa tus datos.<br>3️⃣ Paga por <b>QR</b> y sube tu <b>comprobante</b>.<br>4️⃣ Recibes un <b>código único</b> para seguir tu pedido en tiempo real. ✨` },
    { keys: ["precio","precios","cuanto cuesta","cuanto sale","costo","cuestan","catalogo","productos","sabores","que venden","que tienen","que ofrecen"], reply: respuestaCatalogo },
    { keys: ["comprobante","subir comprobante","validacion","validar pago","factura","recibo"],
      reply: () => `Para subir tu comprobante 🧾: al finalizar el pedido y pagar por QR, ` +
        `verás un botón para <b>adjuntar la imagen</b> del comprobante. Nuestro equipo lo ` +
        `<b>valida</b> antes de iniciar la producción. Podrás ver el estado con tu código. ✅` },
    { keys: ["pago","pagar","pagos","metodo de pago","metodos de pago","qr","transferencia","efectivo","banco","adelanto","tarjeta"],
      reply: () => `Aceptamos 💳:<br><br>• <b>QR</b> (Mercantil Santa Cruz, Banco Unión, BCP)<br>• <b>Transferencia bancaria</b><br>• <b>Efectivo</b> (al recoger)<br><br>Puedes pagar el <b>50% de adelanto</b> o el <b>100%</b>. El pedido entra a producción una vez validado el pago. 👨‍🍳` },
    { keys: ["horario","horarios","atencion","atienden","abierto","abren","a que hora","cuando atienden"],
      reply: () => `🕐 <b>Horarios de atención:</b><br><br>• Lunes a Sábado: 9:00 – 19:00<br>• Domingos: 10:00 – 13:00<br><br>Y este asistente virtual te atiende <b>24/7</b>. 🤖` },
    { keys: ["ubicacion","ubicados","donde estan","direccion","local","recojo","retiro","donde recojo","donde queda","como llego"],
      reply: () => `📍 Nuestro punto de recojo está en el <b>Comercial Chiriguano</b> (Tercer Anillo Interno), Santa Cruz de la Sierra, Bolivia. ¡Te esperamos! 🥮` },
    { keys: ["estado","seguimiento","seguir","rastrear","donde esta mi pedido","mi pedido","trazabilidad","codigo","seguir pedido"], reply: (t, code) => respuestaPedido(code) },
    { keys: ["cuanto tarda","cuanto demora","demora","tiempo de entrega","cuando llega","cuando esta","entrega","entregan","cuanto tiempo"], reply: respuestaEntrega },
    { keys: ["humano","persona","asesor","hablar con alguien","whatsapp","contacto","atencion humana","operador"],
      reply: () => `¡Claro! 📱 Puedes escribirnos por <b>WhatsApp</b> y un miembro del equipo te atenderá personalmente. También puedes seguir tu pedido aquí con tu código. 😊` },
    { keys: ["gracias","muchas gracias","chau","adios","hasta luego","nos vemos","bye"],
      reply: () => `¡Gracias a ti por elegir <b>Contidelicias</b>! 🥮 Que tengas un excelente día. Aquí estaré si necesitas algo más. 👋` },
  ];

  function respond(text) {
    const t = norm(text);
    const codeMatch = (text.match(/cn-?\s?[a-z0-9]{4,6}/i) || [])[0];
    const code = codeMatch ? codeMatch.replace(/\s/g, "").toUpperCase().replace(/^CN(?!-)/, "CN-") : null;

    // Si el mensaje trae un código, priorizamos la consulta del pedido
    if (code) { botSay(respuestaPedido(code)); return; }

    for (const intent of INTENTS) {
      if (has(t, intent.keys)) { botSay(intent.reply(t, code)); return; }
    }
    // Sin coincidencia
    botSay(`Mmm, no estoy seguro de haber entendido eso 🤔. Puedo ayudarte con:<br><br>` +
      `📦 Estado de tu pedido · 🍪 Precios · 🕐 Horarios · 📍 Ubicación · 💳 Pagos · 🛒 Cómo pedir.<br><br>` +
      `¿Sobre cuál te gustaría saber?`);
  }

  /* ---------- Abrir automáticamente si venimos de un pedido nuevo (opcional) ---------- */
  // (Se deja cerrado por defecto; el usuario abre con el botón flotante.)
})();

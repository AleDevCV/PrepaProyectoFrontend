/* =====================================================================
   CONTIDELICIAS — Capa de datos (Frontend, sin backend)
   Simula la base de datos con localStorage. Las dos interfaces
   (Cliente y Administrador) comparten este almacén, de modo que las
   acciones de una se reflejan en la otra.
   ===================================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "contidelicias_db_v2";
  const CAPACIDAD_MAXIMA_DIARIA = 10; // Cajas por día (según mockup del admin)

  /* ---------------- Catálogo de productos ---------------- */
  const PRODUCTOS = [
    { id: "mixta24",  nombre: "Caja Mixta (24 u.)",        precio: 90,  cajas: 1, tipo: "mixto",  desc: "Surtido de maicena, chocolate y dulce de leche." },
    { id: "choco12",  nombre: "Caja de Chocolate (12 u.)", precio: 75,  cajas: 1, tipo: "choco",  desc: "Alfajores bañados en chocolate semiamargo." },
    { id: "dulce12",  nombre: "Caja Dulce de Leche (12 u.)",precio: 65,  cajas: 1, tipo: "dulce",  desc: "Clásicos rellenos de dulce de leche repostero." },
    { id: "maicena12",nombre: "Caja de Maicena (12 u.)",   precio: 60,  cajas: 1, tipo: "dulce",  desc: "Tapas de maicena con coco rallado." },
    { id: "familiar", nombre: "Caja Familiar (48 u.)",     precio: 160, cajas: 2, tipo: "big",    desc: "La caja grande para compartir en familia." },
    { id: "premium",  nombre: "Alfajor Premium (unidad)",  precio: 8,   cajas: 0, tipo: "choco",  desc: "Edición especial triple con dulce de leche." },
  ];

  /* ---------------- Datos semilla (pedidos de ejemplo) ----------------
     Fecha de referencia del proyecto: 2026-07-07 ("hoy").
     Estados de pedido: recibido → en_cocina → listo → entregado
     Estados de pago:   pendiente | aprobado | rechazado
  -------------------------------------------------------------------- */
  const SEED = [
    {
      code: "CN-87X92", cliente: "A. Apaza", telefono: "700-11223",
      items: [{ id: "mixta24", nombre: "Caja Mixta (24 u.)", cantidad: 2, precio: 90 }],
      detalle: "2 Cajas de Alfajores Mixtos (24 u.)",
      total: 180, montoPagado: 90, tipoPago: "50% Adelanto",
      metodoPago: "Visa ····4242", ref: "TX-8841207",
      fechaSubida: "07/07/2026 - 10:42 a.m.",
      fechaEntrega: "2026-07-07", horaEntrega: "16:00",
      cajas: 2, estadoPago: "aprobado", estadoPedido: "en_cocina",
    },
    {
      code: "CN-88F12", cliente: "R. Vaca", telefono: "701-55890",
      items: [{ id: "familiar", nombre: "Caja Familiar (48 u.)", cantidad: 1, precio: 160 },
              { id: "choco12", nombre: "Caja de Chocolate (12 u.)", cantidad: 1, precio: 75 }],
      detalle: "1 Caja Familiar (48 u.) + 1 Caja de Chocolate",
      total: 235, montoPagado: 235, tipoPago: "100% Total",
      metodoPago: "Mastercard ····5578", ref: "TX-8839114",
      fechaSubida: "06/07/2026 - 18:20 p.m.",
      fechaEntrega: "2026-07-07", horaEntrega: "11:00",
      cajas: 3, estadoPago: "aprobado", estadoPedido: "en_cocina",
    },
    {
      code: "CN-33C77", cliente: "L. Gómez", telefono: "702-33417",
      items: [{ id: "dulce12", nombre: "Caja Dulce de Leche (12 u.)", cantidad: 1, precio: 65 }],
      detalle: "1 Caja Dulce de Leche (12 u.)",
      total: 65, montoPagado: 65, tipoPago: "100% Total",
      metodoPago: "Visa ····4242", ref: "TX-8836540",
      fechaSubida: "06/07/2026 - 15:05 p.m.",
      fechaEntrega: "2026-07-07", horaEntrega: "09:00",
      cajas: 1, estadoPago: "aprobado", estadoPedido: "listo",
    },
    {
      code: "CN-90G33", cliente: "S. Méndez", telefono: "706-12045",
      items: [{ id: "mixta24", nombre: "Caja Mixta (24 u.)", cantidad: 2, precio: 90 }],
      detalle: "2 Cajas de Alfajores Mixtos (24 u.)",
      total: 180, montoPagado: 90, tipoPago: "50% Adelanto",
      metodoPago: "Mastercard ····3310", ref: "TX-8842001",
      fechaSubida: "06/07/2026 - 20:10 p.m.",
      fechaEntrega: "2026-07-07", horaEntrega: "18:00",
      cajas: 2, estadoPago: "aprobado", estadoPedido: "recibido",
    },
    {
      code: "CN-11A04", cliente: "A. Contili", telefono: "703-90128",
      items: [{ id: "choco12", nombre: "Caja de Chocolate (12 u.)", cantidad: 2, precio: 75 }],
      detalle: "2 Cajas de Chocolate (12 u.)",
      total: 150, montoPagado: 150, tipoPago: "100% Total",
      metodoPago: "Visa ····1121", ref: "TX-8845093",
      fechaSubida: "07/07/2026 - 09:15 a.m.",
      fechaEntrega: "2026-07-08", horaEntrega: "10:00",
      cajas: 2, estadoPago: "aprobado", estadoPedido: "recibido",
    },
    {
      code: "CN-45B21", cliente: "M. Rojas", telefono: "704-44562",
      items: [{ id: "maicena12", nombre: "Caja de Maicena (12 u.)", cantidad: 3, precio: 60 }],
      detalle: "3 Cajas de Maicena (12 u.)",
      total: 180, montoPagado: 90, tipoPago: "50% Adelanto",
      metodoPago: "Amex ····9004", ref: "TX-8845210",
      fechaSubida: "07/07/2026 - 08:40 a.m.",
      fechaEntrega: "2026-07-08", horaEntrega: "17:00",
      cajas: 3, estadoPago: "aprobado", estadoPedido: "recibido",
    },
    {
      code: "CN-70E90", cliente: "C. Flores", telefono: "705-77341",
      items: [{ id: "mixta24", nombre: "Caja Mixta (24 u.)", cantidad: 2, precio: 90 }],
      detalle: "2 Cajas de Alfajores Mixtos (24 u.)",
      total: 180, montoPagado: 90, tipoPago: "50% Adelanto",
      metodoPago: "Mastercard ····5578", ref: "TX-8843377",
      fechaSubida: "07/07/2026 - 07:55 a.m.",
      fechaEntrega: "2026-07-09", horaEntrega: "12:00",
      cajas: 2, estadoPago: "aprobado", estadoPedido: "recibido",
    },
  ];

  /* ---------------- Persistencia ---------------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* almacenamiento no disponible */ }
    const initial = { pedidos: SEED.slice() };
    save(initial);
    return initial;
  }
  function save(db) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) {}
  }

  /* ---------------- Utilidades de fecha ---------------- */
  const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  function parseISO(iso) { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
  function nombreDia(iso) { return DIAS[parseISO(iso).getDay()]; }
  function fechaLarga(iso) {
    const dt = parseISO(iso);
    return `${DIAS[dt.getDay()]}, ${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}`;
  }
  function fechaCorta(iso) {
    const dt = parseISO(iso);
    return `${dt.getDate()}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
  }

  /* ---------------- API del almacén ---------------- */
  const Store = {
    PRODUCTOS,
    CAPACIDAD_MAXIMA_DIARIA,

    getPedidos() { return load().pedidos; },

    getPedido(code) {
      if (!code) return null;
      const c = code.trim().toUpperCase();
      return load().pedidos.find(p => p.code.toUpperCase() === c) || null;
    },

    addPedido(pedido) {
      const db = load();
      db.pedidos.unshift(pedido);
      save(db);
      return pedido;
    },

    updatePedido(code, patch) {
      const db = load();
      const p = db.pedidos.find(x => x.code === code);
      if (p) { Object.assign(p, patch); save(db); }
      return p;
    },

    /* Genera un código único con formato CN-XXXXX */
    nuevoCodigo() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
      const codes = load().pedidos.map(p => p.code);
      let code;
      do {
        let s = "";
        for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
        code = "CN-" + s;
      } while (codes.includes(code));
      return code;
    },

    /* Suma de cajas reservadas para una fecha (pedidos no rechazados/entregados) */
    capacidadDia(iso) {
      const usadas = load().pedidos
        .filter(p => p.fechaEntrega === iso && p.estadoPago !== "rechazado" && p.estadoPedido !== "entregado")
        .reduce((acc, p) => acc + (p.cajas || 0), 0);
      return { usadas, max: CAPACIDAD_MAXIMA_DIARIA, pct: Math.min(100, Math.round((usadas / CAPACIDAD_MAXIMA_DIARIA) * 100)) };
    },

    /* Próxima fecha de entrega disponible (a partir de hoy) que no supere la capacidad */
    proximaFechaDisponible(cajasSolicitadas) {
      const HOY = "2026-07-07";
      const base = parseISO(HOY);
      for (let i = 0; i < 30; i++) {
        const d = new Date(base); d.setDate(base.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const cap = this.capacidadDia(iso);
        if (cap.usadas + cajasSolicitadas <= CAPACIDAD_MAXIMA_DIARIA) return iso;
      }
      return HOY;
    },

    /* Reinicia el almacén a los datos semilla (útil para demostraciones) */
    reset() { save({ pedidos: SEED.slice() }); },

    // Utilidades expuestas
    fechaLarga, fechaCorta, nombreDia, HOY: "2026-07-07",
  };

  window.Store = Store;
})();

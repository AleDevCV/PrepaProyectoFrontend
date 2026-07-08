# 🥮 Contidelicias — Alfajores Argentinos

**Plataforma Web Integrada con Asistente Virtual para la Automatización y Gestión de Pedidos.**

Prototipo **frontend** (sin backend ni base de datos) del sistema de gestión de pedidos del emprendimiento *Contidelicias Alfajores Argentinos*. Implementa las dos interfaces clave descritas en el proyecto académico y un asistente virtual simulado.

> 🎓 Proyecto de la materia **Preparación y Evaluación de Proyectos (ECO449-SI)** — Universidad Autónoma Gabriel René Moreno (UAGRM), Santa Cruz de la Sierra, Bolivia.

---

## 🌐 Demo en vivo

Una vez publicado en GitHub Pages:

**👉 https://aledevcv.github.io/PrepaProyectoFrontend/**

---

## ✨ Características

### 🛍️ A) Interfaz del Cliente — Consulta y Trazabilidad de Pedidos
- **Seguimiento en tiempo real** por código único (ej: `CN-87X92`), con línea de tiempo de 3 pasos: *Recibido → En Cocina → Listo para Recojo*.
- **Catálogo** de productos con **carrito de compras**.
- **Checkout completo**: datos del pedido → **pago con tarjeta** (pasarela automática simulada) → generación de código de seguimiento.
- **Agendamiento dinámico**: la fecha de entrega se asigna automáticamente según la capacidad diaria de producción.

### 📊 B) Interfaz del Administrador — Panel de Gestión de Producción y Pagos
- **Registro de Pagos**: historial de transacciones con tarjeta (aprobación automática) y total recaudado.
- **Pedidos Pendientes**: indicadores (KPIs) y control del estado de producción.
- **Agenda de Producción**: pedidos agrupados por día con medidor de capacidad (máx. 10 cajas/día).
- **Alertas de control de producción diaria**.

> **Integración:** ambas interfaces comparten datos mediante `localStorage`, por lo que funcionan como un sistema conectado: un pedido creado por el cliente aparece al instante en el panel del administrador (pago ya aprobado por la pasarela), y cuando el administrador avanza la producción, el cliente lo ve reflejado al consultar su código.

---

## 🧪 Códigos de demostración

Prueba el seguimiento en la interfaz del cliente con estos códigos:

| Código      | Cliente     | Estado             |
|-------------|-------------|--------------------|
| `CN-87X92`  | A. Apaza    | En Producción      |
| `CN-33C77`  | L. Gómez    | Listo para Recojo  |
| `CN-11A04`  | A. Contili  | Recibido           |

En el panel de administrador puedes avanzar el estado de producción de cada pedido (Recibido → En Producción → Listo → Entregado) y ver cómo cambia en tiempo real la consulta del cliente.

---

## 🛠️ Tecnologías

- **HTML5**, **CSS3** (sin frameworks, diseño responsive propio)
- **JavaScript** (Vanilla, sin dependencias ni build)
- **localStorage** como almacén de datos simulado
- No requiere Node, npm ni servidor: se abre con doble clic.

---

## 📁 Estructura del proyecto

```
PrepaProyecto/
├── index.html              # Redirección a la app (para GitHub Pages)
├── README.md
├── .gitignore
├── .env.example            # Plantilla de variables (para IA futura)
└── Frontend/
    ├── index.html          # Página de entrada (elegir rol)
    ├── cliente.html        # A) Interfaz del Cliente
    ├── admin.html          # B) Panel del Administrador
    ├── assets/             # Foto de portada del cliente (coloca aquí hero.jpg)
    ├── css/
    │   └── styles.css      # Estilos e identidad de marca
    └── js/
        ├── data.js         # Datos mock + almacén (localStorage)
        ├── ui.js           # Utilidades (toasts, formato)
        ├── cliente.js      # Lógica del cliente
        └── admin.js        # Lógica del administrador
```

> 🖼️ **Foto de portada:** para usar tu propia imagen en la portada del cliente, guárdala como `Frontend/assets/hero.jpg`. Si no existe, se muestra una ilustración de reserva.

---

## ▶️ Cómo ejecutar en local

**Opción rápida:** doble clic en `Frontend/index.html`.

**Opción recomendada** (evita restricciones de algunos navegadores con `file://`), con un servidor local:

```bash
# Con Python
python -m http.server 5500
# Luego abre: http://localhost:5500/Frontend/index.html
```

o con la extensión **Live Server** de VS Code.

---

## 🚀 Publicar en GitHub Pages

1. Sube el proyecto al repositorio (ver comandos abajo).
2. En GitHub: **Settings → Pages**.
3. En **Build and deployment → Source**, elige **Deploy from a branch**.
4. Selecciona la rama **`main`** y la carpeta **`/ (root)`**. Guarda.
5. Espera 1–2 minutos. El sitio quedará en:
   `https://aledevcv.github.io/PrepaProyectoFrontend/`
   *(el `index.html` de la raíz redirige automáticamente a `Frontend/index.html`)*.

### Comandos para subir

```bash
git add .
git commit -m "Frontend Contidelicias"
git branch -M main
git push -u origin main
```

---

## 📌 Notas

- Es un **prototipo de solo frontend**: los datos son de demostración y viven en el navegador (`localStorage`). No hay servidor real ni persistencia entre dispositivos.
- El pago con tarjeta es una **pasarela automática simulada**: no se procesa ningún cobro real ni se envían datos a ningún servidor.
- La carpeta `CONTEXTO-DOCUMENTACION/` (documento y mockups originales) está excluida del repositorio mediante `.gitignore`.

---

## 👥 Autores

- **Amalia Apaza Condori**
- **Alejandro Contili Villarroel**

Materia: *Preparación y Evaluación de Proyectos (ECO449-SI)* · Docente: Ing. Ubaldo Pérez Ferreira · UAGRM.

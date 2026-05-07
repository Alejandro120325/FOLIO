# FOLIO — Librería Digital Premium 📚✨

[![Live Demo](https://img.shields.io/badge/Demo-folio--seven--sand.vercel.app-c9a84c?style=for-the-badge)](https://folio-seven-sand.vercel.app/)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.12-88ce02?style=for-the-badge&logo=greensock&logoColor=white)

Plataforma full-stack de librería digital con experiencia visual inmersiva y backend completo en **Node.js + Express + PostgreSQL (Supabase)**. Autenticación JWT, validación de cédula ecuatoriana, búsqueda fuzzy multivariable, dashboards diferenciados por rol y vitrina 3D nativa con CSS `preserve-3d` + GSAP.

> 🌐 **Demo en producción:** [folio-seven-sand.vercel.app](https://folio-seven-sand.vercel.app/)

---

## 📑 Tabla de contenidos

- [Características](#-características)
- [Stack](#-stack)
- [Arquitectura](#-arquitectura)
- [Base de datos](#-base-de-datos)
- [API REST](#-api-rest)
- [Validación de cédula ecuatoriana](#-validación-de-cédula-ecuatoriana)
- [Setup local](#-setup-local)
- [Despliegue](#-despliegue)
- [Credenciales de prueba](#-credenciales-de-prueba)
- [Changelog técnico](#-changelog-técnico)

---

## 🚀 Características

### Experiencia visual

- **Vitrina 3D nativa** — Cada libro destacado se renderiza como un cuerpo volumétrico con seis caras (portada, contraportada, lomo y tres cantos de páginas) usando `transform-style: preserve-3d`. Animaciones de entrada con stagger y hover dinámico vía **GSAP 3.12**.
- **Three.js hero scene** — Cuatro libros simétricos en `WebGLRenderer` con ray-casting para clic, parallax con cámara reactiva al cursor y sistema de partículas doradas.
- **Sistema de partículas ambiental** — Capa CSS animada (`@keyframes dustDrift`) con polvo dorado a la deriva sobre un gradiente de profundidad animado.
- **Cuatro temas conmutables** — Oscuro Clásico (default), Ámbar Antiguo, Neón Digital y Modo Claro (paleta off-white estilo Bootstrap gray-50).

### Roles diferenciados

| Rol | Capacidades |
|---|---|
| 👤 **Cliente** | Registro extendido (cédula + estado civil + avatar), exploración del catálogo, carrito persistido, checkout con códigos de orden únicos. |
| 🛠 **Empleado** | CRUD completo de libros, alta/baja de descuentos por libro y rango de fechas, soft-delete del catálogo. |
| ⚙ **Administrador** | Dashboard con KPIs (ingresos totales, últimos 30 días, top libros), gráfico de barras de ingresos mensuales, distribución por género, historial de órdenes y gestión de usuarios. |

### Registro extendido y perfil

- Validación algorítmica de **cédula ecuatoriana** (módulo 10 + provincia 01–24/30 + tercer dígito < 6) en backend y frontend.
- ComboBox de estado civil con CHECK constraint en DB (`soltero` | `casado` | `viudo`).
- Upload de avatar en base64 (límite 1.5 MB), preview circular en vivo durante el registro.
- Modal de éxito post-registro que renderiza dinámicamente todos los datos capturados con animación GSAP stagger.

### Búsqueda inteligente

- **Fuzzy matcher multivariable** — Coincidencia por subcadena exacta + subsecuencia (caracteres en orden no contiguos).
- Ignora acentos vía `normalize('NFD')` — buscar `garcia` encuentra "García Márquez".
- Score ponderado: título ×5, autor ×3, género/subgénero/ISBN ×2, badge/año ×1.
- Backend con índice GIN full-text en español + extensión `pg_trgm` para fuzzy fuera del cliente.

### Accesibilidad y UX

- Formularios con fuente sans-serif (Roboto) y contraste AAA en ambos temas.
- `<option>` styled explícitamente (background + color) para legibilidad cross-browser.
- Login con `<form>` + `onsubmit` → tecla **Enter** envía y el navegador ofrece guardar credenciales (`autocomplete="username email"` / `current-password`).
- Menú de usuario con click-toggle puro (sin `:hover`).
- ARIA labels, `role="dialog"`, focus management.

---

## 🛠 Stack

| Capa | Tecnologías |
|---|---|
| **Frontend** | HTML5, CSS3 (Grid + Flexbox + custom properties), Vanilla JS (ES6+), Three.js r128, GSAP 3.12 |
| **Backend** | Node.js 18+, Express 4 |
| **Base de datos** | PostgreSQL 14+ (Supabase) |
| **Auth** | JWT (`jsonwebtoken`) + `bcryptjs` |
| **Driver DB** | `pg` (node-postgres) con SSL para nube |
| **Hosting** | Vercel (frontend) + Railway (backend) + Supabase (DB) |
| **Tipografías** | Playfair Display, Cormorant Garamond, Space Mono, Roboto |

---

## 🏗 Arquitectura

```
LIBROS/
├── index.html              # SPA: hero + vitrina 3D + catálogo + modales
├── assets/                 # logo.svg, imágenes
├── css/
│   └── style.css           # ~1950 líneas — temas, 3D, dashboards, light mode
├── js/
│   ├── data.js             # Catálogo demo + novedades (fallback offline)
│   ├── api-client.js       # FolioBackend: wrapper fetch + JWT en localStorage
│   ├── api.js              # Integración Open Library (enriquecimiento opcional)
│   ├── scene.js            # FolioScene — Three.js hero (4 libros + partículas)
│   ├── book3d.js           # Book3D — vitrina 3D vanilla con preserve-3d + GSAP
│   ├── profile.js          # Validador cédula EC, uploader avatar, modal perfil
│   ├── admin.js            # Dashboard administrador
│   ├── employee.js         # Panel empleado (CRUD libros + descuentos)
│   └── app.js              # Entry — auth, rendering, carrito, fuzzy search
└── server/
    ├── index.js            # Express bootstrap + auto-migraciones
    ├── db.js               # Pool PostgreSQL + seed users
    ├── middleware/
    │   └── auth.js         # signToken, requireAuth, requireRole
    ├── routes/
    │   ├── auth.js         # /register /login /me (PUT /me)
    │   ├── books.js        # GET público con FTS, CRUD para empleado/admin
    │   ├── discounts.js    # CRUD descuentos (empleado/admin)
    │   ├── orders.js       # POST público, /mine, /:id (admin)
    │   └── admin.js        # /stats /users (solo admin)
    ├── utils/
    │   └── cedula.js       # Validador algoritmo módulo 10
    └── sql/
        ├── schema.sql                          # Esquema base (5 tablas)
        ├── seed.sql                            # 30+ libros de catálogo
        ├── migration_001_views_and_search.sql  # Views + FTS español
        └── migration_002_user_profile.sql      # Cédula + estado civil + avatar
```

### Boot del servidor

`server/index.js` ejecuta en orden:

1. Conexión a Postgres y `pingDb()` — falla rápido si la DB no responde.
2. `ensureSchemaIfEmpty()` — aplica `schema.sql` solo si la tabla `users` no existe.
3. `ensureSeedUsers()` — inserta admin/empleado/cliente con `ON CONFLICT DO UPDATE`.
4. `ensureSeedBooksIfEmpty()` — carga `seed.sql` solo si no hay libros.
5. `ensureMigrations()` — aplica todas las migraciones idempotentes en cada arranque.

---

## 🗄 Base de datos

### Tablas

| Tabla | Columnas clave |
|---|---|
| `users` | id, name, email (UNIQUE), password_hash, role (`admin`/`employee`/`client`), phone, **cedula** (UNIQUE, formato `^[0-9]{10}$`), **marital_status** (`soltero`/`casado`/`viudo`), **avatar_url** (TEXT, data URL), created_at |
| `books` | id, title, author, genre, subgenre, price, original_price, isbn, cover_url, cover_color, description, stock, badge, active, created_at, updated_at |
| `discounts` | id, book_id (FK), percent (1-90), starts_at, ends_at, created_by, created_at |
| `orders` | id, user_id (FK nullable), guest_name, guest_email, total, subtotal, shipping, status (`pending`/`paid`/`shipped`/`delivered`/`cancelled`), payment_method, shipping_*, order_code (UNIQUE), created_at |
| `order_items` | id, order_id (FK), book_id (FK), qty, unit_price, title |

### Vistas (migration_001)

**`v_books_with_price`** — Centraliza el cálculo del descuento activo y el precio efectivo. Cualquier consulta sobre libros lee de aquí en lugar de duplicar la subconsulta:

```sql
SELECT *, active_discount, effective_price
FROM v_books_with_price
WHERE active = TRUE;
```

**`v_orders_full`** — JOIN consolidado de `orders + users + order_items`. Agrega items en JSON, cuenta unidades. El frontend del admin consulta una sola "tabla virtual":

```sql
SELECT id, order_code, status, total, buyer_name, items, items_count
FROM v_orders_full
ORDER BY created_at DESC;
```

### Búsqueda full-text

```sql
CREATE INDEX idx_books_fts ON books USING GIN (
  to_tsvector('spanish', title || ' ' || author || ' ' || ...)
);
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_books_title_trgm ON books USING GIN (title gin_trgm_ops);
```

### Constraints idempotentes (migration_002)

- `users_cedula_format_check`: `cedula ~ '^[0-9]{10}$'`
- `users_marital_status_check`: `marital_status IN ('soltero','casado','viudo')`
- `users_cedula_unique`: UNIQUE permitiendo múltiples NULL

---

## 🔌 API REST

Base local: `http://localhost:3000/api` · Producción: `https://folio-production-c35b.up.railway.app/api`

### Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea cliente. Acepta `name`, `email`, `password`, **`cedula`**, **`marital_status`**, **`avatar_url`**, `phone`. Valida cédula EC server-side. |
| POST | `/auth/login` | Devuelve `{ token, user }`. |
| GET | `/auth/me` | Perfil del usuario autenticado. |
| PUT | `/auth/me` | Actualiza perfil (nombre, teléfono, estado civil, avatar, cédula si aún no la tiene). |

### Catálogo

| Método | Ruta | Permisos |
|---|---|---|
| GET | `/books?genre=&q=` | Público. `q=` activa FTS en español + fallback ILIKE. |
| GET | `/books/:id` | Público. |
| POST | `/books` | empleado / admin |
| PUT | `/books/:id` | empleado / admin |
| DELETE | `/books/:id` | empleado / admin (soft-delete: `active = false`) |

### Descuentos

| Método | Ruta | Permisos |
|---|---|---|
| GET | `/discounts` | empleado / admin |
| POST | `/discounts` | empleado / admin (`book_id`, `percent`, `starts_at?`, `ends_at?`) |
| DELETE | `/discounts/:id` | empleado / admin |

### Órdenes

| Método | Ruta | Permisos |
|---|---|---|
| POST | `/orders` | Público (cliente o invitado). Aplica precio efectivo desde `v_books_with_price`. |
| GET | `/orders/mine` | Cliente autenticado. |
| GET | `/orders` | admin |

### Admin

| Método | Ruta | Permisos |
|---|---|---|
| GET | `/admin/stats` | admin (totales + topBooks + monthly + byGenre + recent) |
| GET | `/admin/users` | admin |
| POST | `/admin/users` | admin (crea usuarios con cualquier rol) |
| DELETE | `/admin/users/:id` | admin |
| GET | `/health` | Público (chequeo de DB) |

---

## 🇪🇨 Validación de cédula ecuatoriana

Implementación dual en `server/utils/cedula.js` y `js/profile.js` (mismo algoritmo).

```
1. La cédula debe tener exactamente 10 dígitos numéricos.
2. Los dos primeros dígitos representan la provincia: válida si está en 01-24 o es 30.
3. El tercer dígito debe ser menor a 6 (persona natural).
4. Algoritmo módulo 10:
   - Coeficientes [2,1,2,1,2,1,2,1,2] para los primeros 9 dígitos.
   - Para cada producto, si > 9 se le resta 9.
   - Se suman los 9 productos.
   - Dígito esperado = (10 − sum mod 10) mod 10
   - Debe coincidir con el 10° dígito de la cédula.
```

Validación en vivo en el formulario: feedback visual con `✓ Cédula válida` (verde), `✗ razón específica` (rojo) o contador `n/10 dígitos` (dorado).

---

## ⚙ Setup local

### Requisitos

- Node.js 18+
- PostgreSQL 14+ local **o** acceso a Supabase

### 1. Clonar e instalar

```bash
git clone https://github.com/Alejandro120325/LIBROS.git
cd LIBROS
npm install
```

### 2. Variables de entorno

Copia el ejemplo y rellena:

```bash
cp .env.example .env
```

```env
PORT=3000

# Opción A — PostgreSQL local
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=folio_db

# Opción B — Supabase (la que usa el deploy actual)
DATABASE_URL=postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres

JWT_SECRET=cambia-esta-clave-en-produccion
```

### 3. Crear la base de datos (solo modo local)

```sql
CREATE DATABASE folio_db;
```

El esquema, los seeds y las migraciones se aplican automáticamente al primer arranque del server.

### 4. Arrancar

```bash
npm start          # producción
npm run dev        # con --watch para hot-reload
```

Abrir `http://localhost:3000`.

---

## 🚢 Despliegue

El stack actual en producción:

| Capa | Servicio | URL |
|---|---|---|
| Frontend | **Vercel** | https://folio-seven-sand.vercel.app/ |
| Backend API | **Railway** | https://folio-production-c35b.up.railway.app/api |
| Base de datos | **Supabase** | Pooled connection con SSL |

`js/api-client.js` apunta al backend de Railway:

```js
const FOLIO_API_BASE = 'https://folio-production-c35b.up.railway.app/api';
```

`server/db.js` usa `DATABASE_URL` con `ssl: { rejectUnauthorized: false }` para conectar a Supabase.

---

## 🔑 Credenciales de prueba

Estos usuarios se siembran automáticamente al arrancar el server:

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@folio.com` | `admin123` |
| Empleado | `empleado@folio.com` | `empleado123` |
| Cliente | `cliente@folio.com` | `cliente123` |

> Tras el primer login, el admin redirige al dashboard, el empleado al panel de gestión, el cliente al catálogo.

---

## 📝 Changelog técnico

### v2.0 — Refinamientos UI/UX & Roles

**Backend**
- ➕ Migración 001: Vistas `v_books_with_price` (precio efectivo precalculado) y `v_orders_full` (consolidación admin). Índice GIN full-text español + `pg_trgm`.
- ➕ Migración 002: Columnas `cedula`, `marital_status`, `avatar_url` en `users` con CHECK + UNIQUE constraints idempotentes.
- ➕ `server/utils/cedula.js` — Validador algorítmico módulo 10 + provincia + tercer dígito.
- ➕ `PUT /api/auth/me` para actualizar perfil.
- 🔄 Refactor: rutas `books`, `orders`, `admin` ahora consultan las vistas en lugar de duplicar JOINs.
- 🔄 `auth/register` valida cédula y estado civil server-side.

**Frontend**
- ➕ `js/book3d.js` — Vitrina 3D vanilla con `preserve-3d` + GSAP entrance/hover (sin React).
- ➕ `js/profile.js` — Validador de cédula con feedback en vivo, uploader de avatar (FileReader → base64), modal de éxito post-registro.
- ➕ Búsqueda **fuzzy multivariable** en `app.js` (subsecuencia + ignora acentos + score ponderado).
- ➕ Tema **claro** con paleta off-white profesional (`#f8f9fa` Bootstrap gray-50).
- ➕ Variable `--sans` (Roboto + fallbacks) para formularios; `<option>` con contraste AAA explícito.
- 🔧 Menú de usuario: eliminado `:hover`, ahora click-toggle puro con outside-click closer.
- 🔧 Login: `<form onsubmit>` + `autocomplete="username email"` / `current-password` → Enter envía, navegador guarda credenciales.
- 🔧 Dashboards admin/empleado: añadidos contenedores DOM faltantes + ~270 líneas de CSS (`.dash-*`, `.kpi`, `.emp-form-*`).
- 🔧 Modal de perfil con `hidden` defensivo + cache-busting en `style.css`.

**Infraestructura**
- ☁ Deploy en Vercel + Railway + Supabase con SSL.
- 🔒 `.gitignore` excluye `.env`, `node_modules`, `.idea`, `.claude`.

---

## 📄 Licencia

MIT © Jairo Alejandro Ojeda Herrera

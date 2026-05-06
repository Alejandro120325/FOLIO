# FOLIO — Librería Digital Premium 📚✨

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)

Plataforma web full-stack de librería digital con experiencia visual inmersiva (3D nativo, sistema de partículas) y backend completo en **Node.js + Express + PostgreSQL**, con autenticación JWT y tres roles diferenciados.

---

## 🚀 Características

### Experiencia visual
* **Renderizado 3D nativo** — Tarjetas de libros con `transform-style: preserve-3d` y perspectiva en tiempo real.
* **Motor de partículas (Canvas API)** — Sistema adaptativo a 60 FPS según el tema activo.
* **Tres temas visuales** — Oscuro Clásico, Ámbar Antiguo, Neón Digital (variables CSS).
* **Diseño 100% responsive** — Breakpoints en 360 / 480 / 768 / 1024 / 1600 px, menú hamburguesa móvil.

### Backend y base de datos
* **PostgreSQL** con esquema relacional: usuarios (con roles), libros, descuentos, órdenes y detalle.
* **Autenticación JWT** con bcrypt para hashes de contraseñas.
* **Tres roles diferenciados**:
   * 👤 **Cliente** — Registro libre, exploración del catálogo, carrito persistido en DB, checkout real.
   * 🛠 **Empleado** — CRUD completo de libros, alta/baja de descuentos por libro y por período.
   * ⚙ **Administrador** — Estadísticas de ventas (KPIs, ingresos mensuales, top libros, ventas por género), gestión de usuarios y empleados.

### Tienda
* Carrito y lista de deseos persistidos (DB cuando hay sesión, localStorage como fallback).
* Checkout con validación, soporte para múltiples métodos de pago, confirmación con código de orden.
* Aplicación automática del mejor descuento vigente al momento de la compra.

---

## 🛠️ Stack

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5, CSS3 (Grid + Flexbox), Vanilla JS (ES6+), Three.js |
| Backend  | Node.js 18+, Express 4 |
| Base de datos | PostgreSQL 14+ |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Driver | `pg` (node-postgres) |

---

## 📦 Setup en WebStorm — paso a paso

### 1. Requisitos previos

- **Node.js 18+** (verifica con `node -v`)
- **PostgreSQL 14+** corriendo en `localhost:5432` con usuario `postgres` y contraseña `root` (configurable en `.env`)
- **WebStorm** (cualquier versión reciente)

### 2. Crear la base de datos

Abre **pgAdmin** o **psql** y ejecuta:

```sql
CREATE DATABASE folio_db;
```

> El servidor crea las tablas automáticamente la primera vez que arranca. Si prefieres crearlas a mano, ejecuta `server/sql/schema.sql` y luego `server/sql/seed.sql` contra `folio_db`.

### 3. Abrir el proyecto en WebStorm

1. **File → Open** y selecciona la carpeta del proyecto.
2. WebStorm detectará el `package.json` y ofrecerá instalar dependencias. Acepta, o ejecuta en la terminal integrada:
   ```bash
   npm install
   ```

### 4. Configurar credenciales

Verifica el archivo `.env` en la raíz (ya viene configurado con tus credenciales):

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=folio_db
PORT=3000
JWT_SECRET=folio-cambia-esto-en-produccion-1234567890
```

### 5. Arrancar el servidor

En la terminal de WebStorm:

```bash
npm start
```

O crea una **Run Configuration** (Run → Edit Configurations → + Node.js):
- **JavaScript file:** `server/index.js`
- **Working directory:** raíz del proyecto

Verás algo como:

```
✓ FOLIO server listo
Web:    http://localhost:3000
API:    http://localhost:3000/api
```

### 6. Abrir en el navegador

Visita **http://localhost:3000**.

---

## 🔑 Cuentas de prueba

El servidor crea (o sobreescribe) estas cuentas con sus contraseñas reales hasheadas en cada arranque:

| Rol           | Email                 | Contraseña    |
|---------------|-----------------------|---------------|
| Administrador | `admin@folio.com`     | `admin123`    |
| Empleado      | `empleado@folio.com`  | `empleado123` |
| Cliente demo  | `cliente@folio.com`   | `cliente123`  |

> En el modal de login, **selecciona primero la pestaña del rol** (Cliente / Empleado / Administrador) y luego ingresa tus credenciales.

---

## 📂 Estructura del proyecto

```plaintext
FOLIO/
├── index.html              # SPA: catálogo, login con 3 roles, dashboards
├── css/style.css           # Temas, 3D, dashboards, responsive
├── js/
│   ├── data.js             # Datos demo (fallback offline)
│   ├── api.js              # Open Library (extras)
│   ├── api-client.js       # Cliente HTTP hacia el backend (JWT)
│   ├── scene.js            # Three.js (hero 3D)
│   ├── admin.js            # Dashboard administrador
│   ├── employee.js         # Dashboard empleado (CRUD libros + descuentos)
│   └── app.js              # Lógica principal: carrito, checkout, auth
├── server/
│   ├── index.js            # Express + servir frontend estático
│   ├── db.js               # Pool de pg + seed de usuarios
│   ├── middleware/auth.js  # JWT + requireRole(...)
│   ├── routes/
│   │   ├── auth.js         # /api/auth — login, register, me
│   │   ├── books.js        # /api/books — CRUD (público GET, staff POST/PUT/DELETE)
│   │   ├── discounts.js    # /api/discounts — solo staff
│   │   ├── orders.js       # /api/orders — checkout y consulta
│   │   └── admin.js        # /api/admin — estadísticas + usuarios
│   └── sql/
│       ├── schema.sql      # DDL — tablas, enums, índices, triggers
│       └── seed.sql        # Libros iniciales
├── package.json
├── .env                    # Credenciales locales (no se sube a git)
└── README.md
```

---

## 🧩 API REST

| Método | Endpoint                  | Rol requerido         | Descripción                          |
|--------|---------------------------|-----------------------|--------------------------------------|
| POST   | `/api/auth/register`      | público               | Registro (siempre rol cliente)       |
| POST   | `/api/auth/login`         | público               | Login con verificación de rol        |
| GET    | `/api/auth/me`            | autenticado           | Datos del usuario actual             |
| GET    | `/api/books`              | público               | Catálogo con descuentos aplicados    |
| POST   | `/api/books`              | empleado / admin      | Crear libro                          |
| PUT    | `/api/books/:id`          | empleado / admin      | Editar libro                         |
| DELETE | `/api/books/:id`          | empleado / admin      | Quitar del catálogo (soft delete)    |
| GET    | `/api/discounts`          | empleado / admin      | Listar descuentos vigentes           |
| POST   | `/api/discounts`          | empleado / admin      | Crear descuento sobre un libro       |
| DELETE | `/api/discounts/:id`      | empleado / admin      | Quitar descuento                     |
| POST   | `/api/orders`             | público               | Procesar checkout (asocia user si JWT) |
| GET    | `/api/orders/mine`        | autenticado           | Mis órdenes                          |
| GET    | `/api/orders`             | admin                 | Todas las órdenes                    |
| GET    | `/api/admin/stats`        | admin                 | KPIs + top libros + mensual + recientes |
| GET    | `/api/admin/users`        | admin                 | Listado de usuarios                  |
| POST   | `/api/admin/users`        | admin                 | Crear empleado / admin / cliente     |
| DELETE | `/api/admin/users/:id`    | admin                 | Eliminar usuario                     |

---

## 🐛 Troubleshooting

**`No se pudo conectar a PostgreSQL`** — Verifica que el servicio de Postgres esté corriendo y que la BD `folio_db` exista (`CREATE DATABASE folio_db;`).

**`Error: password authentication failed`** — Revisa `.env` (`DB_USER` y `DB_PASSWORD`). En Windows el usuario por defecto es `postgres`.

**El frontend no llama al backend** — Comprueba en la consola del navegador (`F12`) que las peticiones a `/api/health` respondan 200. Si abres `index.html` directamente con `file://` el cliente apunta a `http://localhost:3000`; si usas `npm start` quedará en el mismo puerto.

**Los dashboards aparecen vacíos** — Asegúrate de haber ingresado con la pestaña correcta. El servidor rechaza login si la pestaña no coincide con el rol guardado en la DB.

---

## 👨‍💻 Autor

**Jairo Alejandro Ojeda Herrera** — Estudiante de Ingeniería en Computación
Universidad Politécnica Salesiana (UPS) — 2026
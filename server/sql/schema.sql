-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FOLIO — Esquema PostgreSQL                                  ║
-- ║  Ejecutar contra una BD vacía (ej. CREATE DATABASE folio_db) ║
-- ╚══════════════════════════════════════════════════════════════╝

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE  IF EXISTS user_role;
DROP TYPE  IF EXISTS order_status;

CREATE TYPE user_role    AS ENUM ('admin','employee','client');
CREATE TYPE order_status AS ENUM ('pending','paid','shipped','delivered','cancelled');

-- ── Usuarios ─────────────────────────────────────────────────────
CREATE TABLE users (
                       id              SERIAL PRIMARY KEY,
                       name            VARCHAR(120) NOT NULL,
                       email           VARCHAR(160) NOT NULL UNIQUE,
                       password_hash   VARCHAR(255) NOT NULL,
                       role            user_role NOT NULL DEFAULT 'client',
                       phone           VARCHAR(40),
                       created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);

-- ── Libros ───────────────────────────────────────────────────────
CREATE TABLE books (
                       id              SERIAL PRIMARY KEY,
                       title           VARCHAR(255) NOT NULL,
                       author          VARCHAR(255) NOT NULL,
                       genre           VARCHAR(80)  NOT NULL,
                       subgenre        VARCHAR(120),
                       price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
                       original_price  NUMERIC(10,2) NOT NULL CHECK (original_price >= 0),
                       isbn            VARCHAR(20),
                       cover_url       TEXT,
                       cover_color     VARCHAR(160),
                       description     TEXT,
                       short_desc      TEXT,
                       publisher       VARCHAR(160),
                       year            INT,
                       pages           INT,
                       language        VARCHAR(40)  DEFAULT 'Español',
                       rating          NUMERIC(3,2) DEFAULT 4.0,
                       reviews         INT          DEFAULT 0,
                       stock           INT          NOT NULL DEFAULT 50 CHECK (stock >= 0),
                       badge           VARCHAR(60),
                       active          BOOLEAN      NOT NULL DEFAULT TRUE,
                       created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                       updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_books_genre  ON books(genre);
CREATE INDEX idx_books_active ON books(active);

-- ── Descuentos (gestión empleado) ────────────────────────────────
CREATE TABLE discounts (
                           id              SERIAL PRIMARY KEY,
                           book_id         INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                           percent         NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 90),
                           starts_at       TIMESTAMPTZ DEFAULT NOW(),
                           ends_at         TIMESTAMPTZ,
                           created_by      INT REFERENCES users(id),
                           created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discounts_book ON discounts(book_id);

-- ── Órdenes ──────────────────────────────────────────────────────
CREATE TABLE orders (
                        id                SERIAL PRIMARY KEY,
                        user_id           INT REFERENCES users(id) ON DELETE SET NULL,
                        guest_name        VARCHAR(160),
                        guest_email       VARCHAR(160),
                        total             NUMERIC(10,2) NOT NULL,
                        subtotal          NUMERIC(10,2) NOT NULL,
                        shipping          NUMERIC(10,2) NOT NULL DEFAULT 0,
                        status            order_status  NOT NULL DEFAULT 'pending',
                        payment_method    VARCHAR(40)   NOT NULL,
                        shipping_address  TEXT,
                        shipping_city     VARCHAR(120),
                        shipping_zip      VARCHAR(20),
                        phone             VARCHAR(40),
                        order_code        VARCHAR(40)   UNIQUE,
                        created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user    ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- ── Detalle de la orden ──────────────────────────────────────────
CREATE TABLE order_items (
                             id          SERIAL PRIMARY KEY,
                             order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                             book_id     INT NOT NULL REFERENCES books(id),
                             qty         INT NOT NULL CHECK (qty > 0),
                             unit_price  NUMERIC(10,2) NOT NULL,
                             title       VARCHAR(255) NOT NULL
);

CREATE INDEX idx_items_order ON order_items(order_id);
CREATE INDEX idx_items_book  ON order_items(book_id);

-- ── Trigger de updated_at en books ───────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
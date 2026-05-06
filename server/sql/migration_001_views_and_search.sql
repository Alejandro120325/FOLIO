-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FOLIO — Migración 001                                       ║
-- ║  Views consolidadas + búsqueda full-text en español          ║
-- ║                                                              ║
-- ║  Idempotente: se puede ejecutar múltiples veces sin riesgo.  ║
-- ║  No toca esquema base ni datos existentes.                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 1. Vista v_books_with_price ─────────────────────────────────
-- Centraliza el cálculo del descuento activo y el precio efectivo,
-- evitando duplicar la subconsulta en books.js, orders.js, etc.
CREATE OR REPLACE VIEW v_books_with_price AS
SELECT b.*,
       COALESCE((
           SELECT MAX(d.percent)
           FROM discounts d
           WHERE d.book_id = b.id
             AND (d.starts_at IS NULL OR d.starts_at <= NOW())
             AND (d.ends_at   IS NULL OR d.ends_at   >= NOW())
       ), 0)::NUMERIC(5,2) AS active_discount,
       ROUND(
           b.price * (1 - COALESCE((
               SELECT MAX(d.percent)
               FROM discounts d
               WHERE d.book_id = b.id
                 AND (d.starts_at IS NULL OR d.starts_at <= NOW())
                 AND (d.ends_at   IS NULL OR d.ends_at   >= NOW())
           ), 0) / 100),
           2
       )::NUMERIC(10,2) AS effective_price
FROM books b;

-- ── 2. Vista v_orders_full (consolidada para Admin Dashboard) ──
-- Una sola "tabla virtual" que el frontend del admin puede consumir
-- con JOIN ya hecho a users + agregados de items.
CREATE OR REPLACE VIEW v_orders_full AS
SELECT o.id,
       o.order_code,
       o.status,
       o.total,
       o.subtotal,
       o.shipping,
       o.payment_method,
       o.shipping_address,
       o.shipping_city,
       o.shipping_zip,
       o.phone,
       o.created_at,
       o.user_id,
       COALESCE(u.name,  o.guest_name)  AS buyer_name,
       COALESCE(u.email, o.guest_email) AS buyer_email,
       u.role                            AS buyer_role,
       (SELECT COUNT(*)::INT
          FROM order_items oi WHERE oi.order_id = o.id)         AS items_count,
       (SELECT COALESCE(SUM(oi.qty), 0)::INT
          FROM order_items oi WHERE oi.order_id = o.id)         AS units_total,
       (SELECT COALESCE(json_agg(json_build_object(
                   'id',          oi.id,
                   'book_id',     oi.book_id,
                   'title',       oi.title,
                   'qty',         oi.qty,
                   'unit_price',  oi.unit_price
               ) ORDER BY oi.id), '[]'::json)
          FROM order_items oi WHERE oi.order_id = o.id)         AS items
FROM orders o
LEFT JOIN users u ON u.id = o.user_id;

-- ── 3. Búsqueda Full-Text (español) ─────────────────────────────
-- Índice GIN sobre tsvector compuesto para búsquedas rápidas.
CREATE INDEX IF NOT EXISTS idx_books_fts
    ON books USING GIN (
        to_tsvector(
            'spanish',
            COALESCE(title,'')      || ' ' ||
            COALESCE(author,'')     || ' ' ||
            COALESCE(genre,'')      || ' ' ||
            COALESCE(subgenre,'')   || ' ' ||
            COALESCE(description,'')
        )
    );

-- ── 4. Búsqueda parcial / fuzzy con trigramas ──────────────────
-- Permite encontrar "rotfus" → "Rothfuss". Si la extensión no se
-- puede instalar (permisos), el server lo loguea y sigue.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_books_title_trgm
    ON books USING GIN (title  gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_author_trgm
    ON books USING GIN (author gin_trgm_ops);

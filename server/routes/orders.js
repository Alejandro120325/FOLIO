'use strict';

const router = require('express').Router();
const { pool, query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validarTarjetaLuhn } = require('../utils/tarjeta');

function genCode() {
    return 'FOL-' + Date.now().toString(36).toUpperCase().slice(-8);
}

// POST /api/orders  → cualquier visitante puede comprar; si hay token se asocia el user_id
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        // Extraemos cardNumber también
        const {
            items,
            name, email, phone,
            shipping_address, shipping_city, shipping_zip,
            payment_method, cardNumber
        } = req.body || {};

        if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Carrito vacío' });
        if (!name || !email || !shipping_address || !shipping_city) {
            return res.status(400).json({ error: 'Faltan datos de envío' });
        }
        if (!payment_method) return res.status(400).json({ error: 'Selecciona método de pago' });

        // 🚨 ESCUDO: Validación de Tarjeta Luhn 🚨
        if (payment_method === 'card') {
            if (!validarTarjetaLuhn(cardNumber)) {
                return res.status(400).json({ error: 'El número de tarjeta es inválido.' });
            }
        }

        let user_id = null;
        const auth = req.headers.authorization || '';
        if (auth.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const { JWT_SECRET } = require('../middleware/auth');
                const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
                user_id = decoded.id;
            } catch (e) { /* token inválido → seguimos como guest */ }
        }

        await client.query('BEGIN');

        const ids = items.map(i => +i.id);
        const bk = await client.query(
            `SELECT id, title, stock, effective_price
             FROM v_books_with_price
             WHERE id = ANY($1::int[]) AND active = TRUE`,
            [ids]
        );
        if (bk.rowCount !== ids.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Algún libro ya no está disponible' });
        }

        let subtotal = 0;
        const lineItems = [];
        for (const it of items) {
            const b = bk.rows.find(r => r.id === +it.id);
            if (!b) continue;
            if (b.stock < it.qty) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Stock insuficiente para "${b.title}"` });
            }
            const unit = +b.effective_price;
            subtotal += unit * it.qty;
            lineItems.push({ book_id: b.id, qty: it.qty, unit_price: unit, title: b.title });
        }

        const shipping = subtotal >= 40 ? 0 : 4.99;
        const total    = subtotal + shipping;
        const code     = genCode();

        const ord = await client.query(
            `INSERT INTO orders
             (user_id, guest_name, guest_email, total, subtotal, shipping, status, payment_method,
              shipping_address, shipping_city, shipping_zip, phone, order_code)
             VALUES ($1,$2,$3,$4,$5,$6,'paid',$7,$8,$9,$10,$11,$12)
             RETURNING *`,
            [user_id, name, email, total.toFixed(2), subtotal.toFixed(2), shipping.toFixed(2),
                payment_method, shipping_address, shipping_city, shipping_zip || null, phone || null, code]
        );

        for (const li of lineItems) {
            await client.query(
                `INSERT INTO order_items (order_id, book_id, qty, unit_price, title)
                 VALUES ($1,$2,$3,$4,$5)`,
                [ord.rows[0].id, li.book_id, li.qty, li.unit_price.toFixed(2), li.title]
            );
            await client.query('UPDATE books SET stock = stock - $1 WHERE id = $2', [li.qty, li.book_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ order: ord.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[ORDERS POST]', err);
        res.status(500).json({ error: 'Error al procesar la orden' });
    } finally {
        client.release();
    }
});

// GET /api/orders/mine  → órdenes del usuario logueado
router.get('/mine', requireAuth, async (req, res) => {
    const r = await query(
        `SELECT * FROM v_orders_full
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.user.id]
    );
    res.json({ orders: r.rows });
});

// GET /api/orders  (admin) — historial consolidado
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    const r = await query(
        `SELECT * FROM v_orders_full
         ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ orders: r.rows });
});

module.exports = router;
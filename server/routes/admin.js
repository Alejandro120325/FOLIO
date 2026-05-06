'use strict';

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));

// GET /api/admin/stats  → estadísticas para el dashboard
router.get('/stats', async (req, res) => {
    try {
        const totals = await query(`
            SELECT
              (SELECT COUNT(*) FROM users  WHERE role='client')        AS total_clients,
              (SELECT COUNT(*) FROM users  WHERE role='employee')      AS total_employees,
              (SELECT COUNT(*) FROM books  WHERE active=TRUE)          AS total_books,
              (SELECT COUNT(*) FROM orders)                            AS total_orders,
              (SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ('paid','shipped','delivered')) AS revenue,
              (SELECT COALESCE(SUM(total),0) FROM orders
                 WHERE status IN ('paid','shipped','delivered')
                   AND created_at >= NOW() - INTERVAL '30 days')       AS revenue_30d
        `);

        const topBooks = await query(`
            SELECT b.id, b.title, b.author, b.price,
                   SUM(oi.qty) AS units_sold,
                   SUM(oi.qty * oi.unit_price) AS revenue
            FROM order_items oi
            JOIN books b   ON b.id = oi.book_id
            JOIN orders o  ON o.id = oi.order_id
            WHERE o.status IN ('paid','shipped','delivered')
            GROUP BY b.id
            ORDER BY units_sold DESC
            LIMIT 8
        `);

        const monthly = await query(`
            SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                   COUNT(*) AS orders,
                   SUM(total) AS revenue
            FROM orders
            WHERE status IN ('paid','shipped','delivered')
              AND created_at >= NOW() - INTERVAL '12 months'
            GROUP BY 1 ORDER BY 1
        `);

        const byGenre = await query(`
            SELECT b.genre, SUM(oi.qty) AS units
            FROM order_items oi
            JOIN books b  ON b.id = oi.book_id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status IN ('paid','shipped','delivered')
            GROUP BY b.genre ORDER BY units DESC
        `);

        const recent = await query(`
            SELECT o.id, o.order_code, o.total, o.status, o.created_at,
                   COALESCE(u.name, o.guest_name) AS buyer
            FROM orders o LEFT JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC LIMIT 10
        `);

        res.json({
            totals: totals.rows[0],
            topBooks: topBooks.rows,
            monthly: monthly.rows,
            byGenre: byGenre.rows,
            recent: recent.rows
        });
    } catch (err) {
        console.error('[ADMIN /stats]', err);
        res.status(500).json({ error: 'Error al cargar estadísticas' });
    }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
    const r = await query(
        `SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ users: r.rows });
});

// POST /api/admin/users  → crear empleados o admins
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, role } = req.body || {};
        if (!name || !email || !password || !role) return res.status(400).json({ error: 'Faltan campos' });
        if (!['admin', 'employee', 'client'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
        if (password.length < 6) return res.status(400).json({ error: 'Contraseña muy corta (mín. 6)' });

        const dup = await query('SELECT 1 FROM users WHERE email=$1', [email.toLowerCase()]);
        if (dup.rowCount) return res.status(409).json({ error: 'Email ya registrado' });

        const hash = await bcrypt.hash(password, 10);
        const r = await query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1,$2,$3,$4) RETURNING id, name, email, role, created_at`,
            [name.trim(), email.toLowerCase(), hash, role]
        );
        res.status(201).json({ user: r.rows[0] });
    } catch (err) {
        console.error('[ADMIN POST /users]', err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        if (+req.params.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        const r = await query('DELETE FROM users WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ ok: true });
    } catch (err) {
        console.error('[ADMIN DELETE /users]', err);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = router;
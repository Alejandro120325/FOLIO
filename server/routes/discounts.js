'use strict';

const router = require('express').Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('employee', 'admin'));

// GET /api/discounts
router.get('/', async (req, res) => {
    try {
        const r = await query(`
            SELECT d.*, b.title AS book_title, b.author AS book_author
            FROM discounts d JOIN books b ON b.id = d.book_id
            ORDER BY d.created_at DESC
        `);
        res.json({ discounts: r.rows });
    } catch (err) {
        console.error('[DISCOUNTS GET]', err);
        res.status(500).json({ error: 'Error al cargar descuentos' });
    }
});

// POST /api/discounts  body: { book_id, percent, starts_at?, ends_at? }
router.post('/', async (req, res) => {
    try {
        const { book_id, percent, starts_at, ends_at } = req.body || {};
        if (!book_id || !percent) return res.status(400).json({ error: 'Faltan book_id o percent' });
        if (percent <= 0 || percent > 90) return res.status(400).json({ error: 'Porcentaje debe estar entre 1 y 90' });

        const r = await query(
            `INSERT INTO discounts (book_id, percent, starts_at, ends_at, created_by)
             VALUES ($1, $2, COALESCE($3, NOW()), $4, $5)
             RETURNING *`,
            [book_id, percent, starts_at || null, ends_at || null, req.user.id]
        );
        res.status(201).json({ discount: r.rows[0] });
    } catch (err) {
        console.error('[DISCOUNTS POST]', err);
        res.status(500).json({ error: 'Error al crear descuento' });
    }
});

// DELETE /api/discounts/:id
router.delete('/:id', async (req, res) => {
    try {
        const r = await query('DELETE FROM discounts WHERE id = $1 RETURNING id', [req.params.id]);
        if (!r.rowCount) return res.status(404).json({ error: 'Descuento no encontrado' });
        res.json({ ok: true });
    } catch (err) {
        console.error('[DISCOUNTS DELETE]', err);
        res.status(500).json({ error: 'Error al eliminar descuento' });
    }
});

module.exports = router;
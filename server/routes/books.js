'use strict';

const router = require('express').Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/books  → catálogo público con descuentos activos aplicados
router.get('/', async (req, res) => {
    try {
        const { genre, q } = req.query;
        const filters = ['b.active = TRUE'];
        const params  = [];
        if (genre && genre !== 'all') {
            params.push(genre);
            filters.push(`b.genre = $${params.length}`);
        }
        if (q) {
            params.push('%' + q.toLowerCase() + '%');
            filters.push(`(LOWER(b.title) LIKE $${params.length} OR LOWER(b.author) LIKE $${params.length})`);
        }
        const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
        const sql = `
            SELECT b.*,
                   COALESCE((
                     SELECT MAX(d.percent)
                     FROM discounts d
                     WHERE d.book_id = b.id
                       AND (d.starts_at IS NULL OR d.starts_at <= NOW())
                       AND (d.ends_at   IS NULL OR d.ends_at   >= NOW())
                   ), 0) AS active_discount
            FROM books b
            ${where}
            ORDER BY b.created_at DESC
        `;
        const r = await query(sql, params);
        res.json({ books: r.rows });
    } catch (err) {
        console.error('[BOOKS /]', err);
        res.status(500).json({ error: 'Error al cargar catálogo' });
    }
});

// GET /api/books/:id
router.get('/:id', async (req, res) => {
    try {
        const r = await query(
            `SELECT b.*,
                    COALESCE((
                      SELECT MAX(d.percent) FROM discounts d
                      WHERE d.book_id = b.id
                        AND (d.starts_at IS NULL OR d.starts_at <= NOW())
                        AND (d.ends_at   IS NULL OR d.ends_at   >= NOW())
                    ), 0) AS active_discount
             FROM books b WHERE b.id = $1`,
            [req.params.id]
        );
        if (!r.rowCount) return res.status(404).json({ error: 'Libro no encontrado' });
        res.json({ book: r.rows[0] });
    } catch (err) {
        console.error('[BOOKS /:id]', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ── A partir de aquí: empleado o admin ──────────────────────────────
router.use(requireAuth, requireRole('employee', 'admin'));

// POST /api/books
router.post('/', async (req, res) => {
    try {
        const b = req.body || {};
        if (!b.title || !b.author || !b.genre || b.price == null || b.original_price == null) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (title, author, genre, price, original_price)' });
        }
        const r = await query(
            `INSERT INTO books (title, author, genre, subgenre, price, original_price, isbn, cover_url, cover_color,
                                description, short_desc, publisher, year, pages, language, stock, badge, active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,COALESCE($18,TRUE))
             RETURNING *`,
            [b.title, b.author, b.genre, b.subgenre || null, b.price, b.original_price,
                b.isbn || null, b.cover_url || null, b.cover_color || null,
                b.description || null, b.short_desc || null, b.publisher || null,
                b.year || null, b.pages || null, b.language || 'Español',
                b.stock != null ? b.stock : 50, b.badge || 'Nuevo', b.active]
        );
        res.status(201).json({ book: r.rows[0] });
    } catch (err) {
        console.error('[BOOKS POST]', err);
        res.status(500).json({ error: 'Error al crear libro' });
    }
});

// PUT /api/books/:id
router.put('/:id', async (req, res) => {
    try {
        const id = +req.params.id;
        const b  = req.body || {};
        const fields = ['title','author','genre','subgenre','price','original_price','isbn','cover_url',
            'cover_color','description','short_desc','publisher','year','pages','language','stock','badge','active'];
        const sets = [], vals = [];
        fields.forEach(f => {
            if (b[f] !== undefined) { vals.push(b[f]); sets.push(`${f} = $${vals.length}`); }
        });
        if (!sets.length) return res.status(400).json({ error: 'Sin cambios' });
        vals.push(id);
        const r = await query(
            `UPDATE books SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
            vals
        );
        if (!r.rowCount) return res.status(404).json({ error: 'Libro no encontrado' });
        res.json({ book: r.rows[0] });
    } catch (err) {
        console.error('[BOOKS PUT]', err);
        res.status(500).json({ error: 'Error al actualizar libro' });
    }
});

// DELETE /api/books/:id  → soft delete (active=false)
router.delete('/:id', async (req, res) => {
    try {
        const r = await query(
            'UPDATE books SET active = FALSE WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (!r.rowCount) return res.status(404).json({ error: 'Libro no encontrado' });
        res.json({ ok: true });
    } catch (err) {
        console.error('[BOOKS DELETE]', err);
        res.status(500).json({ error: 'Error al eliminar libro' });
    }
});

module.exports = router;
'use strict';

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { query } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

// POST /api/auth/register  → solo crea cuentas con rol "client"
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
        if (password.length < 6)           return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        if (!/\S+@\S+\.\S+/.test(email))   return res.status(400).json({ error: 'Email inválido' });

        const existing = await query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rowCount) return res.status(409).json({ error: 'Ese email ya está registrado' });

        const hash = await bcrypt.hash(password, 10);
        const ins  = await query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, 'client')
                 RETURNING id, name, email, role`,
            [name.trim(), email.toLowerCase().trim(), hash]
        );
        const user  = ins.rows[0];
        const token = signToken(user);
        res.json({ token, user });
    } catch (err) {
        console.error('[AUTH /register]', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/auth/login  (Autenticación inteligente, ya no pide el role)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Faltan email o contraseña' });

        const r = await query(
            'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );
        if (!r.rowCount) return res.status(401).json({ error: 'Credenciales inválidas' });

        const u = r.rows[0];
        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

        // HEMOS ELIMINADO EL BLOQUEO DE PESTAÑA. Ahora entras sin importar el rol.

        const safe  = { id: u.id, name: u.name, email: u.email, role: u.role };
        const token = signToken(safe);
        res.json({ token, user: safe });
    } catch (err) {
        console.error('[AUTH /login]', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    const r = await query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: r.rows[0] });
});

module.exports = router;
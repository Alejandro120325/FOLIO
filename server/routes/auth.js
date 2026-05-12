'use strict';

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { query } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { validateCedulaEC }       = require('../utils/cedula');
const { validarTelefonoEcuador } = require('../utils/telefono');

const ALLOWED_MARITAL = ['soltero', 'casado', 'viudo'];
const MAX_AVATAR_LEN = 1_500_000;

function publicUser(u) {
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        cedula: u.cedula || null,
        marital_status: u.marital_status || null,
        avatar_url: u.avatar_url || null,
        phone: u.phone || null,
        created_at: u.created_at
    };
}

router.post('/register', async (req, res) => {
    try {
        const {
            name, email, password,
            cedula, marital_status, avatar_url, phone
        } = req.body || {};

        if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos obligatorios' });
        if (password.length < 6)           return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        if (!/\S+@\S+\.\S+/.test(email))   return res.status(400).json({ error: 'Email inválido' });

        // Cédula: si llega, validamos algorítmicamente
        if (cedula != null && cedula !== '') {
            const v = validateCedulaEC(String(cedula));
            if (!v.ok) return res.status(400).json({ error: `Cédula inválida: ${v.reason}` });
        }

        // 🚨 NUEVO ESCUDO: Validación de Teléfono Ecuatoriano
        if (phone != null && phone !== '') {
            if (!validarTelefonoEcuador(String(phone))) {
                return res.status(400).json({ error: 'Número de teléfono inválido. Debe empezar con 09 y tener 10 dígitos.' });
            }
        }

        if (marital_status && !ALLOWED_MARITAL.includes(String(marital_status).toLowerCase())) {
            return res.status(400).json({ error: 'Estado civil inválido' });
        }

        if (avatar_url && String(avatar_url).length > MAX_AVATAR_LEN) {
            return res.status(413).json({ error: 'La imagen de perfil supera el tamaño permitido' });
        }

        const dupEmail = await query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
        if (dupEmail.rowCount) return res.status(409).json({ error: 'Ese email ya está registrado' });

        if (cedula) {
            const dupCedula = await query('SELECT 1 FROM users WHERE cedula = $1', [cedula]);
            if (dupCedula.rowCount) return res.status(409).json({ error: 'Esa cédula ya está registrada' });
        }

        const hash = await bcrypt.hash(password, 10);
        const ins  = await query(
            `INSERT INTO users (name, email, password_hash, role, cedula, marital_status, avatar_url, phone)
             VALUES ($1, $2, $3, 'client', $4, $5, $6, $7)
             RETURNING id, name, email, role, cedula, marital_status, avatar_url, phone, created_at`,
            [
                name.trim(),
                email.toLowerCase().trim(),
                hash,
                cedula || null,
                marital_status ? String(marital_status).toLowerCase() : null,
                avatar_url || null,
                phone || null
            ]
        );
        const user  = publicUser(ins.rows[0]);
        const token = signToken(user);
        res.status(201).json({ token, user });
    } catch (err) {
        console.error('[AUTH /register]', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Faltan email o contraseña' });

        const r = await query(
            `SELECT id, name, email, password_hash, role, cedula, marital_status, avatar_url, phone, created_at
             FROM users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );
        if (!r.rowCount) return res.status(401).json({ error: 'Credenciales inválidas' });

        const u  = r.rows[0];
        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

        const safe  = publicUser(u);
        const token = signToken(safe);
        res.json({ token, user: safe });
    } catch (err) {
        console.error('[AUTH /login]', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    const r = await query(
        `SELECT id, name, email, role, cedula, marital_status, avatar_url, phone, created_at
         FROM users WHERE id = $1`,
        [req.user.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: publicUser(r.rows[0]) });
});

// Permite cambiar avatar, teléfono, estado civil, cédula (si aún no la tiene), nombre.
router.put('/me', requireAuth, async (req, res) => {
    try {
        const { name, phone, marital_status, avatar_url, cedula } = req.body || {};
        const sets = [], vals = [];

        if (name !== undefined) {
            const n = String(name).trim();
            if (!n) return res.status(400).json({ error: 'Nombre vacío' });
            vals.push(n); sets.push(`name = $${vals.length}`);
        }

        if (phone !== undefined) {
            if (phone && !validarTelefonoEcuador(String(phone))) {
                return res.status(400).json({ error: 'Número celular inválido. Usa el formato: 0991234567' });
            }
            vals.push(phone || null); sets.push(`phone = $${vals.length}`);
        }

        if (marital_status !== undefined) {
            const ms = marital_status ? String(marital_status).toLowerCase() : null;
            if (ms && !ALLOWED_MARITAL.includes(ms)) return res.status(400).json({ error: 'Estado civil inválido' });
            vals.push(ms); sets.push(`marital_status = $${vals.length}`);
        }
        if (avatar_url !== undefined) {
            if (avatar_url && String(avatar_url).length > MAX_AVATAR_LEN) {
                return res.status(413).json({ error: 'La imagen de perfil supera el tamaño permitido' });
            }
            vals.push(avatar_url || null); sets.push(`avatar_url = $${vals.length}`);
        }
        if (cedula !== undefined && cedula) {
            const v = validateCedulaEC(String(cedula));
            if (!v.ok) return res.status(400).json({ error: `Cédula inválida: ${v.reason}` });
            const dup = await query('SELECT 1 FROM users WHERE cedula = $1 AND id <> $2', [cedula, req.user.id]);
            if (dup.rowCount) return res.status(409).json({ error: 'Esa cédula ya está registrada' });
            vals.push(cedula); sets.push(`cedula = $${vals.length}`);
        }

        if (!sets.length) return res.status(400).json({ error: 'Sin cambios' });

        vals.push(req.user.id);
        const r = await query(
            `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}
             RETURNING id, name, email, role, cedula, marital_status, avatar_url, phone, created_at`,
            vals
        );
        res.json({ user: publicUser(r.rows[0]) });
    } catch (err) {
        console.error('[AUTH PUT /me]', err);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

module.exports = router;

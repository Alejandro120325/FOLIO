'use strict';

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     +(process.env.DB_PORT   || 5432),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME     || 'folio_db',
    max: 10,
    idleTimeoutMillis: 30000
});

pool.on('error', err => console.error('[DB] Error inesperado en pool:', err));

async function query(text, params) {
    const res = await pool.query(text, params);
    return res;
}

// Asegura que existan los usuarios admin/empleado/cliente con hashes válidos.
// Si la fila ya existe pero con un hash placeholder, lo sustituye por uno real.
async function ensureSeedUsers() {
    const seeds = [
        { name: 'Administrador Folio', email: 'admin@folio.com',    pass: 'admin123',    role: 'admin'    },
        { name: 'Empleado Folio',      email: 'empleado@folio.com', pass: 'empleado123', role: 'employee' },
        { name: 'Cliente Demo',        email: 'cliente@folio.com',  pass: 'cliente123',  role: 'client'   }
    ];
    for (const s of seeds) {
        const hash = await bcrypt.hash(s.pass, 10);
        await query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email)
             DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
            [s.name, s.email, hash, s.role]
        );
    }
    console.log('[DB] Usuarios seed verificados (admin / empleado / cliente).');
}

async function pingDb() {
    const r = await query('SELECT NOW() AS now');
    return r.rows[0].now;
}

module.exports = { pool, query, ensureSeedUsers, pingDb };
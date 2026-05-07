'use strict';

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

console.log('🔗 Intentando conectar al Pool de PostgreSQL...');

// Configuración del Pool de conexiones hacia la nube (Supabase)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // SSL es obligatorio para conectar con servicios de base de datos en la nube
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000
});

pool.on('error', err => console.error('[DB] Error inesperado en el pool de Supabase:', err));

/**
 * Helper para ejecutar consultas SQL de forma simplificada
 */
async function query(text, params) {
    return await pool.query(text, params);
}

/**
 * Asegura que existan los usuarios base en Supabase.
 */
async function ensureSeedUsers() {
    const seeds = [
        { name: 'Administrador Folio', email: 'admin@folio.com',    pass: 'admin123',    role: 'admin'    },
        { name: 'Empleado Folio',      email: 'empleado@folio.com', pass: 'empleado123', role: 'employee' },
        { name: 'Cliente Demo',        email: 'cliente@folio.com',  pass: 'cliente123',  role: 'client'   }
    ];

    try {
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
        console.log('[DB] Conexión exitosa: Usuarios base verificados en Supabase.');
    } catch (err) {
        console.error('[DB] Error al verificar usuarios en la nube:', err.message);
    }
}

/**
 * Verifica la disponibilidad de la base de datos
 */
async function pingDb() {
    const r = await query('SELECT NOW() AS now');
    return r.rows[0].now;
}

module.exports = { pool, query, ensureSeedUsers, pingDb };
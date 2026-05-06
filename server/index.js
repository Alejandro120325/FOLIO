'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const { pool, query, ensureSeedUsers, pingDb } = require('./db');

const PORT = +(process.env.PORT || 3000);
const app  = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Servimos el frontend estático desde la raíz del proyecto
const ROOT = path.join(__dirname, '..');
app.use(express.static(ROOT));

// ── Rutas API ─────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/books',     require('./routes/books'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/admin',     require('./routes/admin'));

app.get('/api/health', async (req, res) => {
    try {
        const now = await pingDb();
        res.json({ ok: true, db_time: now });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// SPA fallback → manda index.html para rutas que no son /api/*
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(ROOT, 'index.html'));
});

// ── Bootstrap ─────────────────────────────────────────────────────
async function ensureSchemaIfEmpty() {
    try {
        const r = await query("SELECT to_regclass('public.users') AS exists");
        if (!r.rows[0].exists) {
            console.log('[BOOT] Tabla users no existe — ejecutando schema.sql automáticamente.');
            const sql = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
            await pool.query(sql);
            console.log('[BOOT] Schema aplicado.');
        }
    } catch (e) {
        console.warn('[BOOT] No se pudo verificar/crear el schema:', e.message);
    }
}

async function ensureMigrations() {
    // Migraciones idempotentes: views, índices full-text, extensiones.
    // Se aplican en cada arranque; si ya existen, no pasa nada.
    const migrations = [
        'migration_001_views_and_search.sql',
        'migration_002_user_profile.sql'
    ];
    for (const file of migrations) {
        try {
            const sql = fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8');
            await pool.query(sql);
            console.log(`[BOOT] Migración aplicada: ${file}`);
        } catch (e) {
            console.warn(`[BOOT] Migración ${file} falló (continuando): ${e.message}`);
        }
    }
}

async function ensureSeedBooksIfEmpty() {
    const r = await query('SELECT COUNT(*)::int AS n FROM books');
    if (r.rows[0].n === 0) {
        console.log('[BOOT] Tabla books vacía — cargando seed.sql...');
        try {
            const sql = fs.readFileSync(path.join(__dirname, 'sql', 'seed.sql'), 'utf8');
            // ejecutar solo los INSERT INTO books del seed
            const booksOnly = sql
                .split(/;\s*\n/)
                .filter(s => /INSERT\s+INTO\s+books/i.test(s))
                .join(';\n') + ';';
            if (booksOnly.trim()) await pool.query(booksOnly);
            console.log('[BOOT] Seed de libros cargado.');
        } catch (e) {
            console.warn('[BOOT] No se pudo cargar seed.sql:', e.message);
        }
    }
}

async function start() {
    try {
        const now = await pingDb();
        console.log(`[BOOT] Conectado a PostgreSQL — hora del servidor: ${now}`);
    } catch (e) {
        console.error(`
╔════════════════════════════════════════════════════════════════╗
║  ❌ NO SE PUDO CONECTAR A POSTGRESQL                           ║
║                                                                ║
║  Verifica que:                                                 ║
║  1. PostgreSQL esté corriendo                                  ║
║  2. La base "${(process.env.DB_NAME || 'folio_db').padEnd(48)}"║
║     exista (créala con: CREATE DATABASE folio_db;)             ║
║  3. El usuario / contraseña en .env sean correctos             ║
║                                                                ║
║  Detalle: ${e.message}
╚════════════════════════════════════════════════════════════════╝
`);
        process.exit(1);
    }

    await ensureSchemaIfEmpty();
    await ensureSeedUsers();
    await ensureSeedBooksIfEmpty();
    await ensureMigrations();

    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ✓ FOLIO server listo                                          ║
║                                                                ║
║  Web:    http://localhost:${PORT}
║  API:    http://localhost:${PORT}/api
║  Health: http://localhost:${PORT}/api/health
║                                                                ║
║  Credenciales de prueba:                                       ║
║    admin@folio.com    / admin123                               ║
║    empleado@folio.com / empleado123                            ║
║    cliente@folio.com  / cliente123                             ║
╚════════════════════════════════════════════════════════════════╝
`);
    });
}

start();
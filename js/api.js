'use strict';

// ══ OPEN LIBRARY API ════════════════════════════════════════════

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';
const API_TIMEOUT_MS = 6000;
const CACHE_KEY = 'folio-api-cache-v3';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const GENRE_SUBJECTS = {
    'Fantasía':         'fantasy',
    'Ciencia Ficción':  'science_fiction',
    'Thriller':         'thrillers',
    'Literatura':       'literature',
    'No Ficción':       'nonfiction'
};

const GENRE_COLORS = {
    'Fantasía':         ['#3a1a5c','#0f0820'],
    'Ciencia Ficción':  ['#0a2a4a','#04101c'],
    'Thriller':         ['#1a0a25','#080310'],
    'Literatura':       ['#2a3a1a','#0a1008'],
    'No Ficción':       ['#2a2010','#0a0804']
};

// ── Helpers ───────────────────────────────────────────────────
function fetchWithTimeout(url, ms = API_TIMEOUT_MS) {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
}

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp > CACHE_TTL_MS) return null;
        return data.payload;
    } catch (e) { return null; }
}

function writeCache(payload) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), payload }));
    } catch (e) {}
}

function makeColor(genre) {
    const [c1, c2] = GENRE_COLORS[genre] || ['#1a1a22','#080808'];
    return `linear-gradient(135deg,${c1} 0%,${c2} 100%)`;
}

function pickPrice() {
    return Math.round((14 + Math.random() * 12) * 100) / 100;
}

// ── Adaptador: Open Library work → libro Folio ────────────────
function adaptWork(work, genre, idOffset) {
    const coverId = work.cover_id;
    if (!coverId) return null; // descartamos sin portada
    const price = pickPrice();
    const originalPrice = Math.round((price * 1.4) * 100) / 100;
    const author = (work.authors && work.authors[0] && work.authors[0].name) || 'Autor desconocido';
    const year = work.first_publish_year || 2024;

    return {
        id: idOffset,
        title: work.title || 'Sin título',
        author,
        genre,
        subgenre: genre,
        price,
        originalPrice,
        isbn: '',
        coverId,
        olid: work.cover_edition_key || '',
        badge: year >= 2023 ? 'Reciente' : 'Open Library',
        rating: 4.0 + Math.random() * 0.9,
        reviews: Math.floor(500 + Math.random() * 8000),
        pages: 200 + Math.floor(Math.random() * 400),
        language: 'Inglés',
        publisher: 'Open Library',
        year,
        color: makeColor(genre),
        description: work.description || `Una obra reciente del género ${genre}, descubierta a través del catálogo abierto de Open Library.`,
        shortDesc: `Una obra reciente de ${author}.`,
        tags: [genre, 'API', 'Reciente'],
        _fromApi: true
    };
}

// ── Fetch por género ──────────────────────────────────────────
async function fetchSubject(subject, limit = 10) {
    const url = `${OPEN_LIBRARY_BASE}/subjects/${subject}.json?limit=${limit}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.works || []).filter(w => w.cover_id);
}

// ── Función principal: cargar y enriquecer catálogo ───────────
async function fetchApiBooks() {
    const cached = readCache();
    if (cached) return { books: cached, fromCache: true };

    const out = [];
    let nextId = 500;

    const entries = Object.entries(GENRE_SUBJECTS);
    const results = await Promise.allSettled(
        entries.map(([genre, subject]) => fetchSubject(subject, 10))
    );

    results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const [genre] = entries[i];
        r.value.slice(0, 3).forEach(work => {
            const adapted = adaptWork(work, genre, nextId++);
            if (adapted) out.push(adapted);
        });
    });

    if (out.length === 0) throw new Error('La API no devolvió libros');
    writeCache(out);
    return { books: out, fromCache: false };
}

// ── Fetch novedades recientes (2024-2025) ─────────────────────
async function fetchApiReleases() {
    const url = `${OPEN_LIBRARY_BASE}/search.json?q=subject:fiction&sort=new&limit=15`;
    try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const docs = (data.docs || []).filter(d => d.cover_i && d.title && d.author_name);
        return docs.slice(0, 6).map((d, i) => ({
            id: 700 + i,
            title: d.title,
            author: d.author_name[0],
            genre: 'Ficción',
            price: pickPrice(),
            isbn: (d.isbn && d.isbn[0]) || '',
            coverId: d.cover_i,
            olid: (d.edition_key && d.edition_key[0]) || '',
            color: makeColor('Literatura'),
            year: d.first_publish_year || 2024,
            pages: d.number_of_pages_median || 320,
            rating: 4.2 + Math.random() * 0.7,
            reviews: Math.floor(800 + Math.random() * 5000),
            description: `Novedad reciente de ${d.author_name[0]}.`,
            tags: ['Novedad','API','Reciente'],
            _fromApi: true
        }));
    } catch (e) {
        return [];
    }
}

// ── Punto de entrada que usa app.js ───────────────────────────
async function loadApiContent() {
    try {
        const [booksResult, releases] = await Promise.all([
            fetchApiBooks(),
            fetchApiReleases()
        ]);
        return {
            success: true,
            extraBooks: booksResult.books,
            extraReleases: releases,
            fromCache: booksResult.fromCache
        };
    } catch (err) {
        console.warn('[Folio API] fallback activado:', err.message);
        return {
            success: false,
            extraBooks: typeof EXTRA_BOOKS_FALLBACK !== 'undefined' ? EXTRA_BOOKS_FALLBACK : [],
            extraReleases: []
        };
    }
}

window.FolioAPI = { loadApiContent };

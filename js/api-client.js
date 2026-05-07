'use strict';

// ══ CLIENTE HTTP HACIA EL BACKEND ════════════════════════════════
// Encapsula fetch() + JWT en localStorage. Expuesto en window.FolioBackend.

const FOLIO_API_BASE = 'https://folio-production-c35b.up.railway.app/api';

const TOKEN_KEY = 'folio-token';
const USER_KEY  = 'folio-user-v2';

function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
function getStoredUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; } }
function setStoredUser(u) { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch (e) {} }

async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch(FOLIO_API_BASE + path, { ...opts, headers });
    let data = null;
    try { data = await res.json(); } catch (e) { /* respuesta sin body */ }
    if (!res.ok) {
        const msg = (data && data.error) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.data   = data;
        throw err;
    }
    return data;
}

const FolioBackend = {
    isAvailable: false,

    async ping() {
        try {
            await api('/health');
            this.isAvailable = true;
            return true;
        } catch (e) {
            this.isAvailable = false;
            return false;
        }
    },

    // ── Auth ─────────────────────────────────────────────────────
    async login(email, password) { // ELIMINADO EL PARÁMETRO ROLE
        const out = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        setToken(out.token); setStoredUser(out.user);
        return out.user;
    },
    async register(name, email, password) {
        // Registro mínimo (legacy). El frontend ahora usa _registerExtended.
        const out = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role: 'client' }) });
        setToken(out.token); setStoredUser(out.user);
        return out.user;
    },
    // Registro extendido: cedula, marital_status, avatar_url, phone.
    // Devuelve el user completo (no sólo {id,name,email,role}).
    async _registerExtended(payload) {
        const out = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
        setToken(out.token); setStoredUser(out.user);
        return out.user;
    },
    async updateMe(patch) {
        const out = await api('/auth/me', { method: 'PUT', body: JSON.stringify(patch) });
        setStoredUser(out.user);
        return out.user;
    },
    async me() {
        const out = await api('/auth/me');
        setStoredUser(out.user);
        return out.user;
    },
    logout() { setToken(null); setStoredUser(null); },
    currentUser() { return getStoredUser(); },
    isLogged()    { return !!getToken() && !!getStoredUser(); },
    hasRole(...rs) { const u = getStoredUser(); return !!u && rs.includes(u.role); },

    // ── Catálogo ─────────────────────────────────────────────────
    listBooks(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return api('/books' + (qs ? '?' + qs : ''));
    },
    getBook(id)        { return api('/books/' + id); },
    createBook(data)   { return api('/books', { method: 'POST', body: JSON.stringify(data) }); },
    updateBook(id, d)  { return api('/books/' + id, { method: 'PUT', body: JSON.stringify(d) }); },
    deleteBook(id)     { return api('/books/' + id, { method: 'DELETE' }); },

    // ── Descuentos ───────────────────────────────────────────────
    listDiscounts()           { return api('/discounts'); },
    createDiscount(data)      { return api('/discounts', { method: 'POST', body: JSON.stringify(data) }); },
    deleteDiscount(id)        { return api('/discounts/' + id, { method: 'DELETE' }); },

    // ── Órdenes ──────────────────────────────────────────────────
    submitOrder(payload) { return api('/orders', { method: 'POST', body: JSON.stringify(payload) }); },
    myOrders()           { return api('/orders/mine'); },
    allOrders()          { return api('/orders'); },

    // ── Admin ────────────────────────────────────────────────────
    adminStats()                 { return api('/admin/stats'); },
    listUsers()                  { return api('/admin/users'); },
    createUser(data)             { return api('/admin/users', { method: 'POST', body: JSON.stringify(data) }); },
    deleteUser(id)               { return api('/admin/users/' + id, { method: 'DELETE' }); }
};

window.FolioBackend = FolioBackend;
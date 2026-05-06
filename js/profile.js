'use strict';

// ══ PERFIL DE USUARIO — validación, registro extendido y vista éxito ══

// ── Validador de Cédula Ecuatoriana ──────────────────────────────
// Misma lógica que server/utils/cedula.js (también valida en backend).
function validateCedulaEC(cedula) {
    if (typeof cedula !== 'string') return { ok: false, reason: 'Cédula debe ser texto' };
    if (!/^\d{10}$/.test(cedula))   return { ok: false, reason: 'Debe tener exactamente 10 dígitos' };

    const province = parseInt(cedula.substring(0, 2), 10);
    const provinceValid = (province >= 1 && province <= 24) || province === 30;
    if (!provinceValid) return { ok: false, reason: `Código de provincia inválido (${cedula.substring(0,2)})` };

    const third = parseInt(cedula[2], 10);
    if (third > 5) return { ok: false, reason: 'El tercer dígito debe ser menor a 6' };

    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        let prod = parseInt(cedula[i], 10) * coef[i];
        if (prod > 9) prod -= 9;
        sum += prod;
    }
    const expected = (10 - (sum % 10)) % 10;
    if (expected !== parseInt(cedula[9], 10)) {
        return { ok: false, reason: 'Dígito verificador incorrecto' };
    }
    return { ok: true };
}

// ── Validación en vivo del input cédula ──────────────────────────
function bindCedulaLiveValidation() {
    const inp = document.getElementById('reg-cedula');
    const fb  = document.getElementById('reg-cedula-feedback');
    if (!inp || !fb) return;

    inp.addEventListener('input', () => {
        // Sólo dígitos, máximo 10
        const cleaned = inp.value.replace(/\D/g, '').slice(0, 10);
        if (cleaned !== inp.value) inp.value = cleaned;

        if (!cleaned) {
            fb.textContent = '';
            inp.classList.remove('field-valid', 'field-invalid');
            return;
        }
        if (cleaned.length < 10) {
            fb.textContent = `${cleaned.length}/10 dígitos`;
            fb.className = 'field-feedback warn';
            inp.classList.remove('field-valid', 'field-invalid');
            return;
        }
        const v = validateCedulaEC(cleaned);
        if (v.ok) {
            fb.textContent = '✓ Cédula válida';
            fb.className = 'field-feedback ok';
            inp.classList.add('field-valid');
            inp.classList.remove('field-invalid');
        } else {
            fb.textContent = '✗ ' + v.reason;
            fb.className = 'field-feedback err';
            inp.classList.add('field-invalid');
            inp.classList.remove('field-valid');
        }
    });
}

// ── Preview de avatar al subir archivo ───────────────────────────
function bindAvatarPicker() {
    const file = document.getElementById('reg-avatar-file');
    const prev = document.getElementById('reg-avatar-preview');
    if (!file || !prev) return;

    file.addEventListener('change', () => {
        const f = file.files && file.files[0];
        if (!f) return;
        if (!/^image\//.test(f.type)) {
            showToast('El archivo no es una imagen.');
            file.value = '';
            return;
        }
        if (f.size > 1_500_000) {
            showToast('Imagen demasiado grande (máx 1.5 MB).');
            file.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            const dataUrl = e.target.result;
            prev.style.backgroundImage = `url(${dataUrl})`;
            prev.classList.add('has-image');
            prev.dataset.dataUrl = dataUrl;
        };
        reader.readAsDataURL(f);
    });

    prev.addEventListener('click', () => file.click());
    prev.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); }
    });
}

// ── Submit del registro extendido ────────────────────────────────
async function handleRegisterExtended() {
    const get  = id => (document.getElementById(id)?.value || '').trim();
    const err  = document.getElementById('auth-reg-err');
    const prev = document.getElementById('reg-avatar-preview');

    err.style.color = '';
    err.textContent = '';

    const name           = get('reg-name');
    const email          = get('reg-email');
    const pass           = document.getElementById('reg-pass').value;
    const cedula         = get('reg-cedula');
    const marital_status = get('reg-marital');
    const phone          = get('reg-phone');
    const avatar_url     = (prev && prev.dataset.dataUrl) || null;

    if (!name || !email || !pass) { err.textContent = 'Completa nombre, email y contraseña.'; return; }
    if (pass.length < 6)          { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
    if (!cedula)                  { err.textContent = 'Ingresa tu cédula.'; return; }

    const v = validateCedulaEC(cedula);
    if (!v.ok) { err.textContent = 'Cédula inválida: ' + v.reason; return; }

    if (!marital_status) { err.textContent = 'Selecciona tu estado civil.'; return; }

    err.style.color = 'var(--gold)';
    err.textContent = 'Creando cuenta…';

    try {
        const out = await window.FolioBackend._registerExtended({
            name, email, password: pass, cedula, marital_status, phone, avatar_url
        });
        // Cierra el modal de auth y muestra perfil
        if (typeof closeAuth === 'function') closeAuth();
        if (typeof updateAuthUI === 'function') updateAuthUI();
        showProfileSuccess(out);
    } catch (e) {
        err.style.color = '#e05555';
        err.textContent = e.message || 'No se pudo crear la cuenta.';
    }
}

// ── Vista de éxito tras registro ─────────────────────────────────
function profileInitial(name) {
    return (name || '?').trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
}

function maritalLabel(m) {
    return ({ soltero: 'Soltero/a', casado: 'Casado/a', viudo: 'Viudo/a' })[m] || '—';
}

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) { return iso || '—'; }
}

function showProfileSuccess(user) {
    const overlay = document.getElementById('profile-overlay');
    const modal   = document.getElementById('profile-modal');
    if (!overlay || !modal || !user) return;

    const avatarEl = document.getElementById('profile-avatar');
    const nameEl   = document.getElementById('profile-name');
    const emailEl  = document.getElementById('profile-email');
    const cedEl    = document.getElementById('profile-cedula');
    const marEl    = document.getElementById('profile-marital');
    const phoneEl  = document.getElementById('profile-phone');
    const roleEl   = document.getElementById('profile-role');
    const dateEl   = document.getElementById('profile-date');

    if (user.avatar_url) {
        avatarEl.innerHTML = '';
        avatarEl.style.backgroundImage = `url(${user.avatar_url})`;
        avatarEl.classList.add('has-image');
    } else {
        avatarEl.innerHTML = profileInitial(user.name);
        avatarEl.style.backgroundImage = '';
        avatarEl.classList.remove('has-image');
    }
    nameEl.textContent  = user.name || '—';
    emailEl.textContent = user.email || '—';
    cedEl.textContent   = user.cedula || '—';
    marEl.textContent   = maritalLabel(user.marital_status);
    phoneEl.textContent = user.phone || '—';
    roleEl.textContent  = user.role || 'client';
    dateEl.textContent  = formatDate(user.created_at);

    document.body.style.overflow = 'hidden';
    overlay.hidden = false;
    modal.hidden   = false;
    // Forzar repaint antes de añadir .open para que la transición se anime
    void modal.offsetWidth;
    overlay.classList.add('open');
    modal.classList.add('open');

    // GSAP entrada de las filas
    if (window.gsap) {
        window.gsap.fromTo('.profile-row',
            { opacity: 0, x: -18 },
            { opacity: 1, x: 0, stagger: 0.07, duration: 0.5, ease: 'power2.out', delay: 0.2 }
        );
    }
}

function closeProfileSuccess() {
    const overlay = document.getElementById('profile-overlay');
    const modal   = document.getElementById('profile-modal');
    overlay?.classList.remove('open');
    modal?.classList.remove('open');
    document.body.style.overflow = '';
    // Tras la transición de salida, devolvemos hidden para que el SR no
    // los anuncie y queden fuera del flujo aunque el CSS no esté cargado.
    setTimeout(() => {
        if (overlay && !overlay.classList.contains('open')) overlay.hidden = true;
        if (modal   && !modal.classList.contains('open'))   modal.hidden   = true;
    }, 450);
}

// ── Theme toggle (oscuro ↔ claro) ────────────────────────────────
function toggleLightDark() {
    const cur = document.documentElement.getAttribute('data-theme') || 'default';
    const next = cur === 'light' ? 'default' : 'light';
    if (typeof setTheme === 'function') setTheme(next);
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    bindCedulaLiveValidation();
    bindAvatarPicker();
});

// Expone API global
window.Profile = {
    validateCedulaEC,
    handleRegisterExtended,
    showProfileSuccess,
    closeProfileSuccess,
    toggleLightDark
};
window.handleRegisterExtended = handleRegisterExtended;
window.closeProfileSuccess    = closeProfileSuccess;
window.toggleLightDark        = toggleLightDark;

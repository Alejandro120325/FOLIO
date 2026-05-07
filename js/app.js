'use strict';

// ══ ESTADO ═══════════════════════════════════════════════════════
let cart = [], wishlist = [], currentFilter = 'all', toastTimer = null;
let ratingValue = 0, ratingSubmitted = false;
let API_LOADED = false;

try { cart = JSON.parse(localStorage.getItem('folio-cart') || '[]'); } catch(e){ cart=[]; }
try { wishlist = JSON.parse(localStorage.getItem('folio-wishlist') || '[]'); } catch(e){ wishlist=[]; }

// ══ AUTH SYSTEM (backend real con JWT + 3 roles) ═════════════════
const Auth = {
    get user()       { return window.FolioBackend?.currentUser() || null; },
    get isLoggedIn() { return !!this.user; },
    get role()       { return this.user?.role || null; }
};

function openAuth(tab = 'login') {
    document.getElementById('auth-overlay').classList.add('open');
    document.getElementById('auth-modal').classList.add('open');
    switchAuthTab(tab);
    document.body.style.overflow = 'hidden';
}

function closeAuth() {
    document.getElementById('auth-overlay').classList.remove('open');
    document.getElementById('auth-modal').classList.remove('open');
    document.body.style.overflow = '';
}

function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-login-form').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('auth-register-form').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('auth-login-err').textContent = '';
    document.getElementById('auth-reg-err').textContent = '';
}

// REDIRECCIÓN MÁGICA Y LOGIN INTELIGENTE
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;
    const err   = document.getElementById('auth-login-err');
    err.textContent = '';

    if (!email || !pass) { err.textContent = 'Completa todos los campos.'; return; }

    // Mostramos feedback visual mientras conecta
    err.style.color = 'var(--gold)';
    err.textContent = 'Verificando credenciales...';

    try {
        const user = await FolioBackend.login(email, pass);
        closeAuth(); updateAuthUI();

        // 🔮 Redirección inteligente
        if (user.role === 'admin') {
            showToast(`¡Bienvenido al Panel de Control, ${user.name}!`);
            setTimeout(() => { if(window.Admin) Admin.open(); }, 300);
        } else if (user.role === 'employee') {
            showToast(`¡Hola, ${user.name}! Panel de empleado abierto.`);
            setTimeout(() => { if(window.Employee) Employee.open(); }, 300);
        } else {
            showToast(`¡Bienvenido, ${user.name}!`);
            scrollToBooks();
        }
    } catch (e) {
        err.style.color = '#e05555';
        err.textContent = e.message || 'Credenciales inválidas o servidor inactivo.';
    }
}

async function handleRegister() {
    const err = document.getElementById('auth-reg-err');
    const btn = document.querySelector('#auth-register-form .auth-submit-btn');
    err.textContent = '';

    // 1. Captura de datos
    const name    = document.getElementById('reg-name').value.trim();
    const email   = document.getElementById('reg-email').value.trim();
    const pass    = document.getElementById('reg-pass').value;
    const cedula  = document.getElementById('reg-cedula').value.trim();
    const phone   = document.getElementById('reg-phone').value.trim();
    const marital = document.getElementById('reg-marital').value;
    const photoInput = document.getElementById('reg-avatar-file');

    // 2. Validaciones básicas
    if (!name || !email || !pass || !cedula || !marital) {
        err.textContent = 'Completa todos los campos obligatorios.';
        return;
    }

    // 3. Feedback visual
    btn.disabled = true;
    err.style.color = 'var(--gold)';
    err.textContent = 'Creando tu cuenta premium...';

    try {
        // Registro en Backend (Supabase)
        const user = await window.FolioBackend.register(name, email, pass);

        // 4. Llenar los datos en el Modal de Éxito
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-cedula').textContent = cedula;
        document.getElementById('profile-marital').textContent = marital;
        document.getElementById('profile-phone').textContent = phone || 'No registrado';
        document.getElementById('profile-role').textContent = 'Cliente';
        document.getElementById('profile-date').textContent = new Date().toLocaleDateString();

        // 🔥 TRUCO PARA LA IMAGEN 🔥
        const pAvatar = document.getElementById('profile-avatar');
        if (photoInput.files && photoInput.files[0]) {
            // Si el usuario subió una foto, la mostramos usando una URL temporal
            const imgUrl = URL.createObjectURL(photoInput.files[0]);
            pAvatar.textContent = ''; // Quitamos las letras
            pAvatar.style.backgroundImage = `url(${imgUrl})`;
            pAvatar.style.backgroundSize = 'cover';
            pAvatar.classList.add('has-image');
        } else {
            // Si no subió nada, ponemos las iniciales
            pAvatar.textContent = name.substring(0, 2).toUpperCase();
            pAvatar.style.backgroundImage = 'none';
        }

        // 5. Cerrar registro y abrir éxito
        closeAuth();
        updateAuthUI();

        const pOverlay = document.getElementById('profile-overlay');
        const pModal = document.getElementById('profile-modal');

        pOverlay.removeAttribute('hidden');
        pModal.removeAttribute('hidden');

        setTimeout(() => {
            pOverlay.classList.add('open');
            pModal.classList.add('open');
        }, 50);

    } catch (e) {
        console.error(e);
        err.style.color = '#ff6b6b';
        err.textContent = e.message || 'Error al conectar con el servidor.';
    } finally {
        btn.disabled = false;
    }
}

// Función para cerrar el modal de perfil de éxito
window.closeProfileSuccess = function() {
    const pOverlay = document.getElementById('profile-overlay');
    const pModal = document.getElementById('profile-modal');

    pOverlay.classList.remove('open');
    pModal.classList.remove('open');

    // Esperamos a que termine la animación para ocultarlo del DOM
    setTimeout(() => {
        pOverlay.setAttribute('hidden', 'true');
        pModal.setAttribute('hidden', 'true');
    }, 300);
};

function handleLogout() {
    window.FolioBackend?.logout();
    updateAuthUI();
    showToast('Sesión cerrada. ¡Hasta pronto!');
}

function updateAuthUI() {
    const out = document.getElementById('auth-logged-out');
    const inn = document.getElementById('auth-logged-in');
    const u = Auth.user;
    if (u) {
        out.style.display = 'none'; inn.style.display = 'flex';
        document.getElementById('auth-avatar').textContent = (u.name || u.email)[0].toUpperCase();
        document.getElementById('auth-username').textContent = (u.name || u.email).substring(0, 14);
        const chip = document.getElementById('auth-role-chip');
        if (chip) {
            chip.textContent = u.role === 'admin' ? 'admin' : u.role === 'employee' ? 'empleado' : '';
            chip.style.display = u.role === 'client' ? 'none' : 'inline-flex';
            chip.className = 'auth-role-chip role-' + u.role;
        }
        const adm = document.getElementById('menu-admin');
        const emp = document.getElementById('menu-employee');
        if (adm) adm.style.display = u.role === 'admin' ? 'block' : 'none';
        if (emp) emp.style.display = (u.role === 'employee' || u.role === 'admin') ? 'block' : 'none';
    } else {
        out.style.display = 'flex'; inn.style.display = 'none';
    }
}

function openUserMenu(e) {
    if (e) e.stopPropagation();
    const d = document.getElementById('user-dropdown');
    const open = d.classList.toggle('open');
    if (open) {
        const closer = (ev) => {
            if (!d.contains(ev.target)) { d.classList.remove('open'); document.removeEventListener('click', closer); }
        };
        setTimeout(() => document.addEventListener('click', closer), 0);
    }
}

// ══ MOBILE NAV ═══════════════════════════════════════════════════
function toggleMobileNav() {
    const nav = document.getElementById('main-nav');
    const links = document.getElementById('nav-links');
    const burger = document.getElementById('nav-burger');
    const open = !nav.classList.contains('mobile-open');
    nav.classList.toggle('mobile-open', open);
    links.classList.toggle('mobile-open', open);
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function closeMobileNav() {
    document.getElementById('main-nav')?.classList.remove('mobile-open');
    document.getElementById('nav-links')?.classList.remove('mobile-open');
    document.getElementById('nav-burger')?.classList.remove('active');
    document.getElementById('nav-burger')?.setAttribute('aria-expanded', 'false');
}

// ══ THEME ════════════════════════════════════════════════════════
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('folio-theme', theme);
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.id === `tbtn-${theme}`));
}

// ══ HELPERS ══════════════════════════════════════════════════════
const ALL_BOOKS = () => [...BOOKS, ...NEW_RELEASES];
function allBooksById(id) { return ALL_BOOKS().find(b => b.id === id); }
function togglePassword(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (inp.type === 'password') {
        inp.type = 'text';
        btn.textContent = '🙈'; // Monito tapándose los ojos (o el icono que prefieras)
    } else {
        inp.type = 'password';
        btn.textContent = '👁️'; // Vuelve al ojo normal
    }
}
function renderStars(r) {
    const f = Math.floor(r), h = r%1 >= .5;
    return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-(h?1:0));
}
function disc(p,o){ return Math.round((1-p/o)*100); }

// Genera todas las URLs de portada candidatas
function _coverCandidates(bookOrIsbn, sz='M') {
    const base = 'https://covers.openlibrary.org/b';
    if (bookOrIsbn && typeof bookOrIsbn === 'object') {
        const out = [];
        if (bookOrIsbn.cover_url) out.push(bookOrIsbn.cover_url);
        if (bookOrIsbn.isbn)      out.push(`${base}/isbn/${bookOrIsbn.isbn}-${sz}.jpg?default=false`);
        if (bookOrIsbn.olid)      out.push(`${base}/olid/${bookOrIsbn.olid}-${sz}.jpg?default=false`);
        if (bookOrIsbn.coverId)   out.push(`${base}/id/${bookOrIsbn.coverId}-${sz}.jpg?default=false`);
        return out;
    }
    return bookOrIsbn ? [`${base}/isbn/${bookOrIsbn}-${sz}.jpg?default=false`] : [];
}

function imgUrl(bookOrIsbn, sz='M') {
    return _coverCandidates(bookOrIsbn, sz)[0] || '';
}

function bookImg(bookOrIsbn, cls, sz='M') {
    const list = _coverCandidates(bookOrIsbn, sz);
    if (!list.length) return '';
    const fbAttr = list.length > 1
        ? ` data-cover-fb='${JSON.stringify(list.slice(1)).replace(/'/g, '&apos;')}'`
        : '';
    return `<img class="${cls}" src="${list[0]}"${fbAttr} loading="lazy" alt="" onload="this.style.opacity=1" onerror="folioCoverFallback(this)">`;
}

window.folioCoverFallback = function(img) {
    let fb = [];
    try { fb = JSON.parse((img.dataset.coverFb || '[]').replace(/&apos;/g, "'")); } catch(e) {}
    if (fb.length) {
        img.src = fb.shift();
        img.dataset.coverFb = JSON.stringify(fb);
    } else {
        img.remove();
    }
};

// ══ RENDER LIBROS ════════════════════════════════════════════════
function renderBooks() {
    const grid = document.getElementById('books-grid');
    if(!grid) return;
    grid.innerHTML = BOOKS.map(b => {
        const iw = wishlist.includes(b.id);
        return `
    <div class="book-card" id="card-${b.id}" data-genre="${b.genre}">
      <div class="book-card-inner">
        <div class="book-card-front" onclick="openBookModalById(${b.id})">
          <div class="book-cover">
            <div class="book-cover-bg" style="background:${b.color}">
              ${bookImg(b,'book-photo','M')}
              <div class="book-cover-info"><div class="book-cover-title">${b.title}</div><div class="book-cover-author">${b.author}</div></div>
            </div>
            <div class="book-badge">${b.badge}</div>
            <button class="book-wishlist-btn ${iw?'active':''}" onclick="event.stopPropagation();toggleWishlist(${b.id})" id="wish-btn-${b.id}">${iw?'♥':'♡'}</button>
          </div>
          <div class="book-info">
            <div class="book-info-title">${b.title}</div>
            <div class="book-info-author">${b.author}</div>
            <div class="book-rating"><span class="stars">${renderStars(b.rating)}</span><span class="reviews-count">(${b.reviews.toLocaleString()})</span></div>
            <div class="book-price-row">
              <span><span class="book-price">$${b.price.toFixed(2)}</span><span class="book-price-old">$${b.originalPrice.toFixed(2)}</span></span>
              <button class="add-cart-btn" onclick="event.stopPropagation();addToCart(${b.id})">+ Carrito</button>
            </div>
          </div>
        </div>
        <div class="book-card-back">
          <div class="back-stars">${renderStars(b.rating)} <span style="font-family:var(--mono);font-size:.52rem;color:var(--muted)">${b.rating.toFixed(1)}/5</span></div>
          <div class="back-title">${b.title}</div>
          <div class="back-genre">${b.subgenre}</div>
          <div class="back-desc">${b.shortDesc}</div>
          <div class="back-meta-mini">
            <div class="back-meta-item">Páginas<span>${b.pages}</span></div>
            <div class="back-meta-item">Año<span>${b.year}</span></div>
            <div class="back-meta-item">Idioma<span>${b.language}</span></div>
            <div class="back-meta-item">Descuento<span style="color:var(--gold)">-${disc(b.price,b.originalPrice)}%</span></div>
          </div>
          <div class="back-actions">
            <button class="back-btn" onclick="addToCart(${b.id})">+ Carrito</button>
            <button class="back-detail-btn" onclick="openBookModalById(${b.id})">Ver más</button>
          </div>
        </div>
      </div>
    </div>`;
    }).join('');

    document.querySelectorAll('.book-card').forEach(card => {
        let rect = null;
        let ticking = false;
        card.addEventListener('mouseenter', () => { rect = card.getBoundingClientRect(); });
        card.addEventListener('mousemove', e => {
            if (!rect || ticking) return;
            window.requestAnimationFrame(() => {
                const x = (e.clientX - rect.left) / rect.width - .5;
                const y = (e.clientY - rect.top) / rect.height - .5;
                card.style.transform = `perspective(800px) rotateY(${x*9}deg) rotateX(${-y*6}deg)`;
                ticking = false;
            });
            ticking = true;
        }, { passive: true });
        card.addEventListener('mouseleave', () => {
            rect = null;
            card.style.transform = 'perspective(800px) rotateY(0) rotateX(0)';
        });
    });
    updateCategoryCounts();
    renderShowcase3D();
}

function renderShowcase3D() {
    const container = document.getElementById('showcase-3d-grid');
    if (!container || !window.Book3D) return;
    window.Book3D.mount(container, BOOKS);
}

function renderNewReleases() {
    const scroll = document.getElementById('releases-scroll');
    if(!scroll) return;
    scroll.innerHTML = NEW_RELEASES.map(b => `
    <div class="release-card" onclick="openReleaseModal(${b.id})">
      <div class="release-cover">
        <div class="release-cover-inner" style="background:${b.color}">
          ${bookImg(b,'release-photo','M')}
          <div class="release-t" style="position:relative;z-index:1">${b.title}</div>
          <div class="release-a" style="position:relative;z-index:1">${b.author}</div>
        </div>
      </div>
      <div class="release-info-title">${b.title}</div>
      <div class="release-info-sub">${b.genre} · ${b.year}</div>
      <div class="release-price">$${b.price.toFixed(2)}</div>
      <button class="release-add-btn" onclick="event.stopPropagation();addToCart(${b.id})">+ Agregar al carrito</button>
    </div>`).join('');
}

// ══ FILTER & SEARCH ══════════════════════════════════════════════
function filterBooks(genre) {
    currentFilter = genre;
    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.toggle('active', genre==='all' ? t.textContent.trim()==='Todos' : t.textContent.trim()===genre);
    });
    let v = 0;
    document.querySelectorAll('.book-card').forEach(c => {
        const show = genre==='all' || c.dataset.genre===genre;
        c.classList.toggle('hidden', !show);
        if (show) v++;
    });
    const noRes = document.getElementById('no-results');
    if(noRes) noRes.style.display = v===0?'block':'none';

    const secTitle = document.getElementById('section-title-books');
    if(secTitle) secTitle.innerHTML = genre==='all' ? '<em>Bestsellers</em> del momento' : `Colección de <em>${genre}</em>`;

    const searchInp = document.getElementById('main-search');
    if(searchInp) searchInp.value = '';
}
function filterByGenre(genre) { filterBooks(genre); scrollToBooks(); }
function mainSearchFilter(q) {
    const query = (q || '').trim();
    if (!query) { filterBooks(currentFilter); return; }
    let v = 0;
    BOOKS.forEach(b => {
        const s =
            fuzzyScore(b.title,    query) * 5 +
            fuzzyScore(b.author,   query) * 3 +
            fuzzyScore(b.genre,    query) * 2 +
            fuzzyScore(b.subgenre, query) * 2 +
            fuzzyScore(b.badge,    query) * 1 +
            fuzzyScore(String(b.isbn || ''), query) * 2 +
            fuzzyScore(String(b.year || ''), query) * 1 +
            ((b.tags || []).reduce((a, t) => a + fuzzyScore(t, query), 0));
        const m = s > 0;
        const c = document.getElementById(`card-${b.id}`);
        if (c) { c.classList.toggle('hidden', !m); if (m) v++; }
    });
    const noRes = document.getElementById('no-results');
    if(noRes) noRes.style.display = v===0?'block':'none';

    const secTitle = document.getElementById('section-title-books');
    if(secTitle) secTitle.innerHTML = v ? `Resultados para <em>"${query}"</em>` : `Sin resultados para <em>"${query}"</em>`;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
}
function quickSearch(t) {
    const searchInp = document.getElementById('main-search');
    if(searchInp) searchInp.value = t;
    mainSearchFilter(t); scrollToBooks();
}
function updateCategoryCounts() {
    // Agregamos Tecnología y Manga al contador de etiquetas
    ['Fantasía','Ciencia Ficción','Thriller','Tecnología','No Ficción', 'Manga'].forEach(g => {
        const el = document.getElementById(`cnt-${g}`);
        if (el) el.textContent = `${BOOKS.filter(b => b.genre===g).length} títulos`;
    });
}

// ══ SEARCH OVERLAY ════════════════════════════════════════════════
function openSearch() {
    document.getElementById('search-overlay').classList.add('open');
    setTimeout(() => document.getElementById('search-overlay-input').focus(), 250);
    document.body.style.overflow = 'hidden';
}
function closeSearch() {
    document.getElementById('search-overlay').classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('search-overlay-input').value = '';
    document.getElementById('search-results').innerHTML = '';
}
// ── Fuzzy matcher ────────────────────────────────────────────────
// Devuelve un score numérico: 0 = no coincide. Mayor = mejor match.
//   - Coincidencia exacta de subcadena: score base alto, mejor cuanto antes empieza.
//   - Subsecuencia (caracteres en orden, no necesariamente contiguos):
//     score basado en proximidad — caracteres más juntos puntúan más.
//   - Ignora acentos: "Garcia" matchea "García".
function _foldDiacritics(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function fuzzyScore(text, query) {
    if (!query) return 0;
    const t = _foldDiacritics(String(text || '').toLowerCase());
    const q = _foldDiacritics(query.toLowerCase());
    if (!t) return 0;

    // Match exacto contiguo
    const idx = t.indexOf(q);
    if (idx !== -1) return 1000 + Math.max(0, 50 - idx);

    // Subsecuencia: cada carácter de q aparece en t en orden
    let last = -1, score = 0;
    for (const ch of q) {
        const at = t.indexOf(ch, last + 1);
        if (at === -1) return 0;
        // gap pequeño = mejor; primer char temprano = mejor
        const gap = at - last - 1;
        score += Math.max(1, 12 - gap);
        last = at;
    }
    // Bonus si el primer carácter coincide con el inicio del texto
    if (t[0] === q[0]) score += 8;
    return score;
}

function handleLiveSearch(query) {
    const q = query.trim();
    const c = document.getElementById('search-results');
    if (!q) { c.innerHTML=''; return; }

    // Score multivariable: title pesa más, luego author, luego género/subgénero, badge, isbn, year, tags
    const scored = ALL_BOOKS().map(b => {
        const s =
            fuzzyScore(b.title,    q) * 5 +
            fuzzyScore(b.author,   q) * 3 +
            fuzzyScore(b.genre,    q) * 2 +
            fuzzyScore(b.subgenre, q) * 2 +
            fuzzyScore(b.badge,    q) * 1 +
            fuzzyScore(String(b.isbn || ''), q) * 2 +
            fuzzyScore(String(b.year || ''), q) * 1 +
            ((b.tags || []).reduce((a, t) => a + fuzzyScore(t, q), 0));
        return { b, s };
    }).filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map(x => x.b);

    const res = scored;
    if (!res.length) { c.innerHTML='<div class="search-no-results">No se encontraron resultados</div>'; return; }
    c.innerHTML = res.map(b => `
    <div class="search-result-item" onclick="closeSearch();${b.id<100?`openBookModalById(${b.id})`:`openReleaseModal(${b.id})`}">
      <div class="search-result-cover-bg" style="background:${b.color}">
        ${bookImg(b,'','S')}
        <span style="font-family:var(--serif);font-size:.6rem;font-weight:700;color:#fff;position:relative;z-index:1;text-shadow:0 1px 3px rgba(0,0,0,.9)">${b.title}</span>
      </div>
      <div class="search-result-title">${b.title}</div>
      <div class="search-result-author">${b.author}</div>
      <div class="search-result-price">$${b.price.toFixed(2)}</div>
    </div>`).join('');
}

// ══ CART ══════════════════════════════════════════════════════════
function saveCart() { try { localStorage.setItem('folio-cart', JSON.stringify(cart)); } catch(e){} }
function addToCart(id) {
    const b = allBooksById(id); if (!b) return;
    const ex = cart.find(i => i.id===id);
    if (ex) ex.qty++; else cart.push({id,qty:1});
    saveCart(); updateCartCount(); renderCartUI();
    showToast(`"${b.title}" agregado al carrito`);
}
function removeFromCart(id) { cart=cart.filter(i=>i.id!==id); saveCart(); updateCartCount(); renderCartUI(); }
function updateQuantity(id,delta) {
    const item = cart.find(i=>i.id===id); if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart=cart.filter(i=>i.id!==id);
    saveCart(); updateCartCount(); renderCartUI();
}
function updateCartCount() {
    const n = cart.reduce((s,i)=>s+i.qty,0);
    document.getElementById('cart-count').textContent = n;
    document.getElementById('cart-item-count').textContent = n;
}
function getCartSubtotal() {
    return cart.reduce((s,i) => { const b=allBooksById(i.id); return s+(b?b.price*i.qty:0); }, 0);
}
function renderCartUI() {
    const c = document.getElementById('cart-items');
    const f = document.getElementById('cart-footer');
    if (!cart.length) {
        c.innerHTML=`<div class="cart-empty"><div class="cart-empty-icon">📚</div><p>Tu carrito está vacío</p><button class="cart-empty-btn" onclick="closeCart();scrollToBooks()">Explorar catálogo</button></div>`;
        f.style.display='none'; return;
    }
    f.style.display='block';
    c.innerHTML = cart.map(item => {
        const b=allBooksById(item.id); if (!b) return '';
        return `<div class="cart-item" id="cart-item-${b.id}">
      <div class="cart-item-cover" style="background:${b.color}"><img class="cart-item-img" src="${imgUrl(b,'S')}" loading="lazy" alt="${b.title}" onload="this.style.opacity=1" onerror="this.remove()"></div>
      <div class="cart-item-info">
        <div class="cart-item-title">${b.title}</div>
        <div class="cart-item-author">${b.author}</div>
        <div class="cart-item-price">$${(b.price*item.qty).toFixed(2)}</div>
        <div class="cart-item-controls"><button class="qty-btn" onclick="updateQuantity(${b.id},-1)">−</button><span class="qty-display">${item.qty}</span><button class="qty-btn" onclick="updateQuantity(${b.id},1)">+</button></div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${b.id})" title="Eliminar">✕</button>
    </div>`;
    }).join('');
    const sub = getCartSubtotal(), sh = sub>=40?0:4.99;
    document.getElementById('cart-subtotal').textContent=`$${sub.toFixed(2)}`;
    const el=document.getElementById('cart-shipping');
    el.textContent=sub>=40?'Gratis':`$${sh.toFixed(2)}`; el.className=sub>=40?'free-tag':'';
    document.getElementById('cart-total').textContent=`$${(sub+sh).toFixed(2)}`;
}
function openCart() {
    document.getElementById('cart-overlay').classList.add('open');
    document.getElementById('cart-sidebar').classList.add('open');
    document.body.style.overflow='hidden'; renderCartUI();
}
function closeCart() {
    document.getElementById('cart-overlay').classList.remove('open');
    document.getElementById('cart-sidebar').classList.remove('open');
    document.body.style.overflow='';
}
function resetCart() { cart=[]; saveCart(); updateCartCount(); renderCartUI(); }

// ══ WISHLIST ══════════════════════════════════════════════════════
function saveWishlist() { try { localStorage.setItem('folio-wishlist', JSON.stringify(wishlist)); } catch(e){} }
function toggleWishlist(id) {
    const b=allBooksById(id); const i=wishlist.indexOf(id);
    if (i===-1) { wishlist.push(id); showToast(`"${b?.title}" guardado en tu lista`); }
    else { wishlist.splice(i,1); showToast(`"${b?.title}" eliminado de la lista`); }
    saveWishlist();
    const btn=document.getElementById(`wish-btn-${id}`);
    if (btn) { const a=wishlist.includes(id); btn.textContent=a?'♥':'♡'; btn.classList.toggle('active',a); }
    updateWishlistCount();
}
function updateWishlistCount() {
    const c=document.getElementById('wishlist-count');
    c.textContent=wishlist.length; c.style.display=wishlist.length?'flex':'none';
}
function openWishlistView() {
    if (!wishlist.length) { showToast('Tu lista de deseos está vacía'); return; }
    scrollToBooks();
    requestAnimationFrame(() => {
        document.querySelectorAll('.book-card').forEach(c => c.classList.toggle('hidden',!wishlist.includes(parseInt(c.id.replace('card-','')))));
        document.getElementById('section-title-books').innerHTML='Mi lista de <em>deseos</em>';
        document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));
        showToast(`Mostrando ${wishlist.length} libro(s) de tu lista`);
    });
}

// ══ BOOK MODAL ════════════════════════════════════════════════════
function openBookModal(book, isRelease=false) {
    if (!book) return;
    const iw=wishlist.includes(book.id);
    const dv=book.originalPrice?disc(book.price,book.originalPrice):null;
    document.getElementById('book-modal-content').innerHTML=`
    <div>
      <div class="modal-cover">
        <div class="modal-cover-gradient" style="background:${book.color}"></div>
        ${bookImg(book,'','L')}
        <div class="modal-cover-text"><div class="modal-cover-title">${book.title}</div><div class="modal-cover-author">${book.author}</div></div>
      </div>
      <div style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:.4rem">${(book.tags||[]).map(t=>`<span class="modal-tag">${t}</span>`).join('')}</div>
    </div>
    <div class="modal-info">
      <span class="modal-genre-badge">${book.subgenre||book.genre}${book.year?' · '+book.year:''}</span>
      <h2 class="modal-title">${book.title}</h2>
      <div class="modal-author">${book.author}</div>
      <div class="modal-rating"><span class="modal-stars">${renderStars(book.rating)}</span><span class="modal-reviews">${typeof book.rating==='number'?book.rating.toFixed(1):book.rating}/5 · ${book.reviews?.toLocaleString()} reseñas</span></div>
      <p class="modal-desc">${book.description}</p>
      <div class="modal-meta">
        ${book.publisher?`<div class="modal-meta-row"><span class="modal-meta-label">Editorial</span><span class="modal-meta-value">${book.publisher}</span></div>`:''}
        ${book.year?`<div class="modal-meta-row"><span class="modal-meta-label">Año</span><span class="modal-meta-value">${book.year}</span></div>`:''}
        ${book.pages?`<div class="modal-meta-row"><span class="modal-meta-label">Páginas</span><span class="modal-meta-value">${book.pages}</span></div>`:''}
        ${book.language?`<div class="modal-meta-row"><span class="modal-meta-label">Idioma</span><span class="modal-meta-value">${book.language}</span></div>`:''}
      </div>
      <div class="modal-price-block">
        <span class="modal-price">$${book.price.toFixed(2)}</span>
        ${book.originalPrice?`<span class="modal-price-old">$${book.originalPrice.toFixed(2)}</span><span class="modal-discount">-${dv}%</span>`:'<span style="font-family:var(--mono);font-size:.75rem;color:#555">Novedad 2026</span>'}
      </div>
      <div class="modal-actions">
        <button class="modal-add-cart" onclick="addToCart(${book.id});closeBookModal()">+ Agregar al carrito</button>
        ${!isRelease?`<button class="modal-wishlist-btn ${iw?'active':''}" id="modal-wish-${book.id}" onclick="toggleWishlist(${book.id});this.classList.toggle('active');this.textContent=wishlist.includes(${book.id})?'♥ En lista':'♡ Guardar'">${iw?'♥ En lista':'♡ Guardar'}</button>`:''}
      </div>
    </div>`;
    document.getElementById('book-modal-content').querySelectorAll('img').forEach(img => { img.onload = () => img.style.opacity = 1; });
    document.getElementById('book-modal-overlay').classList.add('open');
    document.getElementById('book-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function openBookModalById(id) { openBookModal(BOOKS.find(b => b.id === id), false); }
function openReleaseModal(id) { openBookModal(NEW_RELEASES.find(b => b.id === id), true); }
function closeBookModal() {
    document.getElementById('book-modal-overlay').classList.remove('open');
    document.getElementById('book-modal').classList.remove('open');
    document.body.style.overflow = '';
}

// ══ CHECKOUT ════════════════════════════════════════════════════
function openCheckout() {
    if (!cart.length) { showToast('Tu carrito está vacío'); return; }
    closeCart(); renderCheckoutSummary();
    document.getElementById('checkout-inner').style.display = 'grid';
    document.getElementById('order-success').style.display = 'none';
    document.getElementById('checkout-overlay').classList.add('open');
    document.getElementById('checkout-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeCheckout() {
    document.getElementById('checkout-overlay').classList.remove('open');
    document.getElementById('checkout-modal').classList.remove('open');
    document.body.style.overflow = '';
}
function renderCheckoutSummary() {
    document.getElementById('checkout-items').innerHTML = cart.map(item => {
        const b = allBooksById(item.id); if (!b) return '';
        return `
    <div class="checkout-item">
      <div class="checkout-item-cover" style="background:${b.color};position:relative;overflow:hidden">
        ${bookImg(b,'','S')}
      </div>
      <div style="flex:1;min-width:0">
        <div class="checkout-item-title">${b.title}</div>
        <div class="checkout-item-qty">${b.author} × ${item.qty}</div>
      </div>
      <div class="checkout-item-price">$${(b.price*item.qty).toFixed(2)}</div>
    </div>`;
    }).join('');
    const sub = getCartSubtotal();
    document.getElementById('co-subtotal').textContent = `$${sub.toFixed(2)}`;
    document.getElementById('co-total').textContent = `$${(sub + (sub >= 40 ? 0 : 4.99)).toFixed(2)}`;
}
function selectPayment(input) {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
    input.closest('.payment-method').classList.add('active');
    document.getElementById('card-fields').classList.toggle('hidden', input.value !== 'card');
}
function formatCard(input) {
    const v = input.value.replace(/\D/g,'').slice(0,16);
    input.value = v.match(/.{1,4}/g)?.join(' ') || v;
}
function formatExpiry(input) {
    let v = input.value.replace(/\D/g,'');
    if (v.length >= 2) v = v.slice(0,2)+'/'+v.slice(2,4);
    input.value = v;
}
function validateCheckout() {
    let ok = true;
    const rules = [
        {id:'ch-name',err:'err-name',msg:'Ingresa tu nombre'},
        {id:'ch-email',err:'err-email',msg:'Email inválido',fn:v=>/\S+@\S+\.\S+/.test(v)},
        {id:'ch-address',err:'err-address',msg:'Ingresa tu dirección'},
        {id:'ch-city',err:'err-city',msg:'Ingresa tu ciudad'}
    ];
    if (document.querySelector('input[name="payment"]:checked')?.value === 'card') {
        rules.push(
            {id:'ch-card',err:'err-card',msg:'16 dígitos',fn:v=>v.replace(/\s/g,'').length===16},
            {id:'ch-expiry',err:'err-expiry',msg:'MM/AA',fn:v=>/^\d{2}\/\d{2}$/.test(v)},
            {id:'ch-cvv',err:'err-cvv',msg:'CVV',fn:v=>v.length>=3}
        );
    }
    rules.forEach(r => {
        const inp = document.getElementById(r.id); if (!inp) return;
        const val = inp.value.trim(); const valid = val && (r.fn ? r.fn(val) : true);
        inp.classList.toggle('error', !valid);
        document.getElementById(r.err).textContent = valid ? '' : r.msg;
        if (!valid) ok = false;
    });
    return ok;
}
async function submitOrder() {
    if (!validateCheckout()) { showToast('Completa todos los campos requeridos'); return; }
    const btn = document.querySelector('.checkout-submit-btn');
    btn.textContent = 'Procesando...'; btn.disabled = true;

    const payload = {
        items: cart.map(i => ({ id: i.id, qty: i.qty })),
        name:    document.getElementById('ch-name').value.trim(),
        email:   document.getElementById('ch-email').value.trim(),
        phone:   document.getElementById('ch-phone').value.trim(),
        shipping_address: document.getElementById('ch-address').value.trim(),
        shipping_city:    document.getElementById('ch-city').value.trim(),
        shipping_zip:     document.getElementById('ch-zip').value.trim(),
        payment_method:   document.querySelector('input[name="payment"]:checked')?.value || 'card'
    };

    let code = 'FOL-' + Date.now().toString(36).toUpperCase().slice(-8);

    if (window.FolioBackend?.isAvailable) {
        try {
            const out = await FolioBackend.submitOrder(payload);
            code = out.order?.order_code || code;
        } catch (e) {
            btn.textContent = 'Confirmar pedido →'; btn.disabled = false;
            showToast('Error: ' + e.message);
            return;
        }
    } else {
        // Fallback offline: simulamos delay
        await new Promise(r => setTimeout(r, 1200));
    }

    document.getElementById('checkout-inner').style.display = 'none';
    document.getElementById('order-success').style.display = 'flex';
    document.getElementById('order-code').textContent = 'Código: ' + code;
    btn.textContent = 'Confirmar pedido →'; btn.disabled = false;
    cart = []; saveCart(); updateCartCount();
}

// ══ NEWSLETTER ════════════════════════════════════════════════
function subscribeNewsletter() {
    const inp = document.getElementById('newsletter-email');
    const msg = document.getElementById('newsletter-msg');
    const email = inp.value.trim();
    msg.style.display = 'block';
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        inp.classList.add('error'); msg.className = 'newsletter-msg error'; msg.textContent = 'Por favor ingresa un email válido.'; return;
    }
    inp.classList.remove('error'); msg.className = 'newsletter-msg success';
    msg.textContent = `✓ ¡Bienvenido al club! Te enviaremos novedades a ${email}`;
    inp.value = ''; showToast('¡Suscripción exitosa!');
}

// ══ TOAST ════════════════════════════════════════════════════
function showToast(msg) {
    const el = document.getElementById('toast');
    document.getElementById('toast-text').textContent = '✓  ' + msg;
    el.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ══ SCROLL HELPERS ═══════════════════════════════════════════
function scrollToBooks()      { document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth',block:'start'}); }
function scrollToReleases()   { document.getElementById('novedades')?.scrollIntoView({behavior:'smooth',block:'start'}); }
function scrollToCategories() { document.getElementById('categorias')?.scrollIntoView({behavior:'smooth',block:'start'}); }
function scrollToNewsletter() { document.getElementById('newsletter')?.scrollIntoView({behavior:'smooth',block:'start'}); }
function scrollToTop()        { window.scrollTo({top:0,behavior:'smooth'}); }

// ══ KEYBOARD ═════════════════════════════════════════════════
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); closeBookModal(); closeCart(); closeCheckout(); closeRating(); closeAuth(); }
});

// ══ SCROLL REVEAL ════════════════════════════════════════════
const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.08 });

function observeReveals() {
    document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.stagger').forEach(el => {
        if (!el.classList.contains('visible')) revealObs.observe(el);
    });
}

// ══ RATING SYSTEM ═════════════════════════════════════════════
const RATING_LABELS = {
    0:'Pasa el cursor sobre las estrellas', 0.5:'½★ — Deficiente', 1:'★ — Muy malo', 1.5:'★½ — Malo',
    2:'★★ — Regular', 2.5:'★★½ — Aceptable', 3:'★★★ — Bueno', 3.5:'★★★½ — Muy bueno',
    4:'★★★★ — Excelente', 4.5:'★★★★½ — Sobresaliente', 5:'★★★★★ — ¡Perfecto!'
};
function openRating() {
    const modal = document.getElementById('rating-modal');
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
    const saved = localStorage.getItem('folio-rating');
    if (saved) { ratingValue = parseFloat(saved); ratingSubmitted = true; updateStarDisplay(ratingValue); showRatingResult(ratingValue); }
    else { ratingSubmitted = false; ratingValue = 0; document.getElementById('rating-result').style.display = 'none'; document.getElementById('rating-stars-container').style.display = 'flex'; document.getElementById('rating-label').style.display = 'block'; document.getElementById('rating-submit-btn').style.display = 'none'; updateStarDisplay(0); document.getElementById('rating-label').textContent = RATING_LABELS[0]; }
}
function closeRating() { document.getElementById('rating-modal').classList.remove('open'); document.body.style.overflow = ''; }
function resetRating() {
    ratingSubmitted = false; ratingValue = 0; localStorage.removeItem('folio-rating');
    document.getElementById('rating-result').style.display = 'none'; document.getElementById('rating-stars-container').style.display = 'flex'; document.getElementById('rating-label').style.display = 'block'; document.getElementById('rating-submit-btn').style.display = 'none';
    updateStarDisplay(0); document.getElementById('rating-label').textContent = RATING_LABELS[0];
    document.getElementById('fab-star').textContent = '★'; document.getElementById('fab-text').textContent = 'Calificar';
}
function updateStarDisplay(rating) {
    document.querySelectorAll('.rs-star').forEach((star, i) => {
        const val = i + 1;
        if (rating >= val) star.className = 'rs-star full';
        else if (rating >= val - 0.5) star.className = 'rs-star half';
        else star.className = 'rs-star empty';
    });
}
function submitRating() {
    if (ratingValue === 0) { showToast('Selecciona una calificación primero'); return; }
    localStorage.setItem('folio-rating', ratingValue); ratingSubmitted = true; showRatingResult(ratingValue); showToast(`¡Gracias! Calificaste Folio con ${ratingValue}★`);
    document.getElementById('fab-star').textContent = '★'; document.getElementById('fab-text').textContent = `${ratingValue}★`;
}
function showRatingResult(rating) {
    document.getElementById('rating-result').style.display = 'flex'; document.getElementById('rating-stars-container').style.display = 'none'; document.getElementById('rating-label').style.display = 'none'; document.getElementById('rating-submit-btn').style.display = 'none';
    document.querySelector('.rating-result-stars').innerHTML = [1,2,3,4,5].map(i => {
        if (rating >= i) return '<span class="rs-star full" style="font-size:2rem">★</span>';
        if (rating >= i - 0.5) return '<span class="rs-star half" style="font-size:2rem">★</span>';
        return '<span class="rs-star empty" style="font-size:2rem">★</span>';
    }).join('');
    document.querySelector('.rating-result-text').textContent = `Tu calificación: ${rating}/5 — ${RATING_LABELS[rating]?.split(' — ')[1] || ''}`;
}
function initRatingStars() {
    const container = document.getElementById('rating-stars-container'); if (!container) return;
    container.addEventListener('mousemove', e => {
        if (ratingSubmitted) return;
        const rect = container.getBoundingClientRect(); const x = e.clientX - rect.left; const sw = rect.width / 5;
        const idx = Math.min(4, Math.floor(x / sw)); const within = (x - idx * sw) / sw;
        const hover = within < 0.5 ? idx + 0.5 : idx + 1;
        updateStarDisplay(hover); document.getElementById('rating-label').textContent = RATING_LABELS[hover] || '';
    });
    container.addEventListener('mouseleave', () => {
        if (ratingSubmitted) return;
        updateStarDisplay(ratingValue); document.getElementById('rating-label').textContent = RATING_LABELS[ratingValue] || RATING_LABELS[0];
    });
    container.addEventListener('click', e => {
        if (ratingSubmitted) return;
        const rect = container.getBoundingClientRect(); const x = e.clientX - rect.left; const sw = rect.width / 5;
        const idx = Math.min(4, Math.floor(x / sw)); const within = (x - idx * sw) / sw;
        ratingValue = within < 0.5 ? idx + 0.5 : idx + 1;
        updateStarDisplay(ratingValue); document.getElementById('rating-label').textContent = RATING_LABELS[ratingValue];
        document.getElementById('rating-submit-btn').style.display = 'block';
    });
}

// ══ NAV SCROLL ═══════════════════════════════════════════════
function initNavScroll() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            nav.classList.toggle('scrolled', window.scrollY > 60);
            ticking = false;
        });
    }, { passive: true });
}

// ══ API INTEGRATION — añade libros y novedades en segundo plano ═
async function bootstrapApiContent() {
    if (!window.FolioAPI) return;
    try {
        const result = await window.FolioAPI.loadApiContent();
        if (!result) return;

        // Mergear extraBooks al catálogo
        if (result.extraBooks && result.extraBooks.length) {
            const existingIds = new Set(BOOKS.map(b => b.id));
            const newBooks = result.extraBooks.filter(b => !existingIds.has(b.id));
            BOOKS.push(...newBooks);
            renderBooks();
            observeReveals();
        }

        // Mergear novedades
        if (result.extraReleases && result.extraReleases.length) {
            const existingIds = new Set(NEW_RELEASES.map(b => b.id));
            const newReleases = result.extraReleases.filter(b => !existingIds.has(b.id));
            NEW_RELEASES.push(...newReleases);
            renderNewReleases();
        }

        API_LOADED = true;
        if (result.success) {
            console.log(`[Folio] API cargada: ${result.extraBooks?.length || 0} libros, ${result.extraReleases?.length || 0} novedades${result.fromCache ? ' (caché)' : ''}`);
        } else {
            console.log('[Folio] API no disponible — usando libros del fallback local.');
        }
    } catch (err) {
        console.warn('[Folio] Error al cargar API:', err);
    }
}

// ══ BACKEND BOOTSTRAP ════════════════════════════════════════
// Si el backend está vivo, reemplazamos los libros locales con los de la DB
async function bootstrapBackend() {
    if (!window.FolioBackend) return;
    const ok = await FolioBackend.ping();
    if (!ok) {
        console.warn('[Folio] Backend no disponible — funcionando en modo offline (datos demo).');
        return;
    }
    try {
        const r = await FolioBackend.listBooks();
        if (r.books && r.books.length) {
            // Mapear los libros de la DB al formato que espera el frontend
            const mapped = r.books.map(adaptDbBook);
            BOOKS.length = 0; BOOKS.push(...mapped);
            renderBooks();
            observeReveals();

            // 🔥 Le avisamos a la escena 3D que ya llegaron los libros reales
            if (window.folioSceneInstance) {
                window.folioSceneInstance.updateBooks();
            }
        }
    } catch (e) { console.warn('[Folio] No se pudo cargar /api/books:', e.message); }

    if (FolioBackend.isLogged()) {
        try { await FolioBackend.me(); } catch (e) { FolioBackend.logout(); }
        updateAuthUI();
    }
}

function adaptDbBook(b) {
    const price = b.effective_price != null
        ? +b.effective_price
        : +b.price * (1 - (+b.active_discount || 0) / 100);
    return {
        id: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        subgenre: b.subgenre || b.genre,
        price: +(+price).toFixed(2),
        originalPrice: +b.original_price,
        isbn: b.isbn || '',
        coverId: '',
        olid: '',
        badge: b.badge || (b.active_discount > 0 ? `-${(+b.active_discount).toFixed(0)}%` : 'Catálogo'),
        rating: +b.rating || 4.5,
        reviews: +b.reviews || 0,
        pages: +b.pages || 320,
        language: b.language || 'Español',
        publisher: b.publisher || '',
        year: +b.year || 2024,
        color: b.cover_color || 'linear-gradient(135deg,#1a1a22 0%,#080808 100%)',
        description: b.description || '',
        shortDesc: b.short_desc || '',
        tags: [b.genre],
        cover_url: b.cover_url || ''
    };
}

// ══ INIT ════════════════════════════════════════════════════
(function init() {
    updateAuthUI();
    renderBooks();
    renderNewReleases();
    updateCartCount();
    updateWishlistCount();
    renderCartUI();
    initRatingStars();
    initNavScroll();
    observeReveals();

    // ══ LÓGICA DE VISTA PREVIA DE AVATAR ══════════════════════
    document.getElementById('reg-avatar-preview')?.addEventListener('click', () => {
        document.getElementById('reg-avatar-file').click();
    });

    document.getElementById('reg-avatar-file')?.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('reg-avatar-preview');
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.classList.add('has-image');
                const placeholder = preview.querySelector('.reg-avatar-placeholder');
                if(placeholder) placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Guardamos la instancia de los 4 libros flotantes en window
    if (typeof THREE !== 'undefined' && typeof FolioScene === 'function') {
        window.folioSceneInstance = new FolioScene();
    }

    const savedTheme = localStorage.getItem('folio-theme') || 'default';
    setTheme(savedTheme);

    const savedRating = localStorage.getItem('folio-rating');
    if (savedRating) {
        document.getElementById('fab-text').textContent = `${savedRating}★`;
        ratingValue = parseFloat(savedRating); ratingSubmitted = true;
    }

    // 🔥 EJECUTAMOS LA CONEXIÓN A SUPABASE 🔥
    bootstrapBackend().then(() => {
        console.log('[FRONTEND] Catálogo oficial cargado desde Supabase.');
    });
})();

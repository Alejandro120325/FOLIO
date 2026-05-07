'use strict';

// ══ VITRINA 3D — libros como objetos volumétricos ════════════════════
// Renderiza una selección de libros del catálogo como cuerpos 3D reales
// (front, back, lomo, cantos) usando CSS transform-style: preserve-3d.
// GSAP anima entrada y hover. La textura de la portada viene de Open Library (ISBN)

(function () {
    const SHOWCASE_LIMIT = 8;

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    // Convierte el gradient de book.color a algo válido como fallback
    function fallbackBg(book) {
        return book.color || 'linear-gradient(135deg,#1a1a22 0%,#080808 100%)';
    }

    // HTML de un libro 3D individual
    function makeBookHtml(book) {
        const title  = escapeHtml(book.title);
        const author = escapeHtml(book.author);
        const badge  = escapeHtml(book.badge || '');
        const bg     = fallbackBg(book);

        // 🔥 LA MAGIA AQUÍ: Construir la URL usando el ISBN que inyectamos en Supabase
        let imgSrc = '';
        if (book.isbn) {
            imgSrc = `https://covers.openlibrary.org/b/isbn/${escapeHtml(book.isbn)}-L.jpg?default=false`;
        } else if (book.cover_url) {
            imgSrc = escapeHtml(book.cover_url);
        }

        // Si la imagen falla (404 de OpenLibrary), el onerror="this.remove()"
        // borrará la etiqueta <img> y dejará ver tu diseño CSS del fondo.
        const coverImg = imgSrc
            ? `<img class="b3d-cover-img" src="${imgSrc}" alt="" loading="lazy" onerror="this.remove()">`
            : '';

        return `
        <div class="b3d-stage" data-book-id="${book.id}" role="button" tabindex="0"
             aria-label="Ver detalle de ${title}">
          <div class="b3d-shadow"></div>
          <div class="b3d">
            <div class="b3d-face b3d-front" style="background:${bg}">
              ${coverImg}
              <div class="b3d-front-overlay"></div>
              <div class="b3d-front-spine-line"></div>
              ${badge ? `<div class="b3d-badge">${badge}</div>` : ''}
              <div class="b3d-front-text">
                <div class="b3d-title">${title}</div>
                <div class="b3d-author">${author}</div>
              </div>
            </div>
            <div class="b3d-face b3d-back" style="background:${bg}">
              <div class="b3d-back-overlay"></div>
            </div>
            <div class="b3d-face b3d-spine" style="background:${bg}">
              <div class="b3d-spine-text">${title}</div>
            </div>
            <div class="b3d-face b3d-edge-r"></div>
            <div class="b3d-face b3d-edge-t"></div>
            <div class="b3d-face b3d-edge-b"></div>
          </div>
        </div>`;
    }

    function attachInteractions(stage) {
        const book = stage.querySelector('.b3d');
        const front = stage.querySelector('.b3d-front');
        if (!book || !front) return;

        const hasGsap = typeof window.gsap !== 'undefined';

        function setT(el, props, dur = 0.6, ease = 'power2.out') {
            if (hasGsap) {
                window.gsap.to(el, { duration: dur, ease, ...props });
            } else {
                // Fallback CSS
                const t = [];
                if (props.rotationY != null) t.push(`rotateY(${props.rotationY}deg)`);
                if (props.rotationX != null) t.push(`rotateX(${props.rotationX}deg)`);
                if (props.y != null)         t.push(`translateY(${props.y}px)`);
                if (props.scale != null)     t.push(`scale(${props.scale})`);
                el.style.transition = `transform ${dur}s ${ease}`;
                if (t.length) el.style.transform = t.join(' ');
            }
        }

        stage.addEventListener('mouseenter', () => {
            setT(book,  { rotationY: -38, rotationX: 6, y: -10 }, 0.55);
            setT(front, { rotationY: -28 }, 0.6);
        });
        stage.addEventListener('mouseleave', () => {
            setT(book,  { rotationY: -22, rotationX: 4, y: 0 }, 0.7);
            setT(front, { rotationY: 0 }, 0.6);
        });

        const open = () => {
            const id = +stage.dataset.bookId;
            if (id && typeof window.openBookModalById === 'function') {
                window.openBookModalById(id);
            }
        };
        stage.addEventListener('click', open);
        stage.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
    }

    function entranceAnimate(container) {
        const stages = container.querySelectorAll('.b3d-stage');
        if (!stages.length) return;

        if (typeof window.gsap !== 'undefined') {
            window.gsap.from(stages, {
                duration: 0.9,
                y: 80,
                opacity: 0,
                rotationY: -120,
                stagger: 0.08,
                ease: 'power3.out',
                clearProps: 'transform,opacity'
            });
        } else {
            stages.forEach((s, i) => {
                s.style.opacity = '0';
                s.style.transform = 'translateY(40px)';
                setTimeout(() => {
                    s.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1), opacity .8s';
                    s.style.opacity = '1';
                    s.style.transform = '';
                }, 80 * i);
            });
        }
    }

    function pickShowcaseBooks(books) {
        const withDiscount = books.filter(b => +b.active_discount > 0 || /-\d/.test(b.badge || ''));
        const rest         = books.filter(b => !withDiscount.includes(b));
        rest.sort((a, b) => (+b.rating || 0) - (+a.rating || 0));
        return [...withDiscount, ...rest].slice(0, SHOWCASE_LIMIT);
    }

    function mount(container, books) {
        if (!container) return;
        const sel = pickShowcaseBooks(books || []);
        if (!sel.length) {
            container.innerHTML = '<div class="b3d-empty">Cargando vitrina…</div>';
            return;
        }
        container.innerHTML = sel.map(makeBookHtml).join('');
        container.querySelectorAll('.b3d-stage').forEach(attachInteractions);
        entranceAnimate(container);
    }

    window.Book3D = { mount };
})();
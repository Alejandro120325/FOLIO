'use strict';

// ══ DASHBOARD EMPLEADO ═══════════════════════════════════════════
// CRUD de libros + alta/baja de descuentos.

const Employee = {
    state: { books: [], discounts: [] },

    async open() {
        if (!window.FolioBackend?.hasRole('employee', 'admin')) {
            showToast('Acceso solo para empleados');
            return;
        }
        const ov = document.getElementById('emp-overlay');
        if (!ov) { showToast('Panel empleado no disponible'); return; }
        ov.hidden = false;
        void ov.offsetWidth;
        ov.classList.add('open');
        document.body.style.overflow = 'hidden';
        await this.loadAll();
    },
    close() {
        const ov = document.getElementById('emp-overlay');
        if (!ov) return;
        ov.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => { if (!ov.classList.contains('open')) ov.hidden = true; }, 350);
    },
    async loadAll() {
        const root = document.getElementById('emp-content');
        root.innerHTML = '<div class="dash-loading">Cargando catálogo…</div>';
        try {
            const [b, d] = await Promise.all([
                FolioBackend.listBooks(),
                FolioBackend.listDiscounts().catch(() => ({ discounts: [] }))
            ]);
            this.state.books     = b.books || [];
            this.state.discounts = d.discounts || [];
            this.render(root);
        } catch (err) {
            root.innerHTML = `<div class="dash-error">Error: ${err.message}</div>`;
        }
    },
    render(root) {
        const books = this.state.books;
        const discs = this.state.discounts;

        root.innerHTML = `
      <header class="dash-head">
        <div>
          <span class="dash-tag">Panel empleado</span>
          <h2 class="dash-title">Gestión del <em>catálogo</em></h2>
        </div>
        <div class="dash-head-actions">
          <button class="dash-btn ghost" onclick="Employee.loadAll()">↻ Actualizar</button>
          <button class="dash-btn solid" onclick="Employee.openBookForm()">+ Nuevo libro</button>
        </div>
      </header>

      <section class="dash-card">
        <h3 class="dash-card-title">Catálogo (${books.length} libros)</h3>
        <div class="dash-table-wrap">
          <table class="dash-table emp-books">
            <thead><tr><th>ID</th><th>Título</th><th>Autor</th><th>Género</th><th>Precio</th><th>Stock</th><th>Activo</th><th>Descuento</th><th></th></tr></thead>
            <tbody>${books.map(b => `
              <tr>
                <td>${b.id}</td>
                <td>${b.title}</td>
                <td>${b.author}</td>
                <td>${b.genre}</td>
                <td>$${(+b.price).toFixed(2)}</td>
                <td>${b.stock}</td>
                <td><span class="dash-pill ${b.active ? 'paid' : 'cancelled'}">${b.active ? 'Sí' : 'No'}</span></td>
                <td>${+b.active_discount ? `<span class="dash-pill paid">-${(+b.active_discount).toFixed(0)}%</span>` : '—'}</td>
                <td class="emp-actions-cell">
                  <button class="dash-mini-btn" onclick="Employee.openBookForm(${b.id})">Editar</button>
                  <button class="dash-mini-btn" onclick="Employee.openDiscountForm(${b.id})">% Descuento</button>
                  <button class="dash-mini-btn danger" onclick="Employee.removeBook(${b.id})">Quitar</button>
                </td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>
      </section>

      <section class="dash-card">
        <h3 class="dash-card-title">Descuentos vigentes (${discs.length})</h3>
        ${discs.length ? `
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Libro</th><th>Autor</th><th>%</th><th>Inicio</th><th>Fin</th><th></th></tr></thead>
            <tbody>${discs.map(d => `
              <tr>
                <td>${d.book_title}</td><td>${d.book_author}</td>
                <td><strong>-${(+d.percent).toFixed(0)}%</strong></td>
                <td>${d.starts_at ? new Date(d.starts_at).toLocaleDateString() : '—'}</td>
                <td>${d.ends_at ? new Date(d.ends_at).toLocaleDateString() : 'Sin fin'}</td>
                <td><button class="dash-mini-btn danger" onclick="Employee.removeDiscount(${d.id})">Quitar</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<div class="dash-empty">Sin descuentos activos</div>'}
      </section>

      <div id="emp-form-overlay" class="emp-form-overlay" onclick="if(event.target===this) Employee.closeForm()"></div>
    `;
    },

    // ── Formulario de libro ────────────────────────────────────
    openBookForm(id = null) {
        const book = id ? this.state.books.find(b => b.id === id) : {};
        const isEdit = !!id;
        const ov = document.getElementById('emp-form-overlay');
        ov.classList.add('open');
        ov.innerHTML = `
      <div class="emp-form-box" onclick="event.stopPropagation()">
        <button class="emp-form-close" onclick="Employee.closeForm()">✕</button>
        <h3>${isEdit ? 'Editar libro' : 'Nuevo libro'}</h3>
        <div class="emp-form-grid">
          <label>Título <input id="bf-title"  value="${book.title || ''}"></label>
          <label>Autor  <input id="bf-author" value="${book.author || ''}"></label>
          <label>Género
            <select id="bf-genre">
              ${['Fantasía','Ciencia Ficción','Thriller','Literatura','No Ficción'].map(g =>
            `<option ${book.genre === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </label>
          <label>Subgénero <input id="bf-subgenre" value="${book.subgenre || ''}"></label>
          <label>Precio <input id="bf-price"          type="number" step="0.01" value="${book.price || ''}"></label>
          <label>Precio original <input id="bf-original_price" type="number" step="0.01" value="${book.original_price || ''}"></label>
          <label>Stock <input id="bf-stock" type="number" value="${book.stock ?? 50}"></label>
          <label>ISBN  <input id="bf-isbn"  value="${book.isbn || ''}"></label>
          <label>Año   <input id="bf-year"  type="number" value="${book.year || ''}"></label>
          <label>Páginas <input id="bf-pages" type="number" value="${book.pages || ''}"></label>
          <label>Editorial <input id="bf-publisher" value="${book.publisher || ''}"></label>
          <label>Cover URL <input id="bf-cover_url" value="${book.cover_url || ''}"></label>
          <label class="emp-full">Descripción <textarea id="bf-description" rows="3">${book.description || ''}</textarea></label>
        </div>
        <div class="emp-form-actions">
          <button class="dash-btn ghost" onclick="Employee.closeForm()">Cancelar</button>
          <button class="dash-btn solid" onclick="Employee.saveBook(${id || 'null'})">${isEdit ? 'Guardar cambios' : 'Crear libro'}</button>
        </div>
      </div>
    `;
    },

    async saveBook(id) {
        const v = k => (document.getElementById('bf-' + k)?.value || '').trim();
        const num = k => { const x = +v(k); return isNaN(x) ? null : x; };
        const data = {
            title: v('title'), author: v('author'), genre: v('genre'), subgenre: v('subgenre') || null,
            price: num('price'), original_price: num('original_price'), stock: num('stock'),
            isbn: v('isbn') || null, year: num('year'), pages: num('pages'),
            publisher: v('publisher') || null, cover_url: v('cover_url') || null,
            description: v('description') || null
        };
        if (!data.title || !data.author || !data.genre || data.price == null || data.original_price == null) {
            return showToast('Completa título, autor, género y precios');
        }
        try {
            if (id) await FolioBackend.updateBook(id, data);
            else    await FolioBackend.createBook(data);
            showToast(id ? 'Libro actualizado' : 'Libro creado');
            this.closeForm();
            await this.loadAll();
        } catch (e) { showToast('Error: ' + e.message); }
    },

    async removeBook(id) {
        if (!confirm('¿Quitar este libro del catálogo?')) return;
        try {
            await FolioBackend.deleteBook(id);
            showToast('Libro eliminado');
            await this.loadAll();
        } catch (e) { showToast('Error: ' + e.message); }
    },

    // ── Formulario de descuento ────────────────────────────────
    openDiscountForm(book_id) {
        const book = this.state.books.find(b => b.id === book_id);
        const ov = document.getElementById('emp-form-overlay');
        ov.classList.add('open');
        ov.innerHTML = `
      <div class="emp-form-box" onclick="event.stopPropagation()">
        <button class="emp-form-close" onclick="Employee.closeForm()">✕</button>
        <h3>Agregar descuento</h3>
        <p class="emp-form-sub">Aplicando a: <strong>${book?.title || 'libro'}</strong></p>
        <div class="emp-form-grid">
          <label>Porcentaje (1-90) <input id="df-percent" type="number" min="1" max="90" value="20"></label>
          <label>Termina (opcional) <input id="df-ends" type="datetime-local"></label>
        </div>
        <div class="emp-form-actions">
          <button class="dash-btn ghost" onclick="Employee.closeForm()">Cancelar</button>
          <button class="dash-btn solid" onclick="Employee.saveDiscount(${book_id})">Aplicar descuento</button>
        </div>
      </div>
    `;
    },

    async saveDiscount(book_id) {
        const percent = +document.getElementById('df-percent').value;
        const ends    = document.getElementById('df-ends').value;
        if (!percent || percent <= 0 || percent > 90) return showToast('Porcentaje inválido (1-90)');
        try {
            await FolioBackend.createDiscount({
                book_id, percent,
                ends_at: ends ? new Date(ends).toISOString() : null
            });
            showToast('Descuento aplicado');
            this.closeForm();
            await this.loadAll();
        } catch (e) { showToast('Error: ' + e.message); }
    },

    async removeDiscount(id) {
        if (!confirm('¿Quitar este descuento?')) return;
        try {
            await FolioBackend.deleteDiscount(id);
            showToast('Descuento eliminado');
            await this.loadAll();
        } catch (e) { showToast('Error: ' + e.message); }
    },

    closeForm() {
        const ov = document.getElementById('emp-form-overlay');
        if (ov) { ov.classList.remove('open'); ov.innerHTML = ''; }
    }
};

window.Employee = Employee;
'use strict';

// ══ DASHBOARD ADMIN ══════════════════════════════════════════════

const Admin = {
    async open() {
        if (!window.FolioBackend?.hasRole('admin')) { showToast('Acceso solo para administradores'); return; }
        const ov = document.getElementById('admin-overlay');
        if (!ov) { showToast('Panel admin no disponible'); return; }
        ov.hidden = false;
        void ov.offsetWidth;
        ov.classList.add('open');
        document.body.style.overflow = 'hidden';
        await this.loadAll();
    },
    close() {
        const ov = document.getElementById('admin-overlay');
        if (!ov) return;
        ov.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => { if (!ov.classList.contains('open')) ov.hidden = true; }, 350);
    },
    async loadAll() {
        const root = document.getElementById('admin-content');
        root.innerHTML = '<div class="dash-loading">Cargando estadísticas…</div>';
        try {
            const data = await FolioBackend.adminStats();
            const usersResp = await FolioBackend.listUsers().catch(() => ({ users: [] }));
            this.render(root, data, usersResp.users);
        } catch (err) {
            root.innerHTML = `<div class="dash-error">Error: ${err.message}</div>`;
        }
    },
    render(root, data, users) {
        const t = data.totals;
        const fmt = n => '$' + (+n).toFixed(2);
        const monthlyMax = Math.max(...data.monthly.map(m => +m.revenue), 1);

        root.innerHTML = `
      <header class="dash-head">
        <div>
          <span class="dash-tag">Panel administrador</span>
          <h2 class="dash-title">Vista <em>general</em></h2>
        </div>
        <div class="dash-head-actions">
          <button class="dash-btn ghost" onclick="Admin.loadAll()">↻ Actualizar</button>
          <button class="dash-btn solid" onclick="Admin.openCreateUser()">+ Nuevo usuario</button>
        </div>
      </header>

      <section class="dash-kpis">
        <div class="kpi"><div class="kpi-label">Ingresos totales</div><div class="kpi-value">${fmt(t.revenue)}</div></div>
        <div class="kpi"><div class="kpi-label">Últimos 30 días</div><div class="kpi-value">${fmt(t.revenue_30d)}</div></div>
        <div class="kpi"><div class="kpi-label">Órdenes</div><div class="kpi-value">${t.total_orders}</div></div>
        <div class="kpi"><div class="kpi-label">Libros activos</div><div class="kpi-value">${t.total_books}</div></div>
        <div class="kpi"><div class="kpi-label">Clientes</div><div class="kpi-value">${t.total_clients}</div></div>
        <div class="kpi"><div class="kpi-label">Empleados</div><div class="kpi-value">${t.total_employees}</div></div>
      </section>

      <section class="dash-grid">
        <div class="dash-card">
          <h3 class="dash-card-title">Ingresos últimos 12 meses</h3>
          <div class="dash-bars">
            ${data.monthly.length ? data.monthly.map(m => `
              <div class="dash-bar">
                <div class="dash-bar-fill" style="height:${Math.max(6, +m.revenue / monthlyMax * 100)}%"
                     title="${m.month} — ${fmt(m.revenue)}"></div>
                <div class="dash-bar-label">${m.month.slice(5)}</div>
              </div>
            `).join('') : '<div class="dash-empty">Sin ventas aún</div>'}
          </div>
        </div>

        <div class="dash-card">
          <h3 class="dash-card-title">Por género</h3>
          ${data.byGenre.length ? data.byGenre.map(g => {
            const max = Math.max(...data.byGenre.map(x => +x.units));
            const pct = (+g.units / max) * 100;
            return `<div class="dash-row"><span>${g.genre}</span>
                    <div class="dash-prog"><div class="dash-prog-fill" style="width:${pct}%"></div></div>
                    <strong>${g.units}</strong></div>`;
        }).join('') : '<div class="dash-empty">Sin datos</div>'}
        </div>
      </section>

      <section class="dash-card">
        <h3 class="dash-card-title">Top 8 libros más vendidos</h3>
        ${data.topBooks.length ? `
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>#</th><th>Título</th><th>Autor</th><th>Unidades</th><th>Ingresos</th></tr></thead>
            <tbody>${data.topBooks.map((b, i) => `
              <tr><td>${i + 1}</td><td>${b.title}</td><td>${b.author}</td>
                  <td>${b.units_sold}</td><td>${fmt(b.revenue)}</td></tr>
            `).join('')}</tbody>
          </table>
        </div>` : '<div class="dash-empty">Sin ventas registradas</div>'}
      </section>

      <section class="dash-card">
        <h3 class="dash-card-title">Órdenes recientes</h3>
        ${data.recent.length ? `
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Código</th><th>Comprador</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>${data.recent.map(o => `
              <tr><td><code>${o.order_code || '—'}</code></td><td>${o.buyer || 'Invitado'}</td>
                  <td>${fmt(o.total)}</td><td><span class="dash-pill ${o.status}">${o.status}</span></td>
                  <td>${new Date(o.created_at).toLocaleDateString()}</td></tr>
            `).join('')}</tbody>
          </table>
        </div>` : '<div class="dash-empty">Sin órdenes</div>'}
      </section>

      <section class="dash-card">
        <h3 class="dash-card-title">Usuarios (${users.length})</h3>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Creado</th><th></th></tr></thead>
            <tbody>${users.map(u => `
              <tr><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td>
                  <td><span class="dash-pill role-${u.role}">${u.role}</span></td>
                  <td>${new Date(u.created_at).toLocaleDateString()}</td>
                  <td>${u.role !== 'admin' || users.filter(x => x.role === 'admin').length > 1
            ? `<button class="dash-mini-btn danger" onclick="Admin.deleteUser(${u.id})">Eliminar</button>`
            : '—'}</td></tr>
            `).join('')}</tbody>
          </table>
        </div>
      </section>
    `;
    },

    openCreateUser() {
        const name = prompt('Nombre completo:'); if (!name) return;
        const email = prompt('Email:'); if (!email) return;
        const password = prompt('Contraseña (mín. 6):'); if (!password) return;
        const role = prompt('Rol (admin / employee / client):', 'employee');
        if (!['admin', 'employee', 'client'].includes(role)) return showToast('Rol inválido');
        FolioBackend.createUser({ name, email, password, role })
            .then(() => { showToast('Usuario creado'); this.loadAll(); })
            .catch(e => showToast('Error: ' + e.message));
    },

    deleteUser(id) {
        if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
        FolioBackend.deleteUser(id)
            .then(() => { showToast('Usuario eliminado'); this.loadAll(); })
            .catch(e => showToast('Error: ' + e.message));
    }
};

window.Admin = Admin;

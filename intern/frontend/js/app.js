/* ── API base URL ───────────────────────────────────────── */
const API_BASE = 'http://localhost:5000/api';

/* ── Auth helpers ─────────────────────────────────────── */
const Auth = {
  save(data) {
    localStorage.setItem('ims_token', data.token);
    localStorage.setItem('ims_role',  data.role);
    localStorage.setItem('ims_user',  JSON.stringify(data));
  },
  token()  { return localStorage.getItem('ims_token'); },
  role()   { return localStorage.getItem('ims_role'); },
  user()   { try { return JSON.parse(localStorage.getItem('ims_user')); } catch{ return null; } },
  logout() { localStorage.clear(); window.location.href = '/login.html'; },
  requireAdmin() {
    if (!Auth.token() || Auth.role() !== 'admin') { window.location.href = '/login.html'; }
  },
  requireIntern() {
    if (!Auth.token() || Auth.role() !== 'intern') { window.location.href = '/login.html'; }
  },
  requireAny() {
    if (!Auth.token()) { window.location.href = '/login.html'; }
    if (Auth.role() === 'admin')  { return; }
    if (Auth.role() === 'intern') { return; }
    window.location.href = '/login.html';
  }
};

/* ── Fetch wrapper ─────────────────────────────────────── */
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (Auth.token()) headers['Authorization'] = `Bearer ${Auth.token()}`;
  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

/* ── Toast notification ────────────────────────────────── */
function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

/* ── Format date ───────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}
function fmtDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ── Initials avatar ───────────────────────────────────── */
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Avatar element ────────────────────────────────────── */
function avatarEl(src, name, cls = 'avatar-sm') {
  if (src) return `<img class="avatar ${cls}" src="${src}" alt="${name}">`;
  return `<div class="avatar ${cls}">${initials(name)}</div>`;
}

/* ── Status badge ──────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    approved:'success', active:'success', present:'success',
    pending:'warning', submitted:'info', late:'warning',
    rejected:'danger', absent:'danger'
  };
  return `<span class="badge badge-${map[status]||'secondary'}">${status}</span>`;
}

/* ── Priority badge ────────────────────────────────────── */
function priorityBadge(p) {
  const map = { high:'danger', medium:'warning', low:'info' };
  return `<span class="badge badge-${map[p]||'secondary'}">${p}</span>`;
}

/* ── Sidebar active link ───────────────────────────────── */
function setActiveNav() {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    if (el.dataset.page === current) el.classList.add('active');
    else el.classList.remove('active');
  });
}

/* ── Mobile sidebar toggle ─────────────────────────────── */
function initSidebar() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}

/* ── Populate user info in sidebar ────────────────────── */
function populateSidebarUser() {
  const user = Auth.user();
  if (!user) return;
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl2 = document.getElementById('sidebar-user-avatar');
  if (nameEl) nameEl.textContent = user.full_name || user.email;
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Intern';
  if (avatarEl2) {
    if (user.profile_picture) {
      avatarEl2.innerHTML = `<img src="${user.profile_picture}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" alt="${user.full_name}">`;
    } else {
      avatarEl2.textContent = initials(user.full_name || '?');
    }
  }
}

/* ── Logout button ─────────────────────────────────────── */
function initLogout() {
  document.querySelectorAll('[data-logout]').forEach(el => {
    el.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) Auth.logout();
    });
  });
}

/* ── Confirm dialog ────────────────────────────────────── */
function confirmAction(msg) {
  return confirm(msg);
}

/* ── Progress calc ─────────────────────────────────────── */
function internshipProgress(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end), n = new Date();
  if (n < s) return 0;
  if (n > e) return 100;
  return Math.round(((n - s) / (e - s)) * 100);
}

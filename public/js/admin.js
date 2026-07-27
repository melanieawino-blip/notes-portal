async function init() {
  const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null);
  if (!me || !me.is_admin) { window.location.href = '/'; return; }
  document.getElementById('who').textContent = `Logged in as ${me.name} (admin)`;
  await loadLecturers();
}

async function loadLecturers() {
  const res = await fetch('/api/admin/lecturers');
  const list = document.getElementById('lecturers-list');

  if (!res.ok) {
    list.innerHTML = '<p class="error">Could not load lecturers.</p>';
    return;
  }

  const lecturers = await res.json();
  if (lecturers.length === 0) {
    list.innerHTML = '<p class="note-meta">No lecturer signups yet.</p>';
    return;
  }

  list.innerHTML = lecturers.map(l => `
    <div class="note-row" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="note-title">${l.name} — ${l.email}</div>
          <div class="note-meta">
            Staff number: ${l.staff_number || '(none given)'} ·
            Signed up ${new Date(l.created_at).toLocaleDateString()} ·
            Status: <strong>${l.status}</strong>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          ${l.status !== 'approved' ? `<button style="width:auto" onclick="decide(${l.id}, 'approve')">Approve</button>` : ''}
          ${l.status !== 'rejected' ? `<button class="danger" style="width:auto" onclick="decide(${l.id}, 'reject')">Reject</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

async function decide(id, action) {
  await fetch(`/api/admin/lecturers/${id}/${action}`, { method: 'POST' });
  await loadLecturers();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

init();

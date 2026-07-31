async function init() {
  const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null);
  if (!me || !me.is_admin) { window.location.href = '/'; return; }
  document.getElementById('who').textContent = `Logged in as ${me.name} (admin)`;
  await loadLecturers();
  await loadAutoApprove();
}

async function loadLecturers() {
  const res = await fetch('/api/admin/lecturers');
  const list = document.getElementById('lecturers-list');
  const countBox = document.getElementById('pending-count');

  if (!res.ok) {
    list.innerHTML = '<p class="error">Could not load lecturers.</p>';
    return;
  }

  const lecturers = await res.json();
  const pendingCount = lecturers.filter(l => l.status === 'pending').length;
  countBox.textContent = pendingCount > 0
    ? `${pendingCount} lecturer${pendingCount === 1 ? '' : 's'} waiting for your approval`
    : 'No lecturers currently waiting for approval';

  if (lecturers.length === 0) {
    list.innerHTML = '<p class="note-meta">No lecturer signups yet.</p>';
    return;
  }

  list.innerHTML = lecturers.map(l => `
    <div class="note-row" style="flex-direction:column;align-items:stretch; ${l.status === 'pending' ? 'background:#fff8f0' : ''}">
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
  await loadAutoApprove(); // approving adds their email to this list — refresh it too
}

async function loadAutoApprove() {
  const rows = await fetch('/api/admin/auto-approve').then(r => r.json());
  const list = document.getElementById('auto-approve-list');

  if (rows.length === 0) {
    list.innerHTML = '<p class="note-meta">No auto-approved emails yet.</p>';
    return;
  }

  list.innerHTML = rows.map(r => `
    <div class="note-row">
      <div class="note-title">${r.email}</div>
      <button class="danger" style="width:auto" onclick="removeAutoApprove('${r.email}')">Remove</button>
    </div>
  `).join('');
}

async function addAutoApprove() {
  const input = document.getElementById('new-auto-email');
  const errBox = document.getElementById('auto-approve-error');
  errBox.textContent = '';

  const email = input.value.trim();
  if (!email) { errBox.textContent = 'Enter an email address'; return; }

  const res = await fetch('/api/admin/auto-approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok) { errBox.textContent = data.error; return; }

  input.value = '';
  await loadAutoApprove();
}

async function removeAutoApprove(email) {
  await fetch(`/api/admin/auto-approve/${encodeURIComponent(email)}`, { method: 'DELETE' });
  await loadAutoApprove();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

init();

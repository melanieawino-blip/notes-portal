async function loadMe() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) { window.location.href = '/login.html'; return; }
  const me = await res.json();
  if (!me.is_admin) { window.location.href = '/'; return; }
  document.getElementById('who').textContent = `Logged in as ${me.name} (${me.email})`;
}

async function loadLecturers() {
  const res = await fetch('/api/admin/lecturers');
  const lecturers = await res.json();
  const el = document.getElementById('lecturers-list');
  if (lecturers.length === 0) {
    el.innerHTML = '<p class="sub">No lecturer accounts yet.</p>';
    return;
  }
  el.innerHTML = lecturers.map(l => `
    <div class="row">
      <div>
        <strong>${escapeHtml(l.name)}</strong> — ${escapeHtml(l.email)}<br>
        <span class="sub">Staff #: ${escapeHtml(l.staff_number || 'n/a')} · Status: ${l.status}</span>
      </div>
      <div>
        ${l.status !== 'approved' ? `<button style="width:auto" onclick="decide(${l.id}, 'approve')">Approve</button>` : ''}
        ${l.status !== 'rejected' ? `<button class="secondary" style="width:auto" onclick="decide(${l.id}, 'reject')">Reject</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function decide(id, action) {
  const res = await fetch(`/api/admin/lecturers/${id}/${action}`, { method: 'POST' });
  if (!res.ok) { alert('Could not update lecturer status'); return; }
  loadLecturers();
}

async function loadAutoApprove() {
  const res = await fetch('/api/admin/auto-approve');
  const rows = await res.json();
  const el = document.getElementById('auto-approve-list');
  if (rows.length === 0) {
    el.innerHTML = '<p class="sub">No staff numbers on the auto-approve list.</p>';
    return;
  }
  el.innerHTML = rows.map(r => `
    <div class="row">
      <span>${escapeHtml(r.staff_number)}</span>
      <button class="secondary" style="width:auto" onclick="removeAutoApprove(${r.id})">Remove</button>
    </div>
  `).join('');
}

async function addAutoApprove(e) {
  e.preventDefault();
  const input = document.getElementById('new-staff-number');
  const staff_number = input.value.trim();
  if (!staff_number) return false;
  const res = await fetch('/api/admin/auto-approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_number })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Could not add staff number');
    return false;
  }
  input.value = '';
  loadAutoApprove();
  return false;
}

async function removeAutoApprove(id) {
  const res = await fetch(`/api/admin/auto-approve/${id}`, { method: 'DELETE' });
  if (!res.ok) { alert('Could not remove staff number'); return; }
  loadAutoApprove();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

loadMe();
loadLecturers();
loadAutoApprove();

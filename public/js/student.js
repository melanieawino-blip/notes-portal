let searchTimeout;

async function init() {
  const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null);
  if (!me || me.role !== 'student') { window.location.href = '/'; return; }
  document.getElementById('who').textContent = `Logged in as ${me.name} (student)`;

  const courses = await fetch('/api/courses').then(r => r.json());
  const select = document.getElementById('course-filter');
  select.innerHTML = '<option value="">All courses</option>' +
    courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');

  await loadNotes();
}

function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadNotes, 250);
}

async function loadNotes() {
  const q = document.getElementById('search-box').value.trim();
  const course_id = document.getElementById('course-filter').value;

  const url = q
    ? `/api/notes/search?q=${encodeURIComponent(q)}`
    : `/api/notes${course_id ? `?course_id=${course_id}` : ''}`;

  const notes = await fetch(url).then(r => r.json());
  renderNotes(notes);
}

function renderNotes(notes) {
  const list = document.getElementById('notes-list');
  if (notes.length === 0) {
    list.innerHTML = '<p class="note-meta">No notes found.</p>';
    return;
  }

  list.innerHTML = notes.map(n => `
    <div class="note-row">
      <div>
        <div class="note-title">${n.title}</div>
        <div class="note-meta">${n.course_title} · ${n.uploaded_by_name} · ${new Date(n.created_at).toLocaleDateString()}</div>
      </div>
      <a href="/api/notes/${n.id}/download"><button style="width:auto">Download</button></a>
    </div>
  `).join('');
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

init();

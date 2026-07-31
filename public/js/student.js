let searchTimeout;

async function init() {
  const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null);
  if (!me || me.role !== 'student') { window.location.href = '/'; return; }
  document.getElementById('who').textContent = `Logged in as ${me.name} (student)`;

  const courses = await fetch('/api/courses').then(r => r.json());
  const courseSelect = document.getElementById('course-filter');
  courseSelect.innerHTML = '<option value="">All courses</option>' +
    courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');

  const lecturers = await fetch('/api/notes/lecturers').then(r => r.json());
  const lecturerSelect = document.getElementById('lecturer-filter');
  lecturerSelect.innerHTML = '<option value="">All lecturers</option>' +
    lecturers.map(l => `<option value="${l.id}">${l.name}</option>`).join('');

  await loadNotes();
}

function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadNotes, 250);
}

async function loadNotes() {
  const q = document.getElementById('search-box').value.trim();
  const course_id = document.getElementById('course-filter').value;
  const lecturer_id = document.getElementById('lecturer-filter').value;

  // Keyword search stays its own thing (searches inside PDF text too), but
  // the course and lecturer filters can be combined together freely.
  const url = q
    ? `/api/notes/search?q=${encodeURIComponent(q)}`
    : (() => {
        const params = new URLSearchParams();
        if (course_id) params.set('course_id', course_id);
        if (lecturer_id) params.set('lecturer_id', lecturer_id);
        const qs = params.toString();
        return `/api/notes${qs ? `?${qs}` : ''}`;
      })();

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

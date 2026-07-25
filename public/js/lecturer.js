let courses = [];

async function init() {
  const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null);
  if (!me || me.role !== 'lecturer') { window.location.href = '/'; return; }
  document.getElementById('who').textContent = `Logged in as ${me.name} (lecturer)`;

  await loadCourses();
  await loadNotes();
}

async function loadCourses() {
  courses = await fetch('/api/courses').then(r => r.json());
  const select = document.getElementById('upload-course');
  select.innerHTML = courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
}

async function addCourse() {
  const title = document.getElementById('course-title').value.trim();
  const unit_code = document.getElementById('course-code').value.trim();
  const errBox = document.getElementById('course-error');
  errBox.textContent = '';

  if (!title) { errBox.textContent = 'Course title is required'; return; }

  const res = await fetch('/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, unit_code })
  });
  const data = await res.json();
  if (!res.ok) { errBox.textContent = data.error; return; }

  document.getElementById('course-title').value = '';
  document.getElementById('course-code').value = '';
  await loadCourses();
}

async function uploadNote() {
  const course_id = document.getElementById('upload-course').value;
  const title = document.getElementById('upload-title').value.trim();
  const fileInput = document.getElementById('upload-file');
  const errBox = document.getElementById('upload-error');
  errBox.textContent = '';

  if (!course_id) { errBox.textContent = 'Add a course first'; return; }
  if (!title) { errBox.textContent = 'Give the note a title'; return; }
  if (!fileInput.files[0]) { errBox.textContent = 'Choose a PDF file'; return; }

  const formData = new FormData();
  formData.append('course_id', course_id);
  formData.append('title', title);
  formData.append('file', fileInput.files[0]);

  const res = await fetch('/api/notes/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) { errBox.textContent = data.error; return; }

  document.getElementById('upload-title').value = '';
  fileInput.value = '';
  await loadNotes();
}

async function loadNotes() {
  const notes = await fetch('/api/notes').then(r => r.json());
  const list = document.getElementById('notes-list');

  if (notes.length === 0) {
    list.innerHTML = '<p class="note-meta">No notes uploaded yet.</p>';
    return;
  }

  list.innerHTML = notes.map(n => `
    <div class="note-row" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="note-title">${n.title}</div>
          <div class="note-meta">${n.course_title} · uploaded by ${n.uploaded_by_name} · ${new Date(n.created_at).toLocaleDateString()}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button style="width:auto" onclick="summarize(${n.id})">AI summary</button>
          <button class="danger" style="width:auto" onclick="deleteNote(${n.id})">Delete</button>
        </div>
      </div>
      ${n.summary ? `<div class="summary-box">${n.summary}</div>` : `<div class="summary-box" id="summary-${n.id}" style="display:none"></div>`}
    </div>
  `).join('');
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  await loadNotes();
}

async function summarize(id) {
  const res = await fetch(`/api/notes/${id}/summarize`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) { alert(data.error); return; }
  await loadNotes();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

init();

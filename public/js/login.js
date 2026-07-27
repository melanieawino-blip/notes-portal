async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (!res.ok) { errBox.textContent = data.error; return; }
  window.location.href = data.role === 'lecturer' ? '/lecturer.html' : '/student.html';
}

function onRoleChange() {
  const role = document.getElementById('signup-role').value;
  document.getElementById('id-number-label').textContent =
    role === 'lecturer' ? 'Staff number (your account will need admin approval)' : 'Student number (e.g. DCP-1234)';
}

async function signup() {
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;
  const id_number = document.getElementById('signup-id-number').value;
  const errBox = document.getElementById('signup-error');
  errBox.textContent = '';

  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, id_number })
  });
  const data = await res.json();

  if (!res.ok) { errBox.textContent = data.error; return; }
  // Auto-login after signup
  await login();
}

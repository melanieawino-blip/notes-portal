const { notifyAdminOfLecturerSignup } = require('../utils/notify');

// Sign up — role must be 'lecturer' or 'student'.
//
// Lecturers whose staff number is on the auto-approve list (managed by
// the admin) get status 'approved' immediately. Everyone else gets
// 'pending' and needs admin review. Either way, the admin gets an email
// notification, and pending signups also show up on the dashboard.
router.post('/signup', async (req, res) => {
  const { name, email, password, role, id_number } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are all required' });
  }
  if (!['lecturer', 'student'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'lecturer' or 'student'" });
  }
  if (role === 'lecturer' && (!id_number || !id_number.trim())) {
    return res.status(400).json({ error: 'Staff number is required to sign up as a lecturer' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const trimmedStaffNumber = id_number ? id_number.trim() : null;

  let status = role === 'lecturer' ? 'pending' : 'approved';
  if (role === 'lecturer' && trimmedStaffNumber) {
    const autoApproved = db.prepare(
      'SELECT id FROM auto_approve_staff_numbers WHERE staff_number = ? COLLATE NOCASE'
    ).get(trimmedStaffNumber);
    if (autoApproved) status = 'approved';
  }

  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, id_number, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, password_hash, role, trimmedStaffNumber, status);

  if (role === 'lecturer') {
    notifyAdminOfLecturerSignup({ name, email, staff_number: trimmedStaffNumber, status });
  }

  res.json({ id: info.lastInsertRowid, name, email, role, status });
});

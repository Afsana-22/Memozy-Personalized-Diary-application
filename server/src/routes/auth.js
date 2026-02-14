const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const multer = require('multer');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir); },
  filename: function (req, file, cb) { const ext = path.extname(file.originalname); cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`); }
});
const upload = multer({ storage });

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid auth' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/signup', async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  try {
  const existing = await db.findUserByEmail(email);
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await db.createUser({ email, passwordHash, username, verified: true });

  // create JWT token and return user so frontend can auto-login
  const token = jwt.sign({ userId: created.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: created.id, email: created.email, username: created.username, profileImage: created.profileImage || '/placeholder.svg' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Email verification endpoint removed — users are auto-verified on signup in this deployment

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  try {
  const user = await db.findUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username, profileImage: user.profileImage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const u = await db.findUserById(req.userId);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({ id: u.id, email: u.email, username: u.username, profileImage: u.profileImage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile (username and/or profile image)
router.put('/me', authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    const { username } = req.body;
    const profileImage = req.file ? `/uploads/${req.file.filename}` : undefined;
    const updated = await db.updateUserProfile(req.userId, { username, profileImage });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend verification removed

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// ensure uploads folder exists and serve it statically via /uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});

const upload = multer({ storage });

// uploads dir is created above; static serving is handled at app level in src/index.js
const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

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

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    let entries;
    if (date) {
      entries = await db.getEntriesByDate(req.userId, String(date));
    } else {
      entries = await db.getEntries(req.userId, 5);
    }
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept multipart form with optional images and videos
router.post('/', authMiddleware, upload.fields([{ name: 'images' }, { name: 'videos' }]), async (req, res) => {
  try {
    const { title, content, sentiment, kind, tags } = req.body;
    const images = (req.files && req.files.images) ? req.files.images.map(f => `/uploads/${f.filename}`) : [];
    const videos = (req.files && req.files.videos) ? req.files.videos.map(f => `/uploads/${f.filename}`) : [];
    // tags may be sent as comma-separated string or array
    let parsedTags = [];
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map(String).map(s => s.trim()).filter(Boolean);
    }
    const saved = await db.saveEntry({ userId: req.userId, title, content, sentiment, kind: kind || 'entry', tags: parsedTags, images, videos });
    res.json({ ok: true, entry: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const ok = await db.deleteEntry(req.userId, id);
    if (!ok) return res.status(404).json({ error: 'Not found or not authorized' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// update an entry (title/content/images/videos etc)
router.put('/:id', authMiddleware, upload.array('images'), async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const entryId = req.params.id;
    const { title, content, sentiment, tags, kind } = req.body || {};
    const updates = { title, content, sentiment, kind };
    if (tags) {
      try { updates.tags = JSON.parse(tags); } catch (e) { updates.tags = Array.isArray(tags) ? tags : [tags]; }
    }

    // handle new uploaded files (images)
    if (req.files && req.files.length) {
      const files = req.files.map(f => `/uploads/${f.filename}`);
      // append to existing images array on the entry
      const existing = await db.getEntries(userId);
      const entry = existing.find(e => String(e.id) === String(entryId));
      const prevImages = entry && entry.images ? entry.images : [];
      updates.images = prevImages.concat(files);
    }

    const updated = await db.updateEntry(userId, entryId, updates);
    if (!updated) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entry: updated });
  } catch (err) {
    console.error('PUT /entries/:id error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

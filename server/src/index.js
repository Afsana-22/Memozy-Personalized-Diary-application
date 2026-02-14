require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const analyzeRoutes = require('./routes/analyze');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;

// Initialize DB (MongoDB if MONGODB_URI provided, otherwise in-memory fallback)
async function start() {
  try {
    await db.init(process.env.MONGODB_URI);
  } catch (err) {
    // db.init now handles errors and falls back to memory; this catch is defensive
    console.warn('DB init threw an error (continuing with in-memory fallback):', err && err.message ? err.message : err);
  }

  console.log('DB initialized. Using memory store:', db.useMemoryStore());

  // ensure uploads dir exists and serve statically at /uploads
  const path = require('path');
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/entries', entriesRoutes);
  app.use('/api/analyze', analyzeRoutes);

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();

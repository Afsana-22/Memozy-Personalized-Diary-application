const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

let useMemory = false;
const usersMap = new Map(); // email -> { id, email, passwordHash, username, verified }
const entriesMap = new Map(); // userId -> [entries]

async function init(mongoUri) {
  // If the mongoUri is missing or looks like a placeholder, use in-memory fallback
  if (!mongoUri || mongoUri.includes('<user>') || (mongoUri.includes('cluster0.mongodb.net') && mongoUri.includes('<pass>'))) {
    console.warn('MONGODB_URI not set or appears placeholder  using in-memory fallback (development only).');
    useMemory = true;
    return;
  }

  // Try to connect to MongoDB. If connection fails, fall back to the in-memory store
  try {
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    useMemory = false;
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('Could not connect to MongoDB at provided MONGODB_URI  falling back to in-memory store. Error:', err && err.message ? err.message : err);
    useMemory = true;
  }
}

// Mongoose schemas (only used if not using memory)
let UserModel = null;
let EntryModel = null;
function ensureModels() {
  if (UserModel && EntryModel) return;
  const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    username: { type: String },
    verified: { type: Boolean, default: false },
    profileImage: { type: String, default: '/placeholder.svg' },
    createdAt: { type: Date, default: Date.now }
  });
  const entrySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String },
    content: { type: String, required: true },
    kind: { type: String, enum: ['entry', 'poem', 'story'], default: 'entry' },
    tags: { type: [String], default: [] },
    sentiment: { type: String },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    entry_date: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now }
  });
  UserModel = mongoose.models.User || mongoose.model('User', userSchema);
  EntryModel = mongoose.models.Entry || mongoose.model('Entry', entrySchema);
}

async function findUserByEmail(email) {
  if (useMemory) {
    return usersMap.get(email) || null;
  }
  ensureModels();
  const u = await UserModel.findOne({ email }).lean();
  if (!u) return null;
  return {
    id: u._id.toString(),
    email: u.email,
    profileImage: u.profileImage || '/placeholder.svg',
    username: u.username,
    passwordHash: u.passwordHash,
    verified: u.verified,
    createdAt: u.createdAt,
  };
}

async function createUser({ email, passwordHash, username, verified = true }) {
  if (useMemory) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const user = { id, email, passwordHash, username, verified, profileImage: '/placeholder.svg' };
    usersMap.set(email, user);
    entriesMap.set(id, []);
    return user;
  }
  ensureModels();
  const u = new UserModel({ email, passwordHash, username, verified });
  await u.save();
  return { id: u._id.toString(), email: u.email, username: u.username, verified: u.verified };
}

async function findUserById(id) {
  if (useMemory) {
    for (const user of usersMap.values()) {
      if (user.id === id || String(user.id) === String(id)) return user;
    }
    return null;
  }
  ensureModels();
  const u = await UserModel.findById(id).lean();
  if (!u) return null;
  return {
    id: u._id.toString(),
    email: u.email,
    username: u.username,
    profileImage: u.profileImage || '/placeholder.svg',
    passwordHash: u.passwordHash,
    verified: u.verified,
    createdAt: u.createdAt,
  };
}

async function saveEntry({ userId, title, content, sentiment, kind = 'entry', tags = [], images, videos }) {
  if (useMemory) {
    const arr = entriesMap.get(userId) || [];
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title, content, sentiment, kind, tags, images: images || [], videos: videos || [], entry_date: new Date().toISOString(), created_at: new Date().toISOString() };
    arr.unshift(entry);
    entriesMap.set(userId, arr);
    return entry;
  }
  ensureModels();
  // allow images/videos if provided
  const entryData = { user_id: userId, title, content, sentiment, kind, tags };
  if (images) entryData.images = images;
  if (videos) entryData.videos = videos;
  const e = new EntryModel(entryData);
  await e.save();
  const obj = e.toObject();
  return {
    id: obj._id.toString(),
    user_id: obj.user_id ? obj.user_id.toString() : null,
    title: obj.title,
    content: obj.content,
    sentiment: obj.sentiment,
    kind: obj.kind || 'entry',
    tags: obj.tags || [],
    images: obj.images || [],
    videos: obj.videos || [],
    entry_date: obj.entry_date,
    created_at: obj.created_at,
  };
}

async function getEntries(userId, limit = 5) {
  if (useMemory) {
    return (entriesMap.get(userId) || []).slice(0, limit);
  }
  ensureModels();
  const rows = await EntryModel.find({ user_id: userId }).sort({ created_at: -1 }).limit(limit).lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    user_id: r.user_id ? r.user_id.toString() : null,
    title: r.title,
    content: r.content,
    sentiment: r.sentiment,
    kind: r.kind || 'entry',
    tags: r.tags || [],
    images: r.images || [],
    videos: r.videos || [],
    entry_date: r.entry_date,
    created_at: r.created_at,
  }));
}

// Return entries for a specific date (YYYY-MM-DD)
async function getEntriesByDate(userId, dateStr) {
  if (!dateStr) return [];
  if (useMemory) {
    const arr = entriesMap.get(userId) || [];
    return arr.filter(e => {
      if (!e.entry_date) return false;
      try {
        // Compare by local YYYY-MM-DD so saved entries don't shift dates due to UTC conversions
        const d = new Date(e.entry_date);
        const localYMD = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        return localYMD === dateStr;
      } catch (err) {
        return false;
      }
    });
  }
  ensureModels();
  // Interpret dateStr as local YYYY-MM-DD and build local start/end so entries created locally
  // don't appear to shift to the next/previous day because of UTC offsets.
  const start = new Date(dateStr + 'T00:00:00');
  const end = new Date(dateStr + 'T23:59:59.999');
  const rows = await EntryModel.find({ user_id: userId, entry_date: { $gte: start, $lte: end } }).sort({ created_at: -1 }).lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    user_id: r.user_id ? r.user_id.toString() : null,
    title: r.title,
    content: r.content,
    sentiment: r.sentiment,
    kind: r.kind || 'entry',
    tags: r.tags || [],
    images: r.images || [],
    videos: r.videos || [],
    entry_date: r.entry_date,
    created_at: r.created_at,
  }));
}

async function deleteEntry(userId, entryId) {
  if (useMemory) {
    const arr = entriesMap.get(userId) || [];
    const idx = arr.findIndex(e => e.id === entryId || String(e.id) === String(entryId));
    if (idx === -1) return false;
    arr.splice(idx, 1);
    entriesMap.set(userId, arr);
    return true;
  }
  ensureModels();
  const res = await EntryModel.deleteOne({ _id: entryId, user_id: userId });
  return res.deletedCount > 0;
}

async function updateEntry(userId, entryId, updates) {
  if (useMemory) {
    const arr = entriesMap.get(userId) || [];
    const idx = arr.findIndex(e => e.id === entryId || String(e.id) === String(entryId));
    if (idx === -1) return null;
    const entry = arr[idx];
    const updated = { ...entry, ...updates };
    // ensure timestamps remain
    updated.created_at = entry.created_at;
    updated.entry_date = entry.entry_date || new Date().toISOString();
    arr[idx] = updated;
    entriesMap.set(userId, arr);
    return updated;
  }
  ensureModels();
  const allowed = ['title', 'content', 'sentiment', 'tags', 'kind', 'images', 'videos'];
  const data = {};
  for (const k of allowed) {
    if (updates[k] !== undefined) data[k] = updates[k];
  }
  const e = await EntryModel.findOneAndUpdate({ _id: entryId, user_id: userId }, data, { new: true }).lean();
  if (!e) return null;
  return {
    id: e._id.toString(),
    user_id: e.user_id ? e.user_id.toString() : null,
    title: e.title,
    content: e.content,
    sentiment: e.sentiment,
    kind: e.kind || 'entry',
    tags: e.tags || [],
    images: e.images || [],
    videos: e.videos || [],
    entry_date: e.entry_date,
    created_at: e.created_at,
  };
}

async function updateUserProfile(userId, { username, profileImage }) {
  if (useMemory) {
    for (const user of usersMap.values()) {
      if (user.id === userId || String(user.id) === String(userId)) {
        if (username !== undefined) user.username = username;
        if (profileImage !== undefined) user.profileImage = profileImage;
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
          verified: user.verified,
        };
      }
    }
    return null;
  }
  ensureModels();
  const updates = {};
  if (username !== undefined) updates.username = username;
  if (profileImage !== undefined) updates.profileImage = profileImage;
  const u = await UserModel.findByIdAndUpdate(userId, updates, { new: true }).lean();
  if (!u) return null;
  return { id: u._id.toString(), email: u.email, username: u.username, profileImage: u.profileImage };
}

module.exports = { init, findUserByEmail, createUser, findUserById, saveEntry, getEntries, getEntriesByDate, deleteEntry, updateUserProfile, useMemoryStore: () => useMemory };

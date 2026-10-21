require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');

const { connect, getDb } = require('./db');
const { validateQuiz } = require('./validateQuiz');
const { buildShuffledQuiz } = require('./shuffle');
const { signUserToken, signAdminToken, requireUser, requireAdmin } = require('./auth');

const PORT = Number(process.env.PORT) || 4000;
const app = express();

// ---------- middleware ----------
// Comma-separated list in FRONTEND_URL / ADMIN_URL, plus optional extra
// origins via ALLOWED_ORIGINS (e.g. "https://app.vercel.app,https://admin.vercel.app").
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '').split(','),
  ...(process.env.ADMIN_URL || '').split(','),
  ...(process.env.ALLOWED_ORIGINS || '').split(','),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // allow non-browser clients (no Origin header, e.g. curl) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
}));
app.use(express.json({ limit: '2mb' }));

// ---------- helpers ----------
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function topicTitleMap(db) {
  const topics = await db.collection('topics').find({}, { projection: { title: 1 } }).toArray();
  const map = {};
  topics.forEach((t) => { map[t._id.toString()] = t.title; });
  return map;
}

function summarizeAttempts(attempts) {
  const totalAttempts = attempts.length;
  const topicsAttempted = new Set(attempts.map((a) => a.topicId.toString())).size;
  const scores = attempts.map((a) => a.scorePct);
  const avgScorePct = totalAttempts ? Math.round((scores.reduce((s, v) => s + v, 0) / totalAttempts) * 10) / 10 : 0;
  const bestScorePct = totalAttempts ? Math.max(...scores) : 0;
  const latest = attempts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  return {
    totalAttempts,
    topicsAttempted,
    avgScorePct,
    bestScorePct,
    latestScorePct: latest ? latest.scorePct : null,
    latestAttemptAt: latest ? latest.createdAt : null,
  };
}

// ---------- user-facing routes ----------
app.post('/api/users/login', async (req, res) => {
  try {
    const raw = typeof req.body.name === 'string' ? req.body.name : '';
    const name = raw.trim().replace(/\s+/g, ' ');
    if (name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }
    const db = getDb();
    const users = db.collection('users');

    let user = await users.findOne({ name: { $regex: `^${escapeRegExp(name)}$`, $options: 'i' } });
    if (!user) {
      const now = new Date();
      const result = await users.insertOne({ name, createdAt: now, lastActiveAt: now });
      user = { _id: result.insertedId, name, createdAt: now, lastActiveAt: now };
    } else {
      await users.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } });
    }
    const token = signUserToken(user);
    res.json({ token, user: { id: user._id.toString(), name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/topics', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const topics = await db.collection('topics')
      .find({}, { projection: { title: 1, instructions: 1, questions: 1 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(topics.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      instructions: t.instructions || '',
      questionCount: t.questions.length,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load topics' });
  }
});

app.post('/api/quiz/start', requireUser, async (req, res) => {
  try {
    const { topicId } = req.body || {};
    if (!topicId || !ObjectId.isValid(topicId)) {
      return res.status(400).json({ error: 'Valid topicId is required' });
    }
    const db = getDb();
    const topic = await db.collection('topics').findOne({ _id: new ObjectId(topicId) });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(buildShuffledQuiz(topic));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

app.post('/api/attempts', requireUser, async (req, res) => {
  try {
    const { topicId, scorePct, correct, total, perQuestion } = req.body || {};
    if (!topicId || !ObjectId.isValid(topicId)) return res.status(400).json({ error: 'Valid topicId is required' });
    if (typeof scorePct !== 'number' || typeof correct !== 'number' || typeof total !== 'number') {
      return res.status(400).json({ error: 'scorePct, correct and total must be numbers' });
    }
    if (!Array.isArray(perQuestion)) {
      return res.status(400).json({ error: 'perQuestion must be an array' });
    }
    const db = getDb();
    const topic = await db.collection('topics').findOne({ _id: new ObjectId(topicId) });
    const attempt = {
      userId: new ObjectId(req.user.userId),
      topicId: new ObjectId(topicId),
      topicTitle: topic ? topic.title : 'Unknown topic',
      scorePct,
      correct,
      total,
      perQuestion: perQuestion.map((p) => ({
        questionIndex: typeof p.questionIndex === 'number' ? p.questionIndex : null,
        type: typeof p.type === 'string' ? p.type : '',
        questionText: typeof p.questionText === 'string' ? p.questionText : '',
        correct: !!p.correct,
        userAnswer: typeof p.userAnswer === 'string' ? p.userAnswer : String(p.userAnswer ?? ''),
        correctAnswer: typeof p.correctAnswer === 'string' ? p.correctAnswer : String(p.correctAnswer ?? ''),
        explanation: typeof p.explanation === 'string' ? p.explanation : '',
      })),
      createdAt: new Date(),
    };
    const result = await db.collection('attempts').insertOne(attempt);
    await db.collection('users').updateOne(
      { _id: attempt.userId },
      { $set: { lastActiveAt: new Date() } }
    );
    res.json({ ok: true, attemptId: result.insertedId.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save attempt' });
  }
});

app.get('/api/attempts/mine', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const attempts = await db.collection('attempts')
      .find({ userId: new ObjectId(req.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();
    const titles = await topicTitleMap(db);
    res.json(attempts.map((a) => ({
      id: a._id.toString(),
      topicId: a.topicId.toString(),
      topicTitle: titles[a.topicId.toString()] || a.topicTitle || 'Unknown topic',
      scorePct: a.scorePct,
      correct: a.correct,
      total: a.total,
      createdAt: a.createdAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load attempts' });
  }
});

// ---------- admin routes ----------
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (typeof password === 'string' && password === process.env.ADMIN_PASSWORD) {
    return res.json({ token: signAdminToken() });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

app.get('/api/admin/topics', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const topics = await db.collection('topics').find({}).sort({ createdAt: -1 }).toArray();
    res.json(topics.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      instructions: t.instructions || '',
      questions: t.questions,
      questionCount: t.questions.length,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load topics' });
  }
});

app.post('/api/admin/topics', requireAdmin, async (req, res) => {
  try {
    const { valid, errors } = validateQuiz(req.body);
    if (!valid) return res.status(400).json({ errors });
    const now = new Date();
    const doc = {
      title: req.body.title.trim(),
      instructions: req.body.instructions || '',
      questions: req.body.questions,
      createdAt: now,
      updatedAt: now,
    };
    const result = await getDb().collection('topics').insertOne(doc);
    res.status(201).json({ ok: true, id: result.insertedId.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

app.put('/api/admin/topics/:id', requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ errors: ['Invalid topic id'] });
    const { valid, errors } = validateQuiz(req.body);
    if (!valid) return res.status(400).json({ errors });
    const db = getDb();
    const result = await db.collection('topics').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          title: req.body.title.trim(),
          instructions: req.body.instructions || '',
          questions: req.body.questions,
          updatedAt: new Date(),
        },
      }
    );
    if (result.matchedCount === 0) return res.status(404).json({ errors: ['Topic not found'] });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

app.delete('/api/admin/topics/:id', requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid topic id' });
    const result = await getDb().collection('topics').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Topic not found' });
    // attempts are kept; they store a topicTitle snapshot
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
    const attempts = await db.collection('attempts').find({}).toArray();

    const byUser = {};
    attempts.forEach((a) => {
      const key = a.userId.toString();
      if (!byUser[key]) byUser[key] = [];
      byUser[key].push(a);
    });

    res.json(users.map((u) => {
      const stats = summarizeAttempts(byUser[u._id.toString()] || []);
      return {
        id: u._id.toString(),
        name: u.name,
        createdAt: u.createdAt,
        lastActiveAt: u.lastActiveAt,
        ...stats,
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid user id' });
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const attempts = await db.collection('attempts')
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .toArray();
    const titles = await topicTitleMap(db);

    const attemptsOut = attempts.map((a) => ({
      id: a._id.toString(),
      topicId: a.topicId.toString(),
      topicTitle: titles[a.topicId.toString()] || a.topicTitle || 'Unknown topic',
      scorePct: a.scorePct,
      correct: a.correct,
      total: a.total,
      createdAt: a.createdAt,
      perQuestion: a.perQuestion || [],
    }));

    // per-topic stats
    const groups = {};
    attemptsOut.forEach((a) => {
      if (!groups[a.topicId]) groups[a.topicId] = { topicId: a.topicId, topicTitle: a.topicTitle, list: [] };
      groups[a.topicId].list.push(a);
    });
    const perTopicStats = Object.values(groups).map((g) => {
      const scores = g.list.map((a) => a.scorePct);
      return {
        topicId: g.topicId,
        topicTitle: g.topicTitle,
        attempts: g.list.length,
        best: Math.max(...scores),
        latest: g.list[0].scorePct, // attemptsOut is newest-first
        avg: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
      };
    });

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
        ...summarizeAttempts(attempts),
      },
      attempts: attemptsOut,
      perTopicStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load user profile' });
  }
});

// ---------- startup ----------
async function seedIfEmpty(db) {
  const topics = db.collection('topics');
  const count = await topics.countDocuments();
  if (count > 0) {
    console.log(`Topics collection has ${count} document(s); skipping seed.`);
    return;
  }
  const seedPath = path.join(__dirname, 'seed', 'quiz.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const { valid, errors } = validateQuiz(seed);
  if (!valid) {
    console.error('Seed file failed validation:', errors);
    process.exit(1);
  }
  const now = new Date();
  await topics.insertOne({
    title: seed.title.trim(),
    instructions: seed.instructions || '',
    questions: seed.questions,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Seeded topic "${seed.title}" (${seed.questions.length} questions).`);
}

async function main() {
  const db = await connect();
  await db.collection('users').createIndex({ name: 1 }, { collation: { locale: 'en', strength: 2 } });
  await db.collection('attempts').createIndex({ userId: 1, createdAt: -1 });
  await seedIfEmpty(db);

  // ---- static hosting of the two built React apps (production) ----
  const path = require('path');
  const fs = require('fs');
  const send = (res, file) =>
    res.sendFile(file, (err) => { if (err && !res.headersSent) res.status(404).send('Not found'); });
  const frontendDist = path.join(__dirname, 'frontend', 'dist');
  const adminDist = path.join(__dirname, 'admin', 'dist');
  const landingPage = path.join(__dirname, 'index.html');

  if (fs.existsSync(adminDist)) {
    // admin app served under /admin (assets keep absolute /assets paths)
    app.use('/admin', express.static(adminDist));
    app.get('/admin/*', (req, res) => send(res, path.join(adminDist, 'index.html')));
    app.use('/admin-assets', express.static(path.join(adminDist, 'assets')));
  }
  if (fs.existsSync(frontendDist)) {
    // user app assets (absolute /assets paths from the vite build)
    app.use('/assets', express.static(path.join(frontendDist, 'assets')));
    // SPA deep links for the user app (login, topics, quiz, results, history)
    app.get(['/home', '/home/*', '/login', '/topics', '/results', '/history', '/quiz/*'], (req, res) =>
      send(res, path.join(frontendDist, 'index.html'))
    );
    // landing page at / (root static files: index.html etc.)
    app.use(express.static(__dirname, { index: false }));
    app.get('/', (req, res) => {
      if (fs.existsSync(landingPage)) return send(res, landingPage);
      // no landing page in the image — go straight to the user app
      res.redirect('/home');
    });
  }

  app.listen(PORT, () => {
    console.log(`Quiz API listening on http://localhost:${PORT}`);
    if (fs.existsSync(frontendDist)) console.log(`User app:  http://localhost:${PORT}/`);
    if (fs.existsSync(adminDist)) console.log(`Admin app: http://localhost:${PORT}/admin/`);
  });
}

main().catch((err) => {
  console.error('FATAL: startup failed:', err);
  process.exit(1);
});

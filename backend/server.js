const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
const { aiRateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS from env (comma-separated origins)
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/delegates', require('./routes/delegates'));
app.use('/api/treasury', require('./routes/treasury'));
app.use('/api/voting', require('./routes/voting'));
app.use('/api/governed-proposals', require('./routes/governedProposals'));
app.use('/api/daos', require('./routes/daos'));
app.use('/api/events', require('./routes/events'));
app.use('/api/ai', aiRateLimiter, require('./routes/ai'));
app.use('/api/ai', aiRateLimiter, require('./routes/aiNew'));






app.use('/api/ai', require('./routes/governanceEvolve'));
app.use('/api/ai', require('./routes/delegateQuality'));
app.use('/api/ai', require('./routes/treasuryScenario'));
app.use('/api/ai', require('./routes/apathyPrediction'));
app.use('/api/ai', require('./routes/voterEducation'));
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// === Custom Views (DAO Views) - mounted BEFORE 404 ===
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/quorum-rescue-planner', require('./routes/quorumRescuePlanner'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`CORS origins: ${corsOrigins.join(', ')}`);
});

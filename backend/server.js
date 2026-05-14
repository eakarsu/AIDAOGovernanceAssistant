const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
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
app.use('/api/gap-daos-events-lack-ai-endpoints', require('./routes/gap_daos_events_lack_ai_endpoints'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-proposals-lacks-auto-generate-proposal-or-analyze-proposal-l', require('./routes/gap_proposals_lacks_auto_generate_proposal_or_analyze_proposal_l'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-treasury-lacks-ai-scenario-modeling-endpoint-despite-treasur', require('./routes/gap_treasury_lacks_ai_scenario_modeling_endpoint_despite_treasur'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-blockchain-integration-ethereum-polygon-for-on-chain-prop', require('./routes/gap_no_blockchain_integration_ethereum_polygon_for_on_chain_prop'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-governance-platform-integrations-no-snapshot-aragon', require('./routes/gap_limited_governance_platform_integrations_no_snapshot_aragon'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-real-time-voting-dashboard-or-live-results', require('./routes/gap_no_real_time_voting_dashboard_or_live_results'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-historical-voting-pattern-analytics', require('./routes/gap_no_historical_voting_pattern_analytics'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-webhooks', require('./routes/gap_no_webhooks'));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`CORS origins: ${corsOrigins.join(', ')}`);
});

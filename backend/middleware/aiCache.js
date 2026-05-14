/**
 * aiCache.js - Persistent AI result cache backed by ai_results JSONB table.
 * Used to avoid redundant OpenRouter calls for expensive analyses.
 *
 * Usage:
 *   const cached = await getCached(userId, 'governance-health', { dao_id: 12 });
 *   if (cached) return res.json({ ...cached, cached: true });
 *   ...do expensive AI call...
 *   await setCached(userId, 'governance-health', { dao_id: 12 }, result, 3600);
 */

const crypto = require('crypto');
const pool = require('../db');

let initialized = false;

async function initTable() {
  if (initialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        feature TEXT NOT NULL,
        cache_key TEXT NOT NULL,
        result JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, feature, cache_key)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_results_lookup ON ai_results (user_id, feature, cache_key)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_results_expires ON ai_results (expires_at)`);
    initialized = true;
    console.log('[aiCache] ai_results table ready');
  } catch (err) {
    console.error('[aiCache] init error:', err.message);
  }
}

initTable();

function buildKey(payload) {
  return crypto.createHash('md5').update(JSON.stringify(payload || {})).digest('hex');
}

async function getCached(userId, feature, payload) {
  try {
    const key = buildKey(payload);
    const r = await pool.query(
      `SELECT result FROM ai_results
       WHERE user_id = $1 AND feature = $2 AND cache_key = $3 AND expires_at > NOW()
       LIMIT 1`,
      [userId || 0, feature, key]
    );
    return r.rows.length ? r.rows[0].result : null;
  } catch (err) {
    console.error('[aiCache] getCached error:', err.message);
    return null;
  }
}

async function setCached(userId, feature, payload, result, ttlSeconds = 1800) {
  try {
    const key = buildKey(payload);
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, cache_key, result, expires_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW() + ($5 || ' seconds')::interval)
       ON CONFLICT (user_id, feature, cache_key)
       DO UPDATE SET result = EXCLUDED.result, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [userId || 0, feature, key, JSON.stringify(result), String(ttlSeconds)]
    );
  } catch (err) {
    console.error('[aiCache] setCached error:', err.message);
  }
}

module.exports = { getCached, setCached, buildKey };

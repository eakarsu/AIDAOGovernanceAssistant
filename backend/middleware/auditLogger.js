const pool = require('../db');

// Initialize audit_log table if it doesn't exist
async function initAuditTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        changes JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('[AuditLogger] audit_log table ready');
  } catch (err) {
    console.error('[AuditLogger] Failed to create audit_log table:', err.message);
  }
}

initAuditTable();

/**
 * Middleware factory: logs governance mutations to audit_log.
 * Usage: router.post('/', auth, auditLog('proposals', 'create'), handler)
 */
function auditLog(entityType, action) {
  return async (req, res, next) => {
    // Capture original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only log on successful write operations (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const entityId = body?.id || req.params?.id || null;
          await pool.query(
            `INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, changes, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              req.user?.id || null,
              req.user?.email || null,
              action,
              entityType,
              entityId ? String(entityId) : null,
              JSON.stringify(req.body),
              req.ip,
              req.headers['user-agent'] || null
            ]
          );
        } catch (err) {
          console.error('[AuditLogger] Failed to write audit log:', err.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog };

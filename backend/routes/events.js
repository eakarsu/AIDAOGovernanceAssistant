const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM governance_events'),
      pool.query('SELECT * FROM governance_events ORDER BY event_date DESC LIMIT $1 OFFSET $2', [limit, offset])
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM governance_events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, dao_name, event_type, event_date, impact_level, status } = req.body;
    const result = await pool.query(
      `INSERT INTO governance_events (title, description, dao_name, event_type, event_date, impact_level, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, dao_name, event_type || 'vote', event_date || new Date().toISOString(), impact_level || 'medium', status || 'upcoming']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, dao_name, event_type, event_date, impact_level, status } = req.body;
    const result = await pool.query(
      `UPDATE governance_events SET title=$1, description=$2, dao_name=$3, event_type=$4, event_date=$5, impact_level=$6, status=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, description, dao_name, event_type, event_date, impact_level, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM governance_events WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

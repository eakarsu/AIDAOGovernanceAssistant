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
      pool.query('SELECT COUNT(*) FROM daos'),
      pool.query('SELECT * FROM daos ORDER BY total_members DESC LIMIT $1 OFFSET $2', [limit, offset])
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
    const result = await pool.query('SELECT * FROM daos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, blockchain, governance_token, total_members, treasury_value, active_proposals, website_url } = req.body;
    const result = await pool.query(
      `INSERT INTO daos (name, description, blockchain, governance_token, total_members, treasury_value, active_proposals, website_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, description, blockchain || 'Ethereum', governance_token, total_members || 0, treasury_value || 0, active_proposals || 0, website_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, blockchain, governance_token, total_members, treasury_value, active_proposals, website_url } = req.body;
    const result = await pool.query(
      `UPDATE daos SET name=$1, description=$2, blockchain=$3, governance_token=$4, total_members=$5, treasury_value=$6, active_proposals=$7, website_url=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, description, blockchain, governance_token, total_members, treasury_value, active_proposals, website_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM daos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

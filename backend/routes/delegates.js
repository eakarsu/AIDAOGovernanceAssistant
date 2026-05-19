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
      pool.query('SELECT COUNT(*) FROM delegates'),
      pool.query('SELECT * FROM delegates ORDER BY voting_power DESC LIMIT $1 OFFSET $2', [limit, offset])
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
    const result = await pool.query('SELECT * FROM delegates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, address, dao_name, voting_power, participation_rate, delegators_count, proposals_voted, proposals_created, reputation_score } = req.body;
    const result = await pool.query(
      `INSERT INTO delegates (name, address, dao_name, voting_power, participation_rate, delegators_count, proposals_voted, proposals_created, reputation_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, address, dao_name, voting_power || 0, participation_rate || 0, delegators_count || 0, proposals_voted || 0, proposals_created || 0, reputation_score || 50]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, address, dao_name, voting_power, participation_rate, delegators_count, proposals_voted, proposals_created, reputation_score } = req.body;
    const result = await pool.query(
      `UPDATE delegates SET name=$1, address=$2, dao_name=$3, voting_power=$4, participation_rate=$5, delegators_count=$6, proposals_voted=$7, proposals_created=$8, reputation_score=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, address, dao_name, voting_power, participation_rate, delegators_count, proposals_voted, proposals_created, reputation_score, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM delegates WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

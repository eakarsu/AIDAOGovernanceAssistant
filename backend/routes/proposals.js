const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proposals ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proposals WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, dao_name, proposal_type, status, votes_for, votes_against, quorum_required, proposer } = req.body;
    const result = await pool.query(
      `INSERT INTO proposals (title, description, dao_name, proposal_type, status, votes_for, votes_against, quorum_required, proposer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, dao_name, proposal_type || 'governance', status || 'active', votes_for || 0, votes_against || 0, quorum_required || 50, proposer || 'Unknown']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, dao_name, proposal_type, status, votes_for, votes_against, quorum_required, proposer } = req.body;
    const result = await pool.query(
      `UPDATE proposals SET title=$1, description=$2, dao_name=$3, proposal_type=$4, status=$5, votes_for=$6, votes_against=$7, quorum_required=$8, proposer=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, description, dao_name, proposal_type, status, votes_for, votes_against, quorum_required, proposer, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM proposals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

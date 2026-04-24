const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM voting_records ORDER BY voted_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM voting_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { proposal_title, voter_name, voter_address, dao_name, vote_choice, voting_power, reason } = req.body;
    const result = await pool.query(
      `INSERT INTO voting_records (proposal_title, voter_name, voter_address, dao_name, vote_choice, voting_power, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [proposal_title, voter_name, voter_address, dao_name, vote_choice || 'for', voting_power || 1, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { proposal_title, voter_name, voter_address, dao_name, vote_choice, voting_power, reason } = req.body;
    const result = await pool.query(
      `UPDATE voting_records SET proposal_title=$1, voter_name=$2, voter_address=$3, dao_name=$4, vote_choice=$5, voting_power=$6, reason=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [proposal_title, voter_name, voter_address, dao_name, vote_choice, voting_power, reason, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM voting_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

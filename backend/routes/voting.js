const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLogger');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM voting_records'),
      pool.query('SELECT * FROM voting_records ORDER BY voted_at DESC LIMIT $1 OFFSET $2', [limit, offset])
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
    const result = await pool.query('SELECT * FROM voting_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, auditLog('voting_records', 'create'), async (req, res) => {
  try {
    const { proposal_title, voter_name, voter_address, dao_name, vote_choice, voting_power, reason } = req.body;

    if (!proposal_title || typeof proposal_title !== 'string' || proposal_title.trim().length === 0) {
      return res.status(400).json({ error: 'proposal_title is required' });
    }
    if (!voter_name || typeof voter_name !== 'string' || voter_name.trim().length === 0) {
      return res.status(400).json({ error: 'voter_name is required' });
    }
    if (!dao_name || typeof dao_name !== 'string' || dao_name.trim().length === 0) {
      return res.status(400).json({ error: 'dao_name is required' });
    }
    const validChoices = ['for', 'against', 'abstain'];
    if (vote_choice && !validChoices.includes(vote_choice)) {
      return res.status(400).json({ error: `vote_choice must be one of: ${validChoices.join(', ')}` });
    }
    if (voting_power !== undefined && (isNaN(Number(voting_power)) || Number(voting_power) < 0)) {
      return res.status(400).json({ error: 'voting_power must be a non-negative number' });
    }

    const result = await pool.query(
      `INSERT INTO voting_records (proposal_title, voter_name, voter_address, dao_name, vote_choice, voting_power, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [proposal_title, voter_name, voter_address, dao_name, vote_choice || 'for', voting_power || 1, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, auditLog('voting_records', 'update'), async (req, res) => {
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

router.delete('/:id', auth, auditLog('voting_records', 'delete'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM voting_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

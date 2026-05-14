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
      pool.query('SELECT COUNT(*) FROM proposals'),
      pool.query('SELECT * FROM proposals ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset])
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
    const result = await pool.query('SELECT * FROM proposals WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, auditLog('proposals', 'create'), async (req, res) => {
  try {
    const { title, description, dao_name, proposal_type, status, votes_for, votes_against, quorum_required, proposer } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required and must be a non-empty string' });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'description is required and must be a non-empty string' });
    }
    if (!dao_name || typeof dao_name !== 'string' || dao_name.trim().length === 0) {
      return res.status(400).json({ error: 'dao_name is required' });
    }
    const validTypes = ['governance', 'treasury', 'technical', 'social', 'other'];
    if (proposal_type && !validTypes.includes(proposal_type)) {
      return res.status(400).json({ error: `proposal_type must be one of: ${validTypes.join(', ')}` });
    }
    if (quorum_required !== undefined && (isNaN(Number(quorum_required)) || Number(quorum_required) < 0 || Number(quorum_required) > 100)) {
      return res.status(400).json({ error: 'quorum_required must be a number between 0 and 100' });
    }

    const result = await pool.query(
      `INSERT INTO proposals (title, description, dao_name, proposal_type, status, votes_for, votes_against, quorum_required, proposer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, dao_name, proposal_type || 'governance', status || 'active', votes_for || 0, votes_against || 0, quorum_required || 50, proposer || 'Unknown']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, auditLog('proposals', 'update'), async (req, res) => {
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

router.delete('/:id', auth, auditLog('proposals', 'delete'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM proposals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

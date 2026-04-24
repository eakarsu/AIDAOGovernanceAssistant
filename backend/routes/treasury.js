const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM treasury_transactions ORDER BY transaction_date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM treasury_transactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { dao_name, transaction_type, amount, token_symbol, description, from_address, to_address, status } = req.body;
    const result = await pool.query(
      `INSERT INTO treasury_transactions (dao_name, transaction_type, amount, token_symbol, description, from_address, to_address, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [dao_name, transaction_type || 'transfer', amount || 0, token_symbol || 'ETH', description, from_address, to_address, status || 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { dao_name, transaction_type, amount, token_symbol, description, from_address, to_address, status } = req.body;
    const result = await pool.query(
      `UPDATE treasury_transactions SET dao_name=$1, transaction_type=$2, amount=$3, token_symbol=$4, description=$5, from_address=$6, to_address=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [dao_name, transaction_type, amount, token_symbol, description, from_address, to_address, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM treasury_transactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

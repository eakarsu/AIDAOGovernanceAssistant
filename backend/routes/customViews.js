const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// In-memory governance rules store (CRUD), seeded with sensible defaults
let _nextRuleId = 1;
const _rules = [
  { id: _nextRuleId++, dao_name: 'Uniswap', quorum: 40, threshold: 50, delegation_enabled: true, max_delegation: 1000000, notes: 'Standard governance rules' },
  { id: _nextRuleId++, dao_name: 'Aave', quorum: 20, threshold: 60, delegation_enabled: true, max_delegation: 500000, notes: 'Conservative rules' },
  { id: _nextRuleId++, dao_name: 'Compound', quorum: 30, threshold: 55, delegation_enabled: false, max_delegation: 0, notes: 'No delegation allowed' },
  { id: _nextRuleId++, dao_name: 'MakerDAO', quorum: 25, threshold: 50, delegation_enabled: true, max_delegation: 2000000, notes: 'High delegation cap' },
];

function _validateRule(body) {
  const errors = [];
  if (!body.dao_name || typeof body.dao_name !== 'string' || body.dao_name.trim().length === 0) errors.push('dao_name required');
  if (body.quorum !== undefined && (isNaN(Number(body.quorum)) || Number(body.quorum) < 0 || Number(body.quorum) > 100)) errors.push('quorum must be 0-100');
  if (body.threshold !== undefined && (isNaN(Number(body.threshold)) || Number(body.threshold) < 0 || Number(body.threshold) > 100)) errors.push('threshold must be 0-100');
  if (body.max_delegation !== undefined && (isNaN(Number(body.max_delegation)) || Number(body.max_delegation) < 0)) errors.push('max_delegation must be >= 0');
  return errors;
}

// 1) VIZ: Proposal turnout / results stacked bar chart data
router.get('/proposal-turnout', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT title, dao_name, status,
             COALESCE(votes_for, 0)::int AS votes_for,
             COALESCE(votes_against, 0)::int AS votes_against,
             COALESCE(quorum_required, 50)::int AS quorum_required
      FROM proposals
      ORDER BY created_at DESC
      LIMIT 12
    `);
    const proposals = result.rows.map(r => {
      const total = r.votes_for + r.votes_against;
      const turnout = total; // raw votes; quorum acts as required minimum
      const passing = r.votes_for > r.votes_against && total >= r.quorum_required;
      return {
        title: r.title,
        dao_name: r.dao_name,
        status: r.status,
        votes_for: r.votes_for,
        votes_against: r.votes_against,
        quorum_required: r.quorum_required,
        turnout,
        passing,
      };
    });
    res.json({
      proposals,
      summary: {
        total_proposals: proposals.length,
        passing_count: proposals.filter(p => p.passing).length,
        avg_turnout: proposals.length
          ? Math.round(proposals.reduce((s, p) => s + p.turnout, 0) / proposals.length)
          : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) VIZ: Voter participation heatmap (proposal x voter cohort)
router.get('/voter-heatmap', auth, async (req, res) => {
  try {
    const propRes = await pool.query(`SELECT title FROM proposals ORDER BY created_at DESC LIMIT 8`);
    const proposals = propRes.rows.map(r => r.title);
    const votingRes = await pool.query(`
      SELECT proposal_title, voter_name, voting_power::float AS voting_power
      FROM voting_records
    `);
    const cohortOf = (vp) => {
      if (vp >= 100000) return 'Whale';
      if (vp >= 10000) return 'Large';
      if (vp >= 1000) return 'Medium';
      if (vp >= 100) return 'Small';
      return 'Retail';
    };
    const cohorts = ['Whale', 'Large', 'Medium', 'Small', 'Retail'];
    // Build matrix counts of voters per (proposal, cohort)
    const matrix = proposals.map(title => {
      const row = { proposal: title };
      cohorts.forEach(c => { row[c] = 0; });
      return row;
    });
    const proposalIdx = Object.fromEntries(proposals.map((p, i) => [p, i]));
    votingRes.rows.forEach(v => {
      if (proposalIdx[v.proposal_title] === undefined) return;
      const c = cohortOf(Number(v.voting_power) || 0);
      matrix[proposalIdx[v.proposal_title]][c] += 1;
    });
    // Compute max for color scaling
    let max = 0;
    matrix.forEach(row => cohorts.forEach(c => { if (row[c] > max) max = row[c]; }));
    res.json({ proposals, cohorts, matrix, max });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) NON-VIZ: Proposal summary PDF (returns printable HTML/text summary)
router.get('/proposal-summary-pdf', auth, async (req, res) => {
  try {
    const proposalId = req.query.proposal_id;
    let proposal;
    if (proposalId) {
      const r = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposalId]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
      proposal = r.rows[0];
    } else {
      const r = await pool.query('SELECT * FROM proposals ORDER BY created_at DESC LIMIT 1');
      if (r.rows.length === 0) return res.status(404).json({ error: 'No proposals available' });
      proposal = r.rows[0];
    }

    const total = (proposal.votes_for || 0) + (proposal.votes_against || 0);
    const pctFor = total > 0 ? ((proposal.votes_for / total) * 100).toFixed(1) : '0.0';
    const pctAgainst = total > 0 ? ((proposal.votes_against / total) * 100).toFixed(1) : '0.0';
    const passing = (proposal.votes_for > proposal.votes_against) && total >= (proposal.quorum_required || 0);

    // Try to enrich with voting records
    const vr = await pool.query(
      `SELECT voter_name, vote_choice, voting_power::float AS voting_power, reason
       FROM voting_records WHERE proposal_title = $1 LIMIT 50`,
      [proposal.title]
    );

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Proposal Summary - ${proposal.title}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #111; }
  h1 { color: #4338ca; }
  .meta { color: #555; margin-bottom: 16px; }
  .block { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 13px; }
  th { background: #f4f4fb; }
  .pass { color: #057a55; font-weight: 700; }
  .fail { color: #b91c1c; font-weight: 700; }
  @media print { .noprint { display: none; } }
</style></head>
<body>
  <button class="noprint" onclick="window.print()" style="float:right">Print / Save as PDF</button>
  <h1>${proposal.title}</h1>
  <div class="meta">${proposal.dao_name || 'Unknown DAO'} - Type: ${proposal.proposal_type || 'governance'} - Status: ${proposal.status || 'active'}</div>
  <div class="block">
    <strong>Description</strong>
    <p>${proposal.description || 'No description provided.'}</p>
  </div>
  <div class="block">
    <strong>Voting Results</strong>
    <p>Votes For: ${proposal.votes_for || 0} (${pctFor}%)</p>
    <p>Votes Against: ${proposal.votes_against || 0} (${pctAgainst}%)</p>
    <p>Quorum Required: ${proposal.quorum_required || 0}</p>
    <p>Outcome: <span class="${passing ? 'pass' : 'fail'}">${passing ? 'PASSING' : 'NOT PASSING'}</span></p>
  </div>
  <div class="block">
    <strong>Top Voters (${vr.rows.length})</strong>
    <table>
      <tr><th>Voter</th><th>Choice</th><th>Power</th><th>Reason</th></tr>
      ${vr.rows.map(v => `<tr><td>${v.voter_name || ''}</td><td>${v.vote_choice || ''}</td><td>${v.voting_power || 0}</td><td>${(v.reason || '').slice(0, 80)}</td></tr>`).join('')}
    </table>
  </div>
  <div class="meta">Generated ${new Date().toISOString()}</div>
</body></html>`;

    res.json({
      proposal_id: proposal.id,
      title: proposal.title,
      summary: {
        votes_for: proposal.votes_for || 0,
        votes_against: proposal.votes_against || 0,
        quorum_required: proposal.quorum_required || 0,
        outcome: passing ? 'PASSING' : 'NOT PASSING',
        pct_for: pctFor,
        pct_against: pctAgainst,
      },
      voters_count: vr.rows.length,
      html,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) NON-VIZ: Governance rules editor (CRUD)
router.get('/governance-rules', auth, (req, res) => {
  res.json({ rules: _rules });
});

router.post('/governance-rules', auth, (req, res) => {
  const errors = _validateRule(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  const rule = {
    id: _nextRuleId++,
    dao_name: req.body.dao_name.trim(),
    quorum: req.body.quorum !== undefined ? Number(req.body.quorum) : 50,
    threshold: req.body.threshold !== undefined ? Number(req.body.threshold) : 50,
    delegation_enabled: req.body.delegation_enabled !== undefined ? !!req.body.delegation_enabled : true,
    max_delegation: req.body.max_delegation !== undefined ? Number(req.body.max_delegation) : 0,
    notes: req.body.notes || '',
  };
  _rules.push(rule);
  res.status(201).json(rule);
});

router.put('/governance-rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = _rules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const errors = _validateRule({ ..._rules[idx], ...req.body });
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  _rules[idx] = {
    ..._rules[idx],
    ...req.body,
    id,
    quorum: req.body.quorum !== undefined ? Number(req.body.quorum) : _rules[idx].quorum,
    threshold: req.body.threshold !== undefined ? Number(req.body.threshold) : _rules[idx].threshold,
    max_delegation: req.body.max_delegation !== undefined ? Number(req.body.max_delegation) : _rules[idx].max_delegation,
  };
  res.json(_rules[idx]);
});

router.delete('/governance-rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = _rules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const [removed] = _rules.splice(idx, 1);
  res.json({ message: 'Deleted', rule: removed });
});

module.exports = router;

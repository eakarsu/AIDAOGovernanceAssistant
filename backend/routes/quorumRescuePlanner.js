const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { live_votes: 7, quorum_risk: 3, reachable_delegates: 42, whale_dependency: 2 },
    proposals: [
      { proposal: 'Treasury diversification', quorum_gap: '8.4%', delegates_needed: 6, action: 'notify medium-size delegates' },
      { proposal: 'Protocol fee update', quorum_gap: '3.1%', delegates_needed: 2, action: 'community reminder' },
      { proposal: 'Grants round 18', quorum_gap: '12.7%', delegates_needed: 11, action: 'extend education thread' },
    ],
  });
});

router.post('/plan', (req, res) => {
  const { quorumGap = 0 } = req.body || {};
  res.json({ urgency: quorumGap > 10 ? 'critical' : 'moderate', steps: ['segment inactive voters', 'draft neutral explainer', 'schedule delegate outreach'] });
});

module.exports = router;

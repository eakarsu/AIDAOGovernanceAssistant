const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../openrouter');
const router = express.Router();

// AI Feature 1: Proposal Impact Analysis
router.post('/proposal-impact', auth, async (req, res) => {
  try {
    const { proposal_id } = req.body;
    let proposalData;
    if (proposal_id) {
      const result = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposal_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
      proposalData = result.rows[0];
    } else {
      proposalData = req.body;
    }

    const systemPrompt = `You are an expert DAO governance analyst. Analyze the impact of governance proposals on DAOs.
    Provide your analysis in a structured format with these sections:
    1. **Executive Summary** - Brief overview of the proposal's potential impact
    2. **Financial Impact** - How this affects treasury, token value, and financial health
    3. **Governance Impact** - Effects on voting power distribution, participation, and decentralization
    4. **Community Impact** - How this affects community engagement and stakeholder alignment
    5. **Risk Assessment** - Key risks and mitigation strategies (rate: Low/Medium/High/Critical)
    6. **Recommendation** - Your overall recommendation (Support/Oppose/Amend) with reasoning
    Use clear formatting with bullet points and bold text for key findings.`;

    const userPrompt = `Analyze this DAO governance proposal:
    Title: ${proposalData.title}
    Description: ${proposalData.description}
    DAO: ${proposalData.dao_name}
    Type: ${proposalData.proposal_type}
    Current Votes For: ${proposalData.votes_for || 0}
    Current Votes Against: ${proposalData.votes_against || 0}
    Quorum Required: ${proposalData.quorum_required || 50}%
    Proposer: ${proposalData.proposer || 'Unknown'}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse.content, model: aiResponse.model, usage: aiResponse.usage, proposal: proposalData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Feature 2: Voting Pattern Prediction
router.post('/voting-prediction', auth, async (req, res) => {
  try {
    const votingRecords = await pool.query('SELECT * FROM voting_records ORDER BY voted_at DESC LIMIT 50');
    const proposals = await pool.query('SELECT * FROM proposals ORDER BY created_at DESC LIMIT 20');

    const systemPrompt = `You are an expert DAO voting analyst specializing in predicting governance voting outcomes.
    Analyze voting patterns and predict outcomes with these sections:
    1. **Voting Trend Analysis** - Historical voting patterns and trends
    2. **Participation Metrics** - Voter turnout patterns and engagement levels
    3. **Predicted Outcomes** - For active proposals, predict likely outcomes with confidence percentages
    4. **Whale Influence** - Large voter impact analysis
    5. **Swing Factors** - Key factors that could change outcomes
    6. **Recommendations** - Strategic voting insights
    Use clear formatting with percentages and data-driven insights.`;

    const userPrompt = `Analyze these voting records and predict outcomes:

    Recent Voting Records (${votingRecords.rows.length} records):
    ${votingRecords.rows.map(v => `- ${v.voter_name} voted "${v.vote_choice}" on "${v.proposal_title}" (DAO: ${v.dao_name}, Power: ${v.voting_power})`).join('\n')}

    Active Proposals (${proposals.rows.length}):
    ${proposals.rows.map(p => `- "${p.title}" (${p.dao_name}): For: ${p.votes_for}, Against: ${p.votes_against}, Status: ${p.status}`).join('\n')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ prediction: aiResponse.content, model: aiResponse.model, usage: aiResponse.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Feature 3: Treasury Risk Assessment
router.post('/treasury-risk', auth, async (req, res) => {
  try {
    const transactions = await pool.query('SELECT * FROM treasury_transactions ORDER BY transaction_date DESC LIMIT 50');
    const daos = await pool.query('SELECT * FROM daos ORDER BY treasury_value DESC');

    const systemPrompt = `You are a DeFi treasury risk analyst specializing in DAO treasury management.
    Provide comprehensive risk analysis with these sections:
    1. **Treasury Health Overview** - Overall health assessment of DAO treasuries
    2. **Concentration Risk** - Token concentration and diversification analysis
    3. **Cash Flow Analysis** - Inflows vs outflows patterns
    4. **Market Risk Exposure** - Vulnerability to market conditions
    5. **Operational Risk** - Smart contract and operational risks
    6. **Risk Score** - Overall risk rating (1-100, where 100 is highest risk)
    7. **Recommendations** - Specific actions to mitigate identified risks
    Use clear formatting with specific numbers and risk ratings.`;

    const userPrompt = `Analyze treasury risk for these DAOs:

    Treasury Transactions (${transactions.rows.length}):
    ${transactions.rows.map(t => `- ${t.dao_name}: ${t.transaction_type} ${t.amount} ${t.token_symbol} (${t.status}) - ${t.description}`).join('\n')}

    DAO Treasuries:
    ${daos.rows.map(d => `- ${d.name}: $${d.treasury_value} treasury, ${d.total_members} members, ${d.active_proposals} active proposals`).join('\n')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ risk_assessment: aiResponse.content, model: aiResponse.model, usage: aiResponse.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Feature 4: Delegate Recommendations
router.post('/delegate-recommendations', auth, async (req, res) => {
  try {
    const delegates = await pool.query('SELECT * FROM delegates ORDER BY reputation_score DESC');
    const { preferences } = req.body;

    const systemPrompt = `You are a DAO governance advisor specializing in delegate selection and recommendations.
    Provide delegate recommendations with these sections:
    1. **Top Recommended Delegates** - Ranked list with reasoning for each
    2. **Delegate Performance Scores** - Detailed scoring breakdown
    3. **Alignment Analysis** - How delegates align with different governance philosophies
    4. **Participation Reliability** - Consistency and reliability metrics
    5. **Risk of Centralization** - Warnings about power concentration
    6. **Delegation Strategy** - Optimal delegation approach
    Use clear formatting with rankings, scores, and specific recommendations.`;

    const userPrompt = `Recommend delegates based on this data:
    ${preferences ? `User Preferences: ${preferences}` : 'No specific preferences - recommend best overall delegates.'}

    Available Delegates (${delegates.rows.length}):
    ${delegates.rows.map(d => `- ${d.name} (${d.dao_name}): Power: ${d.voting_power}, Participation: ${d.participation_rate}%, Reputation: ${d.reputation_score}/100, Proposals Voted: ${d.proposals_voted}, Proposals Created: ${d.proposals_created}, Delegators: ${d.delegators_count}`).join('\n')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ recommendations: aiResponse.content, model: aiResponse.model, usage: aiResponse.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Feature 5: Governance Health Score
router.post('/governance-health', auth, async (req, res) => {
  try {
    const daos = await pool.query('SELECT * FROM daos');
    const proposals = await pool.query('SELECT dao_name, status, COUNT(*) as count FROM proposals GROUP BY dao_name, status');
    const delegates = await pool.query('SELECT dao_name, AVG(participation_rate) as avg_participation, COUNT(*) as delegate_count FROM delegates GROUP BY dao_name');
    const votes = await pool.query('SELECT dao_name, COUNT(*) as vote_count FROM voting_records GROUP BY dao_name');

    const systemPrompt = `You are a DAO governance health expert. Provide comprehensive governance health scoring.
    Structure your analysis with these sections:
    1. **Overall Governance Health Score** - Score each DAO from 0-100
    2. **Decentralization Index** - How decentralized is the governance
    3. **Participation Health** - Voter engagement and delegate activity
    4. **Proposal Quality** - Quality and diversity of proposals
    5. **Treasury Management Score** - How well is the treasury managed
    6. **Community Engagement** - Overall community health indicators
    7. **Improvement Roadmap** - Specific recommendations for each DAO
    Use letter grades (A+ to F) alongside numeric scores.`;

    const userPrompt = `Score governance health for these DAOs:

    DAOs: ${daos.rows.map(d => `${d.name} (${d.blockchain}) - Members: ${d.total_members}, Treasury: $${d.treasury_value}`).join('; ')}

    Proposal Stats: ${proposals.rows.map(p => `${p.dao_name}: ${p.count} ${p.status}`).join('; ')}

    Delegate Stats: ${delegates.rows.map(d => `${d.dao_name}: ${d.delegate_count} delegates, ${Math.round(d.avg_participation)}% avg participation`).join('; ')}

    Voting Activity: ${votes.rows.map(v => `${v.dao_name}: ${v.vote_count} votes`).join('; ')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ health_score: aiResponse.content, model: aiResponse.model, usage: aiResponse.usage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Feature 6: Proposal Sentiment Analysis
router.post('/sentiment-analysis', auth, async (req, res) => {
  try {
    const { proposal_id } = req.body;
    let proposalData;
    if (proposal_id) {
      const result = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposal_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
      proposalData = result.rows[0];
    } else {
      proposalData = req.body;
    }

    const votes = await pool.query('SELECT * FROM voting_records WHERE proposal_title = $1', [proposalData.title]);

    const systemPrompt = `You are a sentiment analysis expert for DAO governance. Analyze community sentiment around proposals.
    Structure your analysis with these sections:
    1. **Overall Sentiment** - Bullish/Bearish/Neutral with confidence level
    2. **Support Distribution** - Breakdown of support vs opposition
    3. **Key Concerns** - Main concerns raised by the community
    4. **Enthusiasm Level** - How excited the community is (1-10 scale)
    5. **Controversy Score** - How divisive is this proposal (1-10 scale)
    6. **Sentiment Drivers** - What's driving the sentiment
    7. **Forecast** - How sentiment is likely to evolve
    Use clear formatting with emojis for sentiment indicators.`;

    const userPrompt = `Analyze sentiment for this proposal:
    Title: ${proposalData.title}
    Description: ${proposalData.description}
    DAO: ${proposalData.dao_name}
    Votes For: ${proposalData.votes_for || 0}
    Votes Against: ${proposalData.votes_against || 0}
    Status: ${proposalData.status}

    Voting Details (${votes.rows.length} votes):
    ${votes.rows.map(v => `- ${v.voter_name}: "${v.vote_choice}" (Power: ${v.voting_power}) - Reason: ${v.reason || 'No reason given'}`).join('\n')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({ sentiment: aiResponse.content, model: aiResponse.model, usage: aiResponse.usage, proposal: proposalData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter, parseAIJson } = require('../openrouter');
const { getCached, setCached } = require('../middleware/aiCache');
const router = express.Router();

// ==================== NEW AI FEATURE 1: Governance Timeline ====================
// POST /api/ai/governance-timeline
// Accepts proposal_id, fetches history + voting data, returns timeline with
// momentum analysis and passage probability.
router.post('/governance-timeline', auth, async (req, res) => {
  try {
    const { proposal_id } = req.body;
    if (!proposal_id) {
      return res.status(400).json({ error: 'proposal_id is required' });
    }

    const proposalResult = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposal_id]);
    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const proposal = proposalResult.rows[0];

    const votesResult = await pool.query(
      'SELECT * FROM voting_records WHERE proposal_title = $1 ORDER BY voted_at ASC',
      [proposal.title]
    );

    const systemPrompt = `You are an expert DAO governance analyst specializing in proposal lifecycle tracking.
Analyze the proposal history and voting data to construct a timeline with momentum analysis.
Structure your response with these sections:
1. **Timeline of Events** - Chronological list of key milestones with dates
2. **Voting Momentum** - How support has built or declined over time (momentum: accelerating/decelerating/stable)
3. **Passage Probability** - Current probability of passing (percentage with confidence level)
4. **Critical Turning Points** - Events that significantly shifted the outcome
5. **Remaining Milestones** - What still needs to happen for final resolution
6. **Risk Factors** - Factors that could change the trajectory
Use clear formatting with timestamps, percentages, and directional indicators.`;

    const userPrompt = `Analyze the governance timeline for this proposal:

Proposal Details:
- Title: ${proposal.title}
- DAO: ${proposal.dao_name}
- Type: ${proposal.proposal_type}
- Status: ${proposal.status}
- Created: ${proposal.created_at}
- Votes For: ${proposal.votes_for || 0}
- Votes Against: ${proposal.votes_against || 0}
- Quorum Required: ${proposal.quorum_required || 50}%
- Proposer: ${proposal.proposer || 'Unknown'}

Voting History (${votesResult.rows.length} votes in chronological order):
${votesResult.rows.map(v => `- [${v.voted_at}] ${v.voter_name}: "${v.vote_choice}" (Power: ${v.voting_power}) - ${v.reason || 'No reason'}`).join('\n') || 'No votes recorded yet.'}`;

    const cached = await getCached(req.user.id, 'governance-timeline', { proposal_id });
    if (cached) return res.json({ ...cached, cached: true });

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      timeline: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      proposal,
      vote_count: votesResult.rows.length
    };
    await setCached(req.user.id, 'governance-timeline', { proposal_id }, result, 1800);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE 2: Delegate Network Analysis ====================
// POST /api/ai/delegate-network
// Accepts dao_id, maps delegate coalitions and centralization risks.
router.post('/delegate-network', auth, async (req, res) => {
  try {
    const { dao_id } = req.body;
    if (!dao_id) {
      return res.status(400).json({ error: 'dao_id is required' });
    }

    const daoResult = await pool.query('SELECT * FROM daos WHERE id = $1', [dao_id]);
    if (daoResult.rows.length === 0) {
      return res.status(404).json({ error: 'DAO not found' });
    }
    const dao = daoResult.rows[0];

    const delegatesResult = await pool.query(
      'SELECT * FROM delegates WHERE dao_name = $1 ORDER BY voting_power DESC',
      [dao.name]
    );

    const recentVotesResult = await pool.query(
      'SELECT * FROM voting_records WHERE dao_name = $1 ORDER BY voted_at DESC LIMIT 100',
      [dao.name]
    );

    const systemPrompt = `You are an expert in DAO governance network analysis and decentralization measurement.
Analyze the delegate network to identify coalitions and centralization risks.
Structure your response with these sections:
1. **Network Overview** - Summary of delegate distribution and voting power concentration
2. **Coalition Mapping** - Identified voting blocs and aligned delegate groups
3. **Centralization Risk Score** - Score (1-100, where 100 = fully centralized) with explanation
4. **Power Distribution** - How voting power is spread across delegates (top 10%, top 25%, etc.)
5. **Coordination Patterns** - Evidence of coordinated voting behavior
6. **Centralization Risks** - Specific risks of power concentration
7. **Decentralization Recommendations** - Concrete steps to improve governance distribution
Use Gini coefficient concepts, herfindahl index analogies, and clear risk ratings.`;

    const userPrompt = `Analyze the delegate network for DAO: ${dao.name}

DAO Details:
- Blockchain: ${dao.blockchain}
- Total Members: ${dao.total_members}
- Treasury: $${dao.treasury_value}
- Active Proposals: ${dao.active_proposals}

Delegates (${delegatesResult.rows.length} total, sorted by voting power):
${delegatesResult.rows.map(d => `- ${d.name}: Power=${d.voting_power}, Participation=${d.participation_rate}%, Reputation=${d.reputation_score}/100, Delegators=${d.delegators_count}, Proposals Created=${d.proposals_created}`).join('\n')}

Recent Voting Patterns (${recentVotesResult.rows.length} records):
${recentVotesResult.rows.slice(0, 50).map(v => `- ${v.voter_name}: "${v.vote_choice}" on "${v.proposal_title}" (Power: ${v.voting_power})`).join('\n')}`;

    const cached = await getCached(req.user.id, 'delegate-network', { dao_id });
    if (cached) return res.json({ ...cached, cached: true });

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      network_analysis: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      dao,
      delegate_count: delegatesResult.rows.length
    };
    await setCached(req.user.id, 'delegate-network', { dao_id }, result, 1800);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE 3: Proposal Similarity ====================
// POST /api/ai/proposal-similarity
// Accepts proposal text, searches historical proposals, returns similarity scores
// and outcome analysis.
router.post('/proposal-similarity', auth, async (req, res) => {
  try {
    const { proposal_text, dao_name } = req.body;
    if (!proposal_text || proposal_text.trim().length === 0) {
      return res.status(400).json({ error: 'proposal_text is required' });
    }

    const query = dao_name
      ? 'SELECT * FROM proposals WHERE dao_name = $1 ORDER BY created_at DESC LIMIT 50'
      : 'SELECT * FROM proposals ORDER BY created_at DESC LIMIT 50';
    const params = dao_name ? [dao_name] : [];
    const historicalResult = await pool.query(query, params);

    const systemPrompt = `You are an expert in DAO governance proposal analysis and similarity detection.
Compare the submitted proposal text against historical proposals to identify similarities and predict outcomes.
Structure your response with these sections:
1. **Similarity Scores** - List each similar proposal with a similarity percentage (0-100%)
2. **Thematic Clusters** - Group similar proposals into thematic categories
3. **Outcome Patterns** - How similar proposals historically fared (passed/failed rates)
4. **Key Differentiators** - What makes this proposal unique vs historical ones
5. **Outcome Prediction** - Predicted outcome based on similarity patterns
6. **Lessons Learned** - What the history of similar proposals teaches us
7. **Recommended Amendments** - Suggestions based on what made similar proposals succeed or fail
Use percentage similarity scores and clear outcome statistics.`;

    const userPrompt = `Analyze similarity of this new proposal against historical proposals:

New Proposal Text:
"${proposal_text}"

Historical Proposals (${historicalResult.rows.length} records):
${historicalResult.rows.map(p => `- [ID:${p.id}] "${p.title}" (${p.dao_name}, Status: ${p.status}, For: ${p.votes_for}, Against: ${p.votes_against}): ${p.description?.substring(0, 200)}...`).join('\n')}`;

    const cached = await getCached(req.user.id, 'proposal-similarity', { proposal_text, dao_name });
    if (cached) return res.json({ ...cached, cached: true });

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      similarity_analysis: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      historical_count: historicalResult.rows.length
    };
    await setCached(req.user.id, 'proposal-similarity', { proposal_text, dao_name }, result, 3600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE 4: Voter Education ====================
// POST /api/ai/voter-education
// Accepts proposal_id, generates ELI5, technical, and legal explainers.
router.post('/voter-education', auth, async (req, res) => {
  try {
    const { proposal_id } = req.body;
    if (!proposal_id) {
      return res.status(400).json({ error: 'proposal_id is required' });
    }

    const proposalResult = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposal_id]);
    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const proposal = proposalResult.rows[0];

    const systemPrompt = `You are an expert DAO governance educator who can explain proposals at multiple levels.
Generate three distinct explanations for the same proposal, tailored to different audiences.
Structure your response with exactly these three sections:

## 🟢 ELI5 Explanation (Explain Like I'm 5)
Write a simple, jargon-free explanation using everyday analogies. Maximum 150 words.
What does this proposal actually do in simple terms? Why does it matter to ordinary members?

## 🔵 Technical Explanation
Write a precise technical explanation for developers, engineers, and technically sophisticated voters.
Include: smart contract implications, on-chain mechanics, technical risks, integration impacts.

## 🟡 Legal & Governance Explanation
Write a governance-focused explanation covering:
- Legal and regulatory implications
- Governance precedents this sets
- Voting rights and power implications
- Compliance considerations
- Structural governance changes
- How this affects the DAO's legal standing

End with:
## ✅ Key Questions to Ask Before Voting
List 5 critical questions every voter should consider.`;

    const userPrompt = `Generate educational content for this proposal:

Title: ${proposal.title}
DAO: ${proposal.dao_name}
Type: ${proposal.proposal_type}
Status: ${proposal.status}
Description: ${proposal.description}
Votes For: ${proposal.votes_for || 0}
Votes Against: ${proposal.votes_against || 0}
Quorum Required: ${proposal.quorum_required || 50}%
Proposer: ${proposal.proposer || 'Unknown'}`;

    const cached = await getCached(req.user.id, 'voter-education', { proposal_id });
    if (cached) return res.json({ ...cached, cached: true });

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      education: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      proposal: {
        id: proposal.id,
        title: proposal.title,
        dao_name: proposal.dao_name,
        status: proposal.status
      }
    };
    await setCached(req.user.id, 'voter-education', { proposal_id }, result, 3600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE 5: Multi-DAO Comparison Dashboard ====================
// POST /api/ai/multi-dao-comparison
// Compare governance health metrics across DAOs with benchmarking and best-practice recs.
router.post('/multi-dao-comparison', auth, async (req, res) => {
  try {
    const { dao_ids } = req.body;
    if (!Array.isArray(dao_ids) || dao_ids.length < 2) {
      return res.status(400).json({ error: 'dao_ids must be an array with at least 2 entries' });
    }

    const cached = await getCached(req.user.id, 'multi-dao-comparison', { dao_ids: [...dao_ids].sort() });
    if (cached) return res.json({ ...cached, cached: true });

    const daoResult = await pool.query(
      'SELECT * FROM daos WHERE id = ANY($1::int[])',
      [dao_ids]
    );
    if (daoResult.rows.length < 2) {
      return res.status(404).json({ error: 'Could not find at least 2 of the requested DAOs' });
    }

    // Aggregate per-DAO stats
    const stats = {};
    for (const dao of daoResult.rows) {
      const props = await pool.query('SELECT status, COUNT(*) as c FROM proposals WHERE dao_name = $1 GROUP BY status', [dao.name]);
      const dels = await pool.query('SELECT AVG(participation_rate) as avg_part, COUNT(*) as cnt FROM delegates WHERE dao_name = $1', [dao.name]);
      const votes = await pool.query('SELECT COUNT(*) as c FROM voting_records WHERE dao_name = $1', [dao.name]);
      stats[dao.name] = {
        proposals_by_status: props.rows,
        delegate_count: parseInt(dels.rows[0]?.cnt || 0),
        avg_participation: Math.round(parseFloat(dels.rows[0]?.avg_part || 0)),
        total_votes: parseInt(votes.rows[0]?.c || 0),
      };
    }

    const systemPrompt = `You are an expert in DAO governance benchmarking and comparative analysis.
Compare the provided DAOs across governance dimensions and identify best practices.
Structure your response with these sections:
1. **Executive Summary** - High-level comparison overview
2. **Comparative Scorecard** - Side-by-side scoring across: decentralization, participation, treasury management, proposal velocity, community engagement (each 0-100)
3. **Best-in-Class** - Identify which DAO leads each dimension and why
4. **Common Strengths** - Patterns shared by top performers
5. **Improvement Opportunities** - Specific gaps each DAO should address
6. **Best-Practice Recommendations** - Concrete tactics each DAO can adopt from the others
7. **Benchmark Rankings** - Final overall ranking with rationale
Use percentages, scores, and clear comparative language.`;

    const userPrompt = `Compare these DAOs:\n\n${daoResult.rows.map(d => `### ${d.name}
- Blockchain: ${d.blockchain}
- Members: ${d.total_members}
- Treasury: $${d.treasury_value}
- Active Proposals: ${d.active_proposals}
- Aggregated Stats: ${JSON.stringify(stats[d.name])}
`).join('\n')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      comparison: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      dao_count: daoResult.rows.length,
      stats,
    };
    await setCached(req.user.id, 'multi-dao-comparison', { dao_ids: [...dao_ids].sort() }, result, 3600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE 6: Treasury Rebalancer Advisor ====================
// POST /api/ai/treasury-rebalancer
// AI-driven portfolio rebalancing suggestions for DAO treasuries with DeFi yield ideas.
router.post('/treasury-rebalancer', auth, async (req, res) => {
  try {
    const { dao_id, target_risk } = req.body;
    if (!dao_id) return res.status(400).json({ error: 'dao_id is required' });

    const cached = await getCached(req.user.id, 'treasury-rebalancer', { dao_id, target_risk });
    if (cached) return res.json({ ...cached, cached: true });

    const daoResult = await pool.query('SELECT * FROM daos WHERE id = $1', [dao_id]);
    if (daoResult.rows.length === 0) return res.status(404).json({ error: 'DAO not found' });
    const dao = daoResult.rows[0];

    const txResult = await pool.query(
      'SELECT * FROM treasury_transactions WHERE dao_name = $1 ORDER BY transaction_date DESC LIMIT 100',
      [dao.name]
    );

    // Aggregate token allocation
    const allocation = {};
    for (const tx of txResult.rows) {
      const sym = tx.token_symbol || 'UNKNOWN';
      const sign = ['transfer', 'grant', 'investment', 'buyback'].includes(tx.transaction_type) ? -1 : 1;
      allocation[sym] = (allocation[sym] || 0) + (Number(tx.amount || 0) * sign);
    }

    const systemPrompt = `You are a DeFi treasury portfolio strategist specializing in DAO treasury management.
Provide a comprehensive rebalancing plan with these sections:
1. **Current Portfolio Snapshot** - Concentration analysis and diversification score
2. **Risk Profile Assessment** - Current risk vs target (${target_risk || 'balanced'})
3. **Recommended Allocation** - Target percentages by asset class (stablecoins / blue-chip / governance / yield-bearing)
4. **Specific Rebalancing Actions** - Buy/sell/swap recommendations with sizing
5. **DeFi Yield Opportunities** - Specific protocols and APR estimates (Aave, Compound, Curve, Yearn, etc.)
6. **Risk Mitigations** - Hedges, insurance, multi-sig requirements
7. **Implementation Timeline** - Phased execution plan over 30/60/90 days
8. **Expected Outcomes** - Projected APR, risk score, and treasury runway extension
Use specific dollar amounts, percentages, and protocol names.`;

    const userPrompt = `Recommend treasury rebalancing for: ${dao.name}

Treasury Value: $${dao.treasury_value}
Members: ${dao.total_members}
Active Proposals: ${dao.active_proposals}
Target Risk Profile: ${target_risk || 'balanced'}

Current token allocation (net flow over recent 100 transactions):
${Object.entries(allocation).map(([sym, amt]) => `- ${sym}: ${amt}`).join('\n') || 'No transaction data'}

Recent transactions sample:
${txResult.rows.slice(0, 20).map(t => `- ${t.transaction_date}: ${t.transaction_type} ${t.amount} ${t.token_symbol} (${t.status})`).join('\n')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      rebalancing_plan: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      dao,
      current_allocation: allocation,
      transaction_count: txResult.rows.length,
    };
    await setCached(req.user.id, 'treasury-rebalancer', { dao_id, target_risk }, result, 1800);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE 7: Real-time Voting Alerts ====================
// POST /api/ai/voting-alerts
// Generate alert configurations for swing votes, quorum thresholds, whale activity.
router.post('/voting-alerts', auth, async (req, res) => {
  try {
    const { dao_id, sensitivity } = req.body;
    if (!dao_id) return res.status(400).json({ error: 'dao_id is required' });

    const cached = await getCached(req.user.id, 'voting-alerts', { dao_id, sensitivity });
    if (cached) return res.json({ ...cached, cached: true });

    const daoResult = await pool.query('SELECT * FROM daos WHERE id = $1', [dao_id]);
    if (daoResult.rows.length === 0) return res.status(404).json({ error: 'DAO not found' });
    const dao = daoResult.rows[0];

    const activeProps = await pool.query(
      `SELECT * FROM proposals WHERE dao_name = $1 AND status IN ('active', 'pending') ORDER BY created_at DESC LIMIT 25`,
      [dao.name]
    );
    const recentVotes = await pool.query(
      `SELECT * FROM voting_records WHERE dao_name = $1 ORDER BY voted_at DESC LIMIT 100`,
      [dao.name]
    );

    const systemPrompt = `You are a real-time governance monitoring specialist for DAO voting.
Generate concrete alert rules and immediate findings tailored for ${sensitivity || 'medium'} sensitivity.
Structure your response with these sections:
1. **Critical Alerts NOW** - Immediate alerts from current data (swing votes, near-quorum, whale moves)
2. **Recommended Alert Rules** - Threshold-based configurations (Quorum %, swing margin, whale threshold) with triggers
3. **Whale Activity Detection** - Largest voters and their recent actions
4. **Quorum Risk Watchlist** - Proposals close to quorum failure or overwhelming approval
5. **Sentiment Shift Detection** - Proposals where momentum has reversed
6. **Notification Channel Recommendations** - Where each alert should be routed (email/SMS/Discord/in-app)
7. **Suppression Rules** - When NOT to alert (avoid noise)
Provide each alert as a JSON-like rule with: name, condition, severity, channel.`;

    const userPrompt = `Generate voting alerts for DAO: ${dao.name}

Active proposals (${activeProps.rows.length}):
${activeProps.rows.map(p => `- "${p.title}" — For: ${p.votes_for}, Against: ${p.votes_against}, Quorum req: ${p.quorum_required}%, Status: ${p.status}`).join('\n')}

Recent voting activity (${recentVotes.rows.length}):
${recentVotes.rows.slice(0, 50).map(v => `- ${v.voted_at}: ${v.voter_name} voted "${v.vote_choice}" (Power: ${v.voting_power}) on "${v.proposal_title}"`).join('\n')}

Sensitivity level: ${sensitivity || 'medium'}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      alerts: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      dao,
      active_proposal_count: activeProps.rows.length,
      recent_vote_count: recentVotes.rows.length,
    };
    await setCached(req.user.id, 'voting-alerts', { dao_id, sensitivity }, result, 600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE 8: Governance Compliance Checker ====================
// POST /api/ai/compliance-check
// Validate proposals against DAO bylaws, legal templates, regulatory requirements.
router.post('/compliance-check', auth, async (req, res) => {
  try {
    const { proposal_id, jurisdiction } = req.body;
    if (!proposal_id) return res.status(400).json({ error: 'proposal_id is required' });

    const cached = await getCached(req.user.id, 'compliance-check', { proposal_id, jurisdiction });
    if (cached) return res.json({ ...cached, cached: true });

    const proposalResult = await pool.query('SELECT * FROM proposals WHERE id = $1', [proposal_id]);
    if (proposalResult.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
    const proposal = proposalResult.rows[0];

    const daoResult = await pool.query('SELECT * FROM daos WHERE name = $1', [proposal.dao_name]);
    const dao = daoResult.rows[0] || {};

    const systemPrompt = `You are a Web3 governance legal & compliance expert covering bylaws, securities law (US/EU/UK), AML/KYC, and DAO operational best practices.
Audit the proposal for compliance issues and structural risks.
Structure your response with these sections:
1. **Compliance Verdict** - PASS / NEEDS REVIEW / FAIL with overall confidence
2. **Bylaws Compliance** - Check against typical DAO operating agreements (quorum, notice period, conflict-of-interest, treasury limits)
3. **Regulatory Considerations** - Securities (Howey test), tax, AML, sanctions for jurisdiction: ${jurisdiction || 'US (default)'}
4. **Structural Issues** - Vague language, missing implementation details, unclear authority, missing budget caps
5. **Conflict of Interest Flags** - Proposer relationships and benefit concentration
6. **Required Amendments** - Specific changes needed before passage
7. **Documentation Gaps** - Missing references, audits, legal opinions
8. **Compliance Score** - 0-100 with breakdown
Cite generic precedent (e.g., "FinCEN guidance", "SEC v. W.J. Howey Co.") where relevant.`;

    const userPrompt = `Audit compliance for proposal:

Title: ${proposal.title}
DAO: ${proposal.dao_name} (Blockchain: ${dao.blockchain || 'unknown'}, Members: ${dao.total_members || 'unknown'})
Type: ${proposal.proposal_type}
Status: ${proposal.status}
Quorum required: ${proposal.quorum_required || 50}%
Proposer: ${proposal.proposer || 'Unknown'}
Description:
"""
${proposal.description}
"""
Target jurisdiction: ${jurisdiction || 'US (default)'}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    const result = {
      compliance_report: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      proposal,
      jurisdiction: jurisdiction || 'US',
    };
    await setCached(req.user.id, 'compliance-check', { proposal_id, jurisdiction }, result, 3600);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE: Analyze Proposal Language ====================
// Audit recommendation: stateless analyzer for proposal text quality.
// POST /api/ai/analyze-proposal-language { proposal_text, proposal_type? }
router.post('/analyze-proposal-language', auth, async (req, res) => {
  try {
    const { proposal_text, proposal_type } = req.body;
    if (!proposal_text || typeof proposal_text !== 'string') {
      return res.status(400).json({ error: 'proposal_text is required' });
    }
    if (proposal_text.length > 100000) {
      return res.status(400).json({ error: 'proposal_text too long (max 100,000 chars)' });
    }

    const systemPrompt = `You are a DAO governance writing coach. Evaluate proposal text for clarity, ambiguity, missing details, and persuasiveness. Your goal is to help proposers write proposals that members can understand and act on.
Structure your response with these sections:
1. **Clarity Score** - 0-100 with rationale
2. **Ambiguous Phrases** - Quote any vague or ambiguous wording with suggested replacements
3. **Missing Details** - Required elements that are absent (budget caps, timeline, success criteria, ownership)
4. **Persuasiveness Assessment** - Strengths and weaknesses of the argument
5. **Tone & Audience Fit** - Whether the tone fits a DAO membership audience
6. **Recommended Edits** - Specific edits to improve the proposal
7. **Rewrite Suggestion** - A short improved opening paragraph the proposer could use as a model`;

    const userPrompt = `Analyze the following DAO proposal text${proposal_type ? ` (type: ${proposal_type})` : ''}:

PROPOSAL TEXT:
"""
${proposal_text}
"""`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({
      analysis: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      proposal_type: proposal_type || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEW AI FEATURE: Auto-Generate Proposal Draft ====================
// Audit recommendation: scaffold a proposal draft from a short brief.
// POST /api/ai/auto-generate-proposal { brief, dao_name?, proposal_type?, budget?, timeline? }
router.post('/auto-generate-proposal', auth, async (req, res) => {
  try {
    const { brief, dao_name, proposal_type, budget, timeline } = req.body;
    if (!brief || typeof brief !== 'string') {
      return res.status(400).json({ error: 'brief is required' });
    }
    if (brief.length > 10000) {
      return res.status(400).json({ error: 'brief too long (max 10,000 chars)' });
    }

    const systemPrompt = `You are an expert DAO proposal writer. From a short brief, draft a complete proposal in standard DAO format.
Output sections:
1. **Title** - Concise, action-oriented title
2. **Summary** - 2-3 sentence executive summary
3. **Background** - Context for why this is needed
4. **Specification** - What will be done, by whom, with what budget and milestones
5. **Success Criteria** - Measurable outcomes
6. **Risks & Mitigations** - Top 3 risks
7. **Voting Options** - For/Against/Abstain (or ranked options if multi-choice)
8. **Open Questions** - Items that should be discussed before voting
Use clear, neutral language. Where the brief is silent on a detail, mark it as "[TBD]" rather than fabricating.`;

    const userPrompt = `Draft a DAO proposal from this brief:

DAO: ${dao_name || '[TBD]'}
Proposal Type: ${proposal_type || '[TBD]'}
Budget: ${budget || '[TBD]'}
Timeline: ${timeline || '[TBD]'}

BRIEF:
"""
${brief}
"""`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({
      draft: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      dao_name: dao_name || null,
      proposal_type: proposal_type || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Apply pass 4: DAO Summary ====================
// Closes audit gap: daos.js lacks AI endpoint.
// POST /api/ai/dao-summary { dao_id }
router.post('/dao-summary', auth, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured (OPENROUTER_API_KEY missing)' });
    }
    const { dao_id } = req.body;
    if (!dao_id) return res.status(400).json({ error: 'dao_id is required' });

    const daoResult = await pool.query('SELECT * FROM daos WHERE id = $1', [dao_id]);
    if (daoResult.rows.length === 0) return res.status(404).json({ error: 'DAO not found' });
    const dao = daoResult.rows[0];

    const propResult = await pool.query(
      'SELECT status, COUNT(*) as c FROM proposals WHERE dao_name = $1 GROUP BY status',
      [dao.name]
    );
    const delResult = await pool.query(
      'SELECT COUNT(*) as cnt, AVG(participation_rate) as avg_part FROM delegates WHERE dao_name = $1',
      [dao.name]
    );

    const systemPrompt = `You are an expert DAO governance analyst. Produce a concise health snapshot of the given DAO.
Structure your response with these sections:
1. **Health Snapshot** - Overall health rating (Excellent/Good/Fair/Poor) with rationale
2. **Treasury Outlook** - Runway and stability commentary
3. **Governance Activity** - Proposal velocity and delegate participation
4. **Key Strengths**
5. **Key Risks**
6. **Recommendations** - 3 specific next steps`;

    const userPrompt = `DAO: ${dao.name}
Blockchain: ${dao.blockchain}
Members: ${dao.total_members}
Treasury: $${dao.treasury_value}
Active Proposals: ${dao.active_proposals}

Proposals by status: ${JSON.stringify(propResult.rows)}
Delegate count: ${delResult.rows[0]?.cnt || 0}
Avg delegate participation: ${Math.round(parseFloat(delResult.rows[0]?.avg_part || 0))}%`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({
      summary: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      dao: { id: dao.id, name: dao.name },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Apply pass 4: Events Summary ====================
// Closes audit gap: events.js lacks AI endpoint.
// POST /api/ai/events-summary { dao_name?, limit? }
router.post('/events-summary', auth, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured (OPENROUTER_API_KEY missing)' });
    }
    const { dao_name, limit } = req.body;
    const lim = Math.min(Math.max(parseInt(limit || 25, 10) || 25, 1), 100);

    let eventsResult;
    try {
      if (dao_name) {
        eventsResult = await pool.query(
          'SELECT * FROM events WHERE dao_name = $1 ORDER BY created_at DESC LIMIT $2',
          [dao_name, lim]
        );
      } else {
        eventsResult = await pool.query(
          'SELECT * FROM events ORDER BY created_at DESC LIMIT $1',
          [lim]
        );
      }
    } catch (e) {
      return res.status(500).json({ error: `events table query failed: ${e.message}` });
    }

    const systemPrompt = `You are a DAO community analyst summarizing recent governance events and discussion threads.
Structure your response with these sections:
1. **Recent Activity Overview** - Volume and pace
2. **Key Themes** - Top 3-5 discussion themes
3. **Notable Events** - Most impactful items with brief context
4. **Sentiment Read** - Overall community mood
5. **Watch List** - What to monitor next`;

    const userPrompt = `Summarize these ${eventsResult.rows.length} recent DAO events${dao_name ? ` for ${dao_name}` : ''}:

${eventsResult.rows.map(e => `- [${e.created_at || e.event_date || ''}] ${e.event_type || e.type || 'event'}: ${e.title || ''} — ${(e.description || '').toString().substring(0, 200)}`).join('\n') || 'No events found.'}`;

    const aiResponse = await callOpenRouter(systemPrompt, userPrompt);
    res.json({
      summary: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      event_count: eventsResult.rows.length,
      dao_name: dao_name || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

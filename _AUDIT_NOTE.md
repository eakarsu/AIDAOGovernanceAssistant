# Audit Apply Notes — AIDAOGovernanceAssistant

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 798-838).

## Original audit recommendations

### Existing AI features (audit listed 6; actual is 14)
proposal-impact, voting-prediction, treasury-risk, delegate-recommendations,
governance-health, sentiment-analysis, governance-timeline, delegate-network,
proposal-similarity, voter-education, multi-dao-comparison, treasury-rebalancer,
voting-alerts, compliance-check.

### Missing AI counterparts
- `daos.js`, `events.js` lack AI endpoints.
- `proposals.js` lacks `/auto-generate-proposal` or
  `/analyze-proposal-language`.

### Missing non-AI features
- Blockchain integration (Ethereum, Polygon, etc.).
- Governance platform integration (Snapshot, Aragon, Tally).
- Real-time voting interface or live voting dashboard.
- Analytics of historical voting patterns.

### Custom feature suggestions
- Voter education & deliberation.
- Voter apathy prediction.
- Treasury scenario modeling.
- Delegate quality scoring.
- Governance evolution tracking.

## Implemented in this pass (mechanical)

1. `POST /api/ai/analyze-proposal-language` — closes the audit gap for
   `proposals.js` proposal-language analysis.
2. `POST /api/ai/auto-generate-proposal` — closes the audit gap for
   `proposals.js` proposal drafting.

Both stateless, added to `backend/routes/aiNew.js`, follow the existing
`callOpenRouter` + `auth` pattern. No DB writes, no schema changes.
Verified with `node --check`.

## Backlog (not implemented this pass)

### Mechanical, low-risk
- `/api/ai/dao-summary` for `daos.js` — produce a DAO health snapshot.
- `/api/ai/events-summary` for `events.js` — summarize discussions/threads.

### Needs product decision
- Voter-apathy / participation modeling (data inputs to use).
- Delegate quality scoring rubric.

### Needs credentials / external SDK
- Blockchain RPC integration (ethers, viem).
- Snapshot, Tally, Aragon API integration.

### Too risky / large refactor
- Real-time live voting dashboard (websockets / streaming infra).
- On-chain proposal submission (transaction signing).

## Apply pass 3 (frontend)

- **Status:** LEFT-AS-IS. Frontend already wires the apply-2 endpoints.
- `frontend/src/pages/AINewToolsPage.js` registers `analyze-proposal-language` and `auto-generate-proposal` (both pointing at `/ai/...`).
- JWT Bearer auth injected globally in `frontend/src/api.js` axios interceptor (reads `localStorage.token`).
- Backend mounts `routes/aiNew.js` at `/api/ai` in `backend/server.js`.
- No FE changes needed. No deps installed.

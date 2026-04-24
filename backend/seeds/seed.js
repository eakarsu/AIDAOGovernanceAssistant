const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    // Drop and recreate tables
    await client.query(`
      DROP TABLE IF EXISTS voting_records CASCADE;
      DROP TABLE IF EXISTS governance_events CASCADE;
      DROP TABLE IF EXISTS treasury_transactions CASCADE;
      DROP TABLE IF EXISTS delegates CASCADE;
      DROP TABLE IF EXISTS proposals CASCADE;
      DROP TABLE IF EXISTS daos CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create tables
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE daos (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        blockchain VARCHAR(100) DEFAULT 'Ethereum',
        governance_token VARCHAR(50),
        total_members INTEGER DEFAULT 0,
        treasury_value DECIMAL(20,2) DEFAULT 0,
        active_proposals INTEGER DEFAULT 0,
        website_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE proposals (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        dao_name VARCHAR(255),
        proposal_type VARCHAR(100) DEFAULT 'governance',
        status VARCHAR(50) DEFAULT 'active',
        votes_for INTEGER DEFAULT 0,
        votes_against INTEGER DEFAULT 0,
        quorum_required INTEGER DEFAULT 50,
        proposer VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE delegates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255),
        dao_name VARCHAR(255),
        voting_power DECIMAL(20,4) DEFAULT 0,
        participation_rate DECIMAL(5,2) DEFAULT 0,
        delegators_count INTEGER DEFAULT 0,
        proposals_voted INTEGER DEFAULT 0,
        proposals_created INTEGER DEFAULT 0,
        reputation_score INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE treasury_transactions (
        id SERIAL PRIMARY KEY,
        dao_name VARCHAR(255),
        transaction_type VARCHAR(50) DEFAULT 'transfer',
        amount DECIMAL(20,4) DEFAULT 0,
        token_symbol VARCHAR(20) DEFAULT 'ETH',
        description TEXT,
        from_address VARCHAR(255),
        to_address VARCHAR(255),
        status VARCHAR(50) DEFAULT 'completed',
        transaction_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE voting_records (
        id SERIAL PRIMARY KEY,
        proposal_title VARCHAR(500),
        voter_name VARCHAR(255),
        voter_address VARCHAR(255),
        dao_name VARCHAR(255),
        vote_choice VARCHAR(20) DEFAULT 'for',
        voting_power DECIMAL(20,4) DEFAULT 1,
        reason TEXT,
        voted_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE governance_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        dao_name VARCHAR(255),
        event_type VARCHAR(100) DEFAULT 'vote',
        event_date TIMESTAMP DEFAULT NOW(),
        impact_level VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed users
    const passwordHash = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (email, password_hash, name, role) VALUES
      ('admin@aidao.io', '${passwordHash}', 'Admin User', 'admin'),
      ('user@aidao.io', '${passwordHash}', 'Regular User', 'user');
    `);

    // Seed DAOs (15 items)
    await client.query(`
      INSERT INTO daos (name, description, blockchain, governance_token, total_members, treasury_value, active_proposals, website_url) VALUES
      ('Uniswap DAO', 'Decentralized exchange governance for the Uniswap protocol', 'Ethereum', 'UNI', 387420, 2340000000, 12, 'https://uniswap.org'),
      ('Aave DAO', 'Governance for the Aave lending and borrowing protocol', 'Ethereum', 'AAVE', 156000, 890000000, 8, 'https://aave.com'),
      ('MakerDAO', 'Governance of the Maker protocol and DAI stablecoin', 'Ethereum', 'MKR', 98500, 4200000000, 15, 'https://makerdao.com'),
      ('Compound DAO', 'Governance for the Compound lending protocol', 'Ethereum', 'COMP', 215000, 520000000, 6, 'https://compound.finance'),
      ('Arbitrum DAO', 'Layer 2 scaling solution governance', 'Arbitrum', 'ARB', 645000, 3800000000, 22, 'https://arbitrum.io'),
      ('Optimism Collective', 'Optimistic rollup governance and public goods funding', 'Optimism', 'OP', 312000, 1200000000, 18, 'https://optimism.io'),
      ('ENS DAO', 'Ethereum Name Service governance', 'Ethereum', 'ENS', 42000, 680000000, 5, 'https://ens.domains'),
      ('Lido DAO', 'Liquid staking protocol governance', 'Ethereum', 'LDO', 89000, 950000000, 9, 'https://lido.fi'),
      ('Curve DAO', 'Decentralized exchange governance for stablecoins', 'Ethereum', 'CRV', 67000, 420000000, 7, 'https://curve.fi'),
      ('Gitcoin DAO', 'Public goods funding and grants governance', 'Ethereum', 'GTC', 178000, 150000000, 11, 'https://gitcoin.co'),
      ('SushiSwap DAO', 'Community-driven DEX governance', 'Ethereum', 'SUSHI', 54000, 85000000, 4, 'https://sushi.com'),
      ('Balancer DAO', 'Automated portfolio manager and DEX governance', 'Ethereum', 'BAL', 38000, 210000000, 6, 'https://balancer.fi'),
      ('dYdX DAO', 'Decentralized derivatives exchange governance', 'Ethereum', 'DYDX', 92000, 780000000, 10, 'https://dydx.exchange'),
      ('Nouns DAO', 'On-chain NFT community governance', 'Ethereum', 'NOUN', 5200, 52000000, 3, 'https://nouns.wtf'),
      ('ApeCoin DAO', 'APE ecosystem governance and community', 'Ethereum', 'APE', 134000, 340000000, 8, 'https://apecoin.com');
    `);

    // Seed Proposals (15 items)
    await client.query(`
      INSERT INTO proposals (title, description, dao_name, proposal_type, status, votes_for, votes_against, quorum_required, proposer) VALUES
      ('Deploy Uniswap V4 on Arbitrum', 'Proposal to deploy Uniswap V4 contracts on Arbitrum for reduced gas fees and faster transactions', 'Uniswap DAO', 'protocol', 'active', 45200000, 12300000, 40, 'vitalik.eth'),
      ('Increase AAVE Safety Module Rewards', 'Increase staking rewards for the AAVE Safety Module from 550 to 850 AAVE per day', 'Aave DAO', 'treasury', 'active', 2800000, 890000, 50, 'aavechan.eth'),
      ('MakerDAO Endgame Phase 2', 'Implementation of SubDAOs and MetaDAOs as part of the Endgame plan', 'MakerDAO', 'governance', 'active', 67000, 23000, 50, 'rune.eth'),
      ('Compound III Cross-Chain Deployment', 'Deploy Compound III on Polygon and Optimism networks', 'Compound DAO', 'protocol', 'passed', 3200000, 450000, 40, 'compound-labs.eth'),
      ('ARB Staking Mechanism', 'Introduce native staking for ARB token holders with governance rewards', 'Arbitrum DAO', 'governance', 'active', 89000000, 21000000, 50, 'offchain-labs.eth'),
      ('RetroPGF Round 5 Budget', 'Allocate 30M OP tokens for Retroactive Public Goods Funding Round 5', 'Optimism Collective', 'treasury', 'active', 45000000, 8000000, 50, 'optimism-foundation.eth'),
      ('ENS Name Wrapper V2', 'Upgrade ENS Name Wrapper to V2 with improved permissions and functionality', 'ENS DAO', 'protocol', 'passed', 1200000, 180000, 40, 'nick.eth'),
      ('Lido V3 Architecture Upgrade', 'Major protocol upgrade introducing modular staking architecture', 'Lido DAO', 'protocol', 'active', 34000000, 5600000, 50, 'lido-core.eth'),
      ('Curve Lending Markets Launch', 'Launch integrated lending markets within the Curve ecosystem', 'Curve DAO', 'protocol', 'active', 12000000, 3400000, 40, 'michael.eth'),
      ('Gitcoin Grants Stack V2', 'Upgrade Grants Stack protocol for improved quadratic funding', 'Gitcoin DAO', 'protocol', 'passed', 8900000, 1200000, 50, 'kevin.eth'),
      ('SushiSwap Treasury Diversification', 'Diversify treasury holdings into stablecoins and blue-chip DeFi tokens', 'SushiSwap DAO', 'treasury', 'active', 2100000, 890000, 40, 'jared.eth'),
      ('Balancer V3 Pool Architecture', 'Implement new pool architecture with hooks and custom logic support', 'Balancer DAO', 'protocol', 'active', 5600000, 1200000, 50, 'fernando.eth'),
      ('dYdX Chain Governance Update', 'Update governance parameters for dYdX Chain including voting periods and thresholds', 'dYdX DAO', 'governance', 'passed', 15000000, 2300000, 40, 'antonio.eth'),
      ('Nouns Builder Protocol Upgrade', 'Upgrade Nouns Builder to support cross-chain DAO creation', 'Nouns DAO', 'protocol', 'active', 89, 12, 30, 'noun42.eth'),
      ('ApeCoin Staking V2 Rewards', 'Adjust staking reward distribution for ApeCoin holders and NFT stakers', 'ApeCoin DAO', 'treasury', 'rejected', 12000000, 18000000, 50, 'ape-foundation.eth');
    `);

    // Seed Delegates (15 items)
    await client.query(`
      INSERT INTO delegates (name, address, dao_name, voting_power, participation_rate, delegators_count, proposals_voted, proposals_created, reputation_score) VALUES
      ('Polychain Capital', '0x1a2b...3c4d', 'Uniswap DAO', 15200000, 95.5, 2340, 145, 12, 97),
      ('a16z Crypto', '0x5e6f...7g8h', 'Uniswap DAO', 12800000, 88.2, 1890, 132, 8, 94),
      ('Gauntlet Networks', '0x9i0j...1k2l', 'Aave DAO', 890000, 97.8, 567, 98, 22, 99),
      ('Blockchain@Columbia', '0x3m4n...5o6p', 'Compound DAO', 2100000, 92.1, 890, 78, 5, 91),
      ('StableLab', '0x7q8r...9s0t', 'MakerDAO', 45000, 96.3, 234, 156, 18, 96),
      ('Flipside Governance', '0x1u2v...3w4x', 'Aave DAO', 560000, 89.7, 345, 87, 7, 88),
      ('Penn Blockchain', '0x5y6z...7a8b', 'Uniswap DAO', 3400000, 78.9, 1230, 89, 3, 82),
      ('Treasure DAO Delegate', '0x9c0d...1e2f', 'Arbitrum DAO', 45000000, 94.2, 4560, 67, 15, 95),
      ('L2BEAT', '0x3g4h...5i6j', 'Arbitrum DAO', 23000000, 99.1, 3420, 72, 28, 98),
      ('Optimism Foundation', '0x7k8l...9m0n', 'Optimism Collective', 18000000, 100.0, 5670, 45, 32, 100),
      ('Fire Eyes DAO', '0x1o2p...3q4r', 'Optimism Collective', 8900000, 91.5, 2340, 52, 11, 92),
      ('GFX Labs', '0x5s6t...7u8v', 'MakerDAO', 67000, 87.3, 189, 134, 9, 89),
      ('DeFi Education Fund', '0x9w0x...1y2z', 'Uniswap DAO', 8900000, 82.4, 1560, 98, 6, 85),
      ('Wintermute Governance', '0x3a4b...5c6d', 'Lido DAO', 12000000, 76.8, 890, 45, 4, 78),
      ('Steakhouse Financial', '0x7e8f...9g0h', 'MakerDAO', 89000, 98.2, 456, 167, 24, 97);
    `);

    // Seed Treasury Transactions (15 items)
    await client.query(`
      INSERT INTO treasury_transactions (dao_name, transaction_type, amount, token_symbol, description, from_address, to_address, status, transaction_date) VALUES
      ('Uniswap DAO', 'grant', 500000, 'UNI', 'Uniswap Foundation quarterly operational budget', '0xDAO...Treasury', '0xUNI...Foundation', 'completed', '2024-11-15'),
      ('Aave DAO', 'transfer', 2500000, 'AAVE', 'Safety Module reward replenishment', '0xAave...Treasury', '0xSafety...Module', 'completed', '2024-11-10'),
      ('MakerDAO', 'investment', 50000000, 'DAI', 'Real World Asset investment in US Treasury bonds', '0xMaker...Treasury', '0xRWA...Vault', 'completed', '2024-11-08'),
      ('Arbitrum DAO', 'grant', 45000000, 'ARB', 'Short-term incentive program for DeFi protocols', '0xARB...Treasury', '0xSTIP...Contract', 'completed', '2024-11-05'),
      ('Optimism Collective', 'grant', 30000000, 'OP', 'RetroPGF Round 4 distribution', '0xOP...Treasury', '0xRetroPGF...Contract', 'completed', '2024-10-28'),
      ('Compound DAO', 'transfer', 1200000, 'COMP', 'Protocol development team funding', '0xCOMP...Treasury', '0xDev...Team', 'completed', '2024-10-25'),
      ('ENS DAO', 'grant', 250000, 'ENS', 'ENS ecosystem working group quarterly funding', '0xENS...Treasury', '0xWG...Multisig', 'completed', '2024-10-20'),
      ('Lido DAO', 'buyback', 5000000, 'LDO', 'Token buyback program execution', '0xLido...Treasury', '0xBuyback...Contract', 'pending', '2024-11-18'),
      ('Curve DAO', 'grant', 800000, 'CRV', 'Gauge incentive allocation for new pools', '0xCRV...Treasury', '0xGauge...Controller', 'completed', '2024-10-15'),
      ('Gitcoin DAO', 'grant', 2000000, 'GTC', 'Grants Round 19 matching pool funding', '0xGTC...Treasury', '0xGrants...Round', 'completed', '2024-10-10'),
      ('dYdX DAO', 'staking', 15000000, 'DYDX', 'Validator staking rewards distribution', '0xDYDX...Treasury', '0xStaking...Module', 'completed', '2024-10-05'),
      ('Balancer DAO', 'grant', 400000, 'BAL', 'Service provider ecosystem funding', '0xBAL...Treasury', '0xSP...Multisig', 'completed', '2024-09-30'),
      ('SushiSwap DAO', 'swap', 2000000, 'SUSHI', 'Treasury diversification into USDC', '0xSUSHI...Treasury', '0xSwap...Router', 'completed', '2024-09-25'),
      ('Nouns DAO', 'grant', 120, 'ETH', 'Nouns proliferation grant for art installation', '0xNouns...Treasury', '0xArtist...Wallet', 'completed', '2024-09-20'),
      ('ApeCoin DAO', 'transfer', 5000000, 'APE', 'ApeChain development milestone payment', '0xAPE...Treasury', '0xDev...Contract', 'pending', '2024-11-20');
    `);

    // Seed Voting Records (15 items)
    await client.query(`
      INSERT INTO voting_records (proposal_title, voter_name, voter_address, dao_name, vote_choice, voting_power, reason, voted_at) VALUES
      ('Deploy Uniswap V4 on Arbitrum', 'Polychain Capital', '0x1a2b...3c4d', 'Uniswap DAO', 'for', 15200000, 'Strong support for L2 expansion to reduce user costs', '2024-11-14'),
      ('Deploy Uniswap V4 on Arbitrum', 'a16z Crypto', '0x5e6f...7g8h', 'Uniswap DAO', 'for', 12800000, 'Arbitrum has proven ecosystem; great strategic move', '2024-11-13'),
      ('Increase AAVE Safety Module Rewards', 'Gauntlet Networks', '0x9i0j...1k2l', 'Aave DAO', 'for', 890000, 'Risk analysis shows rewards are below competitive rates', '2024-11-12'),
      ('Increase AAVE Safety Module Rewards', 'Flipside Governance', '0x1u2v...3w4x', 'Aave DAO', 'against', 560000, 'Concerned about sustainability of increased rewards', '2024-11-11'),
      ('MakerDAO Endgame Phase 2', 'StableLab', '0x7q8r...9s0t', 'MakerDAO', 'for', 45000, 'SubDAO structure will improve decentralization', '2024-11-10'),
      ('MakerDAO Endgame Phase 2', 'GFX Labs', '0x5s6t...7u8v', 'MakerDAO', 'against', 67000, 'Implementation timeline is too aggressive', '2024-11-09'),
      ('ARB Staking Mechanism', 'Treasure DAO Delegate', '0x9c0d...1e2f', 'Arbitrum DAO', 'for', 45000000, 'Staking aligns token holder incentives with governance', '2024-11-08'),
      ('ARB Staking Mechanism', 'L2BEAT', '0x3g4h...5i6j', 'Arbitrum DAO', 'for', 23000000, 'Important step for Arbitrum governance maturity', '2024-11-07'),
      ('RetroPGF Round 5 Budget', 'Optimism Foundation', '0x7k8l...9m0n', 'Optimism Collective', 'for', 18000000, 'Public goods funding is core to Optimism mission', '2024-11-06'),
      ('RetroPGF Round 5 Budget', 'Fire Eyes DAO', '0x1o2p...3q4r', 'Optimism Collective', 'for', 8900000, 'RetroPGF has proven impact; increase is justified', '2024-11-05'),
      ('Lido V3 Architecture Upgrade', 'Wintermute Governance', '0x3a4b...5c6d', 'Lido DAO', 'for', 12000000, 'Modular architecture will improve protocol flexibility', '2024-11-04'),
      ('Compound III Cross-Chain Deployment', 'Blockchain@Columbia', '0x3m4n...5o6p', 'Compound DAO', 'for', 2100000, 'Multi-chain presence is essential for protocol growth', '2024-11-03'),
      ('Deploy Uniswap V4 on Arbitrum', 'DeFi Education Fund', '0x9w0x...1y2z', 'Uniswap DAO', 'against', 8900000, 'Should prioritize Uniswap X before new deployments', '2024-11-02'),
      ('Curve Lending Markets Launch', 'Steakhouse Financial', '0x7e8f...9g0h', 'MakerDAO', 'for', 89000, 'Integrated lending will strengthen Curve ecosystem', '2024-11-01'),
      ('ENS Name Wrapper V2', 'Penn Blockchain', '0x5y6z...7a8b', 'ENS DAO', 'for', 3400000, 'V2 wrapper fixes critical permission issues', '2024-10-30');
    `);

    // Seed Governance Events (15 items)
    await client.query(`
      INSERT INTO governance_events (title, description, dao_name, event_type, event_date, impact_level, status) VALUES
      ('Uniswap V4 Deployment Vote', 'Final vote on deploying Uniswap V4 to Arbitrum chain', 'Uniswap DAO', 'vote', '2024-12-01', 'high', 'upcoming'),
      ('Aave GHO Expansion Forum', 'Community discussion on expanding GHO stablecoin to new chains', 'Aave DAO', 'forum', '2024-11-25', 'medium', 'upcoming'),
      ('MakerDAO SubDAO Launch', 'Official launch of first SubDAO under the Endgame plan', 'MakerDAO', 'launch', '2024-12-15', 'critical', 'upcoming'),
      ('Arbitrum STIP Review', 'Review of Short-term Incentive Program results and next steps', 'Arbitrum DAO', 'review', '2024-11-28', 'high', 'upcoming'),
      ('Optimism RetroPGF R5 Nominations', 'Opening of nominations for RetroPGF Round 5', 'Optimism Collective', 'nomination', '2024-12-05', 'high', 'upcoming'),
      ('ENS Governance Call #42', 'Monthly ENS governance community call', 'ENS DAO', 'call', '2024-11-22', 'low', 'upcoming'),
      ('Lido V3 Testnet Launch', 'Launch of Lido V3 on Goerli testnet for community testing', 'Lido DAO', 'launch', '2024-12-10', 'high', 'upcoming'),
      ('Curve Wars Update', 'Quarterly update on gauge weight voting and CRV emissions', 'Curve DAO', 'review', '2024-11-30', 'medium', 'upcoming'),
      ('Gitcoin GG20 Kickoff', 'Launch of Gitcoin Grants Round 20', 'Gitcoin DAO', 'launch', '2024-12-08', 'high', 'upcoming'),
      ('dYdX Chain Upgrade v4.1', 'Protocol upgrade vote for dYdX Chain improvements', 'dYdX DAO', 'vote', '2024-12-03', 'critical', 'upcoming'),
      ('Compound Treasury Report', 'Quarterly treasury and financial report presentation', 'Compound DAO', 'review', '2024-11-26', 'medium', 'completed'),
      ('Balancer V3 Audit Results', 'Public disclosure of Balancer V3 smart contract audit findings', 'Balancer DAO', 'review', '2024-11-20', 'critical', 'completed'),
      ('SushiSwap Head Chef Election', 'Community vote on new SushiSwap core team leadership', 'SushiSwap DAO', 'vote', '2024-12-12', 'high', 'upcoming'),
      ('Nouns Prop House Season 5', 'Launch of new Prop House season for community grants', 'Nouns DAO', 'launch', '2024-12-01', 'medium', 'upcoming'),
      ('ApeCoin ApeChain Mainnet', 'ApeChain mainnet launch announcement and governance transition', 'ApeCoin DAO', 'launch', '2024-12-20', 'critical', 'upcoming');
    `);

    console.log('Database seeded successfully!');
    console.log('Login credentials:');
    console.log('  Email: admin@aidao.io');
    console.log('  Password: password123');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

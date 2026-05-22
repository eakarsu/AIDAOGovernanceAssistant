const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: '/Users/erolakarsu/projects/beauty-wellness-ai/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:siDGHrdRyRhbYSsBLLswcnspJofYWwND@maglev.proxy.rlwy.net:47565/railway',
    ssl: false
});

module.exports = pool;
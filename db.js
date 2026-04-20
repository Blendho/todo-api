require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:siDGHrdRyRhbYSsBLLswcnspJofYWwND@postgres.railway.internal:5432/railway',
    ssl: false
});

module.exports = pool;
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.PG_CONNECTION || process.env.DB_URL;

console.log('PG_CONNECTION exists:', !!process.env.PG_CONNECTION);
console.log('DB_URL exists:', !!process.env.DB_URL);

const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString ? { rejectUnauthorized: false } : false
});

module.exports = pool;
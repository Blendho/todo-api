const pool = require('./db');

pool.query('SELECT 1', function(err, result) {
    if (err) {
        console.log('Connection FAILED:', err);
    } else {
        console.log('Connection SUCCESSFUL!', result.rows);
    }
});
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runRollback() {
    try {
        // Step 1: Find the last migration that ran
        const lastMigration = await pool.query(
            'SELECT * FROM migrations ORDER BY run_at DESC LIMIT 1'
        );

        if (lastMigration.rows.length === 0) {
            console.log('Nothing to roll back.');
            process.exit(0);
        }

        const lastFile = lastMigration.rows[0].filename;
        console.log(`Rolling back: ${lastFile}`);

        // Step 2: Find the matching rollback file
        const rollbackFile = lastFile; // same filename
        const rollbackPath = path.join(__dirname, 'migrations', 'rollbacks', rollbackFile);

        // Step 3: Check if rollback file exists
        if (!fs.existsSync(rollbackPath)) {
            console.log(`No rollback file found for: ${lastFile}`);
            process.exit(1);
        }

        // Step 4: Read and run the rollback SQL
        const sql = fs.readFileSync(rollbackPath, 'utf8');
        await pool.query(sql);

        // Step 5: Remove the migration record
        await pool.query(
            'DELETE FROM migrations WHERE filename = $1',
            [lastFile]
        );

        console.log(`Successfully rolled back: ${lastFile}`);
        process.exit(0);

    } catch (err) {
        console.error('Rollback failed:', err.message);
        process.exit(1);
    }
}

runRollback();
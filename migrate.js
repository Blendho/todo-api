require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigrations() {
    try {
        // Step 1: Create a migrations tracking table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id         SERIAL PRIMARY KEY,
                filename   TEXT NOT NULL UNIQUE,
                run_at     TIMESTAMP DEFAULT NOW()
            )
        `);

        // Step 2: Read all files from the migrations folder
        const migrationFolder = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationFolder)
    .filter(file => file.endsWith('.sql'))
    .sort();

        // Step 3: Loop through each migration file
        for (const file of files) {
            // Step 4: Check if this migration already ran
            const alreadyRan = await pool.query(
                'SELECT * FROM migrations WHERE filename = $1',
                [file]
            );

            if (alreadyRan.rows.length > 0) {
                console.log(`Skipping ${file} - already ran`);
                continue;
            }

            // Step 5: Read the SQL from the file
            const filePath = path.join(migrationFolder, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            // Step 6: Run the SQL
            await pool.query(sql);

            // Step 7: Record that this migration ran
            await pool.query(
                'INSERT INTO migrations (filename) VALUES ($1)',
                [file]
            );

            console.log(`Ran migration: ${file}`);
        }

        console.log('All migrations complete!');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

runMigrations();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
const envPath = path.resolve(__dirname, '../../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Prefer DATABASE_URL from loaded env, process.env fallback
const connectionString = envConfig.DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: DATABASE_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.resolve(__dirname, 'add_user_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration successful!');

        // Verify columns
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('full_name', 'organization');
        `);

        console.log('Verified columns:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();

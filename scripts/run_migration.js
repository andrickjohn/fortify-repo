const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    console.log("Connecting to database...");

    // Parse the connection string manually to handle special characters in password
    // Using simple regex or manual parsing as URL constructor failed
    let connectionString = process.env.DATABASE_URL;
    if (connectionString && connectionString.includes('@')) {
        // Just rely on pg to parse it, but maybe strip quotes if present?
        connectionString = connectionString.replace(/"/g, '');
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected.");

        const sql = fs.readFileSync(path.join(__dirname, 'add_email_draft_to_negotiations.sql'), 'utf8');
        console.log("Executing migration SQL...");
        await client.query(sql);
        console.log("Migration successful.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();

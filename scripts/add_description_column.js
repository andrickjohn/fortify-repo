require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database...');

        // Check if column exists
        const checkRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='contracts' AND column_name='description_of_purpose'
        `);

        if (checkRes.rows.length === 0) {
            console.log('Adding description_of_purpose column...');
            await client.query(`
                ALTER TABLE contracts 
                ADD COLUMN description_of_purpose TEXT;
            `);
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();

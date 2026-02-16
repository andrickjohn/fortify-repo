require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkRoles() {
    try {
        await client.connect();
        console.log('Connected to database...');

        const res = await client.query('SELECT email, role, district_id FROM users');
        console.log('User Roles:', res.rows);

    } catch (err) {
        console.error('Error checking roles:', err);
    } finally {
        await client.end();
    }
}

checkRoles();

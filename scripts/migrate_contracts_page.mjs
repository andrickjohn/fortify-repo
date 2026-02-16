
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Add page_number column if not exists
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='page_number') THEN
          ALTER TABLE contracts ADD COLUMN page_number INTEGER;
          RAISE NOTICE 'Added page_number column to contracts table.';
        ELSE
          RAISE NOTICE 'page_number column already exists.';
        END IF;
      END
      $$;
    `);

        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();

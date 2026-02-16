
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

        // Add flag_ghost
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='flag_ghost') THEN
          ALTER TABLE contracts ADD COLUMN flag_ghost BOOLEAN DEFAULT false;
          RAISE NOTICE 'Added flag_ghost column.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='is_hidden') THEN
          ALTER TABLE contracts ADD COLUMN is_hidden BOOLEAN DEFAULT false;
          RAISE NOTICE 'Added is_hidden column.';
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

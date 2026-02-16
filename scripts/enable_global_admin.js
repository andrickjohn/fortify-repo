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

        // 1. Create helper function for RLS
        await client.query(`
            CREATE OR REPLACE FUNCTION is_super_admin()
            RETURNS boolean AS $$
            BEGIN
                RETURN EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() 
                    AND role = 'super_admin'
                );
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('Created is_super_admin() function.');

        // 2. Handle 'districts' separately (uses 'id' not 'district_id')
        console.log('Updating policies for districts...');
        await client.query(`DROP POLICY IF EXISTS "district_isolation_districts" ON districts`);
        await client.query(`
            CREATE POLICY "district_isolation_districts" ON districts
            FOR ALL USING (
                is_super_admin() OR 
                id = (SELECT district_id FROM public.users WHERE id = auth.uid())
            );
        `);

        // 3. Handle other tables (use 'district_id')
        const districtTables = [
            'users',
            'vendors',
            'contracts',
            'negotiations',
            'savings_realized'
        ];

        for (const table of districtTables) {
            console.log(`Updating policies for ${table}...`);
            await client.query(`DROP POLICY IF EXISTS "district_isolation_${table}" ON ${table}`);

            await client.query(`
                CREATE POLICY "district_isolation_${table}" ON ${table}
                FOR ALL USING (
                    is_super_admin() OR 
                    district_id = (SELECT district_id FROM public.users WHERE id = auth.uid())
                );
            `);
        }

        // 4. Handle contract_line_items specifically (nested relationship)
        console.log('Updating policies for contract_line_items...');
        await client.query(`DROP POLICY IF EXISTS "district_isolation_line_items" ON contract_line_items`);
        await client.query(`
            CREATE POLICY "district_isolation_line_items" ON contract_line_items
            FOR ALL USING (
                is_super_admin() OR 
                contract_id IN (
                    SELECT id FROM contracts 
                    WHERE district_id = (SELECT district_id FROM public.users WHERE id = auth.uid())
                )
            );
        `);

        console.log('✅ RLS Policies Updated successfully for Global Admin Access.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();

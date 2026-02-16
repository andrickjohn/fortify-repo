import { createClient } from '@supabase/supabase-js';

// Note: SUPABASE_SERVICE_ROLE_KEY must be kept secret and only used in server-side contexts
// such as API routes or Server Actions. Never expose this to the client.

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

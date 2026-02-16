import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Update last_login timestamp
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', user.id)
            }
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

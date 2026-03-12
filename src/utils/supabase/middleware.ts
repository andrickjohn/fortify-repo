import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    try {
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase environment variables are missing.')
        }

        const supabase = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                    },
                },
            }
        )

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (
            !user &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/signup') &&
            !request.nextUrl.pathname.startsWith('/auth') &&
            request.nextUrl.pathname !== '/'
        ) {
            // no user, potentially respond by redirecting the user to the login page
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname === '/')) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            const redirectResponse = NextResponse.redirect(url)

            // Copy cookies from the response object (which may have updated session cookies)
            // to the redirect response to ensure the session is preserved.
            const allCookies = response.cookies.getAll()
            allCookies.forEach(cookie => redirectResponse.cookies.set(cookie))

            return redirectResponse
        }
    } catch (e) {
        // If Supabase client creation fails (e.g. invalid URL) or auth check fails,
        // proceed without blocking. The client-side might fail, but the server won't crash.
        console.warn('⚠️  Supabase middleware error:', e)
    }

    return response
}

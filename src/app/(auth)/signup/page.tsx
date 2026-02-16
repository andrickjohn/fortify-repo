'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setMessage('Please check your email to verify your account.');
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50 h-screen">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <Link href="/" className="flex items-center justify-center">
                    <div className="relative w-48 h-12">
                        <Image
                            src="/Fortify Logo.png"
                            alt="Fortify Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </Link>
                <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                    Create your account
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
                    {message ? (
                        <div className="rounded-md bg-green-50 p-4">
                            <div className="flex">
                                <div className="text-sm text-green-700">{message}</div>
                            </div>
                            <div className="mt-4 text-center">
                                <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">Back to Login</Link>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSignUp}>
                            {error && (
                                <div className="rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="text-sm text-red-700">{error}</div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium leading-6 text-gray-900"
                                >
                                    Email address
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium leading-6 text-gray-900"
                                >
                                    Password
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Creating account...' : 'Sign up'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleGoogleSignUp}
                                className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-1.5 text-sm font-semibold leading-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M12.0003 20.45c4.6667 0 8.0833-3.2083 8.0833-8.25 0-.5833-.0416-1.0416-.1666-1.5833h-7.9167v3.0833h4.625c-.2917 1.25-1.0417 2.3333-2.0417 3v1.9583l-.0133.0903 2.9248 2.2154.2052.0527c1.7917-1.6667 2.7917-4.125 2.7917-6.9167 0-.7917-.0833-1.5417-.25-2.25h-5.25c.0833-1.0417.4167-2.0417 1.0417-2.8333l-.04-1.293-2.809-2.193-.1927.0519c-1.6667 1.1667-2.6667 2.9583-2.6667 4.9583 0 1.2084.2917 2.3334.8333 3.3334l.0567.1476-1.0028 2.3551-.1205.048c-1.1667-1.7917-1.75-3.875-1.75-6.0417 0-6.0833 4.9167-11 11-11s11 4.9167 11 11-4.9167 11-11 11zm0 0"
                                        fill="#EA4335"
                                    />
                                    <path
                                        d="M12.0003 20.4501c4.6667 0 8.0833-3.2084 8.0833-8.2501 0-.5833-.0416-1.0416-.1666-1.5833h-7.9167v3.0833h4.625c-.2917 1.25-1.0417 2.3333-2.0417 3v1.9583l2.9167 2.2223c1.7917-1.6667 2.7917-4.125 2.7917-6.9167 0-.7917-.0833-1.5417-.25-2.25h-5.25c.0833-1.0417.4167-2.0417 1.0417-2.8333l-2.8333-2.2084c-1.6667 1.1667-2.6667 2.9583-2.6667 4.9583 0 1.2084.2917 2.3334.8333 3.3334l-1.0417 2.4166c-1.1667-1.7917-1.75-3.875-1.75-6.0416 0-6.0834 4.9167-11 11-11s11 4.9166 11 11-4.9167 11-11 11z"
                                        fill="#34A853"
                                        clipPath="url(#clipper-signup)"
                                    />
                                    <defs>
                                        <clipPath id="clipper-signup">
                                            <path d="M0 0h24v24H0z" />
                                        </clipPath>
                                    </defs>
                                    <path
                                        d="M12 4.75c1.75 0 3.375.625 4.625 1.7083L19.5 3.5833C17.5 1.7083 14.9167.6667 12 .6667 7.4167.6667 3.4167 3.3333 1.5 7.25l3.5 2.7083c.9167-2.6667 3.4167-4.5417 6.3333-4.5417z"
                                        fill="#EA4335"
                                    />
                                    <path
                                        d="M23.25 12.2083c0-.7916-.0833-1.5416-.25-2.25H12v4.25h6.3333c-.2916 1.5-1.125 2.7917-2.3333 3.6667l3.75 2.9167c2.1667-2.0417 3.5-5.0834 3.5-8.5834z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M5.4167 14.125c-.25-.7083-.375-1.4583-.375-2.2083s.125-1.5.375-2.2083l-3.5-2.7084C1.1667 8.5417.75 10.2083.75 12s.4167 3.4583 1.1667 5.0417l3.5-2.9167z"
                                        fill="#FBBC05"
                                    />
                                </svg>
                                <span className="text-sm font-semibold leading-6">Google</span>
                            </button>
                        </div>
                    </div>

                    <p className="mt-10 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-semibold leading-6 text-blue-600 hover:text-blue-500"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

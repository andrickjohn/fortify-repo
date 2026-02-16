import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 to-white pb-12 pt-16 lg:pb-20 lg:pt-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="mx-auto mb-8 flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full border border-blue-100 bg-white/80 px-7 py-2 shadow-sm backdrop-blur transition-all hover:border-blue-200 hover:bg-white">
                        <p className="text-sm font-semibold text-blue-700">
                            New: AI-Powered Contract Analysis
                        </p>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
                        Contract Intelligence for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Modern Schools</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-600 max-w-xl mx-auto">
                        Fortify helps school districts consolidate vendor data, analyze contract performance, and negotiate better terms—all in one secure platform.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link
                            href="/signup"
                            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-500 hover:shadow-blue-300 transition-all flex items-center gap-2"
                        >
                            Get started <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/login"
                            className="text-sm font-semibold leading-6 text-slate-700 hover:text-blue-600 transition-colors"
                        >
                            Sign in <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl opacity-30" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-200 to-indigo-200 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
            </div>
            <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)] opacity-40" aria-hidden="true">
                <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
            </div>
        </section>
    );
}

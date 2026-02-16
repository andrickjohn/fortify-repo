import Link from "next/link";
import Image from "next/image";

export function Navbar() {
    return (
        <header className="absolute inset-x-0 top-0 z-50">
            <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
                <div className="flex lg:flex-1">
                    <Link href="/" className="-m-1.5 p-1.5 flex items-center">
                        <div className="relative h-10 w-40">
                            <Image
                                src="/Fortify Logo.png"
                                alt="Fortify Logo"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>
                </div>
                <div className="flex flex-1 justify-end space-x-4">
                    <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900">
                        Log in
                    </Link>
                    <Link
                        href="/signup"
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                        Sign up
                    </Link>
                </div>
            </nav>
        </header>
    );
}

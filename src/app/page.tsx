import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Navbar } from "@/components/landing/Navbar";

export default function Home() {
  return (
    <div className="bg-white">
      <Navbar />
      <Hero />
      <Features />
      <footer className="bg-gray-50 py-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Fortify. All rights reserved.</p>
      </footer>
    </div>
  );
}

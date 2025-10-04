import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project NEO",
  description: "Simulating asteroid impact and mitigation strategies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white overflow-hidden h-screen`}>
        
        {/* Minimal Space-Style Navigation */}
        <nav className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 mt-6">
          <div className="flex items-center justify-center space-x-10">
            
            {/* Navigation Links */}
            <Link 
              href="/" 
              className="text-white hover:text-gray-300 transition-all duration-300 text-lg font-light tracking-wider uppercase"
            >
              Home
            </Link>
            
            <Link 
              href="/meteors" 
              className="text-white hover:text-gray-300 transition-all duration-300 text-lg font-light tracking-wider uppercase"
            >
              Impact Simulator
            </Link>
            
            <Link 
              href="/ai" 
              className="text-white hover:text-gray-300 transition-all duration-300 text-lg font-light tracking-wider uppercase"
            >
              Mitigation Strategies
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <div className="w-full h-full overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
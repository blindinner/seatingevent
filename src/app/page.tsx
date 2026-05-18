'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import gsap from 'gsap';

function DemoVideo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animation
    gsap.fromTo(
      containerRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.5 }
    );
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Glow behind video */}
      <div className="absolute -inset-10 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 blur-3xl rounded-full" />

      {/* Video container with rounded corners */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full max-w-[950px] h-auto"
        >
          <source src="https://res.cloudinary.com/drfqotrif/video/upload/e_accelerate:100/v1773066510/Google_Chrome_-_9_March_2026_t78dvs.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}

export default function Home() {
  const textContentRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // Animate text content in
    tl.fromTo(
      textContentRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
    // Fade in CTA
    .fromTo(
      ctaRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      '-=0.4'
    );
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a09]">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* Navigation */}
      <Header variant="transparent" />

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-28 pb-16">
        {/* Text content - centered at top */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div ref={textContentRef} className="opacity-0">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              One platform,{' '}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                any event
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/50 mb-8 leading-relaxed max-w-xl mx-auto">
              Create beautiful event pages in minutes. Seated or standing, free or paid —
              everything you need to bring people together.
            </p>
          </div>

          <div ref={ctaRef} className="opacity-0">
            <Link
              href="/create"
              className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 rounded-full transition-all duration-300 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5"
            >
              Create an event
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Demo video - large and centered below */}
        <div className="flex justify-center">
          <DemoVideo />
        </div>

        {/* Pricing Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-white/50">Only pay when you sell tickets. No monthly fees.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Standard */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Standard</h3>
                  <p className="text-white/50 text-sm">5% per ticket sold</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-5">
                Everything you need to create and sell tickets for your events.
              </p>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Beautiful event pages
                </li>
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Seat map editor
                </li>
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Dashboard & analytics
                </li>
                <li className="flex items-center gap-2.5 text-white/40">
                  <svg className="w-4 h-4 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  &quot;Powered by Rendeza&quot; shown
                </li>
              </ul>
            </div>

            {/* Branded */}
            <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/[0.05] p-6 relative">
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider bg-amber-500 text-black rounded-full">
                  Popular
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4 mt-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Your Brand</h3>
                  <p className="text-amber-400 text-sm">8% per ticket sold</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-5">
                Be the face of your events. Build recognition and grow your audience.
              </p>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Standard
                </li>
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Your logo on events & tickets
                </li>
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Emails from your brand name
                </li>
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Your own events page
                </li>
                <li className="flex items-center gap-2.5 text-white/70">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  No platform branding
                </li>
              </ul>
              <Link
                href="/brand/settings"
                className="mt-6 w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
              >
                Set up your brand
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} Rendeza. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Terms of Use
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating particles */}
      <div className="absolute top-1/4 left-10 w-2 h-2 bg-amber-400/40 rounded-full animate-float" />
      <div className="absolute top-1/3 right-20 w-1.5 h-1.5 bg-orange-400/30 rounded-full animate-float-delayed" />
      <div className="absolute bottom-1/4 left-1/4 w-1 h-1 bg-amber-300/20 rounded-full animate-float" />
      <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-orange-300/25 rounded-full animate-float-delayed" />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

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
          <source src="https://res.cloudinary.com/drfqotrif/video/upload/v1773066510/Google_Chrome_-_9_March_2026_t78dvs.mp4" type="video/mp4" />
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
      </main>

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

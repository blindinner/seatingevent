'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';

function SeatMap() {
  const rows = 10;
  const cols = 8;
  const seats = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const delay = (row * 0.05) + (col * 0.02);

      let type = 'seat-available';
      if ((row === 2 && col >= 3 && col <= 5) ||
          (row === 5 && col >= 2 && col <= 4) ||
          (row === 7 && col >= 5 && col <= 7)) {
        type = 'seat-taken';
      }
      if ((row === 4 && col >= 3 && col <= 4)) {
        type = 'seat-selected';
      }

      seats.push(
        <div
          key={index}
          className={`seat ${type}`}
          style={{ animationDelay: `${delay + 0.5}s` }}
        />
      );
    }
  }

  return <div className="seat-grid">{seats}</div>;
}

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a09]">
      {/* Animated gradient orbs */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />

      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* Navigation */}
      <Header variant="transparent" />

      {/* Hero Section */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Text content */}
          <div className="text-center lg:text-left">
            <h1 className="fade-up text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#faf9f7] mb-8 leading-[1.1]">
              Your event,{' '}
              <span className="gradient-text">every seat</span>
            </h1>

            <p className="fade-up-delay-1 text-lg sm:text-xl text-[#faf9f7]/50 mb-12 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Create beautiful event pages with interactive seat maps.
              Let your guests choose exactly where they want to be.
            </p>

            <div className="fade-up-delay-2">
              <Link
                href="/create"
                className="btn-glow inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-[#0a0a09] bg-[#faf9f7] rounded-full hover:bg-[#faf9f7]/90 transition-all duration-300 shadow-lg shadow-white/5 hover:shadow-xl hover:-translate-y-0.5"
              >
                Create an event
              </Link>
            </div>
          </div>

          {/* Right side - Phone mockup */}
          <div className="fade-up-delay-3 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow behind phone */}
              <div className="phone-glow" />

              {/* Phone frame */}
              <div className="phone-mockup">
                <div className="phone-screen">
                  {/* Event header inside phone */}
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-200/80 to-amber-600/80 float-slow" />
                      <div>
                        <div className="h-3 w-24 bg-[#faf9f7]/80 rounded" />
                        <div className="h-2 w-16 bg-[#faf9f7]/20 rounded mt-1.5" />
                      </div>
                    </div>
                    <div className="h-2 w-32 bg-[#faf9f7]/10 rounded" />
                  </div>

                  {/* Stage indicator */}
                  <div className="px-4 py-3">
                    <div className="h-8 rounded-lg bg-[#faf9f7]/5 border border-white/5 flex items-center justify-center">
                      <span className="text-[10px] text-[#faf9f7]/30 uppercase tracking-widest">Stage</span>
                    </div>
                  </div>

                  {/* Seat map */}
                  <div className="px-2">
                    <SeatMap />
                  </div>

                  {/* Bottom action */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a09] to-transparent">
                    <div className="h-10 rounded-full bg-gradient-to-r from-amber-300/90 to-amber-500/90 flex items-center justify-center float-medium shadow-lg shadow-amber-900/20">
                      <span className="text-xs text-[#0a0a09] font-medium">Select Seats</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating decorative elements */}
      <div className="absolute top-1/4 left-10 w-2 h-2 bg-amber-400/40 rounded-full float-slow" />
      <div className="absolute top-1/3 right-20 w-1.5 h-1.5 bg-amber-300/30 rounded-full float-medium" />
      <div className="absolute bottom-1/4 left-1/4 w-1 h-1 bg-amber-200/20 rounded-full float-slow" />
    </div>
  );
}

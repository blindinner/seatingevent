'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

interface HeaderProps {
  variant?: 'default' | 'transparent';
  backgroundColor?: string;
}

export function Header({ variant = 'default', backgroundColor }: HeaderProps) {
  const { user, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setDropdownOpen(false);
  };

  const navClasses = variant === 'transparent'
    ? 'fixed top-0 left-0 right-0 z-50'
    : 'sticky top-0 z-50 backdrop-blur-xl border-b border-white/[0.04]';

  const navStyle = backgroundColor
    ? { backgroundColor: `${backgroundColor}cc` }
    : undefined;

  return (
    <nav className={navClasses} style={navStyle}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-200/90 to-amber-600/90 shadow-lg shadow-amber-900/20 group-hover:shadow-xl group-hover:shadow-amber-900/30 group-hover:scale-105 transition-all duration-300" />
          <span className="text-lg font-semibold text-white tracking-tight">
            seated
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-medium text-white">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-zinc-300 max-w-[120px] truncate hidden sm:block">
                  {user.email?.split('@')[0]}
                </span>
                <svg
                  className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Signed in</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/create"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Create Event
                    </Link>
                    <Link
                      href="/my-events"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      My Events
                    </Link>
                  </div>
                  <div className="border-t border-zinc-800 py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

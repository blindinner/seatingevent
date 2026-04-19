'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { isAdminEmail } from '@/lib/admin';

interface ProfileDropdownProps {
  variant?: 'light' | 'dark';
  compact?: boolean;
}

export function ProfileDropdown({ variant = 'dark', compact = false }: ProfileDropdownProps) {
  const { user, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasThemes, setHasThemes] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDark = variant === 'dark';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user has access to any white-label themes
  useEffect(() => {
    if (!user?.email) {
      setHasThemes(false);
      return;
    }

    async function checkThemes() {
      try {
        const res = await fetch(`/api/white-label/themes?email=${encodeURIComponent(user!.email!)}`);
        if (res.ok) {
          const data = await res.json();
          setHasThemes((data.themes?.length || 0) > 0);
        }
      } catch {
        setHasThemes(false);
      }
    }

    checkThemes();
  }, [user?.email]);

  const handleSignOut = async () => {
    await signOut();
    setDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className={`w-8 h-8 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
    );
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        className={`text-sm font-medium transition-colors duration-200 ${isDark ? 'text-white/60 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`flex items-center gap-2 rounded-full transition-colors ${
          compact
            ? `px-2 py-1.5 ${isDark ? 'bg-white/10 hover:bg-white/20 border border-white/10' : 'bg-black/5 hover:bg-black/10 border border-black/10'}`
            : `px-3 py-1.5 ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50' : 'bg-black/5 hover:bg-black/10 border border-black/10'}`
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0">
          {user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        {!compact && (
          <span className={`text-sm max-w-[100px] truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {user.email?.split('@')[0]}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl overflow-hidden z-[100] ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
          <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{user.email}</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Signed in</p>
          </div>
          <div className="py-1">
            <Link
              href="/create"
              onClick={() => setDropdownOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </Link>
            <Link
              href="/my-events"
              onClick={() => setDropdownOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              My Events
            </Link>
            {hasThemes && (
              <Link
                href="/brand/settings"
                onClick={() => setDropdownOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 text-sm text-amber-400 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
                Brand Settings
              </Link>
            )}
            {isAdminEmail(user.email) && (
              <Link
                href="/admin"
                onClick={() => setDropdownOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 text-sm text-purple-400 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Admin Portal
              </Link>
            )}
          </div>
          <div className={`border-t py-1 ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
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
  );
}

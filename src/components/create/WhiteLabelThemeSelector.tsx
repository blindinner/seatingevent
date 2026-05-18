'use client';

import { useState, useEffect } from 'react';
import type { WhiteLabelTheme } from '@/types/whiteLabel';

interface WhiteLabelThemeSelectorProps {
  userEmail: string;
  selectedThemeId: string | null;
  onChange: (themeId: string | null, theme: WhiteLabelTheme | null) => void;
  isDarkMode?: boolean;
}

export function WhiteLabelThemeSelector({
  userEmail,
  selectedThemeId,
  onChange,
  isDarkMode = true,
}: WhiteLabelThemeSelectorProps) {
  const [themes, setThemes] = useState<WhiteLabelTheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchThemes() {
      if (!userEmail) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/white-label/themes?email=${encodeURIComponent(userEmail)}`);
        if (response.ok) {
          const data = await response.json();
          setThemes(data.themes || []);
        }
      } catch (error) {
        console.error('Failed to fetch white-label themes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchThemes();
  }, [userEmail]);

  // Don't render anything if user has no theme access
  if (loading) return null;
  if (themes.length === 0) return null;

  const selectedTheme = themes.find(t => t.id === selectedThemeId);

  return (
    <div className={`rounded-2xl backdrop-blur-sm border overflow-hidden ${selectedThemeId ? (isDarkMode ? 'bg-amber-500/[0.08] border-amber-500/30' : 'bg-amber-50 border-amber-200') : (isDarkMode ? 'bg-white/[0.06] border-transparent' : 'bg-black/[0.04] border-transparent')}`}>
      <div className={`px-4 py-3.5 border-b ${selectedThemeId ? (isDarkMode ? 'border-amber-500/20' : 'border-amber-200') : (isDarkMode ? 'border-white/[0.03]' : 'border-black/[0.03]')}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedThemeId ? 'bg-amber-500/20' : (isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]')}`}>
              <svg className={`w-4 h-4 ${selectedThemeId ? 'text-amber-400' : (isDarkMode ? 'text-white/40' : 'text-zinc-400')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h3 className={`text-[14px] font-medium ${isDarkMode ? 'text-white/90' : 'text-zinc-800'}`}>
                Your Brand
              </h3>
              <p className={`text-[12px] ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>
                Use your brand on this event
              </p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${selectedThemeId ? 'bg-amber-500/20 text-amber-400' : (isDarkMode ? 'bg-white/[0.08] text-white/50' : 'bg-black/[0.05] text-zinc-500')}`}>
            {selectedThemeId ? '8%' : '5%'} fee
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {/* Theme options */}
        <div className="flex flex-wrap gap-2">
          {/* Default option */}
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
              !selectedThemeId
                ? isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white'
                : isDarkMode ? 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]' : 'bg-black/[0.06] text-zinc-700 hover:bg-black/[0.1]'
            }`}
          >
            Standard
          </button>

          {/* Brand options */}
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id, theme)}
              className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
                selectedThemeId === theme.id
                  ? 'bg-amber-500 text-black'
                  : isDarkMode ? 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]' : 'bg-black/[0.06] text-zinc-700 hover:bg-black/[0.1]'
              }`}
            >
              {theme.navLogoUrl && (
                <img src={theme.navLogoUrl} alt="" className="h-4 w-auto object-contain" />
              )}
              {theme.name}
            </button>
          ))}
        </div>

        {/* Info when branded */}
        {selectedTheme && (
          <p className={`text-[12px] ${isDarkMode ? 'text-amber-200/60' : 'text-amber-700'}`}>
            Your logo and brand name will appear on this event.
          </p>
        )}
      </div>
    </div>
  );
}

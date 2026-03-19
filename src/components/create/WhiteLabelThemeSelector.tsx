'use client';

import { useState, useEffect } from 'react';
import type { WhiteLabelTheme } from '@/types/whiteLabel';

interface WhiteLabelThemeSelectorProps {
  userEmail: string;
  selectedThemeId: string | null;
  onChange: (themeId: string | null, theme: WhiteLabelTheme | null) => void;
}

export function WhiteLabelThemeSelector({
  userEmail,
  selectedThemeId,
  onChange,
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
    <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
      <div className="px-6 py-5 border-b border-white/[0.03]">
        <h3 className="text-[13px] text-white/40 uppercase tracking-wider font-medium mb-1">
          White-Label Theme
        </h3>
        <p className="text-[15px] text-white/70">
          Customize the event page branding
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Theme options */}
        <div className="flex flex-wrap gap-3">
          {/* Default option */}
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
              !selectedThemeId
                ? 'bg-white text-black'
                : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]'
            }`}
          >
            Default (Seated)
          </button>

          {/* Theme options */}
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id, theme)}
              className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                selectedThemeId === theme.id
                  ? 'bg-white text-black'
                  : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]'
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {/* Preview of selected theme */}
        {selectedTheme && (
          <div className="mt-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="flex items-center gap-4">
              <img
                src={selectedTheme.navLogoUrl}
                alt={selectedTheme.name}
                className="h-8 w-auto object-contain"
              />
              <div>
                <p className="text-[13px] text-white/60">Theme Preview</p>
                <p className="text-[14px] text-white/90">{selectedTheme.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

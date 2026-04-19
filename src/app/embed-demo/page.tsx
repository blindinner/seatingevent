'use client';

import { useState } from 'react';
import { TicketWidget, Performance, WidgetTheme } from '@/components/embed/TicketWidget';

// Demo performances data
const demoPerformances: Performance[] = [
  { id: '1', date: '2025-06-12', time: '20:00', status: 'available' },
  { id: '2', date: '2025-06-13', time: '20:00', status: 'available' },
  { id: '3', date: '2025-06-14', time: '14:00', status: 'few-left', seatsAvailable: 12 },
  { id: '4', date: '2025-06-14', time: '20:00', status: 'available' },
  { id: '5', date: '2025-06-15', time: '14:00', status: 'sold-out' },
  { id: '6', date: '2025-06-15', time: '20:00', status: 'available' },
];

// Different theme presets
const themePresets: Record<string, { name: string; theme: WidgetTheme; siteBg: string }> = {
  dark: {
    name: 'Dark (Default)',
    theme: {
      primaryColor: '#10b981',
      backgroundColor: '#1a1a1a',
    },
    siteBg: '#0a0a0a',
  },
  light: {
    name: 'Light',
    theme: {
      primaryColor: '#2563eb',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
    },
    siteBg: '#f5f5f5',
  },
  theater: {
    name: 'Classic Theater',
    theme: {
      primaryColor: '#b91c1c',
      backgroundColor: '#1c1917',
    },
    siteBg: '#0c0a09',
  },
  modern: {
    name: 'Modern Venue',
    theme: {
      primaryColor: '#8b5cf6',
      backgroundColor: '#18181b',
    },
    siteBg: '#09090b',
  },
  warm: {
    name: 'Warm & Elegant',
    theme: {
      primaryColor: '#d97706',
      backgroundColor: '#292524',
    },
    siteBg: '#1c1917',
  },
};

export default function EmbedDemoPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>('dark');
  const preset = themePresets[selectedPreset];

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: preset.siteBg }}
    >
      {/* Demo Controls */}
      <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-white text-lg font-semibold">Embed Widget Demo</h1>
              <p className="text-zinc-400 text-sm">Preview how the widget looks on different sites</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">Theme:</span>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700"
              >
                {Object.entries(themePresets).map(([key, { name }]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Theater Website */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Fake Theater Header */}
        <div className="mb-12 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#1a1a1a' : '#fff' }}
          >
            The Grand Theater
          </h2>
          <p
            className="text-lg"
            style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#666' : 'rgba(255,255,255,0.6)' }}
          >
            Est. 1923 · Downtown Arts District
          </p>
        </div>

        {/* Show Page Layout */}
        <div className="grid lg:grid-cols-[1fr,400px] gap-8 lg:gap-12">
          {/* Left - Show Info */}
          <div>
            {/* Cover Image Placeholder */}
            <div
              className="aspect-[16/9] rounded-2xl mb-8 flex items-center justify-center"
              style={{
                backgroundColor: preset.theme.backgroundColor === '#ffffff' ? '#e5e5e5' : 'rgba(255,255,255,0.05)',
              }}
            >
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={preset.theme.backgroundColor === '#ffffff' ? '#999' : 'rgba(255,255,255,0.2)'}
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <span
                  style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#999' : 'rgba(255,255,255,0.3)' }}
                >
                  Show Poster
                </span>
              </div>
            </div>

            <h1
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#1a1a1a' : '#fff' }}
            >
              The Phantom of the Opera
            </h1>

            <p
              className="text-lg mb-6 leading-relaxed"
              style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#666' : 'rgba(255,255,255,0.7)' }}
            >
              Experience Andrew Lloyd Webbers masterpiece in our newly renovated theater.
              This timeless love story continues to captivate audiences worldwide with its
              stunning music, spectacular staging, and unforgettable characters.
            </p>

            {/* Show Details */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: preset.theme.backgroundColor === '#ffffff' ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                }}
              >
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#999' : 'rgba(255,255,255,0.5)' }}
                >
                  Duration
                </p>
                <p
                  className="font-semibold"
                  style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#1a1a1a' : '#fff' }}
                >
                  2 hours 30 minutes
                </p>
              </div>
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: preset.theme.backgroundColor === '#ffffff' ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                }}
              >
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#999' : 'rgba(255,255,255,0.5)' }}
                >
                  Age Rating
                </p>
                <p
                  className="font-semibold"
                  style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#1a1a1a' : '#fff' }}
                >
                  Suitable for ages 8+
                </p>
              </div>
            </div>

            {/* Cast & Crew placeholder */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: preset.theme.backgroundColor === '#ffffff' ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
              }}
            >
              <h3
                className="font-semibold mb-3"
                style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#1a1a1a' : '#fff' }}
              >
                Cast & Creative Team
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Director', 'Music Director', 'Choreographer', 'Lead Cast'].map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: preset.theme.backgroundColor === '#ffffff' ? '#e5e5e5' : 'rgba(255,255,255,0.1)',
                      color: preset.theme.backgroundColor === '#ffffff' ? '#666' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Ticket Widget */}
          <div className="lg:sticky lg:top-24 h-fit">
            <TicketWidget
              eventId="demo-event-123"
              eventName="The Phantom of the Opera"
              performances={demoPerformances}
              venueName="The Grand Theater"
              venueLocation="123 Arts District, Downtown"
              theme={preset.theme}
            />

            {/* Embed Code Preview */}
            <div className="mt-6">
              <p
                className="text-xs font-medium mb-2"
                style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#999' : 'rgba(255,255,255,0.4)' }}
              >
                Embed Code (example)
              </p>
              <pre
                className="p-3 rounded-lg text-xs overflow-x-auto"
                style={{
                  backgroundColor: preset.theme.backgroundColor === '#ffffff' ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                  color: preset.theme.backgroundColor === '#ffffff' ? '#666' : 'rgba(255,255,255,0.5)',
                }}
              >
{`<script src="https://seated.io/embed.js"></script>
<div
  data-seated-widget
  data-event-id="abc123"
  data-theme-primary="#${preset.theme.primaryColor?.slice(1)}"
></div>`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div
        className="border-t mt-16 py-16"
        style={{
          borderColor: preset.theme.backgroundColor === '#ffffff' ? '#e5e5e5' : 'rgba(255,255,255,0.1)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-2xl font-bold mb-8 text-center"
            style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#1a1a1a' : '#fff' }}
          >
            How the Embed Works
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Compact Widget',
                desc: 'Shows on the theater website with available dates. Minimal footprint, maximum impact.',
              },
              {
                step: '2',
                title: 'Full Experience',
                desc: 'Clicking "Select Seats" opens a modal with the full seat map. No redirect needed.',
              },
              {
                step: '3',
                title: 'Seamless Checkout',
                desc: 'Complete the purchase without leaving the page. Confirmation sent via email.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: preset.theme.backgroundColor === '#ffffff' ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-4"
                  style={{
                    backgroundColor: preset.theme.primaryColor,
                    color: preset.theme.backgroundColor === '#ffffff' ? '#fff' : '#fff',
                  }}
                >
                  {item.step}
                </div>
                <h3
                  className="font-semibold mb-2"
                  style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#1a1a1a' : '#fff' }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: preset.theme.backgroundColor === '#ffffff' ? '#666' : 'rgba(255,255,255,0.6)' }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { WhiteLabelTheme } from '@/types/whiteLabel';
import type { BrandEventSummary } from '@/lib/whiteLabel';
import { BackgroundDecorations } from '@/components/event/BackgroundDecorations';

export default function BrandEventsPage() {
  const params = useParams();
  const themeSlug = params.themeSlug as string;

  const [theme, setTheme] = useState<WhiteLabelTheme | null>(null);
  const [events, setEvents] = useState<BrandEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/brand/${themeSlug}/events`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Brand not found');
          } else {
            setError('Failed to load events');
          }
          return;
        }
        const data = await res.json();
        setTheme(data.theme);
        setEvents(data.events);
      } catch (err) {
        console.error('Error fetching brand events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [themeSlug]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Get event URL (branded if slug exists, otherwise standard)
  const getEventUrl = (event: BrandEventSummary) => {
    if (event.slug) {
      return `/${themeSlug}/${event.slug}`;
    }
    return `/event/${event.shortId || event.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Not Found</h1>
          <p className="text-white/50">{error || 'This page does not exist'}</p>
        </div>
      </div>
    );
  }

  const bgColor = theme.brandColor || '#0a0a09';

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: bgColor }}>
      {/* Background Decorations */}
      <BackgroundDecorations theme={theme} />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {theme.logoDestinationUrl ? (
              <a href={theme.logoDestinationUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={theme.navLogoUrl}
                  alt={theme.name}
                  className="h-8 object-contain"
                />
              </a>
            ) : (
              <img
                src={theme.navLogoUrl}
                alt={theme.name}
                className="h-8 object-contain"
              />
            )}

            {/* Social Links */}
            {theme.socialLinks && (
              <div className="flex items-center gap-3">
                {theme.socialLinks.website && (
                  <a
                    href={theme.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  </a>
                )}
                {theme.socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${theme.socialLinks.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {theme.socialLinks.twitter && (
                  <a
                    href={`https://twitter.com/${theme.socialLinks.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Upcoming Events</h1>
          <p className="text-white/50">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No upcoming events</h2>
            <p className="text-white/50">Check back soon for new events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={getEventUrl(event)}
                className="group block rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all"
              >
                {/* Cover Image */}
                <div className="aspect-[4/5] relative overflow-hidden">
                  {event.coverImageUrl ? (
                    <img
                      src={event.coverImageUrl}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: event.themeColor || '#1c1917' }}
                    >
                      <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Date Badge */}
                  <div className="absolute top-3 left-3">
                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                      <div className="text-xs font-medium text-white">
                        {formatDate(event.startDate)}
                      </div>
                      {event.startTime && (
                        <div className="text-[10px] text-white/60">
                          {formatTime(event.startTime)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Type Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-black/60 backdrop-blur-sm text-white/80 rounded-full capitalize">
                      {event.eventType === 'ga' ? 'GA' : 'Seated'}
                    </span>
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2 group-hover:text-white/90 transition-colors">
                    {event.name}
                  </h3>

                  {event.location && (
                    <div className="flex items-center gap-1.5 text-sm text-white/50">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className="line-clamp-1">{event.location.split(',')[0]}</span>
                    </div>
                  )}

                  {event.hostedBy && (
                    <div className="mt-2 text-sm text-white/40">
                      Hosted by {event.hostedBy}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={theme.navLogoUrl}
                alt={theme.name}
                className="h-6 object-contain opacity-50"
              />
            </div>
            <div className="text-sm text-white/30">
              Powered by Seated
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

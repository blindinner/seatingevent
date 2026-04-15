'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import type { PublicEvent } from '@/types/event';
import type { MapData } from '@/types/map';
import { SeatMapViewer } from '@/components/event/SeatMapViewer';
import { TicketSelector } from '@/components/event/TicketSelector';
import { BackgroundDecorations } from '@/components/event/BackgroundDecorations';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { subscribeToEventSeats } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePageView } from '@/hooks/usePageView';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { useTranslation } from '@/lib/translations';

// Helper to determine if a color is light or dark based on luminance
function isLightColor(hex: string): boolean {
  // Remove # if present
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Adaptive cover image that handles portrait, landscape, and square images
function AdaptiveCoverImage({ src, alt }: { src: string; alt: string }) {
  const [aspectType, setAspectType] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      // Square if aspect ratio is between 0.9 and 1.1
      if (ratio >= 0.9 && ratio <= 1.1) {
        setAspectType('square');
      } else if (img.width > img.height) {
        setAspectType('landscape');
      } else {
        setAspectType('portrait');
      }
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  const aspectClass = {
    portrait: 'aspect-[4/5]',
    landscape: 'aspect-[16/10]',
    square: 'aspect-square',
  }[aspectType];

  return (
    <div className={loaded ? aspectClass : 'aspect-[4/5]'}>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 object-cover`}
      />
    </div>
  );
}

interface EventClientProps {
  event: PublicEvent;
  mapData: MapData | null;
}

export function EventClient({ event, mapData }: EventClientProps) {
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const {
    selectedSeats,
    selectedTickets,
    getTotalPrice,
    getTotalTickets,
    clearSelection,
    clearTickets,
    deselectSeat
  } = useSeatSelectionStore();
  const { user } = useAuth();

  // Determine if user has selected something (seats or GA tickets)
  const hasSelection = event.eventType === 'seated'
    ? selectedSeats.length > 0
    : getTotalTickets() > 0;

  const totalPrice = getTotalPrice();
  const isFreeEvent = totalPrice === 0 && hasSelection;

  // Check if current user is the event owner
  const isOwner = user?.id === event.userId;

  // Track page view for analytics
  usePageView(event.id);

  // Translations
  const { t, isRtl, dir } = useTranslation(event.language);

  // Determine if the theme is dark or light based on background color
  const themeColor = event.themeColor || '#1a1a19';
  const isDarkMode = useMemo(() => !isLightColor(themeColor), [themeColor]);

  // Live seat status - fetched client-side for real-time accuracy
  // Source of truth: bookings table via /api/events/[id]/seats
  const [liveSeatStatus, setLiveSeatStatus] = useState<Record<string, string>>(event.seatStatus || {});

  // Live ticket availability for GA events
  const [ticketTiers, setTicketTiers] = useState(event.ticketTiers || []);

  // Use ref to access current selectedSeats in async callback without triggering re-renders
  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  // Fetch seat status from API (single source of truth)
  const fetchSeatStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.id}/seats`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        const newStatus = data.seatStatus || {};

        // Deselect any seats that were just sold by someone else
        const currentSelected = selectedSeatsRef.current.map(s => s.seatId);
        for (const seatId of currentSelected) {
          if (newStatus[seatId] === 'sold') {
            deselectSeat(seatId);
          }
        }

        setLiveSeatStatus(newStatus);
      }
    } catch (error) {
      console.error('Failed to fetch seat status:', error);
    }
  }, [event.id, deselectSeat]);

  // Fetch ticket availability for GA events
  const fetchTicketAvailability = useCallback(async () => {
    if (event.eventType !== 'ga') return;

    try {
      const res = await fetch(`/api/events/${event.id}/tickets`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setTicketTiers(data.tiers || []);
      }
    } catch (error) {
      console.error('Failed to fetch ticket availability:', error);
    }
  }, [event.id, event.eventType]);

  // Initial fetch + realtime subscription + smart polling
  useEffect(() => {
    // Initial fetch
    fetchSeatStatus();
    fetchTicketAvailability();

    // Subscribe to realtime booking changes (watches bookings table)
    const channel = subscribeToEventSeats(event.id, () => {
      // Refetch when any booking changes
      fetchSeatStatus();
      fetchTicketAvailability();
    });

    // Smart polling: only poll when tab is visible (saves API calls/costs)
    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!pollInterval) {
        pollInterval = setInterval(() => {
          fetchSeatStatus();
          fetchTicketAvailability();
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    // Start polling only if tab is currently visible
    if (document.visibilityState === 'visible') {
      startPolling();
    }

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSeatStatus(); // Immediate refresh when coming back
        fetchTicketAvailability();
        startPolling();    // Resume polling
      } else {
        stopPolling();     // Stop polling when tab hidden
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      channel.unsubscribe();
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [event.id, fetchSeatStatus, fetchTicketAvailability]);

  // Parse date for display
  const parseDateInfo = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      fullDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    };
  };

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const startDateInfo = parseDateInfo(event.startDate);
  const startTimeStr = formatTime(event.startTime);
  const endTimeStr = formatTime(event.endTime);

  // Theme - themeColor already defined above for isDarkMode calculation
  const themeFont = event.themeFont || 'default';
  const fontClass = themeFont === 'serif' ? 'font-serif' : themeFont === 'mono' ? 'font-mono' : 'font-sans';
  const accentColor = event.accentColor || null;

  // Determine if accent color needs dark text (for light accent colors)
  const needsDarkText = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const buttonTextColor = accentColor && needsDarkText(accentColor) ? '#000' : accentColor ? '#fff' : 'black';

  const handleGetTickets = () => {
    if (hasSelection) {
      setCheckoutModalOpen(true);
    }
  };

  const handlePaymentSuccess = () => {
    // Clear the selection after successful payment/registration
    clearSelection();
    clearTickets();
    // Immediately refetch availability to show updated counts
    fetchSeatStatus();
    fetchTicketAvailability();
  };

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: themeColor }} dir={dir}>
      {/* Background decorations - uses white-label theme if available */}
      <BackgroundDecorations theme={event.whiteLabelTheme} />

      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b ${isDarkMode ? 'border-white/[0.04]' : 'border-black/[0.04]'}`} style={{ backgroundColor: `${themeColor}cc` }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          {event.whiteLabelTheme?.logoDestinationUrl ? (
            <a href={event.whiteLabelTheme.logoDestinationUrl} className="group" target="_blank" rel="noopener noreferrer">
              <img
                src={event.whiteLabelTheme.navLogoUrl}
                alt={event.whiteLabelTheme.name}
                className="max-h-10 w-auto group-hover:scale-105 transition-all duration-300"
              />
            </a>
          ) : (
            <Link href="/" className="group">
              {event.whiteLabelTheme?.navLogoUrl ? (
                <img
                  src={event.whiteLabelTheme.navLogoUrl}
                  alt={event.whiteLabelTheme.name}
                  className="max-h-10 w-auto group-hover:scale-105 transition-all duration-300"
                />
              ) : (
                <NextImage
                  src="/logo.png"
                  alt="Seated"
                  width={168}
                  height={168}
                  className="max-h-10 w-auto group-hover:scale-105 transition-all duration-300"
                />
              )}
            </Link>
          )}
          <div className="flex items-center gap-4">
            {/* Owner Dashboard Link */}
            {isOwner && (
              <Link
                href={`/event/${event.id}/dashboard`}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${isDarkMode ? 'text-white/70 hover:text-white bg-white/[0.08] hover:bg-white/[0.12]' : 'text-zinc-700 hover:text-zinc-900 bg-black/[0.05] hover:bg-black/[0.08]'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                Dashboard
              </Link>
            )}
            {/* Show selection summary in nav when seats selected (seated events only) */}
            {event.eventType === 'seated' && selectedSeats.length > 0 && (
              <>
                <span className={`hidden sm:inline text-[14px] ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>
                  {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} · {formatCurrency(totalPrice, event.currency)}
                </span>
                <button
                  onClick={handleGetTickets}
                  className="h-10 px-6 text-[14px] font-semibold rounded-full transition-colors"
                  style={{
                    backgroundColor: accentColor || 'white',
                    color: buttonTextColor,
                  }}
                >
                  {t('getTickets')}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-6 lg:px-8 py-8 lg:py-12 pb-32">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column - Cover Image */}
          <div className="w-full lg:w-[340px] flex-shrink-0 space-y-5">
            {/* Cover Image - Adapts to portrait or landscape */}
            <div className={`relative rounded-3xl overflow-hidden backdrop-blur-sm border border-transparent ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
              {event.coverImageUrl ? (
                <AdaptiveCoverImage src={event.coverImageUrl} alt={event.name} />
              ) : (
                <div className="aspect-[4/5] flex flex-col items-center justify-center p-8 text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 ${isDarkMode ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`}>
                    <svg className={`w-10 h-10 ${isDarkMode ? 'text-white/20' : 'text-zinc-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <p className={`text-[15px] mb-1 ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>No cover image</p>
                </div>
              )}
            </div>

            {/* Selection Summary - Only show when seats selected (Desktop) */}
            {selectedSeats.length > 0 && (
              <div className={`hidden lg:block rounded-2xl backdrop-blur-sm border border-transparent overflow-hidden ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                <div className={`p-5 border-b ${isDarkMode ? 'border-white/[0.03]' : 'border-black/[0.03]'}`}>
                  <h3 className={`text-[15px] font-medium ${isDarkMode ? 'text-white/70' : 'text-zinc-700'}`}>Your Selection</h3>
                </div>
                <div className="p-5 space-y-3 max-h-56 overflow-y-auto">
                  {selectedSeats.map((seat) => (
                    <div key={seat.seatId} className="flex justify-between text-[14px]">
                      <span className={isDarkMode ? 'text-white/80' : 'text-zinc-800'}>{seat.label}</span>
                      <span className={isDarkMode ? 'text-white/60' : 'text-zinc-600'}>{formatCurrency(seat.price, event.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className={`p-5 border-t ${isDarkMode ? 'border-white/[0.03]' : 'border-black/[0.03]'}`}>
                  <div className="flex justify-between text-[17px] font-semibold mb-4">
                    <span className={isDarkMode ? 'text-white' : 'text-zinc-900'}>Total</span>
                    <span className={isDarkMode ? 'text-white' : 'text-zinc-900'}>{formatCurrency(getTotalPrice(), event.currency)}</span>
                  </div>
                  <button
                    onClick={handleGetTickets}
                    className="w-full py-3.5 text-[15px] font-semibold rounded-full transition-colors"
                    style={{
                      backgroundColor: accentColor || 'white',
                      color: buttonTextColor,
                    }}
                  >
                    {t('getTickets')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex-1 space-y-6">
            {/* Event Name */}
            <div>
              <h1 className={`text-[1.75rem] sm:text-[2rem] md:text-[2.5rem] lg:text-[3rem] font-bold tracking-tight leading-tight break-words ${fontClass} ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                {event.name}
              </h1>
            </div>

            {/* Date/Time - Luma style with date widget */}
            <div className="flex items-start gap-5">
              {/* Date Widget */}
              <div className={`w-16 h-16 rounded-xl backdrop-blur-sm flex flex-col items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-white/[0.08]' : 'bg-black/[0.05]'}`}>
                <span className={`text-[11px] uppercase tracking-wider font-medium ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>{startDateInfo.month}</span>
                <span className={`text-[24px] font-bold leading-none ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{startDateInfo.day}</span>
              </div>
              {/* Date Details */}
              <div className="flex-1 pt-1">
                <p className={`text-[17px] font-medium ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{startDateInfo.fullDate}</p>
                <p className={`text-[15px] mt-1 ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>
                  {startTimeStr}{endTimeStr ? ` - ${endTimeStr}` : ''}
                </p>
              </div>
            </div>

            {/* Location - Luma style */}
            {event.location && (
              <div className="flex items-start gap-5">
                {/* Location Icon */}
                <div className={`w-16 h-16 rounded-xl backdrop-blur-sm flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-white/[0.08]' : 'bg-black/[0.05]'}`}>
                  <svg className={`w-6 h-6 ${isDarkMode ? 'text-white/60' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                {/* Location Details */}
                <div className="flex-1 pt-1">
                  <p className={`text-[17px] font-medium ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{event.location.split(',')[0]}</p>
                  {event.location.includes(',') && (
                    <p className={`text-[15px] mt-1 ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>{event.location.split(',').slice(1).join(',').trim()}</p>
                  )}
                </div>
              </div>
            )}

            {/* Hosted By */}
            {event.hostedBy && (
              <div className="flex items-start gap-5">
                {/* Host Icon */}
                <div className={`w-16 h-16 rounded-xl backdrop-blur-sm flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-white/[0.08]' : 'bg-black/[0.05]'}`}>
                  <svg className={`w-6 h-6 ${isDarkMode ? 'text-white/60' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                {/* Host Details */}
                <div className="flex-1 pt-1">
                  <p className={`text-[13px] uppercase tracking-wider font-medium ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('hostedBy')}</p>
                  <p className={`text-[17px] font-medium mt-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{event.hostedBy}</p>
                  {/* Social Links */}
                  {event.whiteLabelTheme?.socialLinks && (
                    <SocialLinks links={event.whiteLabelTheme.socialLinks} className="mt-3" iconSize="sm" />
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className={`rounded-2xl backdrop-blur-sm border border-transparent overflow-hidden ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                <div className="px-6 py-5">
                  <h3 className={`text-[13px] uppercase tracking-wider font-medium mb-3 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('aboutEvent')}</h3>
                  <p
                    className={`text-[16px] leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-white/90' : 'text-zinc-800'}`}
                    dir={event.descriptionRtl ? 'rtl' : 'ltr'}
                  >
                    {event.description}
                  </p>
                </div>
              </div>
            )}

            {/* Location Map */}
            {event.location && event.locationLat && event.locationLng && (
              <div className={`rounded-2xl backdrop-blur-sm border border-transparent overflow-hidden ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                <div className="px-6 py-5">
                  <h3 className={`text-[13px] uppercase tracking-wider font-medium mb-1 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('location')}</h3>
                  <p className={`text-[16px] ${isDarkMode ? 'text-white/90' : 'text-zinc-800'}`}>{event.location}</p>
                </div>
                <div className="relative">
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}&z=15&output=embed`}
                    className="w-full h-56 border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}

            {/* Seat Map */}
            {event.eventType === 'seated' && mapData && (
              <div className={`rounded-2xl overflow-hidden backdrop-blur-sm border border-transparent ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-white/[0.03]' : 'border-black/[0.03]'}`}>
                  <h3 className={`text-[13px] uppercase tracking-wider font-medium mb-1 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>Select Your Seats</h3>
                  <p className={`text-[15px] ${isDarkMode ? 'text-white/70' : 'text-zinc-600'}`}>Click on a seat to select it</p>
                </div>
                <SeatMapViewer
                  mapData={mapData}
                  currency={event.currency}
                  backgroundColor={themeColor}
                  compact={true}
                  height="h-[420px]"
                  seatStatus={liveSeatStatus}
                  accentColor={accentColor || undefined}
                />
              </div>
            )}

            {/* Ticket Tiers for GA events */}
            {event.eventType === 'ga' && event.ticketTiers && (
              <div className={`rounded-2xl overflow-hidden backdrop-blur-sm border border-transparent ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-white/[0.03]' : 'border-black/[0.03]'}`}>
                  <h3 className={`text-[13px] uppercase tracking-wider font-medium mb-1 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>Tickets</h3>
                  <p className={`text-[15px] ${isDarkMode ? 'text-white/70' : 'text-zinc-600'}`}>Select your tickets</p>
                </div>
                <div className="p-6">
                  <TicketSelector tiers={ticketTiers} currency={event.currency} isDarkMode={isDarkMode} />

                  {/* Get Tickets button - appears when tickets selected */}
                  {getTotalTickets() > 0 && (
                    <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className={`text-[14px] ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>
                            {getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''} selected
                          </p>
                          <p className={`text-[20px] font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                            {isFreeEvent ? 'Free' : formatCurrency(totalPrice, event.currency)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleGetTickets}
                        className="w-full py-4 text-[16px] font-semibold rounded-full transition-colors"
                        style={{
                          backgroundColor: accentColor || 'white',
                          color: buttonTextColor,
                        }}
                      >
                        {isFreeEvent ? t('register') : t('getTickets')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No map placeholder */}
            {event.eventType === 'seated' && !mapData && (
              <div className={`rounded-2xl backdrop-blur-sm border border-dashed p-10 text-center ${isDarkMode ? 'bg-white/[0.06] border-white/10' : 'bg-black/[0.04] border-black/10'}`}>
                <svg className={`w-14 h-14 mx-auto mb-4 ${isDarkMode ? 'text-white/20' : 'text-zinc-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <p className={`text-[16px] ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>No seat map available</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Fixed Footer - Only for seated events */}
      {event.eventType === 'seated' && (
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t p-4 ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/10'}`}>
          <div className="flex items-center justify-between">
            <div>
              {selectedSeats.length > 0 ? (
                <>
                  <p className={`text-[12px] ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>
                    {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className={`text-[16px] font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                    {formatCurrency(totalPrice, event.currency)}
                  </p>
                </>
              ) : (
                <p className={`text-[14px] ${isDarkMode ? 'text-white/70' : 'text-zinc-600'}`}>
                  Select seats to continue
                </p>
              )}
            </div>
            <button
              onClick={handleGetTickets}
              disabled={selectedSeats.length === 0}
              className="h-11 px-6 text-[14px] font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: accentColor || 'white',
                color: buttonTextColor,
              }}
            >
              {t('getTickets')}
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => {
          setCheckoutModalOpen(false);
          setCheckoutError(null);
          // Refetch availability when modal closes to ensure counts are current
          fetchSeatStatus();
          fetchTicketAvailability();
        }}
        eventId={event.id}
        eventName={event.name}
        eventDate={startDateInfo.fullDate}
        eventTime={startTimeStr}
        selectedSeats={selectedSeats}
        selectedTickets={selectedTickets}
        totalPrice={totalPrice}
        currency={event.currency}
        themeColor={themeColor}
        onSuccess={handlePaymentSuccess}
        error={checkoutError}
        whiteLabelTheme={event.whiteLabelTheme}
        language={event.language}
      />
    </div>
  );
}

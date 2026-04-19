'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TicketWidgetModal } from './TicketWidgetModal';

// Types for the embed configuration
export interface Performance {
  id: string;
  date: string; // ISO date string
  time: string; // HH:mm format
  status: 'available' | 'few-left' | 'sold-out';
  seatsAvailable?: number;
}

export interface WidgetTheme {
  primaryColor?: string;   // Button/accent color
  textColor?: string;      // Text color
  backgroundColor?: string; // Widget background
  borderRadius?: string;   // Border radius
  fontFamily?: string;     // Font override
}

export interface TicketWidgetProps {
  // Event data
  eventId: string;
  eventName: string;
  performances: Performance[];

  // Optional venue info
  venueName?: string;
  venueLocation?: string;

  // Theming
  theme?: WidgetTheme;

  // Callbacks
  onSelectPerformance?: (performance: Performance) => void;

  // API endpoint for fetching full event data (for the modal)
  apiEndpoint?: string;
}

// Helper to check if a color is light
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Format date for display
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    full: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

// Format time for display
function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function TicketWidget({
  eventId,
  eventName,
  performances,
  venueName,
  venueLocation,
  theme = {},
  onSelectPerformance,
  apiEndpoint,
}: TicketWidgetProps) {
  const [selectedPerformance, setSelectedPerformance] = useState<Performance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Theme defaults
  const primaryColor = theme.primaryColor || '#10b981';
  const textColor = theme.textColor || '#ffffff';
  const backgroundColor = theme.backgroundColor || '#1a1a1a';
  const borderRadius = theme.borderRadius || '16px';
  const fontFamily = theme.fontFamily || 'inherit';

  const isDark = !isLightColor(backgroundColor);
  const buttonTextColor = isLightColor(primaryColor) ? '#000' : '#fff';

  // Show max 4 performances initially, with "View all" option
  const [showAll, setShowAll] = useState(false);
  const visiblePerformances = showAll ? performances : performances.slice(0, 4);

  const handleSelectPerformance = (performance: Performance) => {
    if (performance.status === 'sold-out') return;
    setSelectedPerformance(performance);
    onSelectPerformance?.(performance);
  };

  const handleOpenModal = () => {
    if (selectedPerformance) {
      setModalOpen(true);
    }
  };

  return (
    <>
      <div
        className="overflow-hidden"
        style={{
          backgroundColor,
          borderRadius,
          fontFamily,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
        >
          <h3
            className="text-[15px] font-semibold"
            style={{ color: isDark ? '#fff' : '#1a1a1a' }}
          >
            Select Performance
          </h3>
          {venueName && (
            <p
              className="text-[13px] mt-1"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
            >
              {venueName}
            </p>
          )}
        </div>

        {/* Performance Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {visiblePerformances.map((performance) => {
              const dateInfo = formatDate(performance.date);
              const timeStr = formatTime(performance.time);
              const isSelected = selectedPerformance?.id === performance.id;
              const isSoldOut = performance.status === 'sold-out';

              return (
                <button
                  key={performance.id}
                  onClick={() => handleSelectPerformance(performance)}
                  disabled={isSoldOut}
                  className="text-left p-3 rounded-xl transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? `${primaryColor}20`
                      : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.04)',
                    border: `2px solid ${isSelected ? primaryColor : 'transparent'}`,
                    opacity: isSoldOut ? 0.4 : 1,
                    cursor: isSoldOut ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div
                    className="text-[14px] font-medium"
                    style={{ color: isDark ? '#fff' : '#1a1a1a' }}
                  >
                    {dateInfo.weekday}, {dateInfo.month} {dateInfo.day}
                  </div>
                  <div
                    className="text-[13px] mt-0.5"
                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                  >
                    {timeStr}
                  </div>
                  <div
                    className="text-[11px] mt-1.5 font-medium"
                    style={{
                      color:
                        performance.status === 'few-left'
                          ? '#f59e0b'
                          : isSoldOut
                          ? '#ef4444'
                          : '#10b981',
                    }}
                  >
                    {isSoldOut
                      ? 'Sold out'
                      : performance.status === 'few-left'
                      ? 'Few left'
                      : 'Available'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* View All button */}
          {performances.length > 4 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-3 py-2 text-[13px] font-medium rounded-lg transition-colors"
              style={{
                color: primaryColor,
                backgroundColor: `${primaryColor}10`,
              }}
            >
              View all {performances.length} dates
            </button>
          )}
        </div>

        {/* Footer with CTA */}
        <div
          className="px-4 pb-4"
        >
          <button
            onClick={handleOpenModal}
            disabled={!selectedPerformance}
            className="w-full py-3.5 text-[15px] font-semibold rounded-xl transition-all"
            style={{
              backgroundColor: selectedPerformance ? primaryColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: selectedPerformance ? buttonTextColor : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              cursor: selectedPerformance ? 'pointer' : 'not-allowed',
            }}
          >
            {selectedPerformance ? 'Select Seats' : 'Select a date to continue'}
          </button>

          {/* Powered by badge */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <span
              className="text-[11px]"
              style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
            >
              Powered by
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
            >
              Seated
            </span>
          </div>
        </div>
      </div>

      {/* Modal Portal */}
      {mounted && modalOpen && selectedPerformance && createPortal(
        <TicketWidgetModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          eventId={eventId}
          eventName={eventName}
          performance={selectedPerformance}
          theme={theme}
          apiEndpoint={apiEndpoint}
        />,
        document.body
      )}
    </>
  );
}

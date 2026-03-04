'use client';

import { useEffect, useRef } from 'react';

// Generate a visitor ID that persists across sessions
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  const storageKey = 'luma_visitor_id';
  let visitorId = localStorage.getItem(storageKey);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(storageKey, visitorId);
  }

  return visitorId;
}

export function usePageView(eventId: string) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (hasTracked.current) return;
    hasTracked.current = true;

    const visitorId = getVisitorId();
    if (!visitorId) return;

    // Track page view
    fetch(`/api/events/${eventId}/views`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorId,
        referrer: document.referrer || null,
      }),
    }).catch((error) => {
      // Silently fail - analytics shouldn't break the page
      console.error('Failed to track page view:', error);
    });
  }, [eventId]);
}

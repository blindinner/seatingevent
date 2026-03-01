import type { PublicEventResponse, HoldResponse, ReleaseResponse, CheckoutResponse } from '../types';

export class ApiClient {
  private baseUrl: string;
  private sessionId: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    const storageKey = 'seat_map_session_id';
    let sessionId = sessionStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(storageKey, sessionId);
    }
    return sessionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async fetchEvent(eventId: string): Promise<PublicEventResponse> {
    const response = await fetch(`${this.baseUrl}/api/public/events/${eventId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to fetch event: ${response.status}`);
    }

    return response.json();
  }

  async holdSeats(eventId: string, seatIds: string[]): Promise<HoldResponse> {
    const response = await fetch(`${this.baseUrl}/api/public/events/${eventId}/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seatIds,
        sessionId: this.sessionId,
      }),
    });

    return response.json();
  }

  async releaseSeats(eventId: string, holdId?: string): Promise<ReleaseResponse> {
    const response = await fetch(`${this.baseUrl}/api/public/events/${eventId}/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holdId,
        sessionId: holdId ? undefined : this.sessionId,
      }),
    });

    return response.json();
  }

  async createCheckout(
    eventId: string,
    holdId: string,
    seatIds: string[],
    options?: {
      customerEmail?: string;
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<CheckoutResponse> {
    const response = await fetch(`${this.baseUrl}/api/public/events/${eventId}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holdId,
        seatIds,
        customerEmail: options?.customerEmail,
        successUrl: options?.successUrl,
        cancelUrl: options?.cancelUrl,
      }),
    });

    return response.json();
  }
}

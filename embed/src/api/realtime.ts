import type { SeatStatusInfo } from '../types';

type StatusChangeCallback = (seatStatuses: Record<string, SeatStatusInfo>) => void;

/**
 * Realtime subscription for seat status changes
 * Uses polling as a simple, dependency-free solution
 * Can be upgraded to WebSocket/SSE later
 */
export class RealtimeClient {
  private eventId: string;
  private baseUrl: string;
  private callback: StatusChangeCallback | null = null;
  private pollInterval: number | null = null;
  private pollIntervalMs = 3000; // Poll every 3 seconds

  constructor(baseUrl: string, eventId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.eventId = eventId;
  }

  subscribe(callback: StatusChangeCallback): void {
    this.callback = callback;
    this.startPolling();
  }

  unsubscribe(): void {
    this.stopPolling();
    this.callback = null;
  }

  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = window.setInterval(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/public/events/${this.eventId}`);
        if (response.ok) {
          const data = await response.json();
          if (this.callback && data.seatStatuses) {
            this.callback(data.seatStatuses);
          }
        }
      } catch (error) {
        console.warn('Realtime poll failed:', error);
      }
    }, this.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Force an immediate refresh
  async refresh(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/public/events/${this.eventId}`);
      if (response.ok) {
        const data = await response.json();
        if (this.callback && data.seatStatuses) {
          this.callback(data.seatStatuses);
        }
      }
    } catch (error) {
      console.warn('Realtime refresh failed:', error);
    }
  }
}

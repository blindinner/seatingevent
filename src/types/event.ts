export interface TicketTier {
  id: string;
  name: string;
  price: number; // 0 = free
  quantity: number; // -1 = unlimited
  description?: string;
}

export interface EmailSettings {
  subject?: string;        // Default: "Your tickets for {{eventName}}"
  greeting?: string;       // Default: "You're going!"
  bodyText?: string;       // Default: "Your tickets are confirmed"
  footerText?: string;     // Default: "Questions? Reply to this email or contact the event organizer."
}

export type EventType = 'ga' | 'seated';
export type EventLanguage = 'en' | 'he';

export interface CreateEventInput {
  name: string;
  description?: string;
  descriptionRtl?: boolean; // Right-to-left text direction for description
  hostedBy?: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  coverImageUrl?: string;
  eventType: EventType;
  ticketTiers?: TicketTier[];
  currency: string;
  themeColor?: string;
  themeFont?: string;
  accentColor?: string;
  requireApproval: boolean;
  sendQrCode?: boolean; // Whether to include QR code in confirmation emails (free events only)
  isDemo?: boolean; // Demo events show full checkout flow but don't process payments
  language?: EventLanguage; // Event page language (en = English, he = Hebrew with RTL)
  mapId?: string;
  userId: string;
  whiteLabelThemeId?: string;
  slug?: string; // Custom URL slug for branded events (only with white-label theme)
}

import type { WhiteLabelTheme } from './whiteLabel';

export interface PublicEvent {
  id: string;
  shortId: string | null;
  slug: string | null; // Custom URL slug for branded events
  name: string;
  description: string | null;
  descriptionRtl: boolean; // Right-to-left text direction for description
  hostedBy: string | null;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  coverImageUrl: string | null;
  eventType: EventType;
  ticketTiers: TicketTier[] | null;
  currency: string;
  themeColor: string | null;
  themeFont: string | null;
  accentColor: string | null;
  requireApproval: boolean;
  sendQrCode: boolean; // Whether to include QR code in confirmation emails (free events only)
  isDemo: boolean; // Demo events show full checkout flow but don't process payments
  language: EventLanguage; // Event page language (en = English, he = Hebrew with RTL)
  mapId: string | null;
  userId: string;
  createdAt: string;
  seatStatus: Record<string, string>; // seatId -> status (e.g., "sold:orderId")
  emailSettings?: EmailSettings;
  whiteLabelThemeId: string | null;
  whiteLabelTheme?: WhiteLabelTheme;
}

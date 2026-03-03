export interface TicketTier {
  id: string;
  name: string;
  price: number; // in cents, 0 = free
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

export interface CreateEventInput {
  name: string;
  description?: string;
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
  requireApproval: boolean;
  mapId?: string;
  userId: string;
}

export interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
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
  requireApproval: boolean;
  mapId: string | null;
  userId: string;
  createdAt: string;
  seatStatus: Record<string, string>; // seatId -> status (e.g., "sold:orderId")
  emailSettings?: EmailSettings;
}

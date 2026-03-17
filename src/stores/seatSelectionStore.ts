import { create } from 'zustand';
import type { CategoryConfig } from '@/types/map';

export interface SelectedSeat {
  seatId: string;
  label: string;
  category: string;
  price: number;
}

export interface SelectedTicket {
  tierId: string;
  tierName: string;
  quantity: number;
  price: number; // per ticket
}

interface SeatSelectionState {
  // Seat selection (for seated events)
  selectedSeats: SelectedSeat[];

  // Ticket selection (for GA events)
  selectedTickets: SelectedTicket[];

  // Actions
  selectSeat: (seatId: string, label: string, category: string, price: number) => void;
  deselectSeat: (seatId: string) => void;
  toggleSeat: (seatId: string, label: string, category: string, price: number) => void;
  isSeatSelected: (seatId: string) => boolean;
  clearSelection: () => void;

  // Ticket actions (for GA events)
  setTicketQuantity: (tierId: string, tierName: string, quantity: number, price: number) => void;
  getTicketQuantity: (tierId: string) => number;
  clearTickets: () => void;

  // Computed values
  getTotalPrice: () => number;
  getTotalSeats: () => number;
  getTotalTickets: () => number;
}

export const useSeatSelectionStore = create<SeatSelectionState>()((set, get) => ({
  selectedSeats: [],
  selectedTickets: [],

  selectSeat: (seatId, label, category, price) => {
    const { selectedSeats } = get();
    // Don't add if already selected
    if (selectedSeats.some(s => s.seatId === seatId)) return;

    set({
      selectedSeats: [...selectedSeats, { seatId, label, category, price }],
    });
  },

  deselectSeat: (seatId) => {
    set({
      selectedSeats: get().selectedSeats.filter(s => s.seatId !== seatId),
    });
  },

  toggleSeat: (seatId, label, category, price) => {
    const { selectedSeats } = get();
    const isSelected = selectedSeats.some(s => s.seatId === seatId);

    if (isSelected) {
      set({
        selectedSeats: selectedSeats.filter(s => s.seatId !== seatId),
      });
    } else {
      set({
        selectedSeats: [...selectedSeats, { seatId, label, category, price }],
      });
    }
  },

  isSeatSelected: (seatId) => {
    return get().selectedSeats.some(s => s.seatId === seatId);
  },

  clearSelection: () => {
    set({ selectedSeats: [] });
  },

  setTicketQuantity: (tierId, tierName, quantity, price) => {
    const { selectedTickets } = get();
    const existingIndex = selectedTickets.findIndex(t => t.tierId === tierId);

    if (quantity <= 0) {
      // Remove ticket if quantity is 0 or less
      set({
        selectedTickets: selectedTickets.filter(t => t.tierId !== tierId),
      });
    } else if (existingIndex >= 0) {
      // Update existing ticket
      const updated = [...selectedTickets];
      updated[existingIndex] = { tierId, tierName, quantity, price };
      set({ selectedTickets: updated });
    } else {
      // Add new ticket
      set({
        selectedTickets: [...selectedTickets, { tierId, tierName, quantity, price }],
      });
    }
  },

  getTicketQuantity: (tierId) => {
    const ticket = get().selectedTickets.find(t => t.tierId === tierId);
    return ticket?.quantity || 0;
  },

  clearTickets: () => {
    set({ selectedTickets: [] });
  },

  getTotalPrice: () => {
    const { selectedSeats, selectedTickets } = get();
    const seatTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
    const ticketTotal = selectedTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0);
    return seatTotal + ticketTotal;
  },

  getTotalSeats: () => {
    return get().selectedSeats.length;
  },

  getTotalTickets: () => {
    return get().selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  },
}));

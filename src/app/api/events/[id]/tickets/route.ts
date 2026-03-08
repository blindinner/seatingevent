import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Get ticket availability for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Get event ticket tiers
    const { data: event, error: eventError } = await supabaseAdmin.client
      .from('events')
      .select('ticket_tiers')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const ticketTiers = event.ticket_tiers || [];

    // Get all paid bookings for this event
    const { data: bookings, error: bookingsError } = await supabaseAdmin.client
      .from('bookings')
      .select('metadata')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Calculate sold tickets per tier
    const soldByTier: Record<string, number> = {};

    for (const booking of bookings || []) {
      const tickets = (booking.metadata as { tickets?: Array<{ tierId: string; quantity: number }> })?.tickets || [];
      for (const ticket of tickets) {
        soldByTier[ticket.tierId] = (soldByTier[ticket.tierId] || 0) + ticket.quantity;
      }
    }

    // Calculate remaining for each tier
    const tiersWithAvailability = ticketTiers.map((tier: { id: string; quantity: number; [key: string]: unknown }) => {
      const sold = soldByTier[tier.id] || 0;
      const remaining = tier.quantity === -1 ? -1 : Math.max(0, tier.quantity - sold);

      return {
        ...tier,
        sold,
        remaining,
      };
    });

    return NextResponse.json({
      tiers: tiersWithAvailability,
      soldByTier,
    });
  } catch (error) {
    console.error('Error getting ticket availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

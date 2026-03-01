import { NextRequest, NextResponse } from 'next/server';
import { sendTicketEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Test endpoint - remove in production
export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get('booking_id');

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
  }

  // Get booking with event details
  const { data: booking, error: bookingError } = await supabaseAdmin.client
    .from('bookings')
    .select(`
      *,
      events:event_id (
        name,
        start_date,
        start_time,
        location
      )
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const event = booking.events as { name: string; start_date: string; start_time: string; location: string };
  const seatDetails = (booking.metadata?.seats as Array<{ label: string; category: string }>) || [];

  const result = await sendTicketEmail({
    to: booking.customer_email,
    customerName: booking.customer_name || 'Guest',
    eventName: event.name,
    eventDate: event.start_date,
    eventTime: event.start_time || undefined,
    eventLocation: event.location || undefined,
    seats: seatDetails,
    ticketCode: booking.ticket_code || 'N/A',
    totalAmount: booking.amount_paid,
    currency: booking.currency,
  });

  if (result.success) {
    // Update ticket_sent_at
    await supabaseAdmin.client
      .from('bookings')
      .update({ ticket_sent_at: new Date().toISOString() })
      .eq('id', bookingId);

    return NextResponse.json({
      success: true,
      message: `Email sent to ${booking.customer_email}`,
      ticketCode: booking.ticket_code,
    });
  }

  return NextResponse.json({
    success: false,
    error: result.error
  }, { status: 500 });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Verify a ticket code
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing ticket code' }, { status: 400 });
  }

  try {
    // Find the booking by ticket code
    const { data: booking, error } = await supabaseAdmin.client
      .from('bookings')
      .select(`
        id,
        ticket_code,
        customer_name,
        customer_email,
        seat_ids,
        seat_count,
        amount_paid,
        currency,
        payment_status,
        checked_in_at,
        event_id,
        metadata
      `)
      .eq('ticket_code', code.toUpperCase())
      .single();

    if (error || !booking) {
      return NextResponse.json({
        valid: false,
        error: 'Ticket not found'
      }, { status: 404 });
    }

    // Check if payment was successful
    if (booking.payment_status !== 'paid') {
      return NextResponse.json({
        valid: false,
        error: 'Ticket payment not completed',
        status: booking.payment_status
      }, { status: 400 });
    }

    // Get event details
    const { data: event } = await supabaseAdmin.client
      .from('events')
      .select('id, name, start_date, start_time, location')
      .eq('id', booking.event_id)
      .single();

    // Get seat details from metadata
    const seats = (booking.metadata?.seats as Array<{ label: string; category: string }>) || [];

    return NextResponse.json({
      valid: true,
      ticket: {
        code: booking.ticket_code,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        seatCount: booking.seat_count,
        seats: seats.map(s => s.label),
        checkedInAt: booking.checked_in_at,
        isCheckedIn: !!booking.checked_in_at,
      },
      event: event ? {
        id: event.id,
        name: event.name,
        date: event.start_date,
        time: event.start_time,
        location: event.location,
      } : null,
    });
  } catch (error) {
    console.error('Verify ticket error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Check in a ticket
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing ticket code' }, { status: 400 });
    }

    // Find the booking
    const { data: booking, error: fetchError } = await supabaseAdmin.client
      .from('bookings')
      .select('id, ticket_code, payment_status, checked_in_at')
      .eq('ticket_code', code.toUpperCase())
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({
        success: false,
        error: 'Ticket not found'
      }, { status: 404 });
    }

    // Check if payment was successful
    if (booking.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Ticket payment not completed'
      }, { status: 400 });
    }

    // Check if already checked in
    if (booking.checked_in_at) {
      return NextResponse.json({
        success: false,
        error: 'Ticket already checked in',
        checkedInAt: booking.checked_in_at
      }, { status: 409 });
    }

    // Mark as checked in
    const checkedInAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin.client
      .from('bookings')
      .update({ checked_in_at: checkedInAt })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Check-in update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check in'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checkedInAt,
      message: 'Guest checked in successfully'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

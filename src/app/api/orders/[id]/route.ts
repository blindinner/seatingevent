import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the order
    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get event details
    const { data: event } = await supabaseAdmin.client
      .from('events')
      .select('name, start_date, start_time, location')
      .eq('id', order.eventId)
      .single();

    // Format the response
    const seats = (order.metadata?.seats as Array<{ label: string; category: string; price: number }>) || [];

    return NextResponse.json({
      id: order.id,
      eventId: order.eventId,
      eventName: event?.name || 'Event',
      eventDate: event?.start_date || '',
      eventTime: event?.start_time || null,
      eventLocation: event?.location || null,
      customerName: order.customerName || '',
      customerEmail: order.customerEmail || '',
      seats: seats,
      totalAmount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      ticketCode: order.ticketCode,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

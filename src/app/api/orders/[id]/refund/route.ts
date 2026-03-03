import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAllPayConfig, processRefund } from '@/lib/payments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Get user from cookies
    const cookieHeader = request.headers.get('cookie');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieHeader || '',
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin.client
      .from('bookings')
      .select('*, events!inner(user_id, seat_status)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify the user owns the event
    if (order.events.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already refunded
    if (order.payment_status === 'refunded') {
      return NextResponse.json({ error: 'Order already refunded' }, { status: 400 });
    }

    // Check if order was paid
    if (order.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Can only refund paid orders' }, { status: 400 });
    }

    // Get the AllPay order ID (stored in idempotency_key)
    const allpayOrderId = order.idempotency_key;

    if (!allpayOrderId) {
      return NextResponse.json({ error: 'No payment reference found' }, { status: 400 });
    }

    // Process the refund through AllPay
    const config = getAllPayConfig();
    const refundResult = await processRefund(config, {
      orderId: allpayOrderId,
    });

    if (!refundResult.success) {
      return NextResponse.json(
        { error: refundResult.error || 'Refund failed' },
        { status: 500 }
      );
    }

    // Update order status to refunded
    await supabaseAdmin.client
      .from('bookings')
      .update({ payment_status: 'refunded' })
      .eq('id', orderId);

    // Release the seats
    const seatIds = order.seat_ids || [];
    if (seatIds.length > 0) {
      const currentSeatStatus = order.events.seat_status || {};
      const newSeatStatus = { ...currentSeatStatus };

      // Remove sold status for refunded seats
      for (const seatId of seatIds) {
        delete newSeatStatus[seatId];
      }

      await supabaseAdmin.client
        .from('events')
        .update({ seat_status: newSeatStatus })
        .eq('id', order.event_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

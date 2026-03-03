import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath, revalidateTag } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAllPayConfig, processRefund } from '@/lib/payments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

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
    const eventId = order.event_id;

    console.log('Refund: Processing seat release', {
      orderId,
      eventId,
      seatIds,
    });

    if (seatIds.length > 0) {
      // Fetch FRESH seat_status to avoid race conditions
      // (the one from the order JOIN might be stale)
      const { data: freshEvent, error: freshError } = await supabaseAdmin.client
        .from('events')
        .select('seat_status')
        .eq('id', eventId)
        .single();

      if (freshError) {
        console.error('Refund: Failed to fetch fresh seat_status', freshError);
        // Fall back to the one from the order
      }

      const currentSeatStatus = (freshEvent?.seat_status || order.events.seat_status || {}) as Record<string, string>;
      const newSeatStatus = { ...currentSeatStatus };

      console.log('Refund: Current seat_status keys', Object.keys(currentSeatStatus));

      // Remove sold status for refunded seats
      for (const seatId of seatIds) {
        if (newSeatStatus[seatId]) {
          console.log(`Refund: Removing seat ${seatId} with status ${newSeatStatus[seatId]}`);
          delete newSeatStatus[seatId];
        } else {
          console.log(`Refund: Seat ${seatId} not found in seat_status`);
        }
      }

      console.log('Refund: New seat_status keys', Object.keys(newSeatStatus));

      const { error: updateError } = await supabaseAdmin.client
        .from('events')
        .update({ seat_status: newSeatStatus })
        .eq('id', eventId);

      if (updateError) {
        console.error('Refund: Failed to update seat_status', updateError);
      } else {
        console.log('Refund: Successfully updated seat_status');
      }

      // Invalidate caches so seat status is fresh
      revalidatePath(`/event/${eventId}`);
      revalidatePath(`/event/${eventId}/dashboard`);
      // Also revalidate API routes (though API routes with no-store should not be cached)
      revalidatePath(`/api/events/${eventId}/seats`);
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

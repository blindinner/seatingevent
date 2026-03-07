import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAllPayConfig, processRefund } from '@/lib/payments';
import { recordRefundTransactions, getFeeConfig } from '@/lib/financial';

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
      .select('*, events!inner(user_id)')
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

    // Record refund transactions in the ledger (with 5% refund fee)
    try {
      const refundAmount = order.amount_paid || 0;
      const originalPlatformFee = order.platform_fee_amount || (refundAmount * 0.10);
      const feeConfig = await getFeeConfig(order.event_id);

      const { refundBreakdown } = await recordRefundTransactions({
        bookingId: orderId,
        eventId: order.event_id,
        organizerId: order.events.user_id,
        refundAmount,
        currency: order.currency || 'ILS',
        originalPlatformFee,
        refundFeePercent: feeConfig.refundFeePercent,
        allpayOrderId: allpayOrderId,
        reason: 'Full refund initiated by organizer',
        initiatedBy: user.id,
      });

      console.log('Refund transactions recorded:', {
        orderId,
        grossRefund: refundBreakdown.grossRefund,
        refundFee: refundBreakdown.refundFee,
        customerReceives: refundBreakdown.customerRefund,
        platformRetained: refundBreakdown.platformRetained,
      });
    } catch (refundTrackingError) {
      // Log but don't fail - refund was already processed
      console.error('Error recording refund transactions:', refundTrackingError);
    }

    // Seats are automatically released because:
    // - The booking is now 'refunded' status
    // - The seats API only counts 'paid' bookings as sold
    // - The seats will show as available on the next API fetch

    // Invalidate page cache so the event page shows updated availability
    revalidatePath(`/event/${order.event_id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, type WebhookPayload } from '@/lib/payments';
import { updateOrderByPaymentId, getOrderByPaymentId } from '@/lib/orders';
import { reserveSeatsForOrder, releaseSeats } from '@/lib/seats';
import { sendTicketEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const body = await request.json();
    const payload = body as WebhookPayload;

    console.log('AllPay webhook received:', {
      order_id: payload.order_id,
      status: payload.status,
      amount: payload.amount,
      transaction_uid: payload.transaction_uid,
      card_brand: payload.card_brand,
      card_mask: payload.card_mask,
      receipt: payload.receipt,
    });

    // Get API key for signature verification
    const apiKey = process.env.ALLPAY_API_KEY;
    if (!apiKey) {
      console.error('ALLPAY_API_KEY not configured');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // Verify the webhook signature
    const { sign, ...payloadWithoutSign } = payload;
    const isValid = verifyWebhookSignature(payloadWithoutSign, sign, apiKey);

    if (!isValid) {
      console.error('Invalid webhook signature for order:', payload.order_id);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Extract data from payload
    const paymentOrderId = payload.order_id;
    // AllPay may send status as string '1' or number 1
    const isPaid = payload.status === '1' || payload.status === 1;
    const eventId = payload.add_field_1;
    const seatIds: string[] = payload.add_field_2 ? JSON.parse(payload.add_field_2) : [];

    if (isPaid) {
      // Payment successful
      console.log('Payment successful for order:', paymentOrderId);
      console.log('AllPay transaction_uid:', payload.transaction_uid);

      // Update order status with AllPay transaction data
      const order = await updateOrderByPaymentId(paymentOrderId, {
        status: 'paid',
        // Store AllPay transaction UID as the primary payment identifier
        transactionId: payload.transaction_uid || payload.receipt || `${payload.card_brand}_${payload.card_mask}`,
      });

      // Reserve the seats in the event
      if (order && eventId && seatIds.length > 0) {
        await reserveSeatsForOrder(eventId, seatIds, order.id);
        console.log('Seats reserved for order:', order.id);
      }

      // Send confirmation email with ticket
      const customerEmail = payload.client_email || order?.customerEmail;
      console.log('Email check:', { hasOrder: !!order, customerEmail, eventId, ticketCode: order?.ticketCode });

      if (order && customerEmail && eventId) {
        try {
          // Fetch event details
          const { data: event } = await supabaseAdmin.client
            .from('events')
            .select('name, start_date, start_time, location')
            .eq('id', eventId)
            .single();

          if (event) {
            // Get seat details from order metadata
            const seatDetails = (order.metadata?.seats as Array<{ label: string; category: string }>) ||
              seatIds.map(id => ({ label: id, category: 'General' }));

            const emailResult = await sendTicketEmail({
              to: customerEmail,
              customerName: payload.client_name || order.customerName || 'Guest',
              eventName: event.name,
              eventDate: event.start_date,
              eventTime: event.start_time || undefined,
              eventLocation: event.location || undefined,
              seats: seatDetails,
              ticketCode: order.ticketCode || 'N/A',
              totalAmount: order.totalAmount,
              currency: order.currency,
            });

            if (emailResult.success) {
              // Update ticket_sent_at
              await supabaseAdmin.client
                .from('bookings')
                .update({ ticket_sent_at: new Date().toISOString() })
                .eq('id', order.id);
              console.log('Ticket email sent to:', customerEmail);
            } else {
              console.error('Failed to send ticket email:', emailResult.error);
            }
          }
        } catch (emailError) {
          console.error('Error sending ticket email:', emailError);
          // Don't fail the webhook if email fails
        }
      }
    } else {
      // Payment failed or cancelled
      console.log('Payment failed/cancelled for order:', paymentOrderId);

      // Update order status
      await updateOrderByPaymentId(paymentOrderId, {
        status: 'failed',
      });

      // Release any locked seats
      if (eventId && seatIds.length > 0) {
        // Extract lock ID from the payment order ID pattern
        const order = await getOrderByPaymentId(paymentOrderId);
        if (order) {
          // The lock ID would have been set during checkout, but we can release by event/seats
          console.log('Would release seats for failed order:', order.id);
        }
      }
    }

    // AllPay expects a 200 response to confirm receipt
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent AllPay from retrying
    // Log the error for investigation
    return NextResponse.json({
      success: true,
      warning: 'Processing error logged',
    });
  }
}

// AllPay may send GET requests to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'allpay-webhook' });
}

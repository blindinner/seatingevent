import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyWebhookSignature, type WebhookPayload } from '@/lib/payments';
import { updateOrderByPaymentId, getOrderByPaymentId } from '@/lib/orders';
import { reserveSeatsForOrder, releaseSeats } from '@/lib/seats';
import { sendTicketEmail, sendOwnerNotificationEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  recordPaymentTransactions,
  updateBookingWithFees,
  getFeeConfig,
} from '@/lib/financial';

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

      // Check if order already has a ticket code (from success redirect)
      const existingOrder = await getOrderByPaymentId(paymentOrderId);

      // Only update transactionId if AllPay provides a real one (not card fallback)
      const updateData: { status: 'paid'; transactionId?: string; ticketCode?: string } = { status: 'paid' };
      if (payload.transaction_uid) {
        updateData.transactionId = payload.transaction_uid;
      } else if (payload.receipt) {
        updateData.transactionId = payload.receipt;
      }

      // Generate ticket code only if success redirect hasn't done it yet (fallback)
      if (!existingOrder?.ticketCode) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        updateData.ticketCode = code;
        console.log('[Webhook] Generated fallback ticket code:', code);
      }

      const order = await updateOrderByPaymentId(paymentOrderId, updateData);

      // Calculate and record platform fee (10%)
      if (order && eventId) {
        try {
          // Get organizer ID from event for transaction tracking
          const { data: eventData } = await supabaseAdmin.client
            .from('events')
            .select('user_id')
            .eq('id', eventId)
            .single();

          const feeConfig = await getFeeConfig(eventId);
          const { feeBreakdown } = await recordPaymentTransactions({
            bookingId: order.id,
            eventId: eventId,
            organizerId: eventData?.user_id,
            grossAmount: order.totalAmount,
            currency: order.currency,
            allpayTransactionId: payload.transaction_uid || payload.receipt,
            allpayOrderId: paymentOrderId,
            feeConfig,
          });

          // Update booking with fee breakdown
          await updateBookingWithFees(order.id, feeBreakdown);

          console.log('Financial tracking recorded:', {
            orderId: order.id,
            organizerId: eventData?.user_id,
            grossAmount: feeBreakdown.grossAmount,
            platformFee: feeBreakdown.platformFee,
            organizerAmount: feeBreakdown.organizerAmount,
            feePercent: feeConfig.platformFeePercent,
          });
        } catch (feeError) {
          // Log but don't fail the webhook - payment is still valid
          console.error('Error recording financial tracking:', feeError);
        }
      }

      // Reserve the seats in the event
      if (order && eventId && seatIds.length > 0) {
        await reserveSeatsForOrder(eventId, seatIds, order.id);
        console.log('Seats reserved for order:', order.id);

        // Invalidate the event page cache so seat status is fresh
        revalidatePath(`/event/${eventId}`);
        console.log('Cache invalidated for event:', eventId);
      }

      // Send confirmation email with ticket
      const customerEmail = payload.client_email || order?.customerEmail;
      console.log('Email check:', { hasOrder: !!order, customerEmail, eventId, ticketCode: order?.ticketCode });

      if (order && customerEmail && eventId) {
        try {
          // Fetch event details with owner info and email settings
          const { data: event } = await supabaseAdmin.client
            .from('events')
            .select('name, start_date, start_time, location, user_id, email_settings')
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
              emailSettings: event.email_settings || undefined,
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

            // Send notification to event owner
            if (event.user_id) {
              try {
                // Get owner email
                const { data: ownerProfile } = await supabaseAdmin.client
                  .from('profiles')
                  .select('email, full_name')
                  .eq('id', event.user_id)
                  .single();

                // Fallback: try auth.users if profiles doesn't have email
                let ownerEmail = ownerProfile?.email;
                if (!ownerEmail) {
                  const { data: authUser } = await supabaseAdmin.client.auth.admin.getUserById(event.user_id);
                  ownerEmail = authUser?.user?.email;
                }

                if (ownerEmail) {
                  // Get order count for this event
                  const { count } = await supabaseAdmin.client
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', eventId)
                    .eq('payment_status', 'paid');

                  await sendOwnerNotificationEmail({
                    to: ownerEmail,
                    ownerName: ownerProfile?.full_name || undefined,
                    eventName: event.name,
                    customerName: payload.client_name || order.customerName || 'Guest',
                    customerEmail: customerEmail,
                    seats: seatDetails,
                    totalAmount: order.totalAmount,
                    currency: order.currency,
                    ticketCode: order.ticketCode || 'N/A',
                    orderCount: count || 1,
                  });
                }
              } catch (ownerEmailError) {
                console.error('Error sending owner notification:', ownerEmailError);
                // Don't fail the webhook if owner email fails
              }
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

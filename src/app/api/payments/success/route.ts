import { NextRequest, NextResponse } from 'next/server';
import { getOrderByPaymentId, updateOrderByPaymentId } from '@/lib/orders';
import { sendTicketEmail, sendOwnerNotificationEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.redirect(new URL('/?error=missing_order', request.url));
  }

  try {
    // Get the order from our database
    const order = await getOrderByPaymentId(orderId);

    if (!order) {
      return NextResponse.redirect(new URL('/?error=order_not_found', request.url));
    }

    // If order is still pending, mark it as paid immediately
    // AllPay only redirects to success URL if payment succeeded
    if (order.status === 'pending') {
      console.log('[Payment Success] Marking order as paid:', order.id);

      const updatedOrder = await updateOrderByPaymentId(orderId, {
        status: 'paid',
      });

      if (updatedOrder) {
        // Send confirmation emails in background (don't block redirect)
        sendEmailsInBackground(updatedOrder.id);
      }
    }

    // Redirect to the order confirmation page
    return NextResponse.redirect(new URL(`/order/${order.id}`, request.url));
  } catch (error) {
    console.error('Payment success redirect error:', error);
    return NextResponse.redirect(new URL('/?error=payment_verification', request.url));
  }
}

// Send emails without blocking the redirect
async function sendEmailsInBackground(orderId: string) {
  try {
    // Get full order details with event info
    const { data: booking } = await supabaseAdmin.client
      .from('bookings')
      .select(`
        *,
        events (
          id,
          name,
          start_date,
          start_time,
          location,
          user_id
        )
      `)
      .eq('id', orderId)
      .single();

    if (!booking || !booking.events) return;

    const event = booking.events as {
      id: string;
      name: string;
      start_date: string;
      start_time: string | null;
      location: string | null;
      user_id: string;
    };
    const seats = (booking.metadata?.seats as Array<{ label: string; category: string }>) || [];

    // Send ticket email to customer
    if (booking.customer_email && booking.ticket_code) {
      await sendTicketEmail({
        to: booking.customer_email,
        customerName: booking.customer_name || 'Guest',
        eventName: event.name,
        eventDate: event.start_date,
        eventTime: event.start_time || undefined,
        eventLocation: event.location || undefined,
        seats: seats,
        ticketCode: booking.ticket_code,
        totalAmount: booking.amount_paid,
        currency: booking.currency,
      }).catch(err => console.error('Failed to send ticket email:', err));
    }

    // Get event owner email and send notification
    if (event.user_id) {
      const { data: owner } = await supabaseAdmin.client
        .from('profiles')
        .select('email')
        .eq('id', event.user_id)
        .single();

      // Get total order count for this event
      const { count } = await supabaseAdmin.client
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('payment_status', 'paid');

      if (owner?.email && booking.ticket_code) {
        await sendOwnerNotificationEmail({
          to: owner.email,
          eventName: event.name,
          customerName: booking.customer_name || 'Guest',
          customerEmail: booking.customer_email || '',
          seats: seats,
          totalAmount: booking.amount_paid,
          currency: booking.currency,
          ticketCode: booking.ticket_code,
          orderCount: count || 1,
        }).catch(err => console.error('Failed to send owner notification:', err));
      }
    }
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}

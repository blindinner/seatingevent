import { NextRequest, NextResponse } from 'next/server';
import { getOrderByPaymentId, updateOrderByPaymentId } from '@/lib/orders';
import { sendTicketEmail, sendOwnerNotificationEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Generate a unique ticket code
function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
      const ticketCode = generateTicketCode();
      console.log('[Payment Success] Marking order as paid:', order.id, 'ticket:', ticketCode);

      const updatedOrder = await updateOrderByPaymentId(orderId, {
        status: 'paid',
        ticketCode,
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
          cover_image_url,
          user_id,
          send_qr_code,
          white_label_theme_id,
          brand_logo_url,
          brand_email_name
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
      cover_image_url: string | null;
      user_id: string;
      send_qr_code: boolean;
      white_label_theme_id: string | null;
      brand_logo_url: string | null;
      brand_email_name: string | null;
    };
    const seats = (booking.metadata?.seats as Array<{ label: string; category: string }>) || [];

    // Fetch organizer email for reply-to (and reuse for notification)
    let organizerEmail: string | undefined;
    if (event.user_id) {
      const { data: ownerProfile } = await supabaseAdmin.client
        .from('profiles')
        .select('email')
        .eq('id', event.user_id)
        .single();
      organizerEmail = ownerProfile?.email || undefined;
      if (!organizerEmail) {
        const { data: authUser } = await supabaseAdmin.client.auth.admin.getUserById(event.user_id);
        organizerEmail = authUser?.user?.email || undefined;
      }
    }

    // Fetch white-label theme if set, or use event-level branding
    let whiteLabelTheme: { logoUrl: string | null; name: string; fromName: string | null; brandColor?: string | null } | undefined;
    if (event.white_label_theme_id) {
      const { getThemeById } = await import('@/lib/whiteLabel');
      const theme = await getThemeById(event.white_label_theme_id);
      if (theme) {
        whiteLabelTheme = {
          logoUrl: theme.emailLogoUrl || theme.navLogoUrl,
          name: theme.name,
          fromName: theme.emailFromName,
          brandColor: theme.brandColor,
        };
      }
    } else if (event.brand_logo_url || event.brand_email_name) {
      // Use event-level branding if no white-label theme
      whiteLabelTheme = {
        logoUrl: event.brand_logo_url,
        name: event.brand_email_name || event.name,
        fromName: event.brand_email_name,
        brandColor: null,
      };
    }

    // Send ticket email to customer
    if (booking.customer_email && booking.ticket_code) {
      await sendTicketEmail({
        to: booking.customer_email,
        customerName: booking.customer_name || 'Guest',
        eventName: event.name,
        eventDate: event.start_date,
        eventTime: event.start_time || undefined,
        eventLocation: event.location || undefined,
        eventCoverUrl: event.cover_image_url || undefined,
        seats: seats,
        ticketCode: booking.ticket_code,
        orderId: booking.id,
        totalAmount: booking.amount_paid,
        currency: booking.currency,
        sendQrCode: event.send_qr_code !== false,
        attachPdf: true,
        organizerEmail,
        whiteLabelTheme,
      }).catch(err => console.error('Failed to send ticket email:', err));
    }

    // Send notification to event owner
    if (organizerEmail && booking.ticket_code) {
      // Get total order count for this event
      const { count } = await supabaseAdmin.client
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('payment_status', 'paid');

      await sendOwnerNotificationEmail({
        to: organizerEmail,
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
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}

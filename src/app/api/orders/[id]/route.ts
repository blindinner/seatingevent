import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getThemeById } from '@/lib/whiteLabel';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: rawData, error: rawError } = await supabaseAdmin.client
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (rawError || !rawData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = {
      id: rawData.id,
      eventId: rawData.event_id,
      customerName: rawData.customer_name,
      customerEmail: rawData.customer_email,
      totalAmount: rawData.amount_paid,
      currency: rawData.currency,
      status: rawData.payment_status,
      ticketCode: rawData.ticket_code,
      metadata: rawData.metadata,
    };

    // Get event details including branding
    const { data: event } = await supabaseAdmin.client
      .from('events')
      .select('name, start_date, start_time, location, white_label_theme_id, brand_logo_url, brand_email_name')
      .eq('id', order.eventId)
      .single();

    // Fetch white-label theme if set, or use event-level branding
    let whiteLabelTheme: { name: string; logoUrl: string | null; brandColor: string | null } | undefined;
    if (event?.white_label_theme_id) {
      const theme = await getThemeById(event.white_label_theme_id);
      if (theme) {
        whiteLabelTheme = {
          name: theme.name,
          logoUrl: theme.navLogoUrl || null,
          brandColor: theme.brandColor || null,
        };
      }
    } else if (event?.brand_logo_url || event?.brand_email_name) {
      // Use event-level branding if no white-label theme
      whiteLabelTheme = {
        name: event.brand_email_name || event.name,
        logoUrl: event.brand_logo_url || null,
        brandColor: null,
      };
    }

    // Format the response
    const seats = (order.metadata?.seats as Array<{ label: string; category: string; price: number }>) || [];

    // Order status changes via webhook, so must not be cached
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
      totalAmount: order.totalAmount / 100, // Convert from agorot/cents to display unit
      currency: order.currency,
      status: order.status,
      ticketCode: order.ticketCode,
      whiteLabelTheme,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

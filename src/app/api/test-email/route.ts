import { NextRequest, NextResponse } from 'next/server';
import { sendTicketEmail } from '@/lib/email';
import { getPublicEvent } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { email, eventId } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  // If eventId provided, fetch real event data
  if (eventId) {
    const event = await getPublicEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const testTicketCode = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await sendTicketEmail({
      to: email,
      customerName: 'Test Customer',
      eventName: event.name,
      eventDate: event.startDate,
      eventTime: event.startTime || undefined,
      eventLocation: event.location || undefined,
      eventCoverUrl: event.coverImageUrl || undefined,
      seats: [
        { label: 'A1', category: 'Standard' },
        { label: 'A2', category: 'Standard' },
      ],
      ticketCode: testTicketCode,
      totalAmount: 150,
      currency: event.currency,
      sendQrCode: event.sendQrCode,
      attachPdf: false, // Don't attach PDF for test emails (no real order)
      whiteLabelTheme: event.whiteLabelTheme ? {
        logoUrl: event.whiteLabelTheme.navLogoUrl,
        name: event.whiteLabelTheme.name,
        fromName: event.whiteLabelTheme.emailFromName,
        brandColor: event.whiteLabelTheme.brandColor,
      } : undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${email}`,
        eventName: event.name,
        hasWhiteLabel: !!event.whiteLabelTheme,
        themeName: event.whiteLabelTheme?.name,
        hasCoverImage: !!event.coverImageUrl,
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  // Fallback to hardcoded test data
  const result = await sendTicketEmail({
    to: email,
    customerName: 'Test Customer',
    eventName: 'Soho House Test Event',
    eventDate: '2025-04-15',
    eventTime: '20:00',
    eventLocation: 'Yefet 27, Tel Aviv',
    seats: [
      { label: 'Table 5', category: 'VIP' },
    ],
    ticketCode: 'TEST123',
    totalAmount: 150,
    currency: 'ILS',
    attachPdf: false,
    whiteLabelTheme: {
      logoUrl: 'https://companieslogo.com/img/orig/SHCO_BIG.D-25ccde3e.png',
      name: 'Soho House Tel Aviv',
      fromName: 'Soho House Tel Aviv',
      brandColor: '#8B4513',
    },
  });

  if (result.success) {
    return NextResponse.json({ success: true, message: `Test email sent to ${email}` });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}

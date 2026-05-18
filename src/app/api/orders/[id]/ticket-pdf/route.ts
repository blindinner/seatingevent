import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getThemeById } from '@/lib/whiteLabel';
import { generateQRCodeDataUrl, getTicketVerifyUrl } from '@/lib/qrcode';
import { renderToBuffer } from '@react-pdf/renderer';
import { TicketPDF } from '@/components/pdf/TicketPDF';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch booking
    const { data: rawData, error: rawError } = await supabaseAdmin.client
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (rawError || !rawData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow PDF generation for paid orders
    if (rawData.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Tickets not available for unpaid orders' }, { status: 400 });
    }

    if (!rawData.ticket_code) {
      return NextResponse.json({ error: 'Ticket code not found' }, { status: 400 });
    }

    // Get event details
    const { data: event } = await supabaseAdmin.client
      .from('events')
      .select('name, start_date, start_time, location, white_label_theme_id')
      .eq('id', rawData.event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch white-label theme if set
    let logoUrl: string | null = null;
    let brandColor: string | null = null;
    if (event.white_label_theme_id) {
      const theme = await getThemeById(event.white_label_theme_id);
      if (theme) {
        logoUrl = theme.navLogoUrl || null;
        brandColor = theme.brandColor || null;
      }
    }

    // Generate QR code
    const verifyUrl = getTicketVerifyUrl(rawData.ticket_code);
    const qrCodeDataUrl = await generateQRCodeDataUrl(verifyUrl, {
      width: 200,
      margin: 2,
    });

    // Extract seats from metadata
    const seats = (rawData.metadata?.seats as Array<{ label: string; category: string; price: number }>) || [];

    // Create the PDF
    const pdfElement = React.createElement(TicketPDF, {
      logoUrl,
      brandColor,
      eventName: event.name || 'Event',
      eventDate: event.start_date || '',
      eventTime: event.start_time || null,
      eventLocation: event.location || null,
      ticketCode: rawData.ticket_code,
      qrCodeDataUrl,
      customerName: rawData.customer_name || '',
      customerEmail: rawData.customer_email || '',
      seats,
      totalAmount: rawData.amount_paid || 0,
      currency: rawData.currency || 'USD',
    });
    // @ts-expect-error - react-pdf types require this cast
    const pdfBuffer = await renderToBuffer(pdfElement);

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${rawData.ticket_code}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating PDF ticket:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF ticket' },
      { status: 500 }
    );
  }
}

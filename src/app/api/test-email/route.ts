import { NextRequest, NextResponse } from 'next/server';
import { sendTicketEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

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
    whiteLabelTheme: {
      logoUrl: 'https://companieslogo.com/img/orig/SHCO_BIG.D-25ccde3e.png',
      name: 'Soho House Tel Aviv',
      fromName: 'Soho House Tel Aviv',
    },
  });

  if (result.success) {
    return NextResponse.json({ success: true, message: `Test email sent to ${email}` });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}

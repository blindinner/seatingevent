import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface OwnerNotificationData {
  to: string;
  ownerName?: string;
  eventName: string;
  customerName: string;
  customerEmail: string;
  seats: {
    label: string;
    category: string;
  }[];
  totalAmount: number;
  currency: string;
  ticketCode: string;
  orderCount: number;
}

export async function sendOwnerNotificationEmail(data: OwnerNotificationData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }

  const seatList = data.seats.map(s => `${s.label} (${s.category})`).join(', ');

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency,
  }).format(data.totalAmount);

  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const fromName = process.env.EMAIL_FROM_NAME || 'Luma Seated';

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.to,
      subject: `New ticket sold for ${data.eventName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Ticket Sold</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #18181b; border-radius: 16px; overflow: hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                      <h1 style="margin: 0; color: #22c55e; font-size: 24px; font-weight: 600;">
                        New Ticket Sold
                      </h1>
                      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.6); font-size: 14px;">
                        ${data.eventName}
                      </p>
                    </td>
                  </tr>

                  <!-- Customer Details -->
                  <tr>
                    <td style="padding: 24px 32px;">
                      <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Customer</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${data.customerName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Email</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${data.customerEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Seats</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${seatList}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Ticket Code</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; font-family: monospace;">${data.ticketCode}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0 8px; color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600;">Amount</td>
                          <td style="padding: 12px 0 8px; color: #22c55e; font-size: 18px; text-align: right; font-weight: 600;">${formattedAmount}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Stats -->
                  <tr>
                    <td style="padding: 20px 32px; background-color: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.1);">
                      <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 13px; text-align: center;">
                        Total orders for this event: <strong style="color: #ffffff;">${data.orderCount}</strong>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send owner notification email:', error);
      return { success: false, error: error.message };
    }

    console.log('Owner notification email sent to:', data.to);
    return { success: true };
  } catch (err) {
    console.error('Error sending owner notification email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export interface EmailSettings {
  subject?: string;
  greeting?: string;
  bodyText?: string;
  footerText?: string;
}

export interface TicketEmailData {
  to: string;
  customerName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  seats: {
    label: string;
    category: string;
  }[];
  ticketCode: string;
  totalAmount: number;
  currency: string;
  emailSettings?: EmailSettings;
}

export async function sendTicketEmail(data: TicketEmailData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }

  const seatList = data.seats.map(s => `${s.label} (${s.category})`).join(', ');

  // Format amount for display (amount is already in dollars/main currency unit)
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency,
  }).format(data.totalAmount);

  // Format date
  const eventDate = new Date(data.eventDate);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Use Resend's test email as default (works without domain verification)
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const fromName = process.env.EMAIL_FROM_NAME || 'Luma Seated';

  // Build verification URL for QR code
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seatingevent-j3ip.vercel.app';
  const verifyUrl = `${baseUrl}/verify/${data.ticketCode}`;

  // Apply custom email settings with defaults
  const settings = data.emailSettings || {};
  const subject = (settings.subject || 'Your tickets for {{eventName}}')
    .replace(/\{\{eventName\}\}/g, data.eventName)
    .replace(/\{\{customerName\}\}/g, data.customerName);
  const greeting = (settings.greeting || "You're going!")
    .replace(/\{\{eventName\}\}/g, data.eventName)
    .replace(/\{\{customerName\}\}/g, data.customerName);
  const bodyText = (settings.bodyText || 'Your tickets are confirmed')
    .replace(/\{\{eventName\}\}/g, data.eventName)
    .replace(/\{\{customerName\}\}/g, data.customerName);
  const footerText = (settings.footerText || 'Questions? Reply to this email or contact the event organizer.')
    .replace(/\{\{eventName\}\}/g, data.eventName)
    .replace(/\{\{customerName\}\}/g, data.customerName);

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Tickets</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #18181b; border-radius: 16px; overflow: hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                        ${greeting}
                      </h1>
                      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.6); font-size: 14px;">
                        ${bodyText}
                      </p>
                    </td>
                  </tr>

                  <!-- Event Details -->
                  <tr>
                    <td style="padding: 24px 32px;">
                      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 600;">
                        ${data.eventName}
                      </h2>
                      <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Date</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${formattedDate}</td>
                        </tr>
                        ${data.eventTime ? `
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Time</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${data.eventTime}</td>
                        </tr>
                        ` : ''}
                        ${data.eventLocation ? `
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Location</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${data.eventLocation}</td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Seats</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${seatList}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Ticket Code with QR -->
                  <tr>
                    <td style="padding: 0 32px 24px;">
                      <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; text-align: center;">
                        <p style="margin: 0 0 16px; color: rgba(255,255,255,0.6); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                          Your Ticket
                        </p>
                        <!-- QR Code - links to verification page -->
                        <img
                          src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=18181b&color=ffffff&data=${encodeURIComponent(verifyUrl)}"
                          alt="Ticket QR Code"
                          width="180"
                          height="180"
                          style="display: block; margin: 0 auto 16px; border-radius: 8px;"
                        />
                        <!-- Ticket Code -->
                        <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 4px; font-family: monospace;">
                          ${data.ticketCode}
                        </p>
                        <p style="margin: 12px 0 0; color: rgba(255,255,255,0.4); font-size: 12px;">
                          Scan QR code at entrance for check-in
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Order Summary -->
                  <tr>
                    <td style="padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.1);">
                      <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                          <td style="color: rgba(255,255,255,0.6); font-size: 14px;">Order for</td>
                          <td style="color: #ffffff; font-size: 14px; text-align: right;">${data.customerName}</td>
                        </tr>
                        <tr>
                          <td style="padding-top: 8px; color: rgba(255,255,255,0.6); font-size: 14px;">Total paid</td>
                          <td style="padding-top: 8px; color: #ffffff; font-size: 14px; text-align: right; font-weight: 600;">${formattedAmount}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background-color: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.1);">
                      <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">
                        ${footerText}
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send ticket email:', error);
      return { success: false, error: error.message };
    }

    console.log('Ticket email sent to:', data.to);
    return { success: true };
  } catch (err) {
    console.error('Error sending ticket email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

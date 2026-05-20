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

  // Convert from smallest currency unit (agorot/cents) to main unit
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency,
  }).format(data.totalAmount / 100);

  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const fromName = process.env.EMAIL_FROM_NAME || 'Rendeza';

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
  eventCoverUrl?: string; // Event cover image
  seats: {
    label: string;
    category: string;
  }[];
  ticketCode: string;
  orderId?: string; // For PDF generation
  totalAmount: number;
  currency: string;
  emailSettings?: EmailSettings;
  sendQrCode?: boolean; // Whether to include QR code in email (default true)
  attachPdf?: boolean; // Whether to attach PDF ticket (default true)
  organizerEmail?: string; // Reply-to email for the event organizer
  whiteLabelTheme?: {
    logoUrl: string | null;
    name: string;
    fromName: string | null;
    brandColor?: string | null;
  };
}

export async function sendTicketEmail(data: TicketEmailData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Email not configured' };
  }

  const seatList = data.seats.map(s => `${s.label} (${s.category})`).join(', ');

  // Format amount for display (amount is already in dollars/main currency unit)
  // Convert from smallest currency unit (agorot/cents) to main unit
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currency,
  }).format(data.totalAmount / 100);

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
  // Use white-label theme's from name if provided, otherwise default
  const fromName = data.whiteLabelTheme?.fromName || process.env.EMAIL_FROM_NAME || 'Rendeza';

  // Build verification URL for QR code
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seatingevent-j3ip.vercel.app';
  const verifyUrl = `${baseUrl}/verify/${data.ticketCode}`;

  // Check if QR code should be included (default to true)
  const includeQrCode = data.sendQrCode !== false;
  console.log('sendTicketEmail called:', { to: data.to, includeQrCode, rawSendQrCode: data.sendQrCode });

  // Apply custom email settings with defaults
  const settings = data.emailSettings || {};
  const subject = (settings.subject || 'Your tickets for {{eventName}}')
    .replace(/\{\{eventName\}\}/g, data.eventName)
    .replace(/\{\{customerName\}\}/g, data.customerName);
  const bodyText = (settings.bodyText || `Hi ${data.customerName}, your tickets for ${data.eventName} are confirmed. We can't wait to see you there!`)
    .replace(/\{\{eventName\}\}/g, data.eventName)
    .replace(/\{\{customerName\}\}/g, data.customerName);

  // Brand color for accents
  const brandColor = data.whiteLabelTheme?.brandColor || '#22c55e';

  // Generate PDF attachment if requested
  let attachments: { filename: string; content: Buffer }[] | undefined;
  if (data.attachPdf !== false && data.orderId) {
    try {
      const { generateTicketPdfBuffer } = await import('./pdfGenerator');
      const pdfBuffer = await generateTicketPdfBuffer({
        logoUrl: data.whiteLabelTheme?.logoUrl || null,
        brandColor: data.whiteLabelTheme?.brandColor || null,
        eventName: data.eventName,
        eventDate: data.eventDate,
        eventTime: data.eventTime || null,
        eventLocation: data.eventLocation || null,
        ticketCode: data.ticketCode,
        customerName: data.customerName,
        customerEmail: data.to,
        seats: data.seats.map(s => ({ ...s, price: 0 })), // Price not needed for PDF in email
        totalAmount: data.totalAmount,
        currency: data.currency,
      });
      attachments = [{
        filename: `ticket-${data.ticketCode}.pdf`,
        content: pdfBuffer,
      }];
    } catch (err) {
      console.error('Failed to generate PDF attachment:', err);
      // Continue without attachment
    }
  }

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.to,
      ...(data.organizerEmail && { replyTo: data.organizerEmail }),
      subject,
      attachments,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Tickets</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">

                  ${data.whiteLabelTheme?.logoUrl ? `
                  <!-- White-Label Logo -->
                  <tr>
                    <td style="padding: 0 0 24px; text-align: center;">
                      <img src="${data.whiteLabelTheme.logoUrl}" alt="${data.whiteLabelTheme.name}" style="max-height: 40px; max-width: 180px;" />
                    </td>
                  </tr>
                  ` : ''}

                  <!-- Main Card -->
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

                        ${data.eventCoverUrl ? `
                        <!-- Event Cover Image -->
                        <tr>
                          <td>
                            <img src="${data.eventCoverUrl}" alt="${data.eventName}" style="width: 100%; height: 160px; object-fit: cover;" />
                          </td>
                        </tr>
                        ` : ''}

                        <!-- Event Info -->
                        <tr>
                          <td style="padding: 24px 24px 20px;">
                            <h1 style="margin: 0 0 8px; color: #0f172a; font-size: 22px; font-weight: 700;">
                              ${data.eventName}
                            </h1>
                            <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                              ${bodyText}
                            </p>
                          </td>
                        </tr>

                        <!-- Event Details -->
                        <tr>
                          <td style="padding: 0 24px 20px;">
                            <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border-radius: 12px; padding: 16px;">
                              <tr>
                                <td style="padding: 12px 16px;">
                                  <table cellpadding="0" cellspacing="0" style="width: 100%;">
                                    <tr>
                                      <td style="padding: 6px 0;">
                                        <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date</span><br/>
                                        <span style="color: #0f172a; font-size: 14px; font-weight: 500;">${formattedDate}</span>
                                      </td>
                                    </tr>
                                    ${data.eventTime ? `
                                    <tr>
                                      <td style="padding: 6px 0;">
                                        <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Time</span><br/>
                                        <span style="color: #0f172a; font-size: 14px; font-weight: 500;">${data.eventTime}</span>
                                      </td>
                                    </tr>
                                    ` : ''}
                                    ${data.eventLocation ? `
                                    <tr>
                                      <td style="padding: 6px 0;">
                                        <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Location</span><br/>
                                        <span style="color: #0f172a; font-size: 14px; font-weight: 500;">${data.eventLocation}</span>
                                      </td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                      <td style="padding: 6px 0;">
                                        <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Seats</span><br/>
                                        <span style="color: #0f172a; font-size: 14px; font-weight: 500;">${seatList}</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Ticket Section -->
                        <tr>
                          <td style="padding: 0 24px 24px;">
                            <table cellpadding="0" cellspacing="0" style="width: 100%; border: 2px dashed #e2e8f0; border-radius: 12px; overflow: hidden;">
                              <tr>
                                <td style="padding: 24px; text-align: center; background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);">
                                  ${includeQrCode ? `
                                  <!-- QR Code -->
                                  <div style="background: #ffffff; display: inline-block; padding: 12px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                                    <img
                                      src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&bgcolor=ffffff&color=000000&data=${encodeURIComponent(verifyUrl)}"
                                      alt="Ticket QR Code"
                                      width="160"
                                      height="160"
                                      style="display: block;"
                                    />
                                  </div>
                                  ` : ''}
                                  <p style="margin: 0 0 8px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                                    Ticket Code
                                  </p>
                                  <p style="margin: 0; color: #0f172a; font-size: 32px; font-weight: 800; letter-spacing: 3px; font-family: 'SF Mono', Monaco, monospace;">
                                    ${data.ticketCode}
                                  </p>
                                  <p style="margin: 12px 0 0; color: #94a3b8; font-size: 12px;">
                                    ${includeQrCode ? 'Scan or show this code at entrance' : 'Show this code at the entrance'}
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Order Summary -->
                        <tr>
                          <td style="padding: 0 24px 24px;">
                            <table cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                              <tr>
                                <td style="padding-top: 16px;">
                                  <table cellpadding="0" cellspacing="0" style="width: 100%;">
                                    <tr>
                                      <td style="color: #64748b; font-size: 14px;">Guest</td>
                                      <td style="color: #0f172a; font-size: 14px; text-align: right; font-weight: 500;">${data.customerName}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding-top: 8px; color: #64748b; font-size: 14px;">Total</td>
                                      <td style="padding-top: 8px; color: #0f172a; font-size: 16px; text-align: right; font-weight: 700;">${formattedAmount}</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        ${attachments ? `
                        <!-- PDF Notice -->
                        <tr>
                          <td style="padding: 0 24px 24px;">
                            <div style="background-color: ${brandColor}10; border-radius: 8px; padding: 12px 16px; text-align: center;">
                              <p style="margin: 0; color: ${brandColor}; font-size: 13px; font-weight: 500;">
                                📎 Your PDF ticket is attached to this email
                              </p>
                            </div>
                          </td>
                        </tr>
                        ` : ''}

                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 0; text-align: center;">
                      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                        Questions? Reply to this email or contact the event organizer.
                      </p>
                      ${!data.whiteLabelTheme ? `
                      <p style="margin: 16px 0 0; color: #cbd5e1; font-size: 11px;">
                        Powered by <a href="https://rendeza.com" style="color: #94a3b8; text-decoration: none; font-weight: 500;">Rendeza</a>
                      </p>
                      ` : ''}
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

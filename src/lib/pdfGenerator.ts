import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { TicketPDF, TicketPDFProps } from '@/components/pdf/TicketPDF';
import { generateQRCodeWithLogo, generateQRCodeDataUrl, getTicketVerifyUrl } from './qrcode';

export interface GeneratePdfOptions {
  logoUrl: string | null;
  brandColor: string | null;
  eventName: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  ticketCode: string;
  customerName: string;
  customerEmail: string;
  seats: Array<{ label: string; category: string; price: number }>;
  totalAmount: number;
  currency: string;
}

export async function generateTicketPdfBuffer(options: GeneratePdfOptions): Promise<Buffer> {
  // Generate QR code (with logo if available)
  const verifyUrl = getTicketVerifyUrl(options.ticketCode);
  let qrCodeDataUrl: string;

  if (options.logoUrl) {
    try {
      qrCodeDataUrl = await generateQRCodeWithLogo(verifyUrl, options.logoUrl, {
        width: 200,
        logoSize: 22,
        logoPadding: 6,
      });
    } catch {
      // Fallback to plain QR code
      qrCodeDataUrl = await generateQRCodeDataUrl(verifyUrl, { width: 200, margin: 2 });
    }
  } else {
    qrCodeDataUrl = await generateQRCodeDataUrl(verifyUrl, { width: 200, margin: 2 });
  }

  const pdfProps: TicketPDFProps = {
    logoUrl: options.logoUrl,
    brandColor: options.brandColor,
    eventName: options.eventName,
    eventDate: options.eventDate,
    eventTime: options.eventTime,
    eventLocation: options.eventLocation,
    ticketCode: options.ticketCode,
    qrCodeDataUrl,
    customerName: options.customerName,
    customerEmail: options.customerEmail,
    seats: options.seats,
    totalAmount: options.totalAmount,
    currency: options.currency,
  };

  const pdfElement = React.createElement(TicketPDF, pdfProps);
  // @ts-expect-error - react-pdf types require this cast
  const pdfBuffer = await renderToBuffer(pdfElement);

  return Buffer.from(pdfBuffer);
}

import QRCode from 'qrcode';
import sharp from 'sharp';

/**
 * Fetch and convert image to PNG buffer
 * Handles AVIF, WebP, and other formats that canvas doesn't support
 */
async function fetchAndConvertImage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Convert to PNG using sharp (handles AVIF, WebP, etc.)
  const pngBuffer = await sharp(buffer)
    .png()
    .toBuffer();

  return pngBuffer;
}

/**
 * Generate a QR code as a data URL (for use in PDFs and images)
 */
export async function generateQRCodeDataUrl(
  data: string,
  options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  return QRCode.toDataURL(data, {
    width: options?.width || 200,
    margin: options?.margin || 2,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate a QR code with a logo in the center
 * Uses high error correction (H = 30%) to allow logo overlay
 */
export async function generateQRCodeWithLogo(
  data: string,
  logoUrl: string,
  options?: {
    width?: number;
    margin?: number;
    logoSize?: number; // Percentage of QR code size (default 20%)
    logoPadding?: number; // Padding around logo in pixels
    logoBackgroundColor?: string; // Background color behind logo
  }
): Promise<string> {
  const { createCanvas, loadImage } = await import('canvas');

  const width = options?.width || 200;
  const margin = options?.margin || 2;
  const logoSizePercent = options?.logoSize || 20;
  const logoPadding = options?.logoPadding || 4;
  const logoBackgroundColor = options?.logoBackgroundColor || '#ffffff';

  // Generate QR code with high error correction for logo overlay
  const qrDataUrl = await QRCode.toDataURL(data, {
    width,
    margin,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H', // High error correction allows ~30% coverage
  });

  // Create canvas and draw QR code
  const canvas = createCanvas(width, width);
  const ctx = canvas.getContext('2d');

  // Load and draw QR code
  const qrImage = await loadImage(qrDataUrl);
  ctx.drawImage(qrImage, 0, 0, width, width);

  // Load, convert, and draw logo
  try {
    // Fetch and convert logo to PNG (handles AVIF, WebP, etc.)
    const logoPngBuffer = await fetchAndConvertImage(logoUrl);
    const logoImage = await loadImage(logoPngBuffer);

    // Calculate logo dimensions (keep aspect ratio)
    const maxLogoSize = (width * logoSizePercent) / 100;
    const logoAspect = logoImage.width / logoImage.height;
    let logoWidth, logoHeight;

    if (logoAspect > 1) {
      logoWidth = maxLogoSize;
      logoHeight = maxLogoSize / logoAspect;
    } else {
      logoHeight = maxLogoSize;
      logoWidth = maxLogoSize * logoAspect;
    }

    // Center position
    const logoX = (width - logoWidth) / 2;
    const logoY = (width - logoHeight) / 2;

    // Draw white background with padding behind logo
    const bgPadding = logoPadding;
    ctx.fillStyle = logoBackgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      logoX - bgPadding,
      logoY - bgPadding,
      logoWidth + bgPadding * 2,
      logoHeight + bgPadding * 2,
      4
    );
    ctx.fill();

    // Draw logo
    ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
  } catch (err) {
    console.error('Failed to load logo for QR code:', err);
    // Return QR without logo if logo loading fails
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate a branded QR code URL for use in emails
 * This creates a URL that can be used in <img> tags
 * Returns a data URL with the branded QR code
 */
export async function generateBrandedQRCodeForEmail(
  verifyUrl: string,
  logoUrl: string | null,
  options?: {
    size?: number;
  }
): Promise<string> {
  const size = options?.size || 180;

  if (logoUrl) {
    try {
      return await generateQRCodeWithLogo(verifyUrl, logoUrl, {
        width: size,
        logoSize: 22, // 22% of QR size
        logoPadding: 6,
      });
    } catch (err) {
      console.error('Failed to generate branded QR code:', err);
      // Fall back to plain QR code
    }
  }

  // Plain QR code fallback
  return generateQRCodeDataUrl(verifyUrl, { width: size });
}

/**
 * Generate a verification URL for a ticket
 */
export function getTicketVerifyUrl(ticketCode: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://seated.events';
  return `${base}/verify/${ticketCode}`;
}

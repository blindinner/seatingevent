import { NextRequest, NextResponse } from 'next/server';
import { getPublicEvent } from '@/lib/supabase';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const event = await getPublicEvent(eventId);

    if (!event?.coverImageUrl) {
      // Return a default OG image or 404
      return new NextResponse('No cover image', { status: 404 });
    }

    // Fetch the original image
    const imageResponse = await fetch(event.coverImageUrl);
    if (!imageResponse.ok) {
      return new NextResponse('Failed to fetch image', { status: 500 });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Compress and resize the image using sharp
    const optimizedImage = await sharp(imageBuffer)
      .resize(1200, 1500, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    // Return the optimized image
    return new NextResponse(new Uint8Array(optimizedImage), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new NextResponse('Error generating image', { status: 500 });
  }
}

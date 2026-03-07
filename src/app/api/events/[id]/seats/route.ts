import { NextRequest, NextResponse } from 'next/server';
import { getSeatStatus } from '@/lib/seat-status';

// Force dynamic - disable ALL caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const result = await getSeatStatus(eventId);

    return NextResponse.json({
      seatStatus: result.seatStatus,
      _debug: result.debug,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Seats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seat status' },
      { status: 500 }
    );
  }
}

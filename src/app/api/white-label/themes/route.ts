import { NextRequest, NextResponse } from 'next/server';
import { getAvailableThemesForUser } from '@/lib/whiteLabel';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const themes = await getAvailableThemesForUser(email);

    return NextResponse.json({ themes });
  } catch (error) {
    console.error('Error fetching white-label themes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

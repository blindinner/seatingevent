import { NextResponse } from 'next/server';
import { getThemeBySlug, getUpcomingEventsByTheme } from '@/lib/whiteLabel';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ themeSlug: string }> }
) {
  try {
    const { themeSlug } = await params;

    // Fetch the theme
    const theme = await getThemeBySlug(themeSlug);
    if (!theme) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Check if theme is active
    if (!theme.isActive) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Fetch upcoming events for this theme
    const events = await getUpcomingEventsByTheme(theme.id);

    return NextResponse.json({
      theme,
      events,
    });
  } catch (error) {
    console.error('Error fetching brand events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

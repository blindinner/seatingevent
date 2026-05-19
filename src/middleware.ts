import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of known social media crawler user agents
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = CRAWLER_USER_AGENTS.some(crawler =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );

  const response = NextResponse.next();

  // For social media crawlers, ensure no caching
  if (isCrawler) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    // Match event pages
    '/event/:path*',
    // Match branded event pages
    '/:themeSlug/:eventSlug*',
  ],
};

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicEvent, getMap } from '@/lib/supabase';
import { EventClient } from './EventClient';

// Disable caching for this page - seat status must always be fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublicEvent(id);

  if (!event) {
    return {
      title: 'Event Not Found',
    };
  }

  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const description = event.description || `Join us for ${event.name} on ${formattedDate}`;

  // Build OG image URL using our API route that compresses images
  // This ensures images are always under Facebook's 8MB limit
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rendeza.com';
  const ogImageUrl = event.coverImageUrl
    ? `${baseUrl}/api/og/${id}`
    : null;

  const ogImages = ogImageUrl
    ? [{
        url: ogImageUrl,
        width: 1200,
        height: 1500,
        alt: event.name,
      }]
    : [];

  return {
    title: event.name,
    description,
    openGraph: {
      title: event.name,
      description,
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: ogImageUrl ? 'summary_large_image' : 'summary',
      title: event.name,
      description,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getPublicEvent(id);

  if (!event) {
    notFound();
  }

  // Fetch map data if this is a seated event
  let mapData = null;
  if (event.mapId) {
    try {
      const map = await getMap(event.mapId);
      mapData = map.data;
    } catch (error) {
      console.error('Failed to fetch map:', error);
    }
  }

  return <EventClient event={event} mapData={mapData} />;
}

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventByBrandedSlug, getMap } from '@/lib/supabase';
import { EventClient } from '@/app/event/[id]/EventClient';

// Disable caching for this page - seat status must always be fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ themeSlug: string; eventSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { themeSlug, eventSlug } = await params;
  const event = await getEventByBrandedSlug(themeSlug, eventSlug);

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

  const ogImages = event.coverImageUrl
    ? [{
        url: event.coverImageUrl,
        width: 800,
        height: 1000,
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
      card: event.coverImageUrl ? 'summary_large_image' : 'summary',
      title: event.name,
      description,
      images: event.coverImageUrl ? [event.coverImageUrl] : [],
    },
  };
}

export default async function BrandedEventPage({ params }: PageProps) {
  const { themeSlug, eventSlug } = await params;
  const event = await getEventByBrandedSlug(themeSlug, eventSlug);

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

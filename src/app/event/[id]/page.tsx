import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicEvent, getMap } from '@/lib/supabase';
import { EventClient } from './EventClient';

// Ensure the page is not cached - seat status needs to be fresh
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

  return {
    title: event.name,
    description: event.description || `Join us for ${event.name} on ${formattedDate}`,
    openGraph: {
      title: event.name,
      description: event.description || `Join us for ${event.name} on ${formattedDate}`,
      images: event.coverImageUrl ? [event.coverImageUrl] : [],
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

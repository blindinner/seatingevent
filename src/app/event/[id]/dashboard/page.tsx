'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/auth';
import { PublicEvent } from '@/types/event';
import { Order } from '@/lib/orders';
import { MapData } from '@/types/map';
import { DashboardClient } from './DashboardClient';

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data once we have user
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/signin?redirect=/event/${eventId}/dashboard`);
      return;
    }

    async function fetchData() {
      try {
        const supabase = getSupabaseClient();

        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (eventError || !eventData) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        // Check ownership
        if (eventData.user_id !== user!.id) {
          router.push(`/event/${eventId}`);
          return;
        }

        // Transform to PublicEvent format
        const publicEvent: PublicEvent = {
          id: eventData.id,
          name: eventData.name,
          description: eventData.description,
          startDate: eventData.start_date,
          startTime: eventData.start_time,
          endDate: eventData.end_date,
          endTime: eventData.end_time,
          location: eventData.location,
          locationLat: eventData.location_lat,
          locationLng: eventData.location_lng,
          coverImageUrl: eventData.cover_image_url,
          eventType: eventData.event_type,
          ticketTiers: eventData.ticket_tiers,
          currency: eventData.currency,
          themeColor: eventData.theme_color,
          themeFont: eventData.theme_font,
          requireApproval: eventData.require_approval,
          mapId: eventData.map_id,
          userId: eventData.user_id,
          createdAt: eventData.created_at,
          seatStatus: eventData.seat_status || {},
        };
        setEvent(publicEvent);

        // Fetch orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('bookings')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        if (!ordersError && ordersData) {
          const mappedOrders: Order[] = ordersData.map(row => ({
            id: row.id,
            eventId: row.event_id,
            customerName: row.customer_name,
            customerEmail: row.customer_email,
            customerPhone: row.customer_phone,
            seatIds: row.seat_ids || [],
            seatCount: row.seat_count,
            totalAmount: row.amount_paid,
            currency: row.currency,
            status: row.payment_status === 'completed' ? 'paid' : row.payment_status,
            paymentOrderId: row.idempotency_key,
            transactionId: row.allpay_transaction_id,
            platformFeeAmount: row.platform_fee_amount,
            organizerAmount: row.organizer_amount,
            ticketCode: row.ticket_code,
            createdAt: row.created_at,
            metadata: row.metadata || {},
          }));
          setOrders(mappedOrders);
        }

        // Fetch map if seated event
        if (eventData.map_id) {
          const { data: mapRow, error: mapError } = await supabase
            .from('maps')
            .select('*')
            .eq('id', eventData.map_id)
            .single();

          if (!mapError && mapRow) {
            setMapData(mapRow.data as MapData);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard');
        setLoading(false);
      }
    }

    fetchData();
  }, [user, authLoading, eventId, router]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/my-events')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to My Events
          </button>
        </div>
      </div>
    );
  }

  // No event
  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Event not found</p>
          <button
            onClick={() => router.push('/my-events')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to My Events
          </button>
        </div>
      </div>
    );
  }

  return <DashboardClient event={event} orders={orders} mapData={mapData} />;
}

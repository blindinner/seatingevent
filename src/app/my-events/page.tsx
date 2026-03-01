'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/auth';
import { formatCurrency } from '@/lib/currency';

interface UserEvent {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  location: string | null;
  cover_image_url: string | null;
  event_type: 'seated' | 'ga';
  currency: string;
  theme_color: string;
  created_at: string;
  // Stats
  total_bookings?: number;
  total_revenue?: number;
}

export default function MyEventsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/signin?redirect=/my-events');
      return;
    }

    async function fetchEvents() {
      try {
        const supabase = getSupabaseClient();

        // Fetch events created by this user
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false });

        if (eventsError) throw eventsError;

        // Fetch booking stats for each event
        const eventsWithStats = await Promise.all(
          (eventsData || []).map(async (event) => {
            const { data: bookings } = await supabase
              .from('bookings')
              .select('amount_paid, payment_status')
              .eq('event_id', event.id)
              .eq('payment_status', 'paid');

            const totalBookings = bookings?.length || 0;
            const totalRevenue = bookings?.reduce((sum, b) => sum + (b.amount_paid || 0), 0) || 0;

            return {
              ...event,
              total_bookings: totalBookings,
              total_revenue: totalRevenue,
            };
          })
        );

        setEvents(eventsWithStats);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [user, authLoading, router]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Check if event is in the past
  const isPastEvent = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a09]">
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-48 bg-white/10 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-white/5 rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a09]">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Events</h1>
            <p className="text-white/50 mt-1">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </Link>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No events yet</h2>
            <p className="text-white/50 mb-6">Create your first event to get started</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const past = isPastEvent(event.start_date);

              return (
                <Link
                  key={event.id}
                  href={`/event/${event.id}`}
                  className={`group block rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all hover:bg-white/[0.05] ${
                    past ? 'opacity-60' : ''
                  }`}
                >
                  {/* Cover Image */}
                  <div className="aspect-[16/9] relative overflow-hidden bg-white/[0.02]">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: event.theme_color || '#1c1917' }}
                      >
                        <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {past ? (
                        <span className="px-2.5 py-1 text-xs font-medium bg-white/10 backdrop-blur-sm text-white/70 rounded-full">
                          Past
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium bg-green-500/20 backdrop-blur-sm text-green-400 rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Event Type Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 text-xs font-medium bg-black/50 backdrop-blur-sm text-white/80 rounded-full capitalize">
                        {event.event_type === 'ga' ? 'General Admission' : 'Seated'}
                      </span>
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1 group-hover:text-white/90">
                      {event.name}
                    </h3>

                    <p className="text-sm text-white/50 mb-4">
                      {formatDate(event.start_date)}
                      {event.start_time && ` · ${formatTime(event.start_time)}`}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                        </svg>
                        <span className="text-sm text-white/60">
                          {event.total_bookings} sold
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-white/60">
                          {formatCurrency(event.total_revenue || 0, event.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';

interface AdminEvent {
  id: string;
  short_id: string;
  name: string;
  start_date: string;
  start_time: string | null;
  location: string | null;
  event_type: 'seated' | 'ga';
  currency: string;
  cover_image_url: string | null;
  created_at: string;
  user_id: string;
  organizer_email: string;
  ticketsSold: number;
  totalRevenue: number;
}

type StatusFilter = 'all' | 'active' | 'past';

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/admin/events');
        if (!res.ok) throw new Error('Failed to fetch events');
        const data = await res.json();
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const isPastEvent = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        e => e.name.toLowerCase().includes(query) || e.organizer_email.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(e => {
        const isPast = isPastEvent(e.start_date);
        return statusFilter === 'past' ? isPast : !isPast;
      });
    }

    return result;
  }, [events, searchQuery, statusFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Events</h1>
        <p className="text-white/50 mt-1">{events.length} total events</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or organizer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'active', 'past'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Event</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Organizer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Tickets</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Revenue</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                    {searchQuery || statusFilter !== 'all' ? 'No events match your filters' : 'No events yet'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const isPast = isPastEvent(event.start_date);
                  return (
                    <tr key={event.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${isPast ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {event.cover_image_url ? (
                            <img
                              src={event.cover_image_url}
                              alt={event.name}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/event/${event.short_id || event.id}`}
                              className="text-white hover:text-white/80 font-medium transition-colors line-clamp-1"
                            >
                              {event.name}
                            </Link>
                            {event.location && (
                              <div className="text-sm text-white/40 truncate max-w-[200px]">
                                {event.location.split(',')[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/70 truncate max-w-[150px] block">{event.organizer_email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white/70">{formatDate(event.start_date)}</div>
                        {event.start_time && (
                          <div className="text-sm text-white/40">{formatTime(event.start_time)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.event_type === 'ga'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {event.event_type === 'ga' ? 'GA' : 'Seated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">{event.ticketsSold}</td>
                      <td className="px-6 py-4">
                        <span className={`${event.totalRevenue > 0 ? 'text-green-400' : 'text-white/40'}`}>
                          {formatCurrency(event.totalRevenue, event.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/event/${event.short_id || event.id}`}
                            className="p-2 text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                          <Link
                            href={`/event/${event.id}/dashboard`}
                            className="p-2 text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
                            title="Dashboard"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

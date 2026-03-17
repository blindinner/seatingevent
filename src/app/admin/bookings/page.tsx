'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';

interface AdminBooking {
  id: string;
  ticket_code: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_id: string;
  event_name: string;
  event_short_id: string;
  seat_ids: string[];
  seat_count: number;
  amount_paid: number;
  currency: string;
  payment_status: string;
  platform_fee_amount: number;
  organizer_amount: number;
  created_at: string;
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'cancelled' | 'refunded';

export default function AdminBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch('/api/admin/bookings');
        if (!res.ok) throw new Error('Failed to fetch bookings');
        const data = await res.json();
        setBookings(data.bookings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    let result = bookings;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        b =>
          b.customer_email.toLowerCase().includes(query) ||
          b.customer_name?.toLowerCase().includes(query) ||
          b.ticket_code?.toLowerCase().includes(query) ||
          b.event_name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(b => b.payment_status === statusFilter);
    }

    return result;
  }, [bookings, searchQuery, statusFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'refunded':
        return 'bg-blue-500/20 text-blue-400';
      case 'cancelled':
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-white/10 text-white/60';
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    const paidBookings = bookings.filter(b => b.payment_status === 'paid');
    return {
      totalRevenue: paidBookings.reduce((sum, b) => sum + (b.amount_paid || 0), 0),
      platformFees: paidBookings.reduce((sum, b) => sum + (b.platform_fee_amount || 0), 0),
      organizerPayouts: paidBookings.reduce((sum, b) => sum + (b.organizer_amount || 0), 0),
    };
  }, [bookings]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/[0.04] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white/[0.04] rounded-xl animate-pulse" />
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
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <p className="text-white/50 mt-1">{bookings.length} total bookings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <div className="text-sm text-white/50 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totals.totalRevenue, 'USD')}</div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <div className="text-sm text-white/50 mb-1">Platform Fees</div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(totals.platformFees, 'USD')}</div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
          <div className="text-sm text-white/50 mb-1">Organizer Payouts</div>
          <div className="text-2xl font-bold text-white/70">{formatCurrency(totals.organizerPayouts, 'USD')}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by email, name, ticket code, or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'paid', 'pending', 'refunded', 'cancelled'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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

      {/* Bookings Table */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Event</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Tickets</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-white/50">Code</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                    {searchQuery || statusFilter !== 'all' ? 'No bookings match your filters' : 'No bookings yet'}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white">{booking.customer_name || 'N/A'}</div>
                        <div className="text-sm text-white/50">{booking.customer_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/event/${booking.event_short_id}`}
                        className="text-white hover:text-white/80 transition-colors line-clamp-1 max-w-[200px] block"
                      >
                        {booking.event_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-white">{booking.seat_count}</td>
                    <td className="px-6 py-4">
                      <div className="text-white">{formatCurrency(booking.amount_paid, booking.currency)}</div>
                      {booking.platform_fee_amount > 0 && (
                        <div className="text-xs text-green-400/70">
                          +{formatCurrency(booking.platform_fee_amount, booking.currency)} fee
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.payment_status)}`}>
                        {booking.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/50 text-sm">{formatDate(booking.created_at)}</td>
                    <td className="px-6 py-4">
                      {booking.ticket_code ? (
                        <code className="px-2 py-1 bg-white/[0.08] rounded text-sm text-white/70">
                          {booking.ticket_code}
                        </code>
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

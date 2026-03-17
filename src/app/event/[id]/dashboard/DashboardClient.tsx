'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PublicEvent } from '@/types/event';
import { Order } from '@/lib/orders';
import { MapData } from '@/types/map';
import { formatCurrency } from '@/lib/currency';
import { MiniSeatMap } from '@/components/event/MiniSeatMap';
import { getSupabaseClient } from '@/lib/auth';
import { PageViewsAnalytics } from '@/components/dashboard/PageViewsAnalytics';

interface DashboardClientProps {
  event: PublicEvent;
  orders: Order[];
  mapData: MapData | null;
}

interface DashboardStats {
  ticketsSold: number;
  totalSeats: number;
  availableSeats: number;
  totalRevenue: number;
  bookingCount: number;
  averageOrderValue: number;
}

export function DashboardClient({ event, orders: initialOrders, mapData }: DashboardClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  // Local seat status that can be updated after refunds
  const [seatStatus, setSeatStatus] = useState<Record<string, string>>(event.seatStatus || {});

  // Handle refund
  const handleRefund = useCallback(async (orderId: string, customerName: string | null) => {
    if (!confirm(`Are you sure you want to refund ${customerName || 'this order'}? This will release the seats and cannot be undone.`)) {
      return;
    }

    setRefundingId(orderId);
    setRefundError(null);

    try {
      // Get the access token from Supabase
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Refund failed');
      }

      // Find the order to get its seat IDs
      const refundedOrder = orders.find(o => o.id === orderId);

      // Update local orders state
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, status: 'refunded' as const } : o
        )
      );

      // Update local seat status - remove the refunded seats
      if (refundedOrder?.seatIds && refundedOrder.seatIds.length > 0) {
        setSeatStatus(prev => {
          const newStatus = { ...prev };
          for (const seatId of refundedOrder.seatIds) {
            delete newStatus[seatId];
          }
          return newStatus;
        });
      }
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setRefundingId(null);
    }
  }, [orders]);

  // Calculate stats from orders
  const stats: DashboardStats = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === 'paid');
    const ticketsSold = paidOrders.reduce((sum, o) => sum + o.seatCount, 0);
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Calculate total seats from map data or ticket tiers
    let totalSeats = 0;
    if (event.eventType === 'seated' && mapData) {
      // Count all seats in the map
      const countSeats = (elements: MapData['elements']): number => {
        let count = 0;
        for (const el of elements) {
          if (el.type === 'seat') {
            count++;
          } else if (el.type === 'row' && 'seats' in el) {
            count += el.seats?.length || 0;
          } else if (el.type === 'section' && 'rows' in el) {
            for (const row of el.rows || []) {
              count += row.seats?.length || 0;
            }
          } else if (el.type === 'table' && 'seats' in el) {
            count += el.seats?.length || 0;
          }
        }
        return count;
      };
      totalSeats = countSeats(mapData.elements);
    } else if (event.eventType === 'ga' && event.ticketTiers) {
      // Sum up ticket tier quantities (-1 means unlimited)
      totalSeats = event.ticketTiers.reduce((sum, tier) => {
        if (tier.quantity === -1) return sum; // Skip unlimited
        return sum + tier.quantity;
      }, 0);
    }

    return {
      ticketsSold,
      totalSeats,
      availableSeats: Math.max(0, totalSeats - ticketsSold),
      totalRevenue,
      bookingCount: paidOrders.length,
      averageOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
    };
  }, [orders, event, mapData]);

  // Filter orders based on search and status
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'cancelled' && order.status !== 'cancelled' && order.status !== 'refunded') {
          return false;
        } else if (statusFilter !== 'cancelled' && order.status !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = order.customerName?.toLowerCase().includes(query);
        const matchesEmail = order.customerEmail?.toLowerCase().includes(query);
        const matchesTicketCode = order.ticketCode?.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesTicketCode;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  // Calculate tier breakdown for GA events
  const tierBreakdown = useMemo(() => {
    if (event.eventType !== 'ga' || !event.ticketTiers) return null;

    const breakdown: Record<string, { sold: number; total: number; revenue: number }> = {};

    // Initialize tiers
    for (const tier of event.ticketTiers) {
      breakdown[tier.name] = {
        sold: 0,
        total: tier.quantity === -1 ? Infinity : tier.quantity,
        revenue: 0,
      };
    }

    // Count sold tickets per tier from order metadata
    const paidOrders = orders.filter(o => o.status === 'paid');
    for (const order of paidOrders) {
      const seats = (order.metadata?.seats as Array<{ category?: string; price?: number }>) || [];
      for (const seat of seats) {
        const tierName = seat.category || 'General';
        if (breakdown[tierName]) {
          breakdown[tierName].sold++;
          breakdown[tierName].revenue += seat.price || 0;
        }
      }
    }

    return breakdown;
  }, [event, orders]);

  // Format date
  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Export attendees as CSV
  const exportCSV = useCallback(() => {
    const paidOrders = orders.filter(o => o.status === 'paid');

    // CSV headers
    const headers = ['Name', 'Email', 'Phone', 'Seats', 'Amount Paid', 'Ticket Code', 'Status', 'Date'];

    // CSV rows
    const rows = paidOrders.map(order => {
      const seats = (order.metadata?.seats as Array<{ label?: string }>) || [];
      const seatLabels = seats.map(s => s.label).filter(Boolean).join('; ') || `${order.seatCount} ticket(s)`;
      const amount = order.totalAmount;
      const date = new Date(order.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return [
        order.customerName || '',
        order.customerEmail || '',
        order.customerPhone || '',
        seatLabels,
        `${amount} ${order.currency}`,
        order.ticketCode || '',
        order.status,
        date,
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}_attendees_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [orders, event.name]);

  return (
    <div className="min-h-screen bg-[#0a0a09] overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link
                href={`/event/${event.id}`}
                className="text-white/50 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-white truncate">{event.name}</h1>
                <p className="text-xs sm:text-sm text-white/50 truncate">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center flex-shrink-0">
              {/* Mobile: Show only key actions */}
              <div className="flex items-center sm:hidden">
                <button
                  onClick={exportCSV}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Export"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <Link
                  href={`/event/${event.id}/check-in`}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Check-in"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
                <Link
                  href={`/event/${event.id}/edit`}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Edit Event"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Link>
              </div>
              {/* Desktop: Show all actions with labels */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Export attendees as CSV"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
                <Link
                  href={`/event/${event.id}/edit`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Event
                </Link>
                <Link
                  href={`/event/${event.id}/settings`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
                <Link
                  href={`/event/${event.id}/check-in`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Check-in
                </Link>
                <Link
                  href={`/event/${event.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl sm:rounded-2xl p-3 sm:p-5 overflow-hidden">
            <div className="text-xs sm:text-sm text-white/50 mb-1">Tickets Sold</div>
            <div className="text-lg sm:text-2xl font-semibold text-white truncate">
              {stats.ticketsSold}
              {stats.totalSeats > 0 && (
                <span className="text-xs sm:text-base font-normal text-white/40">
                  {' '}/ {stats.totalSeats === Infinity ? '∞' : stats.totalSeats}
                </span>
              )}
            </div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl sm:rounded-2xl p-3 sm:p-5 overflow-hidden">
            <div className="text-xs sm:text-sm text-white/50 mb-1">Available</div>
            <div className="text-lg sm:text-2xl font-semibold text-white truncate">
              {stats.totalSeats === Infinity ? '∞' : stats.availableSeats}
            </div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl sm:rounded-2xl p-3 sm:p-5 overflow-hidden">
            <div className="text-xs sm:text-sm text-white/50 mb-1">Revenue</div>
            <div className="text-lg sm:text-2xl font-semibold text-white truncate">
              {formatCurrency(stats.totalRevenue, event.currency, { showFree: false })}
            </div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl sm:rounded-2xl p-3 sm:p-5 overflow-hidden">
            <div className="text-xs sm:text-sm text-white/50 mb-1">Orders</div>
            <div className="text-lg sm:text-2xl font-semibold text-white truncate">{stats.bookingCount}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Main Content - Attendee List */}
          <div className="md:col-span-2 order-2 md:order-1 min-w-0">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="p-4 border-b border-white/[0.08]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Attendees</h2>
                    <span className="text-sm text-white/40 md:hidden">
                      {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    {/* Search */}
                    <div className="relative flex-1 sm:max-w-xs">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search name, email, or ticket..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/20"
                      />
                    </div>
                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                      className="px-3 py-2.5 sm:py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-white/20 sm:w-auto"
                    >
                      <option value="all">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Refund Error */}
              {refundError && (
                <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20">
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {refundError}
                    <button
                      onClick={() => setRefundError(null)}
                      className="ml-auto text-red-400/60 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Card Layout */}
              <div className="md:hidden">
                {filteredOrders.length === 0 ? (
                  <div className="px-4 py-8 text-center text-white/50">
                    {orders.length === 0
                      ? 'No orders yet'
                      : 'No orders match your search'}
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {filteredOrders.map((order) => {
                      const seats = (order.metadata?.seats as Array<{ label?: string }>) || [];
                      const seatLabels = seats.map(s => s.label).filter(Boolean).join(', ') || `${order.seatCount} ticket${order.seatCount !== 1 ? 's' : ''}`;

                      return (
                        <div key={order.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-white">{order.customerName || 'Unknown'}</div>
                              <div className="text-xs text-white/50 truncate">{order.customerEmail}</div>
                            </div>
                            <span
                              className={`flex-shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                order.status === 'paid'
                                  ? 'bg-green-500/20 text-green-400'
                                  : order.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : order.status === 'refunded'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                            <span className="truncate">{seatLabels}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-white">
                                {formatCurrency(order.totalAmount, order.currency)}
                              </span>
                              <span className="text-xs text-white/40">
                                {new Date(order.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            {order.status === 'paid' && (
                              <button
                                onClick={() => handleRefund(order.id, order.customerName)}
                                disabled={refundingId === order.id}
                                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
                              >
                                {refundingId === order.id ? 'Refunding...' : 'Refund'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-4 py-3">
                        Customer
                      </th>
                      <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-4 py-3">
                        Seats
                      </th>
                      <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-4 py-3">
                        Amount
                      </th>
                      <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider px-4 py-3">
                        Date
                      </th>
                      <th className="text-right text-xs font-medium text-white/50 uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                          {orders.length === 0
                            ? 'No orders yet'
                            : 'No orders match your search'}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const seats = (order.metadata?.seats as Array<{ label?: string }>) || [];
                        const seatLabels = seats.map(s => s.label).filter(Boolean).join(', ') || `${order.seatCount} ticket${order.seatCount !== 1 ? 's' : ''}`;

                        return (
                          <tr
                            key={order.id}
                            className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-3">
                              <div className="text-sm text-white">{order.customerName || 'Unknown'}</div>
                              <div className="text-xs text-white/50">{order.customerEmail}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-white/70">{seatLabels}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-white">
                                {formatCurrency(order.totalAmount, order.currency)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  order.status === 'paid'
                                    ? 'bg-green-500/20 text-green-400'
                                    : order.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : order.status === 'refunded'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-white/50">
                                {new Date(order.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {order.status === 'paid' && (
                                <button
                                  onClick={() => handleRefund(order.id, order.customerName)}
                                  disabled={refundingId === order.id}
                                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {refundingId === order.id ? 'Refunding...' : 'Refund'}
                                </button>
                              )}
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

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 order-1 md:order-2 min-w-0">
            {/* Page Views Analytics */}
            <PageViewsAnalytics eventId={event.id} />

            {/* Seat Map (for seated events) */}
            {event.eventType === 'seated' && mapData && (
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.08]">
                  <h3 className="text-sm font-medium text-white">Seat Map</h3>
                </div>
                <MiniSeatMap
                  mapData={mapData}
                  seatStatus={seatStatus}
                />
                <div className="p-3 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-4 text-xs">
                  {mapData.categories.map(category => (
                    <div key={category.id} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-white/50">{category.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-600 opacity-40" />
                    <span className="text-white/50">Sold</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Tier Breakdown (for GA events) */}
            {event.eventType === 'ga' && tierBreakdown && (
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.08]">
                  <h3 className="text-sm font-medium text-white">Ticket Tiers</h3>
                </div>
                <div className="p-4 space-y-4">
                  {Object.entries(tierBreakdown).map(([tierName, data]) => {
                    const percentage = data.total === Infinity
                      ? 0
                      : Math.min(100, (data.sold / data.total) * 100);

                    return (
                      <div key={tierName}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-white">{tierName}</span>
                          <span className="text-white/50">
                            {data.sold} / {data.total === Infinity ? '∞' : data.total}
                          </span>
                        </div>
                        <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        {data.revenue > 0 && (
                          <div className="text-xs text-white/40 mt-1">
                            Revenue: {formatCurrency(data.revenue, event.currency)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
              <h3 className="text-sm font-medium text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Avg. Order Value</span>
                  <span className="text-sm text-white">
                    {formatCurrency(stats.averageOrderValue, event.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Event Type</span>
                  <span className="text-sm text-white capitalize">{event.eventType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Pending Orders</span>
                  <span className="text-sm text-white">
                    {orders.filter(o => o.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface OrderDetails {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  customerName: string;
  customerEmail: string;
  seats: Array<{ label: string; category: string; price: number }>;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  ticketCode: string | null;
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order once on mount - payment should already be confirmed
  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Order not found' : 'Failed to load order');
          return;
        }
        const data = await res.json();
        setOrder(data);
      } catch {
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="text-red-400 text-lg mb-4">{error || 'Order not found'}</div>
        <Link href="/" className="text-white hover:underline">
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="group">
            <Image
              src="/logo.png"
              alt="Seated"
              width={168}
              height={168}
              className="max-h-10 w-auto group-hover:scale-105 transition-all duration-300"
            />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Status Banner */}
        {order.status === 'pending' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 font-medium">Order Pending</p>
            <p className="text-yellow-400/60 text-sm">If you completed payment, please refresh the page.</p>
          </div>
        )}

        {order.status === 'paid' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You&apos;re going!</h1>
            <p className="text-zinc-400">Your tickets have been confirmed</p>
          </div>
        )}

        {order.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
            <p className="text-zinc-400">There was an issue processing your payment</p>
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-xl p-6 mb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Order Cancelled</h1>
            <p className="text-zinc-400">This order has been cancelled</p>
          </div>
        )}

        {/* Ticket Code (only show when paid) */}
        {order.status === 'paid' && order.ticketCode && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6 text-center">
            <p className="text-zinc-400 text-sm mb-2">Your Ticket Code</p>
            <p className="text-3xl font-mono font-bold text-white tracking-wider">{order.ticketCode}</p>
            <p className="text-zinc-500 text-sm mt-2">Show this at the entrance</p>
          </div>
        )}

        {/* Event Details */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">{order.eventName}</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-zinc-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-white">{order.eventDate}</p>
                {order.eventTime && <p className="text-zinc-400">{order.eventTime}</p>}
              </div>
            </div>

            {order.eventLocation && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-zinc-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-white">{order.eventLocation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Order Details</h3>

          <div className="space-y-3">
            {order.seats.map((seat, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="text-white">Seat {seat.label}</p>
                  <p className="text-zinc-500 text-sm">{seat.category}</p>
                </div>
                <p className="text-white">{formatCurrency(seat.price, order.currency)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800 mt-4 pt-4 flex justify-between items-center">
            <p className="text-white font-medium">Total</p>
            <p className="text-white font-bold text-lg">{formatCurrency(order.totalAmount, order.currency)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Confirmation sent to</h3>
          <p className="text-white">{order.customerName}</p>
          <p className="text-zinc-400">{order.customerEmail}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/event/${order.eventId}`}
            className="flex-1 text-center py-3 px-4 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg font-medium transition-colors"
          >
            View Event
          </Link>
          <Link
            href="/"
            className="flex-1 text-center py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </main>
    </div>
  );
}

'use client';

import type { TicketTier } from '@/types/event';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';

interface TicketSelectorProps {
  tiers: TicketTier[];
  currency: string;
}

export function TicketSelector({ tiers, currency }: TicketSelectorProps) {
  const { setTicketQuantity, getTicketQuantity } = useSeatSelectionStore();

  return (
    <div className="space-y-3">
      {tiers.map((tier) => {
        const quantity = getTicketQuantity(tier.id);
        const isSoldOut = tier.quantity !== -1 && tier.quantity <= 0;

        return (
          <div
            key={tier.id}
            className={`rounded-xl bg-white/[0.06] border border-white/[0.08] p-4 transition-colors ${
              quantity > 0 ? 'border-white/20 bg-white/[0.08]' : ''
            } ${isSoldOut ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[15px] font-medium text-white">{tier.name}</h3>
                {tier.description && (
                  <p className="text-[13px] text-white/50 mt-1">{tier.description}</p>
                )}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[18px] font-semibold text-white">
                    {formatCurrency(tier.price, currency)}
                  </span>
                  {tier.quantity !== -1 && (
                    <span className="text-[12px] text-white/40">
                      {isSoldOut ? 'Sold out' : `${tier.quantity} left`}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              {!isSoldOut && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTicketQuantity(tier.id, tier.name, Math.max(0, quantity - 1), tier.price)}
                    disabled={quantity === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-8 text-center text-[16px] font-medium text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={() => {
                      const maxQuantity = tier.quantity === -1 ? 10 : tier.quantity;
                      setTicketQuantity(tier.id, tier.name, Math.min(maxQuantity, quantity + 1), tier.price);
                    }}
                    disabled={tier.quantity !== -1 && quantity >= tier.quantity}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

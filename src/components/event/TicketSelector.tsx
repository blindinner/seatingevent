'use client';

import type { TicketTier } from '@/types/event';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';

interface TierWithAvailability extends TicketTier {
  remaining?: number; // -1 = unlimited, otherwise remaining count
  sold?: number;
}

interface TicketSelectorProps {
  tiers: TierWithAvailability[];
  currency: string;
  isDarkMode?: boolean;
}

export function TicketSelector({ tiers, currency, isDarkMode = true }: TicketSelectorProps) {
  const { setTicketQuantity, getTicketQuantity } = useSeatSelectionStore();

  return (
    <div className="space-y-3">
      {tiers.map((tier) => {
        const quantity = getTicketQuantity(tier.id);
        // Use remaining if available, otherwise fall back to quantity (for backwards compatibility)
        const available = tier.remaining !== undefined ? tier.remaining : tier.quantity;
        const isSoldOut = available !== -1 && available <= 0;

        return (
          <div
            key={tier.id}
            className={`rounded-xl p-4 transition-colors ${
              isDarkMode
                ? `bg-white/[0.06] border border-white/[0.08] ${quantity > 0 ? 'border-white/20 bg-white/[0.08]' : ''}`
                : `bg-black/[0.04] border border-black/[0.08] ${quantity > 0 ? 'border-black/20 bg-black/[0.06]' : ''}`
            } ${isSoldOut ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className={`text-[15px] font-medium ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{tier.name}</h3>
                {tier.description && (
                  <p className={`text-[13px] mt-1 ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>{tier.description}</p>
                )}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-[18px] font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                    {tier.price === 0 ? 'Free' : formatCurrency(tier.price, currency)}
                  </span>
                  {available !== -1 && (
                    <span className={`text-[12px] ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>
                      {isSoldOut ? 'Sold out' : `${available} left`}
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
                    className={`w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
                      isDarkMode
                        ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        : 'bg-black/10 text-zinc-600 hover:bg-black/20 hover:text-zinc-900'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  <span className={`w-8 text-center text-[16px] font-medium ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => {
                      const maxQuantity = available === -1 ? 10 : available;
                      setTicketQuantity(tier.id, tier.name, Math.min(maxQuantity, quantity + 1), tier.price);
                    }}
                    disabled={available !== -1 && quantity >= available}
                    className={`w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
                      isDarkMode
                        ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        : 'bg-black/10 text-zinc-600 hover:bg-black/20 hover:text-zinc-900'
                    }`}
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

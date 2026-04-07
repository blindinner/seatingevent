'use client';

import { useState, useEffect } from 'react';
import type { TicketTier, EventLanguage } from '@/types/event';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';
import { useTranslation } from '@/lib/translations';

interface TicketTierCardProps {
  tier: TicketTier;
  currency: string;
  onChange: (tier: TicketTier) => void;
  onDelete: () => void;
  canDelete: boolean;
  defaultExpanded?: boolean;
  isDarkMode?: boolean;
  language?: EventLanguage;
}

export function TicketTierCard({ tier, currency, onChange, onDelete, canDelete, defaultExpanded = false, isDarkMode = true, language = 'en' }: TicketTierCardProps) {
  const { t } = useTranslation(language);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Local state for price input to allow free typing
  const [priceInput, setPriceInput] = useState(() =>
    tier.price === 0 ? '' : tier.price.toString()
  );

  // Local state for quantity input
  const [quantityInput, setQuantityInput] = useState(() =>
    tier.quantity === -1 ? '' : tier.quantity.toString()
  );

  // Sync local state when tier prop changes (e.g., from parent reset)
  useEffect(() => {
    setPriceInput(tier.price === 0 ? '' : tier.price.toString());
  }, [tier.price, currency]);

  useEffect(() => {
    setQuantityInput(tier.quantity === -1 ? '' : tier.quantity.toString());
  }, [tier.quantity]);

  const formatQuantity = (qty: number) => {
    if (qty === -1) return t('unlimited');
    return `${qty} ${t('available')}`;
  };

  const handlePriceBlur = () => {
    const price = parseFloat(priceInput) || 0;
    onChange({ ...tier, price });
    setPriceInput(price === 0 ? '' : price.toString());
  };

  const handleQuantityBlur = () => {
    // Convert to number on blur
    if (quantityInput === '') {
      onChange({ ...tier, quantity: -1 });
    } else {
      const qty = parseInt(quantityInput) || 0;
      onChange({ ...tier, quantity: qty });
      setQuantityInput(qty === 0 ? '' : qty.toString());
    }
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
      {/* Collapsed Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
            <svg className={`w-4 h-4 ${isDarkMode ? 'text-white/50' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          <div className="text-left">
            <p className={`text-[14px] font-medium ${isDarkMode ? 'text-white/90' : 'text-zinc-800'}`}>{tier.name || t('untitledTier')}</p>
            <p className={`text-[12px] ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>
              {formatCurrency(tier.price, currency)} · {formatQuantity(tier.quantity)}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isDarkMode ? 'text-white/30' : 'text-zinc-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={`px-4 pb-4 pt-2 space-y-4 border-t ${isDarkMode ? 'border-white/[0.04]' : 'border-black/[0.04]'}`}>
          {/* Tier Name */}
          <div>
            <label className={`block text-[12px] mb-1.5 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('tierNameLabel')}</label>
            <input
              type="text"
              value={tier.name}
              onChange={(e) => onChange({ ...tier, name: e.target.value })}
              placeholder={t('tierNamePlaceholder')}
              className={`w-full px-3 py-2 text-[14px] rounded-lg focus:outline-none transition-colors ${
                isDarkMode
                  ? 'text-white/90 placeholder:text-white/30 bg-white/[0.06] border border-white/[0.06] focus:border-white/20'
                  : 'text-zinc-800 placeholder:text-zinc-400 bg-black/[0.04] border border-black/[0.06] focus:border-black/20'
              }`}
            />
          </div>

          {/* Price and Quantity Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Price */}
            <div>
              <label className={`block text-[12px] mb-1.5 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('price')}</label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[14px] ${isDarkMode ? 'text-white/40' : 'text-zinc-400'}`}>{getCurrencySymbol(currency)}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={handlePriceBlur}
                  placeholder="0"
                  className={`w-full pl-7 pr-3 py-2 text-[14px] rounded-lg focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'text-white/90 placeholder:text-white/30 bg-white/[0.06] border border-white/[0.06] focus:border-white/20'
                      : 'text-zinc-800 placeholder:text-zinc-400 bg-black/[0.04] border border-black/[0.06] focus:border-black/20'
                  }`}
                />
              </div>
              {tier.price === 0 && (
                <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-white/30' : 'text-zinc-400'}`}>{t('leaveEmptyForFree')}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className={`block text-[12px] mb-1.5 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('quantity')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                onBlur={handleQuantityBlur}
                placeholder={t('unlimited')}
                className={`w-full px-3 py-2 text-[14px] rounded-lg focus:outline-none transition-colors ${
                  isDarkMode
                    ? 'text-white/90 placeholder:text-white/30 bg-white/[0.06] border border-white/[0.06] focus:border-white/20'
                    : 'text-zinc-800 placeholder:text-zinc-400 bg-black/[0.04] border border-black/[0.06] focus:border-black/20'
                }`}
              />
              {tier.quantity === -1 && (
                <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-white/30' : 'text-zinc-400'}`}>{t('leaveEmptyForUnlimited')}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={`block text-[12px] mb-1.5 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('descriptionOptional')}</label>
            <textarea
              value={tier.description || ''}
              onChange={(e) => onChange({ ...tier, description: e.target.value })}
              placeholder={t('whatsIncluded')}
              rows={2}
              className={`w-full px-3 py-2 text-[14px] rounded-lg focus:outline-none transition-colors resize-none ${
                isDarkMode
                  ? 'text-white/90 placeholder:text-white/30 bg-white/[0.06] border border-white/[0.06] focus:border-white/20'
                  : 'text-zinc-800 placeholder:text-zinc-400 bg-black/[0.04] border border-black/[0.06] focus:border-black/20'
              }`}
            />
          </div>

          {/* Delete Button */}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-2 text-[13px] text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {t('removeTier')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

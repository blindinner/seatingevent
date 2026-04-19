'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export interface TicketTier {
  id: string;
  name: string;
  price: number;
  description?: string;
  available: number; // -1 = unlimited
}

export interface InlineWidgetTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

export interface InlineTicketWidgetProps {
  // Event info
  eventId: string;
  eventName: string;
  venueName?: string;
  date: string; // ISO date
  time: string; // HH:mm

  // Tickets
  ticketTiers: TicketTier[];
  currency?: string;

  // Features
  showPromoCode?: boolean;
  showMemberLogin?: boolean;
  memberLoginUrl?: string;

  // Theming
  theme?: InlineWidgetTheme;
  language?: 'en' | 'he';

  // Callbacks
  onCheckout?: (selection: { tierId: string; quantity: number; price: number }[], promoCode?: string) => void;
  checkoutUrl?: string;
}

// Helpers
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function formatCurrency(amount: number, currency: string = 'ILS'): string {
  if (currency === 'ILS') return `₪${amount}`;
  if (currency === 'USD') return `$${amount}`;
  if (currency === 'EUR') return `€${amount}`;
  return `${amount} ${currency}`;
}

function formatDate(dateStr: string, language: 'en' | 'he' = 'he'): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  };
  return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', options);
}

function formatTime(time: string): string {
  return time; // Already in HH:mm format
}

// Translations
const translations = {
  en: {
    checkout: 'Continue to Checkout',
    memberLogin: 'Member Login',
    promoCodePlaceholder: 'Have a promo code?',
    soldOut: 'Sold out',
    left: 'left',
    free: 'Free',
    poweredBy: 'Powered by',
    selectTickets: 'Select tickets to continue',
    total: 'Total',
  },
  he: {
    checkout: 'המשך לתשלום',
    memberLogin: 'התחברות מנויים',
    promoCodePlaceholder: 'יש לך קוד הנחה?',
    soldOut: 'אזל',
    left: 'נותרו',
    free: 'חינם',
    poweredBy: 'מופעל על ידי',
    selectTickets: 'בחר כרטיסים להמשך',
    total: 'סה"כ',
  },
};

export function InlineTicketWidget({
  eventId,
  eventName,
  venueName,
  date,
  time,
  ticketTiers,
  currency = 'ILS',
  showPromoCode = true,
  showMemberLogin = false,
  memberLoginUrl,
  theme = {},
  language = 'he',
  onCheckout,
  checkoutUrl,
}: InlineTicketWidgetProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);

  const t = translations[language];
  const isRtl = language === 'he';

  // Theme
  const primaryColor = theme.primaryColor || '#dc2626';
  const backgroundColor = theme.backgroundColor || '#ffffff';
  const textColor = theme.textColor || '#1a1a1a';
  const borderRadius = theme.borderRadius || '16px';
  const fontFamily = theme.fontFamily || 'inherit';

  const isDark = !isLightColor(backgroundColor);
  const buttonTextColor = isLightColor(primaryColor) ? '#000' : '#fff';

  // Calculate total
  const totalAmount = ticketTiers.reduce((sum, tier) => {
    return sum + (quantities[tier.id] || 0) * tier.price;
  }, 0);

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleQuantityChange = (tierId: string, delta: number) => {
    const tier = ticketTiers.find(t => t.id === tierId);
    if (!tier) return;

    const current = quantities[tierId] || 0;
    const newQty = Math.max(0, current + delta);

    // Check availability
    if (tier.available !== -1 && newQty > tier.available) return;

    // Max 10 per tier
    if (newQty > 10) return;

    setQuantities(prev => ({ ...prev, [tierId]: newQty }));
  };

  const handleCheckout = () => {
    if (totalTickets === 0) return;

    const selection = ticketTiers
      .filter(tier => quantities[tier.id] > 0)
      .map(tier => ({
        tierId: tier.id,
        quantity: quantities[tier.id],
        price: tier.price,
      }));

    if (onCheckout) {
      onCheckout(selection, promoCode || undefined);
    } else if (checkoutUrl) {
      // Build URL with params
      const params = new URLSearchParams();
      params.set('event', eventId);
      params.set('tickets', JSON.stringify(selection));
      if (promoCode) params.set('promo', promoCode);
      window.location.href = `${checkoutUrl}?${params.toString()}`;
    }
  };

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor,
        borderRadius,
        fontFamily,
        direction: isRtl ? 'rtl' : 'ltr',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 text-center border-b"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        }}
      >
        <h2
          className="text-xl font-bold mb-3"
          style={{ color: isDark ? '#fff' : textColor }}
        >
          {eventName}
        </h2>

        <div
          className="flex items-center justify-center gap-4 text-sm"
          style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
        >
          {venueName && (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {venueName}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDate(date, language)} · {formatTime(time)}
          </span>
        </div>
      </div>

      {/* Member Login Bar */}
      {showMemberLogin && (
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <a
            href={memberLoginUrl || '#'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: primaryColor,
              color: buttonTextColor,
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {t.memberLogin}
          </a>

          {/* Promo code toggle */}
          {showPromoCode && (
            <button
              onClick={() => setPromoExpanded(!promoExpanded)}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
              }}
            >
              {t.promoCodePlaceholder}
            </button>
          )}
        </div>
      )}

      {/* Promo Code Expanded */}
      <AnimatePresence>
        {promoExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="px-6 py-3 border-b"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
            >
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={t.promoCodePlaceholder}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: isDark ? '#fff' : textColor,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Tiers */}
      <div className="p-6 space-y-3">
        {ticketTiers.map((tier) => {
          const qty = quantities[tier.id] || 0;
          const isSoldOut = tier.available === 0;

          return (
            <div
              key={tier.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl transition-all"
              style={{
                backgroundColor: qty > 0
                  ? `${primaryColor}10`
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: qty > 0
                  ? `2px solid ${primaryColor}40`
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                opacity: isSoldOut ? 0.5 : 1,
              }}
            >
              {/* Tier Info */}
              <div className="flex-1">
                <div
                  className="font-medium"
                  style={{ color: isDark ? '#fff' : textColor }}
                >
                  {tier.name}
                </div>
                {tier.description && (
                  <div
                    className="text-sm mt-0.5"
                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                  >
                    {tier.description}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-lg font-semibold"
                    style={{ color: isDark ? '#fff' : textColor }}
                  >
                    {tier.price === 0 ? t.free : formatCurrency(tier.price, currency)}
                  </span>
                  {tier.available !== -1 && tier.available > 0 && tier.available <= 10 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(245,158,11,0.15)',
                        color: '#d97706',
                      }}
                    >
                      {tier.available} {t.left}
                    </span>
                  )}
                  {isSoldOut && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(239,68,68,0.15)',
                        color: '#dc2626',
                      }}
                    >
                      {t.soldOut}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              {!isSoldOut && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleQuantityChange(tier.id, -1)}
                    disabled={qty === 0}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      color: isDark ? '#fff' : textColor,
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>

                  <span
                    className="w-12 text-center text-lg font-semibold"
                    style={{ color: isDark ? '#fff' : textColor }}
                  >
                    {qty}
                  </span>

                  <button
                    onClick={() => handleQuantityChange(tier.id, 1)}
                    disabled={tier.available !== -1 && qty >= tier.available}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      color: isDark ? '#fff' : textColor,
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-5 border-t"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        }}
      >
        {/* Total */}
        {totalTickets > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-sm"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
            >
              {t.total} ({totalTickets})
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: isDark ? '#fff' : textColor }}
            >
              {formatCurrency(totalAmount, currency)}
            </span>
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={totalTickets === 0}
          className="w-full py-4 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: totalTickets > 0 ? primaryColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            color: totalTickets > 0 ? buttonTextColor : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            cursor: totalTickets > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          {totalTickets > 0 ? (
            <>
              {t.checkout}
              <svg className="w-5 h-5" style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          ) : (
            t.selectTickets
          )}
        </button>

        {/* Powered by */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <span
            className="text-xs"
            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
          >
            {t.poweredBy}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
          >
            Seated
          </span>
        </div>
      </div>
    </div>
  );
}

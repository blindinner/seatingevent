'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/currency';
import Script from 'next/script';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import type { WhiteLabelTheme } from '@/types/whiteLabel';
import type { EventLanguage } from '@/types/event';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { useTranslation } from '@/lib/translations';

// Helper to determine if a color is light or dark based on luminance
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

interface SelectedSeat {
  seatId: string;
  label: string;
  category: string;
  price: number;
}

interface SelectedTicket {
  tierId: string;
  tierName: string;
  quantity: number;
  price: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  selectedSeats: SelectedSeat[];
  selectedTickets?: SelectedTicket[];
  totalPrice: number;
  currency: string;
  themeColor: string;
  onSuccess?: () => void;
  error?: string | null;
  whiteLabelTheme?: WhiteLabelTheme | null;
  language?: EventLanguage;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

type CheckoutStep = 'info' | 'payment' | 'demo' | 'success';

// Extend window for AllPay SDK
declare global {
  interface Window {
    AllpayPayment: new (config: {
      iframeId: string;
      onSuccess: () => void;
      onError: (errorN: string, errorMsg: string) => void;
    }) => {
      pay: () => void;
    };
  }
}

export function CheckoutModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  eventDate,
  eventTime,
  selectedSeats,
  selectedTickets = [],
  totalPrice,
  currency,
  themeColor,
  onSuccess,
  error: externalError,
  whiteLabelTheme,
  language = 'en',
}: CheckoutModalProps) {
  const { t, isRtl, dir } = useTranslation(language);
  const isDarkMode = useMemo(() => !isLightColor(themeColor), [themeColor]);
  const isFreeEvent = totalPrice === 0;
  const isGAEvent = selectedTickets.length > 0;
  const totalItems = isGAEvent
    ? selectedTickets.reduce((sum, t) => sum + t.quantity, 0)
    : selectedSeats.length;
  const [step, setStep] = useState<CheckoutStep>('info');
  const [formData, setFormData] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [allpayLoaded, setAllpayLoaded] = useState(false);
  const allpayInstanceRef = useRef<{ pay: () => void } | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('info');
      setPaymentUrl(null);
      setOrderId(null);
      setPaymentError(null);
      setIsPaymentProcessing(false);
      allpayInstanceRef.current = null;
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPaymentProcessing) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isPaymentProcessing]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Initialize AllPay SDK when iframe loads
  const initializeAllpay = useCallback(() => {
    if (!allpayLoaded || !paymentUrl || step !== 'payment') return;

    // Small delay to ensure iframe is ready
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.AllpayPayment) {
        try {
          allpayInstanceRef.current = new window.AllpayPayment({
            iframeId: 'allpay-payment-iframe',
            onSuccess: () => {
              console.log('Payment successful!');
              setIsPaymentProcessing(false);
              setStep('success');
              onSuccess?.();
            },
            onError: (errorN: string, errorMsg: string) => {
              console.error('Payment error:', errorN, errorMsg);
              setIsPaymentProcessing(false);
              setPaymentError(`Payment failed: ${errorMsg}`);
            },
          });
          console.log('AllPay SDK initialized');
        } catch (err) {
          console.error('Failed to initialize AllPay:', err);
        }
      }
    }, 500);
  }, [allpayLoaded, paymentUrl, step, onSuccess]);

  useEffect(() => {
    initializeAllpay();
  }, [initializeAllpay]);

  // Fire confetti when demo step appears
  useEffect(() => {
    if (step === 'demo') {
      // Fire confetti from both sides with high z-index to appear above modal
      const duration = 1000;
      const end = Date.now() + duration;

      const frame = () => {
        // Left side
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
          zIndex: 10001,
        });
        // Right side
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
          zIndex: 10001,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [step]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // For free events, register directly without payment
      if (isFreeEvent) {
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            eventName,
            selectedSeats: selectedSeats.map(seat => ({
              seatId: seat.seatId,
              label: seat.label,
              category: seat.category,
              price: seat.price,
            })),
            selectedTickets: selectedTickets.map(ticket => ({
              tierId: ticket.tierId,
              tierName: ticket.tierName,
              quantity: ticket.quantity,
              price: ticket.price,
            })),
            customer: formData,
            currency,
            isFreeRegistration: true,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setPaymentError(data.error || 'Failed to register');
          return;
        }

        // Skip payment step, go directly to success
        setStep('success');
        onSuccess?.();
        return;
      }

      // Paid event - create payment
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          eventName,
          selectedSeats: selectedSeats.map(seat => ({
            seatId: seat.seatId,
            label: seat.label,
            category: seat.category,
            price: seat.price,
          })),
          selectedTickets: selectedTickets.map(ticket => ({
            tierId: ticket.tierId,
            tierName: ticket.tierName,
            quantity: ticket.quantity,
            price: ticket.price,
          })),
          customer: formData,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPaymentError(data.error || 'Failed to create payment');
        return;
      }

      // Check if this is a demo event
      if (data.isDemo) {
        setOrderId(data.orderId);
        setStep('demo');
        return;
      }

      setPaymentUrl(data.paymentUrl);
      setOrderId(data.orderId);
      setStep('payment');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayClick = () => {
    if (allpayInstanceRef.current) {
      setIsPaymentProcessing(true);
      setPaymentError(null);
      allpayInstanceRef.current.pay();
    } else {
      setPaymentError('Payment system not ready. Please wait and try again.');
    }
  };

  const handleChange = (field: keyof CustomerInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClose = () => {
    if (!isPaymentProcessing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayError = externalError || paymentError;

  return createPortal(
    <>
      {/* AllPay SDK Script */}
      <Script
        src="https://allpay.to/js/allpay-hf.js"
        onLoad={() => {
          console.log('AllPay SDK loaded');
          setAllpayLoaded(true);
        }}
        strategy="lazyOnload"
      />

      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <div
          className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: themeColor }}
          dir={dir}
        >
          {/* Header */}
          <div className={`px-8 pt-8 pb-6 border-b ${isDarkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
            {/* White-label logo */}
            {whiteLabelTheme?.navLogoUrl && (
              <div className="mb-5">
                <img
                  src={whiteLabelTheme.navLogoUrl}
                  alt={whiteLabelTheme.name}
                  className="max-h-10 w-auto"
                />
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h2 className={`text-[22px] font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                  {step === 'info' && t('checkout')}
                  {step === 'payment' && t('paymentDetails')}
                  {step === 'demo' && t('demoEvent')}
                  {step === 'success' && t('paymentSuccessful')}
                </h2>
                <p className={`text-[14px] mt-1 ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>{eventName}</p>
              </div>
              {!isPaymentProcessing && step !== 'success' && (
                <button
                  onClick={handleClose}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors -mr-2 -mt-2 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                >
                  <svg className={`w-5 h-5 ${isDarkMode ? 'text-white/60' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
            {/* Order Summary - Show on info and payment steps */}
            {step !== 'success' && (
              <div className="mb-8">
                <h3 className={`text-[12px] uppercase tracking-wider font-medium mb-4 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('orderSummary')}</h3>
                <div className={`rounded-xl p-4 ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                  <div className={`flex items-center gap-3 mb-4 pb-4 border-b ${isDarkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-white/[0.08]' : 'bg-black/[0.06]'}`}>
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-white/60' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className={`text-[15px] font-medium ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{totalItems} {totalItems !== 1 ? t('tickets') : t('ticket')}</p>
                      <p className={`text-[13px] ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>{eventDate} · {eventTime}</p>
                    </div>
                  </div>

                  {/* Seat list (for seated events) */}
                  {selectedSeats.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedSeats.map((seat) => (
                        <div key={seat.seatId} className="flex justify-between text-[14px]">
                          <span className={isDarkMode ? 'text-white/70' : 'text-zinc-700'}>{seat.label}</span>
                          <span className={isDarkMode ? 'text-white/50' : 'text-zinc-500'}>{formatCurrency(seat.price, currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ticket list (for GA events) */}
                  {selectedTickets.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedTickets.map((ticket) => (
                        <div key={ticket.tierId} className="flex justify-between text-[14px]">
                          <span className={isDarkMode ? 'text-white/70' : 'text-zinc-700'}>{ticket.tierName} × {ticket.quantity}</span>
                          <span className={isDarkMode ? 'text-white/50' : 'text-zinc-500'}>
                            {ticket.price === 0 ? t('free') : formatCurrency(ticket.price * ticket.quantity, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  <div className={`flex justify-between pt-4 border-t ${isDarkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                    <span className={`text-[16px] font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{t('total')}</span>
                    <span className={`text-[16px] font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                      {isFreeEvent ? t('free') : formatCurrency(totalPrice, currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {displayError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-[14px] text-red-400">{displayError}</p>
                </div>
              </div>
            )}

            {/* Step 1: Customer Information Form */}
            {step === 'info' && (
              <form onSubmit={handleInfoSubmit}>
                <h3 className={`text-[12px] uppercase tracking-wider font-medium mb-4 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('yourInformation')}</h3>

                <div className="space-y-4">
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[13px] mb-2 ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>{t('firstName')}</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange('firstName')}
                        className={`w-full h-12 px-4 rounded-xl border text-[15px] focus:outline-none focus:ring-2 transition-all ${
                          isDarkMode
                            ? 'bg-white/[0.08] text-white placeholder:text-white/30 focus:ring-white/20'
                            : 'bg-black/[0.04] text-zinc-900 placeholder:text-zinc-400 focus:ring-black/20'
                        } ${errors.firstName ? 'border-red-500/50' : 'border-transparent'}`}
                        placeholder="John"
                      />
                      {errors.firstName && (
                        <p className="text-[12px] text-red-400 mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-[13px] mb-2 ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>{t('lastName')}</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange('lastName')}
                        className={`w-full h-12 px-4 rounded-xl border text-[15px] focus:outline-none focus:ring-2 transition-all ${
                          isDarkMode
                            ? 'bg-white/[0.08] text-white placeholder:text-white/30 focus:ring-white/20'
                            : 'bg-black/[0.04] text-zinc-900 placeholder:text-zinc-400 focus:ring-black/20'
                        } ${errors.lastName ? 'border-red-500/50' : 'border-transparent'}`}
                        placeholder="Doe"
                      />
                      {errors.lastName && (
                        <p className="text-[12px] text-red-400 mt-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className={`block text-[13px] mb-2 ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>{t('email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={handleChange('email')}
                      className={`w-full h-12 px-4 rounded-xl border text-[15px] focus:outline-none focus:ring-2 transition-all ${
                        isDarkMode
                          ? 'bg-white/[0.08] text-white placeholder:text-white/30 focus:ring-white/20'
                          : 'bg-black/[0.04] text-zinc-900 placeholder:text-zinc-400 focus:ring-black/20'
                      } ${errors.email ? 'border-red-500/50' : 'border-transparent'}`}
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="text-[12px] text-red-400 mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={`block text-[13px] mb-2 ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>{t('phone')}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange('phone')}
                      className={`w-full h-12 px-4 rounded-xl border text-[15px] focus:outline-none focus:ring-2 transition-all ${
                        isDarkMode
                          ? 'bg-white/[0.08] text-white placeholder:text-white/30 focus:ring-white/20'
                          : 'bg-black/[0.04] text-zinc-900 placeholder:text-zinc-400 focus:ring-black/20'
                      } ${errors.phone ? 'border-red-500/50' : 'border-transparent'}`}
                      placeholder="+1 (555) 000-0000"
                    />
                    {errors.phone && (
                      <p className="text-[12px] text-red-400 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full h-14 mt-8 text-[16px] font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isDarkMode
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('processing')}
                    </span>
                  ) : isFreeEvent ? (
                    t('register')
                  ) : (
                    `${t('continueToPayment')} · ${formatCurrency(totalPrice, currency)}`
                  )}
                </button>

                <p className={`text-center text-[12px] mt-4 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>
                  {t('termsAgreement')}
                </p>
              </form>
            )}

            {/* Step 2: Payment Form (AllPay Hosted Fields) */}
            {step === 'payment' && paymentUrl && (
              <div>
                <h3 className={`text-[12px] uppercase tracking-wider font-medium mb-4 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('cardDetails')}</h3>

                {/* AllPay iframe */}
                <div className="mb-6">
                  <iframe
                    id="allpay-payment-iframe"
                    src={paymentUrl}
                    className="w-full border-0"
                    style={{ height: '320px', background: 'transparent' }}
                    allow="payment *"
                    // @ts-expect-error - allowtransparency is a valid HTML attribute
                    allowtransparency="true"
                    onLoad={initializeAllpay}
                  />
                </div>

                {/* Pay Button */}
                <button
                  type="button"
                  onClick={handlePayClick}
                  disabled={isPaymentProcessing || !allpayLoaded}
                  className={`w-full h-14 text-[16px] font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isDarkMode
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {isPaymentProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('processingPayment')}
                    </span>
                  ) : (
                    `${t('pay')} ${formatCurrency(totalPrice, currency)}`
                  )}
                </button>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep('info');
                    setPaymentUrl(null);
                    setPaymentError(null);
                  }}
                  disabled={isPaymentProcessing}
                  className={`w-full h-12 mt-3 text-[14px] font-medium disabled:opacity-50 transition-colors ${
                    isDarkMode ? 'text-white/60 hover:text-white/80' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {isRtl ? `${t('backToInformation')} →` : `← ${t('backToInformation')}`}
                </button>

                <p className={`text-center text-[12px] mt-4 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>
                  {t('securePayment')}
                </p>
              </div>
            )}

            {/* Demo Event Message */}
            {step === 'demo' && (
              <div className="text-center py-4">
                {/* Animated success icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/30"
                >
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>

                {/* Main message */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <h2 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                    {formData.firstName ? `${formData.firstName}, you just experienced` : 'You just experienced'}
                  </h2>
                  <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                    the future of your events
                  </h2>
                </motion.div>

                {/* What they selected - fun version */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`rounded-2xl p-4 mb-4 ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}
                >
                  {selectedSeats.length > 0 && (
                    <p className={`text-[15px] ${isDarkMode ? 'text-white/90' : 'text-zinc-800'}`}>
                      Your guests picked <span className="font-bold">{selectedSeats.map(s => s.label).join(', ')}</span>
                      <br />
                      <span className={`text-[13px] ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>
                        (and loved every second of it)
                      </span>
                    </p>
                  )}
                  {selectedTickets.length > 0 && (
                    <p className={`text-[15px] ${isDarkMode ? 'text-white/90' : 'text-zinc-800'}`}>
                      Your guests grabbed{' '}
                      <span className="font-bold">
                        {selectedTickets.map(t => `${t.quantity}x ${t.tierName}`).join(', ')}
                      </span>
                      <br />
                      <span className={`text-[13px] ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>
                        (and loved every second of it)
                      </span>
                    </p>
                  )}
                </motion.div>

                {/* Quick benefits - with icons instead of emojis */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center gap-3 mb-5"
                >
                  {[
                    { icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ), text: 'Fast checkout' },
                    { icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    ), text: 'Seat selection' },
                    { icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ), text: 'Mobile-first' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-white/[0.04]' : 'bg-black/[0.03]'}`}
                    >
                      <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>{item.icon}</span>
                      <span className={`text-[11px] font-medium ${isDarkMode ? 'text-white/60' : 'text-zinc-500'}`}>{item.text}</span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* CTA Section - Both buttons highlighted */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="rounded-2xl p-5 mb-4 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border border-purple-500/20"
                >
                  <p className={`text-[15px] mb-1 ${isDarkMode ? 'text-white/90' : 'text-zinc-800'}`}>
                    Ready to wow <span className="font-semibold">your</span> audience?
                  </p>
                  <p className={`text-[13px] mb-4 ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>
                    Let&apos;s make it happen together
                  </p>

                  <div className="flex gap-3">
                    {/* Book a Call Button */}
                    <motion.a
                      href="https://calendly.com/benji-rendeza/30min"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t('bookACall')}
                    </motion.a>

                    {/* WhatsApp Button - Now highlighted too */}
                    <motion.a
                      href="https://wa.me/972542645588"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      {t('whatsapp')}
                    </motion.a>
                  </div>

                  <p className={`text-[12px] mt-3 ${isDarkMode ? 'text-white/40' : 'text-zinc-400'}`}>
                    No commitment, just a friendly chat
                  </p>
                </motion.div>

                {/* Fun closer */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className={`text-[12px] mb-3 ${isDarkMode ? 'text-white/40' : 'text-zinc-400'}`}
                >
                  P.S. Yes, this whole experience can be yours
                </motion.p>

                <button
                  type="button"
                  onClick={onClose}
                  className={`text-[13px] font-medium transition-colors ${
                    isDarkMode
                      ? 'text-white/40 hover:text-white/60'
                      : 'text-zinc-400 hover:text-zinc-500'
                  }`}
                >
                  Maybe later
                </button>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div className="text-center py-8">
                {/* White-label logo */}
                {whiteLabelTheme?.navLogoUrl && (
                  <div className="mb-6">
                    <img
                      src={whiteLabelTheme.navLogoUrl}
                      alt={whiteLabelTheme.name}
                      className="max-h-12 w-auto mx-auto"
                    />
                  </div>
                )}

                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h3 className={`text-[20px] font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{t('youreGoing')}</h3>
                <p className={`text-[15px] mb-6 ${isDarkMode ? 'text-white/60' : 'text-zinc-600'}`}>
                  {t('ticketsConfirmed')}
                </p>

                <div className={`rounded-xl p-5 mb-6 ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                  <p className={`text-[13px] mb-2 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('confirmationSentTo')}</p>
                  <p className={`text-[16px] font-medium ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{formData.email}</p>
                </div>

                {/* Social Links */}
                {whiteLabelTheme?.socialLinks && (
                  <div className="mb-6">
                    <p className={`text-[13px] mb-3 ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>{t('followUs')}</p>
                    <SocialLinks links={whiteLabelTheme.socialLinks} className="justify-center" iconSize="md" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full h-14 text-[16px] font-semibold rounded-full transition-colors ${
                    isDarkMode
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {t('done')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

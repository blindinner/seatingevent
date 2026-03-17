'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/currency';
import Script from 'next/script';

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
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

type CheckoutStep = 'info' | 'payment' | 'success';

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
}: CheckoutModalProps) {
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
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[22px] font-bold text-white">
                  {step === 'info' && 'Complete Your Order'}
                  {step === 'payment' && 'Payment Details'}
                  {step === 'success' && 'Payment Successful!'}
                </h2>
                <p className="text-[14px] text-white/50 mt-1">{eventName}</p>
              </div>
              {!isPaymentProcessing && step !== 'success' && (
                <button
                  onClick={handleClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors -mr-2 -mt-2"
                >
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <h3 className="text-[12px] text-white/40 uppercase tracking-wider font-medium mb-4">Order Summary</h3>
                <div className="rounded-xl bg-white/[0.06] p-4">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
                    <div className="w-12 h-12 rounded-lg bg-white/[0.08] flex items-center justify-center">
                      <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-white font-medium">{totalItems} Ticket{totalItems !== 1 ? 's' : ''}</p>
                      <p className="text-[13px] text-white/50">{eventDate} · {eventTime}</p>
                    </div>
                  </div>

                  {/* Seat list (for seated events) */}
                  {selectedSeats.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedSeats.map((seat) => (
                        <div key={seat.seatId} className="flex justify-between text-[14px]">
                          <span className="text-white/70">{seat.label}</span>
                          <span className="text-white/50">{formatCurrency(seat.price, currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ticket list (for GA events) */}
                  {selectedTickets.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedTickets.map((ticket) => (
                        <div key={ticket.tierId} className="flex justify-between text-[14px]">
                          <span className="text-white/70">{ticket.tierName} × {ticket.quantity}</span>
                          <span className="text-white/50">
                            {ticket.price === 0 ? 'Free' : formatCurrency(ticket.price * ticket.quantity, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                    <span className="text-[16px] font-semibold text-white">Total</span>
                    <span className="text-[16px] font-semibold text-white">
                      {isFreeEvent ? 'Free' : formatCurrency(totalPrice, currency)}
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
                <h3 className="text-[12px] text-white/40 uppercase tracking-wider font-medium mb-4">Your Information</h3>

                <div className="space-y-4">
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] text-white/60 mb-2">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange('firstName')}
                        className={`w-full h-12 px-4 rounded-xl bg-white/[0.08] border text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all ${
                          errors.firstName ? 'border-red-500/50' : 'border-transparent'
                        }`}
                        placeholder="John"
                      />
                      {errors.firstName && (
                        <p className="text-[12px] text-red-400 mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] text-white/60 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange('lastName')}
                        className={`w-full h-12 px-4 rounded-xl bg-white/[0.08] border text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all ${
                          errors.lastName ? 'border-red-500/50' : 'border-transparent'
                        }`}
                        placeholder="Doe"
                      />
                      {errors.lastName && (
                        <p className="text-[12px] text-red-400 mt-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[13px] text-white/60 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={handleChange('email')}
                      className={`w-full h-12 px-4 rounded-xl bg-white/[0.08] border text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all ${
                        errors.email ? 'border-red-500/50' : 'border-transparent'
                      }`}
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="text-[12px] text-red-400 mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[13px] text-white/60 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange('phone')}
                      className={`w-full h-12 px-4 rounded-xl bg-white/[0.08] border text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all ${
                        errors.phone ? 'border-red-500/50' : 'border-transparent'
                      }`}
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
                  className="w-full h-14 mt-8 text-[16px] font-semibold rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isFreeEvent ? 'Registering...' : 'Processing...'}
                    </span>
                  ) : isFreeEvent ? (
                    'Complete Registration'
                  ) : (
                    `Continue to Payment · ${formatCurrency(totalPrice, currency)}`
                  )}
                </button>

                <p className="text-center text-[12px] text-white/40 mt-4">
                  By completing this purchase you agree to our Terms of Service
                </p>
              </form>
            )}

            {/* Step 2: Payment Form (AllPay Hosted Fields) */}
            {step === 'payment' && paymentUrl && (
              <div>
                <h3 className="text-[12px] text-white/40 uppercase tracking-wider font-medium mb-4">Card Details</h3>

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
                  className="w-full h-14 text-[16px] font-semibold rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPaymentProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing Payment...
                    </span>
                  ) : (
                    `Pay ${formatCurrency(totalPrice, currency)}`
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
                  className="w-full h-12 mt-3 text-[14px] font-medium text-white/60 hover:text-white/80 disabled:opacity-50 transition-colors"
                >
                  ← Back to Information
                </button>

                <p className="text-center text-[12px] text-white/40 mt-4">
                  Secure payment powered by AllPay
                </p>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h3 className="text-[20px] font-bold text-white mb-2">You&apos;re going!</h3>
                <p className="text-[15px] text-white/60 mb-6">
                  Your tickets have been confirmed. Check your email for details.
                </p>

                <div className="rounded-xl bg-white/[0.06] p-5 mb-6">
                  <p className="text-[13px] text-white/40 mb-2">Confirmation sent to</p>
                  <p className="text-[16px] text-white font-medium">{formData.email}</p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-14 text-[16px] font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-colors"
                >
                  Done
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

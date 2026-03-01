import { useState, useCallback } from 'react';
import { useWidgetStore } from '../stores/widgetStore';
import { ApiClient } from '../api/client';

interface SelectionPanelProps {
  apiClient: ApiClient;
  eventId: string;
}

export function SelectionPanel({ apiClient, eventId }: SelectionPanelProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const {
    config,
    event,
    selectedSeatIds,
    getSelectedSeats,
    setHold,
    setError,
  } = useWidgetStore();

  const selectedSeats = getSelectedSeats();
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);

  // Check if Stripe payments are enabled for this event
  const stripeEnabled = event?.stripeEnabled ?? false;

  const handleCheckout = useCallback(async () => {
    if (selectedSeats.length === 0) return;

    setIsCheckingOut(true);

    try {
      // Create hold for selected seats
      const seatIds = Array.from(selectedSeatIds);
      const holdResponse = await apiClient.holdSeats(eventId, seatIds);

      if (!holdResponse.success) {
        setError(holdResponse.error || 'Failed to hold seats');
        setIsCheckingOut(false);
        return;
      }

      // Store the hold info
      setHold(holdResponse.holdId!, holdResponse.expiresAt!);

      // If Stripe is enabled and no custom checkout handler, redirect to Stripe
      if (stripeEnabled && !config?.onCheckout) {
        // Create Stripe checkout session
        const checkoutResponse = await apiClient.createCheckout(
          eventId,
          holdResponse.holdId!,
          seatIds
        );

        if (!checkoutResponse.success || !checkoutResponse.checkoutUrl) {
          setError(checkoutResponse.error || 'Failed to create checkout session');
          setIsCheckingOut(false);
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = checkoutResponse.checkoutUrl;
        return;
      }

      // Invoke custom checkout callback if provided
      if (config?.onCheckout) {
        config.onCheckout(selectedSeats, holdResponse.holdId!);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to process checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  }, [selectedSeats, selectedSeatIds, apiClient, eventId, config, stripeEnabled, setHold, setError]);

  if (selectedSeats.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="smw-selection-panel">
      <div className="smw-selection-title">
        <span>Selected Seats</span>
        <span className="smw-selection-count">
          {selectedSeats.length} / {config?.maxSeats || 10}
        </span>
      </div>

      <div className="smw-selection-list">
        {selectedSeats.map((seat) => (
          <div key={seat.id} className="smw-selection-item">
            <div className="smw-selection-item-info">
              <span className="smw-selection-item-label">
                {seat.rowLabel ? `${seat.rowLabel} - ` : ''}
                {seat.label}
              </span>
              {seat.sectionLabel && (
                <span className="smw-selection-item-location">{seat.sectionLabel}</span>
              )}
            </div>
            {seat.price !== undefined && (
              <span className="smw-selection-item-price">{formatPrice(seat.price)}</span>
            )}
          </div>
        ))}
      </div>

      {totalPrice > 0 && (
        <div className="smw-selection-total">
          <span>Total</span>
          <span className="smw-selection-total-price">{formatPrice(totalPrice)}</span>
        </div>
      )}

      <button
        className="smw-checkout-button"
        onClick={handleCheckout}
        disabled={isCheckingOut}
      >
        {isCheckingOut
          ? 'Processing...'
          : stripeEnabled && !config?.onCheckout
          ? `Pay ${totalPrice > 0 ? formatPrice(totalPrice) : 'Now'}`
          : 'Checkout'}
      </button>
    </div>
  );
}

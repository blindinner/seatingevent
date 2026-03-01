/**
 * Client-side payment utilities
 * These run in the browser and call our API routes
 */

interface SelectedSeat {
  seatId: string;
  label: string;
  category: string;
  price: number;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface CreatePaymentParams {
  eventId: string;
  eventName: string;
  selectedSeats: SelectedSeat[];
  customer: CustomerInfo;
  currency: string;
}

interface CreatePaymentResult {
  success: boolean;
  orderId?: string;
  paymentUrl?: string;
  error?: string;
  unavailableSeats?: string[];
}

/**
 * Create a payment and get the AllPay payment URL
 */
export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  try {
    const response = await fetch('/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create payment',
        unavailableSeats: data.unavailableSeats,
      };
    }

    return {
      success: true,
      orderId: data.orderId,
      paymentUrl: data.paymentUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Redirect to AllPay payment page
 */
export function redirectToPayment(paymentUrl: string): void {
  window.location.href = paymentUrl;
}

/**
 * Create payment and redirect in one step
 */
export async function initiatePayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const result = await createPayment(params);

  if (result.success && result.paymentUrl) {
    redirectToPayment(result.paymentUrl);
  }

  return result;
}

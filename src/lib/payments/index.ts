import { createPayment, type PaymentItem, type AllPayConfig } from './allpay';

// Re-export types
export type { PaymentItem, AllPayConfig, WebhookPayload } from './allpay';
export { verifyWebhookSignature, getPaymentStatus, processRefund, TEST_CARDS } from './allpay';

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

interface CreateOrderParams {
  eventId: string;
  eventName: string;
  selectedSeats: SelectedSeat[];
  customer: CustomerInfo;
  currency: string;
}

interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  paymentUrl?: string;
  error?: string;
}

/**
 * Get AllPay configuration from environment
 */
export function getAllPayConfig(): AllPayConfig {
  const login = process.env.ALLPAY_LOGIN;
  const apiKey = process.env.ALLPAY_API_KEY;

  if (!login || !apiKey) {
    throw new Error('AllPay credentials not configured. Set ALLPAY_LOGIN and ALLPAY_API_KEY environment variables.');
  }

  return { login, apiKey };
}

/**
 * Check if we're in test mode
 */
export function isTestMode(): boolean {
  return process.env.ALLPAY_TEST_MODE === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Get the base URL for webhooks and redirects
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Create a payment for ticket purchase
 */
export async function createTicketPayment(params: CreateOrderParams): Promise<CreateOrderResult> {
  try {
    const config = getAllPayConfig();
    const baseUrl = getBaseUrl();

    // Generate a unique order ID
    const orderId = `order_${params.eventId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Convert seats to payment items
    const items: PaymentItem[] = params.selectedSeats.map(seat => ({
      name: `${params.eventName} - ${seat.label}`,
      price: seat.price,
      qty: 1,
      vat: 1, // Include VAT
    }));

    // Create the payment
    const result = await createPayment(config, {
      orderId,
      items,
      currency: params.currency as 'ILS' | 'USD' | 'EUR',
      webhookUrl: `${baseUrl}/api/payments/webhook`,
      successUrl: `${baseUrl}/api/payments/success?order_id=${orderId}`,
      cancelUrl: `${baseUrl}/api/payments/cancel?order_id=${orderId}`,
      customerName: `${params.customer.firstName} ${params.customer.lastName}`,
      customerEmail: params.customer.email,
      customerPhone: params.customer.phone,
      // Store event ID for webhook processing
      addField1: params.eventId,
      // Store seat IDs as JSON for webhook processing
      addField2: JSON.stringify(params.selectedSeats.map(s => s.seatId)),
      testMode: isTestMode(),
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      orderId,
      paymentUrl: result.paymentUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment',
    };
  }
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(
  totalAmount: number,
  feePercent: number = 5,
  fixedFee: number = 0
): number {
  const percentFee = totalAmount * (feePercent / 100);
  return Math.round((percentFee + fixedFee) * 100) / 100;
}

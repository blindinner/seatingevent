import crypto from 'crypto';

// AllPay API Configuration
const ALLPAY_API_BASE = 'https://allpay.to/app/';

export interface AllPayConfig {
  login: string;
  apiKey: string;
}

export interface PaymentItem {
  name: string;
  price: number; // in the payment currency (e.g., ILS)
  qty: number;
  vat?: number; // 1 = include VAT, 0 = no VAT
}

export interface CreatePaymentParams {
  orderId: string;
  items: PaymentItem[];
  currency?: 'ILS' | 'USD' | 'EUR';
  webhookUrl: string;
  successUrl: string;
  cancelUrl?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  // Custom fields that will be echoed back in webhook
  addField1?: string;
  addField2?: string;
  // Test mode
  testMode?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface WebhookPayload {
  order_id: string;
  amount: string | number;
  status: '0' | '1' | 0 | 1; // 0 = unpaid, 1 = paid (can be string or number)
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  card_mask?: string;
  card_brand?: string;
  foreign_card?: '0' | '1';
  inst?: string; // installment count
  currency: string;
  receipt?: string;
  sign: string;
  add_field_1?: string;
  add_field_2?: string;
  transaction_uid?: string;
}

export interface RefundParams {
  orderId: string;
  amount?: number; // Optional for partial refund
}

/**
 * Generate SHA256 signature for AllPay API requests
 *
 * Algorithm:
 * 1. Remove 'sign' parameter and empty values
 * 2. Sort all keys alphabetically (including nested items)
 * 3. Concatenate values with colons
 * 4. Append API key after final colon
 * 5. Apply SHA256 hash
 */
function generateSignature(params: Record<string, unknown>, apiKey: string): string {
  // Flatten and collect all values
  const values: string[] = [];

  function collectValues(obj: Record<string, unknown>, prefix = ''): void {
    const sortedKeys = Object.keys(obj).sort();

    for (const key of sortedKeys) {
      if (key === 'sign') continue;

      const value = obj[key];

      if (value === null || value === undefined || value === '') continue;

      if (Array.isArray(value)) {
        // For arrays (like items), process each element
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            collectValues(item as Record<string, unknown>, `${prefix}${key}[${index}].`);
          } else {
            values.push(String(item));
          }
        });
      } else if (typeof value === 'object') {
        collectValues(value as Record<string, unknown>, `${prefix}${key}.`);
      } else {
        values.push(String(value));
      }
    }
  }

  collectValues(params);

  // Join with colons and append API key
  const signatureString = values.join(':') + ':' + apiKey;

  return crypto.createHash('sha256').update(signatureString).digest('hex');
}

/**
 * Verify webhook signature from AllPay
 */
export function verifyWebhookSignature(
  payload: Record<string, unknown>,
  receivedSignature: string,
  apiKey: string
): boolean {
  const expectedSignature = generateSignature(payload, apiKey);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Create a payment request and get the payment URL
 */
export async function createPayment(
  config: AllPayConfig,
  params: CreatePaymentParams
): Promise<PaymentResponse> {
  const requestBody: Record<string, unknown> = {
    login: config.login,
    order_id: params.orderId,
    items: params.items.map(item => ({
      name: item.name,
      price: item.price,
      qty: item.qty,
      vat: item.vat ?? 1, // Include VAT by default (Israeli standard)
    })),
    currency: params.currency || 'ILS',
    webhook_url: params.webhookUrl,
    success_url: params.successUrl,
  };

  // Add optional parameters
  if (params.cancelUrl) requestBody.cancel_url = params.cancelUrl;
  if (params.customerName) requestBody.client_name = params.customerName;
  if (params.customerEmail) requestBody.client_email = params.customerEmail;
  if (params.customerPhone) requestBody.client_phone = params.customerPhone;
  if (params.addField1) requestBody.add_field_1 = params.addField1;
  if (params.addField2) requestBody.add_field_2 = params.addField2;
  if (params.testMode) requestBody.test_mode = '1';

  // Generate signature
  requestBody.sign = generateSignature(requestBody, config.apiKey);

  try {
    console.log('AllPay request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${ALLPAY_API_BASE}?show=getpayment&mode=api10`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('AllPay response:', JSON.stringify(data, null, 2));

    if (data.error) {
      return {
        success: false,
        error: data.error_message || data.error || 'Unknown error',
      };
    }

    return {
      success: true,
      paymentUrl: data.payment_url,
      transactionId: data.transaction_uid,
    };
  } catch (error) {
    console.error('AllPay API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check payment status
 */
export async function getPaymentStatus(
  config: AllPayConfig,
  orderId: string
): Promise<{ status: 'paid' | 'unpaid' | 'error'; error?: string }> {
  const requestBody: Record<string, unknown> = {
    login: config.login,
    order_id: orderId,
  };

  requestBody.sign = generateSignature(requestBody, config.apiKey);

  try {
    const response = await fetch(`${ALLPAY_API_BASE}?show=paymentstatus&mode=api10`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.error) {
      return { status: 'error', error: data.error_message || data.error };
    }

    return {
      status: data.status === '1' ? 'paid' : 'unpaid',
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Process a refund (full or partial)
 */
export async function processRefund(
  config: AllPayConfig,
  params: RefundParams
): Promise<{ success: boolean; error?: string }> {
  const requestBody: Record<string, unknown> = {
    login: config.login,
    order_id: params.orderId,
  };

  if (params.amount !== undefined) {
    requestBody.amount = params.amount;
  }

  requestBody.sign = generateSignature(requestBody, config.apiKey);

  try {
    const response = await fetch(`${ALLPAY_API_BASE}?show=refund&mode=api10`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error_message || data.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Verify API credentials are valid
 */
export async function verifyCredentials(config: AllPayConfig): Promise<boolean> {
  const requestBody: Record<string, unknown> = {
    login: config.login,
  };

  requestBody.sign = generateSignature(requestBody, config.apiKey);

  try {
    const response = await fetch(`${ALLPAY_API_BASE}?show=checkkeys&mode=api10`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    return !data.error;
  } catch {
    return false;
  }
}

// Test card numbers for development
export const TEST_CARDS = {
  visa: '4557430402053431',
  mastercard: '5326105300985846',
  amex: '375516193000090',
  failure: '4000000000000002', // This card will always fail
} as const;

import { supabaseAdmin } from './supabase-admin';

// ============================================
// FINANCIAL TRACKING SYSTEM
// 10% Platform Fee + 5% Refund Fee Model
// ============================================

export const DEFAULT_PLATFORM_FEE_PERCENT = 10.0;
export const DEFAULT_PLATFORM_FEE_FIXED = 0.0;
export const DEFAULT_REFUND_FEE_PERCENT = 5.0;

// Transaction types
export type TransactionType = 'charge' | 'platform_fee' | 'refund' | 'fee_reversal' | 'refund_fee' | 'payout';

export interface FeeConfig {
  platformFeePercent: number;
  platformFeeFixed: number;
  refundFeePercent: number;
}

export interface FeeBreakdown {
  grossAmount: number;      // Total charged to customer
  platformFee: number;      // Our 10% cut
  organizerAmount: number;  // What organizer gets (gross - platform fee)
}

export interface RefundBreakdown {
  grossRefund: number;           // Original amount being refunded
  refundFee: number;             // 5% we keep on refund
  customerRefund: number;        // What customer actually gets back
  feeReversal: number;           // Platform fee we return (original fee - refund fee)
  platformRetained: number;      // Total we keep (refund fee)
}

export interface TransactionInput {
  bookingId?: string;
  eventId?: string;
  organizerId?: string;     // Event owner for direct organizer queries
  type: TransactionType;
  amount: number;           // Positive for charges/fees, negative for refunds
  currency: string;
  allpayTransactionId?: string;
  allpayOrderId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  bookingId: string | null;
  eventId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  allpayTransactionId: string | null;
  allpayOrderId: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Get the applicable fee configuration for an event/organizer
 * Priority: event-specific > organizer-specific > global default
 */
export async function getFeeConfig(eventId?: string, organizerId?: string): Promise<FeeConfig> {
  try {
    const { data, error } = await supabaseAdmin.client
      .rpc('get_fee_config', {
        p_event_id: eventId || null,
        p_organizer_id: organizerId || null,
      });

    if (error || !data || data.length === 0) {
      // Return default if no config found
      return {
        platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
        platformFeeFixed: DEFAULT_PLATFORM_FEE_FIXED,
        refundFeePercent: DEFAULT_REFUND_FEE_PERCENT,
      };
    }

    return {
      platformFeePercent: Number(data[0].platform_fee_percent),
      platformFeeFixed: Number(data[0].platform_fee_fixed),
      refundFeePercent: Number(data[0].refund_fee_percent),
    };
  } catch {
    // Fallback to defaults on any error
    return {
      platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
      platformFeeFixed: DEFAULT_PLATFORM_FEE_FIXED,
      refundFeePercent: DEFAULT_REFUND_FEE_PERCENT,
    };
  }
}

/**
 * Calculate the fee breakdown for a given amount
 * Uses 10% platform fee by default
 */
export function calculateFeeBreakdown(
  grossAmount: number,
  feeConfig: FeeConfig = {
    platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
    platformFeeFixed: DEFAULT_PLATFORM_FEE_FIXED,
    refundFeePercent: DEFAULT_REFUND_FEE_PERCENT,
  }
): FeeBreakdown {
  // Calculate percentage fee
  const percentFee = grossAmount * (feeConfig.platformFeePercent / 100);

  // Total platform fee (percentage + fixed)
  const platformFee = Math.round((percentFee + feeConfig.platformFeeFixed) * 100) / 100;

  // Organizer gets the rest
  const organizerAmount = Math.round((grossAmount - platformFee) * 100) / 100;

  return {
    grossAmount,
    platformFee,
    organizerAmount,
  };
}

/**
 * Calculate the refund breakdown
 * Customer gets back: grossAmount - refundFee (5%)
 * Platform keeps: refundFee (5%)
 * Platform returns: originalPlatformFee - refundFee
 */
export function calculateRefundBreakdown(
  grossRefund: number,
  originalPlatformFee: number,
  refundFeePercent: number = DEFAULT_REFUND_FEE_PERCENT
): RefundBreakdown {
  // Calculate 5% refund fee on the gross amount
  const refundFee = Math.round(grossRefund * (refundFeePercent / 100) * 100) / 100;

  // Customer gets gross minus the refund fee
  const customerRefund = Math.round((grossRefund - refundFee) * 100) / 100;

  // We reverse only the portion of platform fee that exceeds the refund fee
  // If original fee was 10% ($10) and refund fee is 5% ($5), we reverse $5
  const feeReversal = Math.max(0, Math.round((originalPlatformFee - refundFee) * 100) / 100);

  // Total we keep is the refund fee
  const platformRetained = refundFee;

  return {
    grossRefund,
    refundFee,
    customerRefund,
    feeReversal,
    platformRetained,
  };
}

/**
 * Record a transaction in the immutable ledger
 */
export async function recordTransaction(input: TransactionInput): Promise<Transaction> {
  const { data, error } = await supabaseAdmin.client
    .from('transactions')
    .insert({
      booking_id: input.bookingId || null,
      event_id: input.eventId || null,
      organizer_id: input.organizerId || null,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      allpay_transaction_id: input.allpayTransactionId || null,
      allpay_order_id: input.allpayOrderId || null,
      description: input.description || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record transaction:', error);
    throw error;
  }

  return mapTransaction(data);
}

/**
 * Record a successful payment with all associated transactions
 * Creates: 1 charge transaction + 1 platform_fee transaction
 */
export async function recordPaymentTransactions(params: {
  bookingId: string;
  eventId: string;
  organizerId?: string;
  grossAmount: number;
  currency: string;
  allpayTransactionId?: string;
  allpayOrderId?: string;
  feeConfig?: FeeConfig;
}): Promise<{
  chargeTransaction: Transaction;
  feeTransaction: Transaction;
  feeBreakdown: FeeBreakdown;
}> {
  const feeConfig = params.feeConfig || await getFeeConfig(params.eventId);
  const feeBreakdown = calculateFeeBreakdown(params.grossAmount, feeConfig);

  // Record the charge transaction (full amount)
  const chargeTransaction = await recordTransaction({
    bookingId: params.bookingId,
    eventId: params.eventId,
    organizerId: params.organizerId,
    type: 'charge',
    amount: feeBreakdown.grossAmount,
    currency: params.currency,
    allpayTransactionId: params.allpayTransactionId,
    allpayOrderId: params.allpayOrderId,
    description: 'Ticket purchase',
    metadata: {
      feePercent: feeConfig.platformFeePercent,
      feeFixed: feeConfig.platformFeeFixed,
    },
  });

  // Record the platform fee transaction
  const feeTransaction = await recordTransaction({
    bookingId: params.bookingId,
    eventId: params.eventId,
    organizerId: params.organizerId,
    type: 'platform_fee',
    amount: feeBreakdown.platformFee,
    currency: params.currency,
    allpayTransactionId: params.allpayTransactionId,
    allpayOrderId: params.allpayOrderId,
    description: `Platform fee (${feeConfig.platformFeePercent}%)`,
    metadata: {
      chargeTransactionId: chargeTransaction.id,
      feePercent: feeConfig.platformFeePercent,
    },
  });

  return {
    chargeTransaction,
    feeTransaction,
    feeBreakdown,
  };
}

/**
 * Record a refund with all associated transactions
 * Creates: 1 refund transaction + 1 fee_reversal transaction + 1 refund_fee transaction
 *
 * With 5% refund fee on a $100 purchase (original 10% platform fee = $10):
 * - Refund: -$100 (full gross amount refunded to AllPay)
 * - Fee Reversal: -$5 (we return half our fee)
 * - Refund Fee: +$5 (we keep 5% as refund fee)
 * Net effect: We keep $5 instead of $10
 */
export async function recordRefundTransactions(params: {
  bookingId: string;
  eventId: string;
  organizerId?: string;
  refundAmount: number;  // Positive number representing the gross refund
  currency: string;
  originalPlatformFee: number;  // The original fee that was charged
  refundFeePercent?: number;  // Default 5%
  allpayTransactionId?: string;
  allpayOrderId?: string;
  reason?: string;
  initiatedBy?: string;
}): Promise<{
  refundTransaction: Transaction;
  feeReversalTransaction: Transaction;
  refundFeeTransaction: Transaction;
  refundBreakdown: RefundBreakdown;
}> {
  const refundBreakdown = calculateRefundBreakdown(
    params.refundAmount,
    params.originalPlatformFee,
    params.refundFeePercent ?? DEFAULT_REFUND_FEE_PERCENT
  );

  // Record the refund transaction (negative - full gross amount)
  const refundTransaction = await recordTransaction({
    bookingId: params.bookingId,
    eventId: params.eventId,
    organizerId: params.organizerId,
    type: 'refund',
    amount: -params.refundAmount,  // Negative for refunds
    currency: params.currency,
    allpayTransactionId: params.allpayTransactionId,
    allpayOrderId: params.allpayOrderId,
    description: params.reason || 'Full refund',
    metadata: {
      initiatedBy: params.initiatedBy,
      customerReceives: refundBreakdown.customerRefund,
      refundFeeDeducted: refundBreakdown.refundFee,
    },
  });

  // Record the partial fee reversal (only the portion we don't keep)
  const feeReversalTransaction = await recordTransaction({
    bookingId: params.bookingId,
    eventId: params.eventId,
    organizerId: params.organizerId,
    type: 'fee_reversal',
    amount: -refundBreakdown.feeReversal,  // Negative for reversal
    currency: params.currency,
    allpayTransactionId: params.allpayTransactionId,
    allpayOrderId: params.allpayOrderId,
    description: 'Partial platform fee reversal',
    metadata: {
      refundTransactionId: refundTransaction.id,
      originalPlatformFee: params.originalPlatformFee,
    },
  });

  // Record the refund fee (positive - we keep this)
  const refundFeeTransaction = await recordTransaction({
    bookingId: params.bookingId,
    eventId: params.eventId,
    organizerId: params.organizerId,
    type: 'refund_fee',
    amount: refundBreakdown.refundFee,  // Positive - we earn this
    currency: params.currency,
    allpayTransactionId: params.allpayTransactionId,
    allpayOrderId: params.allpayOrderId,
    description: `Refund processing fee (${params.refundFeePercent ?? DEFAULT_REFUND_FEE_PERCENT}%)`,
    metadata: {
      refundTransactionId: refundTransaction.id,
      refundFeePercent: params.refundFeePercent ?? DEFAULT_REFUND_FEE_PERCENT,
    },
  });

  return {
    refundTransaction,
    feeReversalTransaction,
    refundFeeTransaction,
    refundBreakdown,
  };
}

/**
 * Get all transactions for a booking
 */
export async function getBookingTransactions(bookingId: string): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin.client
    .from('transactions')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapTransaction);
}

/**
 * Get all transactions for an event
 */
export async function getEventTransactions(eventId: string): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin.client
    .from('transactions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapTransaction);
}

/**
 * Get financial summary for an event
 */
export async function getEventFinancialSummary(eventId: string): Promise<{
  totalCharges: number;
  totalPlatformFees: number;
  totalRefunds: number;
  totalFeeReversals: number;
  totalRefundFees: number;
  netRevenue: number;
  platformEarnings: number;
  organizerEarnings: number;
  currency: string;
}> {
  const transactions = await getEventTransactions(eventId);

  const summary = {
    totalCharges: 0,
    totalPlatformFees: 0,
    totalRefunds: 0,
    totalFeeReversals: 0,
    totalRefundFees: 0,
    netRevenue: 0,
    platformEarnings: 0,
    organizerEarnings: 0,
    currency: 'ILS',
  };

  for (const tx of transactions) {
    summary.currency = tx.currency;

    switch (tx.type) {
      case 'charge':
        summary.totalCharges += tx.amount;
        break;
      case 'platform_fee':
        summary.totalPlatformFees += tx.amount;
        break;
      case 'refund':
        summary.totalRefunds += Math.abs(tx.amount);
        break;
      case 'fee_reversal':
        summary.totalFeeReversals += Math.abs(tx.amount);
        break;
      case 'refund_fee':
        summary.totalRefundFees += tx.amount;
        break;
    }
  }

  // Net revenue = charges - refunds
  summary.netRevenue = summary.totalCharges - summary.totalRefunds;

  // Platform earnings = platform fees - fee reversals + refund fees
  summary.platformEarnings = summary.totalPlatformFees - summary.totalFeeReversals + summary.totalRefundFees;

  // Organizer earnings = net revenue - platform earnings
  summary.organizerEarnings = summary.netRevenue - summary.platformEarnings;

  return summary;
}

/**
 * Update booking with fee breakdown
 * Call this after successful payment to store fees on the booking record
 */
export async function updateBookingWithFees(
  bookingId: string,
  feeBreakdown: FeeBreakdown
): Promise<void> {
  const { error } = await supabaseAdmin.client
    .from('bookings')
    .update({
      platform_fee_amount: feeBreakdown.platformFee,
      organizer_amount: feeBreakdown.organizerAmount,
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Failed to update booking with fees:', error);
    throw error;
  }
}

// Helper to map database row to Transaction type
function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string | null,
    eventId: row.event_id as string | null,
    type: row.type as TransactionType,
    amount: Number(row.amount),
    currency: row.currency as string,
    allpayTransactionId: row.allpay_transaction_id as string | null,
    allpayOrderId: row.allpay_order_id as string | null,
    description: row.description as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
  };
}

import { supabaseAdmin } from './supabase-admin';

// Use the existing 'bookings' table which already has AllPay support

export interface OrderSeat {
  seatId: string;
  label: string;
  category: string;
  price: number;
}

export interface OrderTicket {
  tierId: string;
  tierName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  eventId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  seatIds: string[];
  seatCount: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paymentOrderId: string | null; // AllPay order_id
  transactionId: string | null; // AllPay transaction_uid
  platformFeeAmount: number | null;
  organizerAmount: number | null;
  ticketCode: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface CreateOrderInput {
  eventId: string;
  eventShortId?: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  seats?: OrderSeat[];
  tickets?: OrderTicket[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid';
}

export interface UpdateOrderInput {
  status?: Order['status'];
  paymentOrderId?: string;
  transactionId?: string;
  platformFeeAmount?: number;
  organizerAmount?: number;
  ticketCode?: string;
  errorMessage?: string;
  paidAt?: string;
  // Legacy fields we're not using but keeping for compatibility
  paymentUrl?: string;
  receiptUrl?: string;
  cardMask?: string;
  cardBrand?: string;
}

/**
 * Generate a unique ticket code
 */
function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new order (booking)
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const customerName = `${input.customerFirstName} ${input.customerLastName}`;
  const seats = input.seats || [];
  const tickets = input.tickets || [];
  const seatIds = seats.map(s => s.seatId);

  // Calculate total ticket count
  const ticketCount = tickets.reduce((sum, t) => sum + t.quantity, 0);
  const totalItemCount = seatIds.length + ticketCount;

  const { data, error } = await supabaseAdmin.client
    .from('bookings')
    .insert({
      event_id: input.eventId,
      event_short_id: input.eventShortId || null,
      customer_name: customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      seat_ids: seatIds.length > 0 ? seatIds : [], // Empty array for GA events
      seat_count: totalItemCount,
      amount_paid: input.totalAmount,
      currency: input.currency,
      payment_status: input.status,
      ticket_code: input.status === 'paid' ? generateTicketCode() : null,
      metadata: {
        seats: seats,
        tickets: tickets,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return mapDatabaseBooking(data);
}

/**
 * Get an order by ID
 */
export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin.client
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return mapDatabaseBooking(data);
}

/**
 * Get an order by payment order ID (AllPay order_id stored in idempotency_key)
 */
export async function getOrderByPaymentId(paymentOrderId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin.client
    .from('bookings')
    .select('*')
    .eq('idempotency_key', paymentOrderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return mapDatabaseBooking(data);
}

/**
 * Update an order
 */
export async function updateOrder(id: string, updates: UpdateOrderInput): Promise<Order> {
  const updateData: Record<string, unknown> = {};

  if (updates.status !== undefined) {
    updateData.payment_status = updates.status;
  }
  if (updates.paymentOrderId !== undefined) {
    updateData.idempotency_key = updates.paymentOrderId;
  }
  if (updates.transactionId !== undefined) {
    updateData.allpay_transaction_id = updates.transactionId;
  }
  if (updates.platformFeeAmount !== undefined) {
    updateData.platform_fee_amount = updates.platformFeeAmount;
  }
  if (updates.organizerAmount !== undefined) {
    updateData.organizer_amount = updates.organizerAmount;
  }
  if (updates.ticketCode !== undefined) {
    updateData.ticket_code = updates.ticketCode;
  }

  const { data, error } = await supabaseAdmin.client
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDatabaseBooking(data);
}

/**
 * Update an order by payment order ID
 */
export async function updateOrderByPaymentId(
  paymentOrderId: string,
  updates: UpdateOrderInput
): Promise<Order | null> {
  const updateData: Record<string, unknown> = {};

  if (updates.status !== undefined) {
    updateData.payment_status = updates.status;
  }
  if (updates.transactionId !== undefined) {
    updateData.allpay_transaction_id = updates.transactionId;
  }
  if (updates.platformFeeAmount !== undefined) {
    updateData.platform_fee_amount = updates.platformFeeAmount;
  }
  if (updates.organizerAmount !== undefined) {
    updateData.organizer_amount = updates.organizerAmount;
  }
  if (updates.ticketCode !== undefined) {
    updateData.ticket_code = updates.ticketCode;
  }

  const { data, error } = await supabaseAdmin.client
    .from('bookings')
    .update(updateData)
    .eq('idempotency_key', paymentOrderId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return mapDatabaseBooking(data);
}

/**
 * Get all orders for an event
 */
export async function getEventOrders(eventId: string): Promise<Order[]> {
  const { data, error } = await supabaseAdmin.client
    .from('bookings')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDatabaseBooking);
}

/**
 * Get all orders for a customer by email
 */
export async function getCustomerOrders(email: string): Promise<Order[]> {
  const { data, error } = await supabaseAdmin.client
    .from('bookings')
    .select('*')
    .eq('customer_email', email)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDatabaseBooking);
}

// Map database row to Order type
function mapDatabaseBooking(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    customerName: row.customer_name as string | null,
    customerEmail: row.customer_email as string | null,
    customerPhone: row.customer_phone as string | null,
    seatIds: (row.seat_ids as string[]) || [],
    seatCount: row.seat_count as number,
    totalAmount: row.amount_paid as number,
    currency: row.currency as string,
    status: mapPaymentStatus(row.payment_status as string),
    paymentOrderId: row.idempotency_key as string | null,
    transactionId: row.allpay_transaction_id as string | null,
    platformFeeAmount: row.platform_fee_amount as number | null,
    organizerAmount: row.organizer_amount as number | null,
    ticketCode: row.ticket_code as string | null,
    createdAt: row.created_at as string,
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}

function mapPaymentStatus(status: string): Order['status'] {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'paid':
    case 'completed':
      return 'paid';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'refunded';
    default:
      return 'pending';
  }
}

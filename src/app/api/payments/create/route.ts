import { NextRequest, NextResponse } from 'next/server';
import { createOrder, updateOrder } from '@/lib/orders';
import { createPayment, type PaymentItem } from '@/lib/payments/allpay';
import { getAllPayConfig, isTestMode, getBaseUrl } from '@/lib/payments';
import { lockSeats } from '@/lib/seats';
import { fromSmallestUnit } from '@/lib/currency';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Payment request body:', JSON.stringify(body, null, 2));

    const { eventId, eventName, selectedSeats, customer, currency } = body;

    // Validate required fields
    if (!eventId || !eventName || !selectedSeats?.length || !customer || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate customer info
    if (!customer.firstName || !customer.lastName || !customer.email || !customer.phone) {
      return NextResponse.json(
        { error: 'Missing customer information' },
        { status: 400 }
      );
    }

    // Calculate total (selectedSeats prices should be in display currency, e.g., ILS)
    const totalAmount = selectedSeats.reduce(
      (sum: number, seat: { price: number }) => sum + seat.price,
      0
    );
    console.log('Total amount:', totalAmount);

    // Try to lock seats to prevent double booking
    const seatIds = selectedSeats.map((s: { seatId: string }) => s.seatId);
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log('Locking seats:', seatIds);

    let lockResult;
    try {
      lockResult = await lockSeats(eventId, seatIds, lockId, 15 * 60 * 1000); // 15 min lock
      console.log('Lock result:', lockResult);
    } catch (lockError) {
      console.error('Lock seats error:', lockError);
      throw lockError;
    }

    if (!lockResult.success) {
      return NextResponse.json(
        {
          error: 'Some seats are no longer available',
          unavailableSeats: lockResult.unavailableSeats,
        },
        { status: 409 }
      );
    }

    // Create the order in database
    console.log('Creating order...');
    let order;
    try {
      order = await createOrder({
        eventId,
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        seats: selectedSeats,
        totalAmount,
        currency,
        status: 'pending',
      });
      console.log('Order created:', order.id);
    } catch (orderError) {
      console.error('Create order error:', orderError);
      throw orderError;
    }

    // Generate AllPay order ID
    const paymentOrderId = `order_${order.id}_${Date.now()}`;
    console.log('Payment order ID:', paymentOrderId);

    // Update order with payment order ID
    try {
      await updateOrder(order.id, { paymentOrderId });
      console.log('Order updated with payment ID');
    } catch (updateError) {
      console.error('Update order error:', updateError);
      throw updateError;
    }

    // Create payment items for AllPay
    // Convert prices from smallest unit (cents) to display currency for AllPay
    const items: PaymentItem[] = selectedSeats.map((seat: { label: string; price: number }) => ({
      name: `${eventName} - ${seat.label}`,
      price: fromSmallestUnit(seat.price, currency),
      qty: 1,
      vat: 1,
    }));

    // Get AllPay config and base URL
    console.log('Getting AllPay config...');
    const config = getAllPayConfig();
    const baseUrl = getBaseUrl();
    console.log('Base URL:', baseUrl);

    // Create payment with AllPay
    console.log('Creating AllPay payment...');
    const paymentResult = await createPayment(config, {
      orderId: paymentOrderId,
      items,
      currency: currency as 'ILS' | 'USD' | 'EUR',
      webhookUrl: `${baseUrl}/api/payments/webhook`,
      successUrl: `${baseUrl}/api/payments/success?order_id=${paymentOrderId}`,
      cancelUrl: `${baseUrl}/api/payments/cancel?order_id=${paymentOrderId}`,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      // Store event ID and seat IDs for webhook processing
      addField1: eventId,
      addField2: JSON.stringify(seatIds),
      testMode: isTestMode(),
    });

    if (!paymentResult.success) {
      // Update order status to failed
      await updateOrder(order.id, { status: 'failed', errorMessage: paymentResult.error });

      return NextResponse.json(
        { error: paymentResult.error || 'Failed to create payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentOrderId,
      paymentUrl: paymentResult.paymentUrl,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

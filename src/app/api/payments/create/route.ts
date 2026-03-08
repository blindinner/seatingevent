import { NextRequest, NextResponse } from 'next/server';
import { createOrder, updateOrder } from '@/lib/orders';
import { createPayment, type PaymentItem } from '@/lib/payments/allpay';
import { getAllPayConfig, isTestMode, getBaseUrl } from '@/lib/payments';
import { lockSeats } from '@/lib/seats';
import { fromSmallestUnit } from '@/lib/currency';
import { sendTicketEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Payment request body:', JSON.stringify(body, null, 2));

    const {
      eventId,
      eventName,
      selectedSeats = [],
      selectedTickets = [],
      customer,
      currency,
      isFreeRegistration
    } = body;

    // Validate required fields
    const hasSeats = selectedSeats?.length > 0;
    const hasTickets = selectedTickets?.length > 0;

    if (!eventId || !eventName || (!hasSeats && !hasTickets) || !customer || !currency) {
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

    // Calculate total - prices are in cents (smallest currency unit)
    const seatsTotal = selectedSeats.reduce(
      (sum: number, seat: { price: number }) => sum + seat.price,
      0
    );
    const ticketsTotal = selectedTickets.reduce(
      (sum: number, ticket: { price: number; quantity: number }) => sum + (ticket.price * ticket.quantity),
      0
    );
    const totalAmount = seatsTotal + ticketsTotal;
    console.log('Total amount:', totalAmount);

    // For seated events, lock the seats to prevent double booking
    const seatIds = selectedSeats.map((s: { seatId: string }) => s.seatId);
    let lockResult = { success: true, unavailableSeats: [] as string[] };

    if (seatIds.length > 0) {
      const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log('Locking seats:', seatIds);

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
    }

    // Handle free registration - no payment needed
    if (isFreeRegistration && totalAmount === 0) {
      console.log('Processing free registration...');

      // Create the order directly as paid
      const order = await createOrder({
        eventId,
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        seats: selectedSeats,
        tickets: selectedTickets,
        totalAmount: 0,
        currency,
        status: 'paid', // Mark as paid immediately for free events
      });
      console.log('Free registration order created:', order.id);

      // Fetch event details for email
      const { data: eventData } = await supabaseAdmin.client
        .from('events')
        .select('name, start_date, start_time, location, email_settings, send_qr_code')
        .eq('id', eventId)
        .single();

      // Send confirmation email
      if (eventData && customer.email && order.ticketCode) {
        const seatDetails = selectedSeats.map((s: { label: string; category: string }) => ({
          label: s.label,
          category: s.category,
        }));
        const ticketDetails = selectedTickets.map((t: { tierName: string; quantity: number }) => ({
          label: `${t.tierName} × ${t.quantity}`,
          category: 'General Admission',
        }));

        try {
          await sendTicketEmail({
            to: customer.email,
            customerName: `${customer.firstName} ${customer.lastName}`,
            eventName: eventData.name,
            eventDate: eventData.start_date,
            eventTime: eventData.start_time || undefined,
            eventLocation: eventData.location || undefined,
            ticketCode: order.ticketCode,
            seats: [...seatDetails, ...ticketDetails],
            totalAmount: 0,
            currency,
            emailSettings: eventData.email_settings || undefined,
            sendQrCode: eventData.send_qr_code !== false, // Default to true
          });
          console.log('Confirmation email sent for free registration');
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't fail the registration if email fails
        }
      }

      return NextResponse.json({
        success: true,
        orderId: order.id,
        isFreeRegistration: true,
      });
    }

    // Create the order in database for paid events
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
        tickets: selectedTickets,
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

    // Extract AllPay payment_id from the payment URL
    let allpayPaymentId: string | null = null;
    if (paymentResult.paymentUrl) {
      const urlParams = new URL(paymentResult.paymentUrl).searchParams;
      allpayPaymentId = urlParams.get('payment_id');
      if (allpayPaymentId) {
        // Store the AllPay payment ID
        await updateOrder(order.id, { transactionId: `allpay_${allpayPaymentId}` });
        console.log('AllPay payment_id:', allpayPaymentId);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentOrderId,
      paymentUrl: paymentResult.paymentUrl,
      allpayPaymentId,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

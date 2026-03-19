import { NextRequest, NextResponse } from 'next/server';
import { createOrder, updateOrder } from '@/lib/orders';
import { createPayment, type PaymentItem } from '@/lib/payments/allpay';
import { getAllPayConfig, isTestMode, getBaseUrl } from '@/lib/payments';
import { lockSeats } from '@/lib/seats';
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

    // Check if event has ended
    const { data: eventCheck } = await supabaseAdmin.client
      .from('events')
      .select('start_date, start_time, end_date, end_time')
      .eq('id', eventId)
      .single();

    if (eventCheck) {
      const now = new Date();
      const eventEndDate = eventCheck.end_date || eventCheck.start_date;
      const eventEndTime = eventCheck.end_time || eventCheck.start_time || '23:59';

      const endDate = new Date(eventEndDate);
      const [hours, minutes] = eventEndTime.split(':').map(Number);
      endDate.setHours(hours, minutes, 0, 0);

      if (now > endDate) {
        return NextResponse.json(
          { error: 'This event has already ended. Tickets are no longer available.' },
          { status: 400 }
        );
      }
    }

    // Calculate total - prices are in display currency
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

    // Fetch event's short_id for storing in booking
    let eventShortId: string | undefined;
    try {
      const { data: eventData } = await supabaseAdmin.client
        .from('events')
        .select('short_id')
        .eq('id', eventId)
        .single();
      eventShortId = eventData?.short_id || undefined;
    } catch (e) {
      console.error('Error fetching event short_id:', e);
    }

    // Handle free registration - no payment needed
    if (isFreeRegistration && totalAmount === 0) {
      console.log('Processing free registration...');

      // Create the order directly as paid
      const order = await createOrder({
        eventId,
        eventShortId,
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
        .select('name, start_date, start_time, location, email_settings, send_qr_code, white_label_theme_id')
        .eq('id', eventId)
        .single();

      // Fetch white-label theme if set
      let whiteLabelTheme: { logoUrl: string | null; name: string } | undefined;
      if (eventData?.white_label_theme_id) {
        const { getThemeById } = await import('@/lib/whiteLabel');
        const theme = await getThemeById(eventData.white_label_theme_id);
        if (theme) {
          whiteLabelTheme = {
            logoUrl: theme.emailLogoUrl || theme.navLogoUrl,
            name: theme.name,
          };
        }
      }

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
          const sendQrCodeValue = eventData.send_qr_code !== false;
          console.log('Email params:', {
            to: customer.email,
            eventName: eventData.name,
            ticketCode: order.ticketCode,
            sendQrCode: sendQrCodeValue,
            rawSendQrCode: eventData.send_qr_code,
          });

          const emailResult = await sendTicketEmail({
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
            sendQrCode: sendQrCodeValue,
            whiteLabelTheme,
          });
          console.log('Email result:', emailResult);
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
        eventShortId,
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
    const items: PaymentItem[] = [];

    // Add seated tickets
    for (const seat of selectedSeats as Array<{ label: string; price: number }>) {
      items.push({
        name: `${eventName} - ${seat.label}`,
        price: seat.price,
        qty: 1,
        vat: 1,
      });
    }

    // Add GA tickets
    for (const ticket of selectedTickets as Array<{ tierName: string; price: number; quantity: number }>) {
      items.push({
        name: `${eventName} - ${ticket.tierName}`,
        price: ticket.price,
        qty: ticket.quantity,
        vat: 1,
      });
    }

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
      // Hide Apple Pay until properly configured
      showApplePay: false,
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

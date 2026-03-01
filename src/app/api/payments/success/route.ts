import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus, getAllPayConfig } from '@/lib/payments';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.redirect(new URL('/?error=missing_order', request.url));
  }

  try {
    // Verify payment status with AllPay
    const config = getAllPayConfig();
    const status = await getPaymentStatus(config, orderId);

    if (status.status === 'paid') {
      // Get the order to find the event ID for redirect
      const { getOrderByPaymentId } = await import('@/lib/orders');
      const order = await getOrderByPaymentId(orderId);

      if (order) {
        // Redirect to event page with success message
        return NextResponse.redirect(
          new URL(`/event/${order.eventId}?payment=success&order=${order.id}`, request.url)
        );
      }
    }

    // Payment not completed or order not found
    return NextResponse.redirect(new URL('/?payment=pending', request.url));
  } catch (error) {
    console.error('Payment success redirect error:', error);
    return NextResponse.redirect(new URL('/?error=payment_verification', request.url));
  }
}

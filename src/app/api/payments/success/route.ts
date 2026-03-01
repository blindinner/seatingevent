import { NextRequest, NextResponse } from 'next/server';
import { getOrderByPaymentId } from '@/lib/orders';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.redirect(new URL('/?error=missing_order', request.url));
  }

  try {
    // Get the order from our database
    const order = await getOrderByPaymentId(orderId);

    if (order) {
      // Redirect to the order confirmation page
      // This page will poll for status updates if payment is still processing
      return NextResponse.redirect(
        new URL(`/order/${order.id}`, request.url)
      );
    }

    // Order not found - redirect to home with error
    return NextResponse.redirect(new URL('/?error=order_not_found', request.url));
  } catch (error) {
    console.error('Payment success redirect error:', error);
    return NextResponse.redirect(new URL('/?error=payment_verification', request.url));
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getOrderByPaymentId, updateOrderByPaymentId } from '@/lib/orders';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.redirect(new URL('/?payment=cancelled', request.url));
  }

  try {
    // Get the order first
    const order = await getOrderByPaymentId(orderId);

    if (order) {
      // Update order status to cancelled
      await updateOrderByPaymentId(orderId, {
        status: 'cancelled',
      });

      // Redirect to order page to show cancellation
      return NextResponse.redirect(
        new URL(`/order/${order.id}`, request.url)
      );
    }

    // Order not found - redirect to home
    return NextResponse.redirect(new URL('/?payment=cancelled', request.url));
  } catch (error) {
    console.error('Payment cancel handling error:', error);
    return NextResponse.redirect(new URL('/?payment=cancelled', request.url));
  }
}

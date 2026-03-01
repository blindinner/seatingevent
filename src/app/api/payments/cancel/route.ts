import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id');

  if (orderId) {
    try {
      // Update order status to cancelled
      const { updateOrderByPaymentId, getOrderByPaymentId } = await import('@/lib/orders');

      await updateOrderByPaymentId(orderId, {
        status: 'cancelled',
      });

      // Get event ID for redirect
      const order = await getOrderByPaymentId(orderId);
      if (order) {
        return NextResponse.redirect(
          new URL(`/event/${order.eventId}?payment=cancelled`, request.url)
        );
      }
    } catch (error) {
      console.error('Payment cancel handling error:', error);
    }
  }

  // Redirect to home with cancelled status
  return NextResponse.redirect(new URL('/?payment=cancelled', request.url));
}

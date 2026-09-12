import type { MomoPaymentResponse, ZaloPayPaymentResponse } from "@/api/paymentApi";

/** Phân biệt ví bằng trường bắt buộc, kể cả khi MoMo không trả URL QR riêng. */
export function getPaymentLinks(payment: MomoPaymentResponse | ZaloPayPaymentResponse) {
  return "payUrl" in payment
    ? { payUrl: payment.payUrl, qrContent: payment.qrCodeUrl || payment.deeplink || payment.payUrl }
    : { payUrl: payment.orderUrl, qrContent: payment.orderUrl };
}

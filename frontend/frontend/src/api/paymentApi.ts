import apiClient from './api';

export interface ZaloPayPaymentResponse {
  bookingId: number;
  appTransId: string;
  amount: number;
  orderUrl: string;
  qrCode?: string | null;
  orderToken?: string | null;
  zpTransToken?: string | null;
  returnCode?: number | null;
  returnMessage?: string | null;
  subReturnCode?: number | null;
  subReturnMessage?: string | null;
}

export interface MomoPaymentResponse {
  bookingId: number;
  requestId: string;
  orderId: string;
  amount: number;
  payUrl: string;
  shortLink?: string | null;
  deeplink?: string | null;
  qrCodeUrl?: string | null;
  resultCode?: number | null;
  message?: string | null;
}

export const paymentApi = {
  createZaloPayOrder: async (bookingId: number) => {
    const res = await apiClient.post(`/payment/zalopay/orders/${bookingId}`);
    return res.data.result as ZaloPayPaymentResponse;
  },

  createMomoOrder: async (bookingId: number) => {
    const res = await apiClient.post(`/payment/momo/orders/${bookingId}`);
    return res.data.result as MomoPaymentResponse;
  },

  createQrCodeUrl: async (content: string) => {
    const res = await apiClient.get('/payment/qr-code', {
      params: { content },
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data as Blob);
  },

  confirmZaloPayReturn: async (params: Record<string, string>) => {
    const res = await apiClient.get('/payment/zalopay/return', { params });
    return res.data.result as 'SUCCESS' | 'FAILED';
  },

  confirmMomoReturn: async (params: Record<string, string>) => {
    const res = await apiClient.get('/payment/momo/return', { params });
    return res.data.result as 'SUCCESS' | 'FAILED';
  },
};

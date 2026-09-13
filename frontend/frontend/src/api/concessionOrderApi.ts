import apiClient from './api';
import type { ComboResponse, FoodItemResponse } from './comboApi';

export type ConcessionPaymentMethod = 'CASH' | 'BANK_TRANSFER';
export type ConcessionOrderStatus = 'PAID' | 'CANCELLED';

export interface ConcessionOrderItemRequest {
  comboId?: number;
  foodVariantId?: number;
  quantity: number;
}

export interface ConcessionOrderRequest {
  customerName?: string;
  customerPhone?: string;
  paymentMethod: ConcessionPaymentMethod;
  cashReceived?: number;
  items: ConcessionOrderItemRequest[];
}

export interface ConcessionOrderItemResponse {
  itemId: number;
  itemType: 'COMBO' | 'FOOD_VARIANT';
  comboId?: number | null;
  foodVariantId?: number | null;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ConcessionOrderResponse {
  orderId: number;
  orderCode: string;
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount: number;
  costAmount: number;
  profitAmount: number;
  cashReceived?: number | null;
  changeAmount: number;
  paymentMethod: ConcessionPaymentMethod;
  status: ConcessionOrderStatus;
  soldByUsername?: string | null;
  cancelReason?: string | null;
  createdAt?: string | null;
  cancelledAt?: string | null;
  items: ConcessionOrderItemResponse[];
}

export interface ConcessionOrderPage {
  content: ConcessionOrderResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const concessionOrderApi = {
  create: async (request: ConcessionOrderRequest) => {
    const response = await apiClient.post('/concession-orders', request);
    return response.data.result as ConcessionOrderResponse;
  },
  list: async (params?: { from?: string; to?: string; status?: ConcessionOrderStatus; page?: number; size?: number }) => {
    const response = await apiClient.get('/concession-orders', { params });
    return response.data.result as ConcessionOrderPage;
  },
  cancel: async (orderId: number, reason: string) => {
    const response = await apiClient.post(`/concession-orders/${orderId}/cancel`, null, { params: { reason } });
    return response.data.result as ConcessionOrderResponse;
  },
};

export type { ComboResponse, FoodItemResponse };

import apiClient from './api';

export type PromotionType = 'MEMBER_TIER' | 'BIRTHDAY' | 'LEAP_DAY_BIRTHDAY' | 'E_WALLET';
export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
export type PromotionUsageStatus = 'RESERVED' | 'APPLIED' | 'RELEASED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'ZALOPAY' | 'MOMO';
export type BirthdayRule = 'EXACT_DATE' | 'DATE_RANGE' | 'BIRTH_MONTH';
export type LeapDayPolicy = 'LEAP_DAY_ONLY' | 'FEBRUARY_28' | 'MARCH_1';
export type UsageLimitType = 'UNLIMITED' | 'LIMITED';

export interface PromotionRequest {
  name: string;
  code: string;
  description?: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startAt: string;
  endAt: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  totalUsageLimitType: UsageLimitType;
  totalUsageLimit?: number;
  perCustomerUsageLimitType: UsageLimitType;
  perCustomerUsageLimit?: number;
  eligibleMemberTiers?: string[];
  birthdayRule?: BirthdayRule;
  birthdayDaysBefore?: number;
  birthdayDaysAfter?: number;
  leapDayPolicy?: LeapDayPolicy;
  birthdayMinProfileAgeDays?: number;
  walletPaymentMethod?: PaymentMethod;
}

export interface PromotionResponse extends PromotionRequest {
  promotionId: number;
  status: PromotionStatus;
  reservedUsageCount: number;
  appliedUsageCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PromotionCatalogResponse {
  promotionId: number;
  name: string;
  code: string;
  description: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startAt: string;
  endAt: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  eligibleMemberTiers?: string[];
  walletPaymentMethod?: PaymentMethod;
}

export interface PromotionEvaluation {
  promotionId: number;
  name: string;
  code: string;
  description?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export interface PromotionCatalogItem {
  name: string;
  code: string;
  description?: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  eligibleMemberTiers?: string[];
  walletPaymentMethod?: PaymentMethod;
  endAt: string;
}

export interface PromotionUsage {
  promotionUsageId: number;
  promotionId: number;
  bookingId: number;
  userId: string;
  username: string;
  promotionCode: string;
  promotionType: PromotionType;
  memberTier?: string;
  birthday?: string;
  birthdayCycleYear?: number;
  paymentMethod?: PaymentMethod;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: PromotionUsageStatus;
  reservedAt: string;
  paymentInitiatedAt?: string;
  confirmedAt?: string;
  releasedAt?: string;
  releaseReason?: string;
}

export const promotionApi = {
  getPromotionCatalog: async () => {
    const response = await apiClient.get('/promotions');
    return response.data.result as PromotionCatalogResponse[];
  },

  getPromotions: async (params?: { status?: PromotionStatus; type?: PromotionType }) => {
    const response = await apiClient.get('/promotions/admin', { params });
    return response.data.result as PromotionResponse[];
  },

  create: async (request: PromotionRequest) => {
    const response = await apiClient.post('/promotions', request);
    return response.data.result as PromotionResponse;
  },

  update: async (promotionId: number, request: PromotionRequest) => {
    const response = await apiClient.put(`/promotions/${promotionId}`, request);
    return response.data.result as PromotionResponse;
  },

  activate: async (promotionId: number) => {
    const response = await apiClient.patch(`/promotions/${promotionId}/activate`);
    return response.data.result as PromotionResponse;
  },

  deactivate: async (promotionId: number) => {
    const response = await apiClient.patch(`/promotions/${promotionId}/deactivate`);
    return response.data.result as PromotionResponse;
  },

  validate: async (request: {
    code: string;
    orderAmount: number;
    paymentMethod?: PaymentMethod;
    memberUserId?: string;
  }) => {
    const response = await apiClient.post('/promotions/validate', request);
    return response.data.result as PromotionEvaluation;
  },

  getAvailable: async (orderAmount: number, paymentMethod?: PaymentMethod) => {
    const response = await apiClient.get('/promotions/available', {
      params: { orderAmount, paymentMethod },
    });
    return response.data.result as PromotionEvaluation[];
  },

  getUsages: async () => {
    const response = await apiClient.get('/promotions/admin/usages');
    return response.data.result as PromotionUsage[];
  },

  getMyUsages: async () => {
    const response = await apiClient.get('/promotions/my-usages');
    return response.data.result as PromotionUsage[];
  },
};

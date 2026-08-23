import apiClient, { API_BASE_URL } from './api';
import type { MovieFormat, MovieLanguageType, MovieProjectionType } from './movieApi';

export interface BookingRequest {
  showtimeId: number;
  showtimeSeatIds: number[];
  u22SeatIds?: number[];
  u22DocumentVerified?: boolean;
  voucherCode?: string;
  paymentMethod?: "ZALOPAY" | "MOMO" | "CASH" | "BANK_TRANSFER";
  memberUserId?: string;
  membershipBenefitIds?: number[];
  combos?: { comboId: number; quantity: number }[];
  foodItems?: { foodVariantId: number; quantity: number }[];
}


export interface BookingResponse {
  bookingId: number;
  showtimeId: number;
  movieTitle: string;
  cinemaRoomName: string;
  presentationId?: number | null;
  presentationName?: string | null;
  presentationFormat?: MovieFormat | string | null;
  projectionType?: MovieProjectionType | string | null;
  languageType?: MovieLanguageType | string | null;
  showDate: string;
  startTime: string;
  totalAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  promotionCode?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'ZALOPAY' | 'MOMO';
  loyaltyPointsEarned?: number;
  membershipPlanCode?: string | null;
  membershipPlanName?: string | null;
  ticketSubtotal?: number;
  concessionSubtotal?: number;
  membershipTicketDiscount?: number;
  membershipConcessionDiscount?: number;
  membershipFreeTicketsUsed?: number;
  voucherDiscount?: number;
  pointMultiplierApplied?: number;
  membershipTicketEarnPercent?: number;
  membershipConcessionEarnPercent?: number;
  loyaltyPointsRedeemed?: number;
  membershipEligibleSpend?: number;
  status: string;
  createdAt: string;
  holdExpiresAt?: string;
  showtimeSeatIds?: number[];
  seatCodes: string[];
  combos: string[];
  foodItems?: string[];
  ticketDetails?: {
    ticketId: number;
    seatCode: string;
    seatType?: string | null;
    price: number;
  }[];
  productDetails?: {
    type: "COMBO" | "FOOD";
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  ticketQrToken?: string;
  payUrl?: string;
}

export interface TicketVerificationResponse {
  bookingId: number;
  movieTitle: string;
  cinemaRoomName: string;
  presentationName?: string | null;
  presentationFormat?: MovieFormat | string | null;
  projectionType?: MovieProjectionType | string | null;
  languageType?: MovieLanguageType | string | null;
  showDate: string;
  startTime: string;
  seatCodes: string[];
  ticketCount: number;
  totalAmount: number;
  status: BookingStatus;
  bookedAt: string;
  validTicket: boolean;
  isScanned: boolean;
  verificationMessage: string;
}

export type BookingStatus = "PENDING" | "SUCCESS" | "CANCELLED";
export type BookingChannel = "ONLINE" | "COUNTER";
export type CounterCustomerType = "GUEST" | "ACCOUNT";

export interface BookingAdminFilterParams {
  page?: number;
  size?: number;
  channel?: BookingChannel;
  status?: BookingStatus | "";
  keyword?: string;
  showDateFrom?: string;
  showDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface BookingAdminPageResponse {
  content: BookingAdminResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const bookingApi = {
  createBooking: async (data: BookingRequest) => {
    const res = await apiClient.post('/bookings', data);
    return res.data.result as BookingResponse;
  },

  createPaymentForPendingBooking: async (
    bookingId: number,
    paymentMethod: 'ZALOPAY' | 'MOMO' = 'ZALOPAY'
  ) => {
    const res = await apiClient.post(`/bookings/${bookingId}/payment`, null, {
      params: { paymentMethod },
    });
    return res.data.result as BookingResponse;
  },

  confirmCounterCashPayment: async (
    bookingId: number,
    paymentMethod: 'CASH' | 'BANK_TRANSFER' = 'CASH'
  ) => {
    const res = await apiClient.post(`/bookings/${bookingId}/cash-payment`, null, {
      params: { paymentMethod },
    });
    return res.data.result as BookingResponse;
  },

  getCounterBookingStatus: async (bookingId: number) => {
    const res = await apiClient.get(`/bookings/${bookingId}/counter-status`);
    return res.data.result as BookingResponse;
  },

  getPendingBookingByShowtime: async (showtimeId: number) => {
    const res = await apiClient.get('/bookings/pending', { params: { showtimeId } });
    return res.data.result as BookingResponse | null;
  },

  cancelPendingBooking: async (bookingId: number) => {
    await apiClient.delete(`/bookings/${bookingId}/pending`);
  },

  applyPromotion: async (
    bookingId: number,
    code: string,
    paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'ZALOPAY' | 'MOMO'
  ) => {
    const res = await apiClient.post(`/bookings/${bookingId}/promotion`, { code, paymentMethod });
    return res.data.result as BookingResponse;
  },

  removePromotion: async (bookingId: number) => {
    const res = await apiClient.delete(`/bookings/${bookingId}/promotion`);
    return res.data.result as BookingResponse;
  },

  getMyBookings: async () => {
    const res = await apiClient.get('/bookings/my-bookings');
    return res.data.result as BookingResponse[];
  },

  verifyTicket: async (token: string) => {
    const res = await apiClient.get(`/bookings/tickets/${encodeURIComponent(token)}`);
    return res.data.result as TicketVerificationResponse;
  },

  markTicketAsScanned: async (token: string) => {
    const res = await apiClient.post(`/bookings/tickets/${encodeURIComponent(token)}/scan`);
    return res.data;
  },

  getTicketQrImageUrl: (token: string) =>
    `${API_BASE_URL}/bookings/tickets/${encodeURIComponent(token)}/qr`,

  getAllBookings: async (
    pageOrParams: number | BookingAdminFilterParams = 1,
    size: number = 10
  ) => {
    const params =
      typeof pageOrParams === "number"
        ? { page: pageOrParams, size }
        : { page: 1, size: 10, ...pageOrParams };
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
    const res = await apiClient.get('/bookings/all', { params: cleanParams });
    return res.data.result as BookingAdminPageResponse;
  },
};

export interface BookingAdminResponse {
  bookingId: number;
  username: string;
  email: string;
  showtimeId: number;
  movieTitle: string;
  cinemaRoomName: string;
  presentationId?: number | null;
  presentationName?: string | null;
  presentationFormat?: MovieFormat | string | null;
  projectionType?: MovieProjectionType | string | null;
  languageType?: MovieLanguageType | string | null;
  showDate: string;
  startTime: string;
  totalAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  promotionCode?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'ZALOPAY' | 'MOMO';
  status: BookingStatus;
  bookingChannel: BookingChannel;
  staffUsername?: string | null;
  staffEmail?: string | null;
  counterCustomerType?: CounterCustomerType | null;
  createdAt: string;
  seatCodes: string[];
  combos: string[];
  foodItems?: string[];
}

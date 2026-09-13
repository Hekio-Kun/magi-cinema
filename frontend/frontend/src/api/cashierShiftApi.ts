import apiClient from './api';

export type CashierShiftStatus = 'OPEN' | 'CLOSED';
export type CashierReconciliationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface CashierShiftResponse {
  shiftId: number;
  shiftCode: string;
  cashierUserId: string;
  cashierUsername: string;
  status: CashierShiftStatus;
  reconciliationStatus: CashierReconciliationStatus;
  openingCash: number;
  expectedCash?: number | null;
  actualCash?: number | null;
  variance?: number | null;
  cashSales: number;
  transferSales: number;
  ticketSales: number;
  concessionSales: number;
  totalSales: number;
  openedNote?: string | null;
  closingNote?: string | null;
  approvalNote?: string | null;
  approvedByUsername?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  approvedAt?: string | null;
}

export interface CashierShiftPage {
  content: CashierShiftResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const cashierShiftApi = {
  current: async () => {
    const response = await apiClient.get('/cashier-shifts/current');
    return response.data.result as CashierShiftResponse | null;
  },
  open: async (openingCash: number, note?: string) => {
    const response = await apiClient.post('/cashier-shifts/open', { openingCash, note });
    return response.data.result as CashierShiftResponse;
  },
  close: async (shiftId: number, actualCash: number, note?: string) => {
    const response = await apiClient.post(`/cashier-shifts/${shiftId}/close`, { actualCash, note });
    return response.data.result as CashierShiftResponse;
  },
  approve: async (shiftId: number, approved: boolean, note?: string) => {
    const response = await apiClient.post(`/cashier-shifts/${shiftId}/approve`, { approved, note });
    return response.data.result as CashierShiftResponse;
  },
  list: async (page = 0, size = 20) => {
    const response = await apiClient.get('/cashier-shifts', { params: { page, size } });
    return response.data.result as CashierShiftPage;
  },
  summary: async (shiftId: number) => {
    const response = await apiClient.get(`/cashier-shifts/${shiftId}/summary`);
    return response.data.result as CashierShiftResponse;
  },
};

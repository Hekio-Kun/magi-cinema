import apiClient from "./api";

export interface StaffPerformanceResponse {
  staffUserId: string;
  username: string;
  fullName: string;
  shiftCount: number;
  approvedShiftCount: number;
  ticketSales: number;
  concessionSales: number;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  varianceTotal: number;
  workedMinutes: number;
  lateCount: number;
  absentCount: number;
}

export const staffPerformanceApi = {
  list: async (from: string, to: string): Promise<StaffPerformanceResponse[]> => {
    const response = await apiClient.get("/staff-performance", { params: { from, to } });
    const data = response.data as { result?: StaffPerformanceResponse[] } | StaffPerformanceResponse[];
    return Array.isArray(data) ? data : data.result || [];
  },
};

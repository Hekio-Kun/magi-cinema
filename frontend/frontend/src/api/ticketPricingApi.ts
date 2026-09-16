import apiClient from "@/api/api";

export interface TicketPriceConfig {
  standard2dPrice: number;
  standard3dPrice: number;
  imax3dPrice: number;
  fourDx3dPrice: number;
  vipSeatSurcharge: number;
  coupleSeatSurcharge: number;
  disabledSeatSurcharge: number;
  u22BasePrice: number;
  u22Enabled: boolean;
  weekendSurcharge: number;
  earlyBirdEnd: string;
  earlyBirdDiscount: number;
  primeTimeStart: string;
  primeTimeEnd: string;
  primeTimeSurcharge: number;
  lateShowStart: string;
  lateShowSurcharge: number;
  priceRoundingUnit: number;
  updatedBy?: string | null;
  version?: number | null;
  updatedAt?: string | null;
}

export type TicketPriceConfigRequest = Omit<TicketPriceConfig, "updatedBy" | "updatedAt"> & {
  changeReason?: string;
};

export interface TicketPriceConfigHistory {
  historyId: number;
  changeReason: string;
  changedBy: string;
  createdAt: string;
  config: TicketPriceConfig;
}

const unwrap = <T>(response: { data: { result?: T } | T }) => {
  const data = response.data;
  return typeof data === "object" && data !== null && "result" in data
    ? (data.result as T)
    : data as T;
};

export const ticketPricingApi = {
  getConfig: async () => unwrap<TicketPriceConfig>(await apiClient.get("/ticket-pricing/public/config")),

  getAdminConfig: async () => unwrap<TicketPriceConfig>(await apiClient.get("/ticket-pricing/admin/config")),

  updateConfig: async (data: TicketPriceConfigRequest) =>
    unwrap<TicketPriceConfig>(await apiClient.put("/ticket-pricing/admin/config", data)),

  getHistory: async (limit = 20) =>
    unwrap<TicketPriceConfigHistory[]>(await apiClient.get("/ticket-pricing/admin/history", { params: { limit } })),

  restoreHistory: async (historyId: number, reason?: string) =>
    unwrap<TicketPriceConfig>(await apiClient.post(`/ticket-pricing/admin/history/${historyId}/restore`, { reason })),
};

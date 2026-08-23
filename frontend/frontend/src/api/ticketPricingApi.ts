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
  updatedAt?: string | null;
}

export type TicketPriceConfigRequest = Omit<TicketPriceConfig, "updatedAt">;

export const ticketPricingApi = {
  getConfig: async () => {
    const response = await apiClient.get("/ticket-pricing/public/config");
    return response.data.result as TicketPriceConfig;
  },

  updateConfig: async (data: TicketPriceConfigRequest) => {
    const response = await apiClient.put("/ticket-pricing/admin/config", data);
    return response.data.result as TicketPriceConfig;
  },
};

import apiClient from "./api";

export interface StaffAuditLogResponse {
  auditLogId: number;
  targetType: string;
  targetId?: number | null;
  targetName?: string | null;
  action: string;
  summary?: string | null;
  actorUsername?: string | null;
  reason?: string | null;
  beforeSnapshot?: string | null;
  afterSnapshot?: string | null;
  createdAt?: string | null;
}

export const staffAuditLogApi = {
  list: async (keyword?: string, limit = 100): Promise<StaffAuditLogResponse[]> => {
    const response = await apiClient.get("/staff-audit-logs", { params: { keyword, limit } });
    const data = response.data as { result?: StaffAuditLogResponse[] } | StaffAuditLogResponse[];
    return Array.isArray(data) ? data : data.result || [];
  },
};

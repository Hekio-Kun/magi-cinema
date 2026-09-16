import apiClient from "./api";
import type { AxiosResponse } from "axios";

export interface DashboardNotification {
  notificationId: number;
  title: string;
  description: string;
  type: string;
  unread: boolean;
  createdAt: string;
}

export interface DashboardNotificationListResponse {
  unreadCount: number;
  notifications: DashboardNotification[];
}

const unwrap = <T>(response: AxiosResponse<unknown>): T => {
  const data = response.data;
  if (typeof data === "object" && data !== null && "result" in data) {
    const result = (data as { result?: unknown }).result;
    if (result !== null && result !== undefined) return result as T;
  }
  return data as T;
};

export const notificationService = {
  getDashboardNotifications: async (limit = 10): Promise<DashboardNotificationListResponse> => {
    const res = await apiClient.get("/dashboard/notifications", { params: { limit } });
    return unwrap<DashboardNotificationListResponse>(res);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put("/dashboard/notifications/read-all");
  },

  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.put(`/dashboard/notifications/${notificationId}/read`);
  },

  markAsUnread: async (notificationId: number): Promise<void> => {
    await apiClient.put(`/dashboard/notifications/${notificationId}/unread`);
  },
};

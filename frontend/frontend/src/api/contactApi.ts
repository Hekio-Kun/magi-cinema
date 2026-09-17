import apiClient from './api';

export type ContactCategory =
  | 'SERVICE_QUALITY'
  | 'BOOKING_PAYMENT'
  | 'STAFF_ATTITUDE'
  | 'PARTNERSHIP'
  | 'MOVIE_SCHEDULE'
  | 'OTHER';
export type ContactPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface AiModerationResult {
  isValid: boolean;
  reason?: string;
  badWords?: string[];
  suggestion?: string;
}

export interface ContactSubmitRequest {
  senderName: string;
  senderEmail: string;
  subject: string;
  category: ContactCategory;
  message: string;
}

export interface ContactSubmitResponse {
  success: boolean;
  message: string;
  aiModerationResult: AiModerationResult;
  ticketCode: string;
  status: ContactStatus;
  dueAt?: string;
}

export interface ContactReplyResponse {
  replyId: number;
  replyMessage: string;
  staffName?: string;
  emailDelivered: boolean;
  createdAt: string;
}

export interface ContactResponse {
  contactId: number;
  ticketCode: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  maskedMessage: string;
  aiApproved: boolean;
  aiReason?: string;
  badWords?: string[];
  status: ContactStatus;
  category: ContactCategory;
  priority: ContactPriority;
  assignedToUserId?: string;
  assignedToName?: string;
  dueAt?: string;
  overdue: boolean;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  internalNote?: string;
  archived: boolean;
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt?: string;
  replies: ContactReplyResponse[];
}

export interface ContactTrackingResponse {
  ticketCode: string;
  subject: string;
  category: ContactCategory;
  priority: ContactPriority;
  status: ContactStatus;
  createdAt: string;
  updatedAt?: string;
  dueAt?: string;
  resolvedAt?: string;
  replies: ContactReplyResponse[];
}

export interface ContactAnalyticsResponse {
  totalActive: number;
  newCount: number;
  inProgressCount: number;
  waitingCustomerCount: number;
  overdueCount: number;
  resolvedTodayCount: number;
  flaggedCount: number;
  averageFirstResponseMinutes: number;
}

export interface ContactUpdateRequest {
  status?: ContactStatus;
  priority?: ContactPriority;
  assignToMe?: boolean;
  internalNote?: string;
}

export const contactApi = {
  submit: async (data: ContactSubmitRequest): Promise<ContactSubmitResponse> => {
    const response = await apiClient.post('/contact/submit', data);
    return response.data.result || response.data;
  },
  track: async (ticketCode: string, email: string): Promise<ContactTrackingResponse> => {
    const response = await apiClient.get('/contact/track', { params: { ticketCode, email } });
    return response.data.result || response.data;
  },
  getAdminList: async (): Promise<ContactResponse[]> => {
    const response = await apiClient.get('/contact/admin/list');
    return response.data.result || [];
  },
  getAnalytics: async (): Promise<ContactAnalyticsResponse> => {
    const response = await apiClient.get('/contact/admin/analytics');
    return response.data.result || response.data;
  },
  update: async (contactId: number, data: ContactUpdateRequest): Promise<ContactResponse> => {
    const response = await apiClient.patch(`/contact/admin/${contactId}`, data);
    return response.data.result || response.data;
  },
  reply: async (contactId: number, replyMessage: string, resolveAfterReply = true): Promise<ContactResponse> => {
    const response = await apiClient.post(`/contact/admin/reply/${contactId}`, { replyMessage, resolveAfterReply });
    return response.data.result || response.data;
  },
  archive: async (contactId: number): Promise<void> => {
    await apiClient.delete(`/contact/admin/${contactId}`);
  },
  restore: async (contactId: number): Promise<ContactResponse> => {
    const response = await apiClient.patch(`/contact/admin/${contactId}/restore`);
    return response.data.result || response.data;
  },
};

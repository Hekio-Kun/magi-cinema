import apiClient from './api';

export interface AiModerationResult {
  isValid: boolean;
  reason: string;
  badWords: string[];
  suggestion: string;
}

export interface ContactSubmitRequest {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

export interface ContactSubmitResponse {
  success: boolean;
  message: string;
  aiModerationResult: AiModerationResult;
}

export interface ContactResponse {
  contactId: number;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;       // Original unmasked message
  maskedMessage: string; // Message with bad words replaced by ***
  aiApproved: boolean;
  aiReason?: string;
  badWords?: string[];
  status: string;        // "RECEIVED" | "REPLIED"
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export const contactApi = {
  submit: async (data: ContactSubmitRequest): Promise<ContactSubmitResponse> => {
    const response = await apiClient.post('/contact/submit', data);
    return response.data.result || response.data;
  },

  getAdminList: async (): Promise<ContactResponse[]> => {
    const response = await apiClient.get('/contact/admin/list');
    return response.data.result || [];
  },

  reply: async (contactId: number, replyMessage: string): Promise<ContactResponse> => {
    const response = await apiClient.post(`/contact/admin/reply/${contactId}`, { replyMessage });
    return response.data.result || response.data;
  },

  delete: async (contactId: number): Promise<void> => {
    await apiClient.delete(`/contact/admin/${contactId}`);
  }
};

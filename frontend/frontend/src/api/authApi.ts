import apiClient from './api';

export const authService = {
    checkRegistrationStep1: async (username: string, email: string) => {
        const response = await apiClient.get(`/auth/register/check?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`);
        return response.data;
    },

    register: async (userData: Record<string, unknown>) => {
        const response = await apiClient.post('/auth/register', userData);
        return response.data;
    },

    verifyOtp: async (registerData: Record<string, unknown>, otp: string) => {
        const response = await apiClient.post('/auth/register/verify', { registerRequest: registerData, otp });
        return response.data;
    },

    resendOtp: async (email: string) => {
        const response = await apiClient.post('/auth/register/resend-otp', { email });
        return response.data;
    },

    login: async (credentials: Record<string, unknown>) => {
        const response = await apiClient.post('/auth/login', credentials);
        if (response.data && response.data.result) {
            return response.data.result;
        }
        return response.data;
    },

    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.warn('Backend logout failed or offline, proceeding with local cleanup:', error);
        }
    },

    forgotPassword: async (email: string) => {
        const response = await apiClient.post('/auth/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (email: string, token: string, newPassword: string) => {
        const response = await apiClient.post('/auth/reset-password', { email, token, newPassword });
        return response.data;
    },
};

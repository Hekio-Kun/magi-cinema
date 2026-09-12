import axios from 'axios';
import { getAuthToken, clearAuthToken } from '@/utils/authSession';

const DEFAULT_API_URL = 'http://localhost:8080';
export const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Một số nhà mạng chặn image.tmdb.org; chuẩn hóa URL ngay tại biên API.
function replaceTmdbUrls(value: unknown): unknown {
    if (
        (typeof Blob !== 'undefined' && value instanceof Blob) ||
        (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
    ) {
        return value;
    }
    if (value === null || typeof value !== 'object') {
        if (typeof value === 'string' && value.includes('image.tmdb.org')) {
            return value.replace(/^https?:\/\/image\.tmdb\.org\//, 'https://wsrv.nl/?url=image.tmdb.org/');
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(replaceTmdbUrls);
    }
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, replaceTmdbUrls(entry)])
    );
}

apiClient.interceptors.response.use(
    (response) => {
        if (response.data) {
            response.data = replaceTmdbUrls(response.data);
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            clearAuthToken();
        }
        return Promise.reject(error);
    }
);

export default apiClient;

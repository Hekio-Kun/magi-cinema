import apiClient, { API_BASE_URL } from './api';
import { getAuthToken } from '@/utils/authSession';
import {
  PageResponse,
  ShowtimeSeat,
  ShowtimeSeatCreationRequest,
  ShowtimeSeatStatus,
  ShowtimeSeatUpdateRequest,
} from '@/types/seat';

export interface GetShowtimeSeatsParams {
  showtimeId?: number;
  status?: ShowtimeSeatStatus;
  page?: number;
  size?: number;
}

export interface SeatSelectionHoldResponse {
  showtimeId: number;
  showtimeSeatIds: number[];
  clientToken?: string | null;
  expiresAt?: string | null;
}

export const showtimeSeatService = {
  getShowtimeSeats: async (params: GetShowtimeSeatsParams = {}): Promise<PageResponse<ShowtimeSeat>> => {
    const response = await apiClient.get('/showtime-seats', { params });
    return response.data.result;
  },

  getById: async (showtimeSeatId: number): Promise<ShowtimeSeat> => {
    const response = await apiClient.get(`/showtime-seats/${showtimeSeatId}`);
    return response.data.result;
  },

  create: async (payload: ShowtimeSeatCreationRequest): Promise<ShowtimeSeat> => {
    const response = await apiClient.post('/showtime-seats', payload);
    return response.data.result;
  },

  update: async (showtimeSeatId: number, payload: ShowtimeSeatUpdateRequest): Promise<ShowtimeSeat> => {
    const response = await apiClient.put(`/showtime-seats/${showtimeSeatId}`, payload);
    return response.data.result;
  },

  delete: async (showtimeSeatId: number): Promise<void> => {
    await apiClient.delete(`/showtime-seats/${showtimeSeatId}`);
  },

  getCurrentSelection: async (
    showtimeId: number,
    clientToken: string
  ): Promise<SeatSelectionHoldResponse> => {
    const response = await apiClient.get('/seat-selections', { params: { showtimeId, clientToken } });
    return response.data.result;
  },

  updateSelection: async (
    showtimeId: number,
    showtimeSeatIds: number[],
    clientToken: string
  ): Promise<SeatSelectionHoldResponse> => {
    const response = await apiClient.put('/seat-selections', {
      showtimeId,
      showtimeSeatIds,
      clientToken,
    });
    return response.data.result;
  },

  releaseCurrentUserSelection: async (showtimeId: number): Promise<void> => {
    await apiClient.delete('/seat-selections', { params: { showtimeId } });
  },

  releaseSelectionOnPageExit: (showtimeId: number): void => {
    if (!Number.isFinite(showtimeId) || showtimeId <= 0) return;

    const authToken = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const endpoint = new URL(
      `${API_BASE_URL.replace(/\/$/, '')}/seat-selections`,
      window.location.origin
    );
    endpoint.searchParams.set('showtimeId', String(showtimeId));

    void fetch(endpoint.toString(), {
      method: 'DELETE',
      headers,
      keepalive: true,
    }).catch(() => {
      // The backend TTL is the final fallback when the browser cannot send on exit.
    });
  },
};

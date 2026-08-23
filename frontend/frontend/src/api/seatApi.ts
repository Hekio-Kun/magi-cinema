import apiClient from './api';
import {
  PageResponse,
  Seat,
  SeatCreationRequest,
  SeatStatus,
  SeatUpdateRequest,
} from '@/types/seat';

export interface GetSeatsParams {
  cinemaRoomId?: number;
  status?: SeatStatus;
  page?: number;
  size?: number;
}

export const seatService = {
  getSeats: async (params: GetSeatsParams = {}): Promise<PageResponse<Seat>> => {
    const response = await apiClient.get('/seats', { params });
    return response.data.result;
  },

  getById: async (seatId: number): Promise<Seat> => {
    const response = await apiClient.get(`/seats/${seatId}`);
    return response.data.result;
  },

  create: async (payload: SeatCreationRequest): Promise<Seat> => {
    const response = await apiClient.post('/seats', payload);
    return response.data.result;
  },

  update: async (seatId: number, payload: SeatUpdateRequest): Promise<Seat> => {
    const response = await apiClient.put(`/seats/${seatId}`, payload);
    return response.data.result;
  },

  delete: async (seatId: number): Promise<void> => {
    await apiClient.delete(`/seats/${seatId}`);
  },

  bulkUpdate: async (payload: { seatIds: number[], type?: string, status?: string }): Promise<void> => {
    await apiClient.put('/seats/bulk', payload);
  },
};

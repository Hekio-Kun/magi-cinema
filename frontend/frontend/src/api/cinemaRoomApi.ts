import apiClient from './api';
import {
  CinemaRoom,
  CinemaRoomCreationRequest,
  CinemaRoomOperationalSummary,
  CinemaRoomSeatSummary,
  CinemaRoomUpdateRequest,
  SeatLayoutRequest,
} from '@/types/cinemaRoom';
import type { Seat } from '@/types/seat';

export interface PageCinemaRoomResponse {
  content: CinemaRoom[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GetCinemaRoomsParams {
  keyword?: string;
  status?: string;
  page?: number;
  size?: number;
}

export const cinemaRoomService = {
  getCinemaRooms: async (params: GetCinemaRoomsParams = {}): Promise<PageCinemaRoomResponse> => {
    const response = await apiClient.get('/cinema-rooms', { params });
    return response.data.result;
  },

  getById: async (roomId: number): Promise<CinemaRoom> => {
    const response = await apiClient.get(`/cinema-rooms/${roomId}`);
    return response.data.result;
  },

  create: async (payload: CinemaRoomCreationRequest): Promise<CinemaRoom> => {
    const response = await apiClient.post('/cinema-rooms', payload);
    return response.data.result;
  },

  update: async (roomId: number, payload: CinemaRoomUpdateRequest): Promise<CinemaRoom> => {
    const response = await apiClient.put(`/cinema-rooms/${roomId}`, payload);
    return response.data.result;
  },

  delete: async (roomId: number): Promise<void> => {
    await apiClient.delete(`/cinema-rooms/${roomId}`);
  },

  restore: async (roomId: number): Promise<CinemaRoom> => {
    const response = await apiClient.patch(`/cinema-rooms/${roomId}/restore`);
    return response.data.result;
  },

  getSeatSummary: async (roomId: number): Promise<CinemaRoomSeatSummary> => {
    const response = await apiClient.get(`/cinema-rooms/${roomId}/seat-summary`);
    return response.data.result;
  },

  getOperationalSummary: async (): Promise<CinemaRoomOperationalSummary> => {
    const response = await apiClient.get('/cinema-rooms/operational-summary');
    return response.data.result;
  },

  applySeatLayout: async (roomId: number, payload: SeatLayoutRequest): Promise<Seat[]> => {
    const response = await apiClient.post(`/cinema-rooms/${roomId}/seat-layout`, payload);
    return response.data.result;
  },
};

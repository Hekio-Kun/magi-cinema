import apiClient from './api';
import { Genre, GenreRequest, GenreStatus } from '@/types/genre';

export const genreService = {
  getAllGenres: async (): Promise<Genre[]> => {
    const response = await apiClient.get('/genres');
    return response.data.result;
  },

  getAllGenresForAdmin: async (): Promise<Genre[]> => {
    const response = await apiClient.get('/genres/admin');
    return response.data.result;
  },

  getGenreById: async (genreId: number): Promise<Genre> => {
    const response = await apiClient.get(`/genres/${genreId}`);
    return response.data.result;
  },

  createGenre: async (payload: GenreRequest): Promise<Genre> => {
    const response = await apiClient.post('/genres', payload);
    return response.data.result;
  },

  updateGenre: async (genreId: number, payload: GenreRequest): Promise<Genre> => {
    const response = await apiClient.put(`/genres/${genreId}`, payload);
    return response.data.result;
  },

  updateStatus: async (genreId: number, status: GenreStatus): Promise<Genre> => {
    const response = await apiClient.patch(`/genres/${genreId}/status`, { status });
    return response.data.result;
  },

  deleteGenre: async (genreId: number): Promise<void> => {
    await apiClient.delete(`/genres/${genreId}`);
  },
};

import apiClient from './api';
import { MovieResponse } from './movieApi';
import type { MovieFormat, MovieLanguageType, MovieProjectionType } from './movieApi';

export interface DashboardShowtimeResponse {
    showtimeId: number;
    movieName: string;
    cinemaRoomName: string;
    cinemaRoomType: string;
    seatQuantity: number;
    presentationId?: number | null;
    presentationName?: string | null;
    presentationFormat?: MovieFormat | string | null;
    projectionType?: MovieProjectionType | string | null;
    languageType?: MovieLanguageType | string | null;
    showDate: string;
    startTime: string;
}

export interface DashboardResponse {
    totalMovies: number;
    totalUsers: number;
    totalCinemaRooms: number;
    totalShowtimes: number;
    topMovies: MovieResponse[];
    recentShowtimes: DashboardShowtimeResponse[];
}

export const dashboardService = {
    getStats: async (): Promise<DashboardResponse> => {
        const response = await apiClient.get('/dashboard/stats');
        return response.data.result;
    },
};

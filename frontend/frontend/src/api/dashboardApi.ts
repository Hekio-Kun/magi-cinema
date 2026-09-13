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
    onlineUsers?: number;
    peakOnlineUsersToday?: number;
    topMovies: MovieResponse[];
    recentShowtimes: DashboardShowtimeResponse[];
    financialSummary?: FinancialSummaryResponse | null;
}

export interface OnlineUsersResponse {
    onlineCount: number;
    peakToday: number;
}

export interface FinancialDailyResponse {
    date: string;
    bookings: number;
    tickets: number;
    grossSales: number;
    discountAmount: number;
    netSales: number;
    ticketRevenue: number;
    concessionRevenue: number;
}

export interface FinancialPaymentMethodResponse {
    paymentMethod: string;
    bookings: number;
    amount: number;
}

export interface FinancialMovieResponse {
    movieId: number;
    movieName: string;
    bookings: number;
    tickets: number;
    netSales: number;
}

export interface FinancialRoomResponse {
    roomId: number;
    roomName: string;
    seatCapacity: number;
    bookedSeats: number;
    occupancyRate: number;
}

export interface FinancialSummaryResponse {
    fromDate: string;
    toDate: string;
    totalBookings: number;
    successfulBookings: number;
    cancelledBookings: number;
    pendingBookings: number;
    ticketsSold: number;
    seatCapacity: number;
    bookedSeats: number;
    occupancyRate: number;
    grossSales: number;
    discountAmount: number;
    netSales: number;
    ticketRevenue: number;
    concessionRevenue: number;
    cancelledAmount: number;
    pendingAmount: number;
    averageOrderValue: number;
    cashCollected: number;
    bankTransferCollected: number;
    momoCollected: number;
    zaloPayCollected: number;
    otherCollected: number;
    daily: FinancialDailyResponse[];
    paymentMethods: FinancialPaymentMethodResponse[];
    topMovies: FinancialMovieResponse[];
    roomOccupancy: FinancialRoomResponse[];
}

export const dashboardService = {
    getStats: async (fromDate?: string, toDate?: string): Promise<DashboardResponse> => {
        const response = await apiClient.get('/dashboard/stats', {
            params: { fromDate, toDate },
        });
        return response.data.result;
    },
    getOnlineUsers: async (): Promise<OnlineUsersResponse> => {
        const response = await apiClient.get('/dashboard/online-users');
        return response.data.result;
    },
};

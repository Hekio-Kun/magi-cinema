import apiClient from './api';

export type ShowtimeStatusEnum = "CANCELLED" | "SCHEDULED" | "ONGOING" | "COMPLETED";

export interface ShowtimeResponse {
  showtimeId: number;
  movieId: number;
  cinemaRoomId: number;
  cinemaRoomName?: string | null;
  presentationId?: number | null;
  presentationName?: string | null;
  presentationFormat?: string | null;
  projectionType?: string | null;
  languageType?: string | null;
  showDate: string;
  startTime: string;
  endTime: string;
  basePrice: number;
  status: ShowtimeStatusEnum;
}

export interface ShowtimeAdminRequest {
  movieId: number;
  cinemaRoomId: number;
  presentationId?: number | null;
  showDate: string;
  startTime: string;
  endTime: string;
  basePrice?: number;
  status: ShowtimeStatusEnum;
}

export interface ShowtimeSelectionResponse extends ShowtimeResponse {
  seatSelectionPath?: string | null;
}

export interface MovieShowtimeByDateResponse {
  movieId: number;
  movieNameVn?: string | null;
  movieNameEnglish?: string | null;
  displayName?: string | null;
  showtimes: ShowtimeSelectionResponse[];
}

export type ShowtimePlannerPresentationMode = "AUTO" | "MANUAL";

export interface ShowtimePlannerPresentationRequest {
  presentationId: number;
  requestedShowtimes?: number;
  basePrice?: number;
}

export interface ShowtimePlannerMovieRequest {
  movieId: number;
  requestedShowtimes: number;
  basePrice?: number;
  presentationMode: ShowtimePlannerPresentationMode;
  presentations: ShowtimePlannerPresentationRequest[];
}

export interface ShowtimePlannerLockedItemRequest {
  clientKey?: string;
  movieId: number;
  presentationId: number;
  cinemaRoomId: number;
  showDate: string;
  startTime: string;
  endTime: string;
  basePrice?: number;
}

export interface ShowtimePlannerPreviewRequest {
  fromDate: string;
  toDate: string;
  openingTime: string;
  latestFinishTime: string;
  turnaroundMinutes: number;
  slotIntervalMinutes: number;
  primeStartTime: string;
  primeEndTime: string;
  maximizeSchedule?: boolean;
  cinemaRoomIds: number[];
  movies: ShowtimePlannerMovieRequest[];
  lockedItems?: ShowtimePlannerLockedItemRequest[];
}

export interface ShowtimePlannerPreviewItem {
  clientKey: string;
  movieId: number;
  movieName: string;
  presentationId: number;
  presentationName: string;
  cinemaRoomId: number;
  cinemaRoomName: string;
  showDate: string;
  startTime: string;
  endTime: string;
  basePrice: number;
  qualityScore: number;
  qualityReasons: string[];
  locked: boolean;
}

export interface ShowtimePlannerAllocationSummary {
  movieId: number;
  movieName: string;
  presentationId: number;
  presentationName: string;
  requested: number;
  scheduled: number;
  missing: number;
  maximumPossible: number;
  additionalPossible: number;
  maximumWithCurrentPlan: number;
  movieAdditionalPossible: number;
  movieMaximumWithCurrentPlan: number;
}

export interface ShowtimePlannerIssue {
  code: string;
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
  movieId?: number;
  presentationId?: number;
  cinemaRoomId?: number;
  requested?: number;
  scheduled?: number;
  missing?: number;
  blockerCounts?: Record<string, number>;
}

export interface ShowtimePlannerPreviewResponse {
  complete: boolean;
  totalRequested: number;
  totalScheduled: number;
  totalMissing: number;
  additionalPossible: number;
  additionalByFormat: Record<string, number>;
  items: ShowtimePlannerPreviewItem[];
  allocations: ShowtimePlannerAllocationSummary[];
  issues: ShowtimePlannerIssue[];
}

export interface ShowtimePlannerConfirmRequest {
  plan: ShowtimePlannerPreviewRequest;
  items: ShowtimePlannerPreviewItem[];
}

export interface ShowtimePlannerMovieSelectionRequest {
  movieId: number;
  presentationIds: number[];
}

export interface ShowtimePlannerCapacityRequest {
  fromDate: string;
  toDate: string;
  openingTime: string;
  latestFinishTime: string;
  turnaroundMinutes: number;
  slotIntervalMinutes: number;
  primeStartTime: string;
  primeEndTime: string;
  cinemaRoomIds: number[];
  movies: ShowtimePlannerMovieSelectionRequest[];
}

export interface ShowtimePlannerCapacityItem {
  movieId: number;
  movieName: string;
  presentationId: number;
  presentationName: string;
  maximumPossible: number;
  compatibleRoomCount: number;
  blockerCounts: Record<string, number>;
}

export interface ShowtimePlannerCapacityResponse {
  totalMaximum: number;
  planningDays: number;
  maximumByFormat: Record<string, number>;
  items: ShowtimePlannerCapacityItem[];
}

export const showtimeApi = {
  getPublicScreeningDates: async () => {
    const res = await apiClient.get('/showtimes/dates');
    return res.data.result as string[];
  },

  getPublicShowtimesByDate: async (date: string) => {
    const res = await apiClient.get('/showtimes', { params: { date } });
    return res.data.result as MovieShowtimeByDateResponse[];
  },

  getAdminShowtimes: async (params?: { movieId?: number; cinemaRoomId?: number; date?: string; status?: ShowtimeStatusEnum }) => {
    const res = await apiClient.get('/showtimes/admin', { params });
    return res.data.result as ShowtimeResponse[];
  },

  getShowtimeById: async (showtimeId: number) => {
    const res = await apiClient.get(`/showtimes/${showtimeId}`);
    return res.data.result as ShowtimeResponse;
  },

  getAdminShowtimeById: async (showtimeId: number) => {
    const res = await apiClient.get(`/showtimes/admin/${showtimeId}`);
    return res.data.result as ShowtimeResponse;
  },

  createShowtime: async (data: ShowtimeAdminRequest) => {
    const res = await apiClient.post('/showtimes/admin', data);
    return res.data.result as ShowtimeResponse;
  },

  createShowtimes: async (data: ShowtimeAdminRequest[]) => {
    const res = await apiClient.post('/showtimes/admin/bulk', data);
    return res.data.result as ShowtimeResponse[];
  },

  previewPlanner: async (data: ShowtimePlannerPreviewRequest, signal?: AbortSignal) => {
    const res = await apiClient.post('/showtimes/admin/planner/preview', data, { signal });
    return res.data.result as ShowtimePlannerPreviewResponse;
  },

  validatePlannerQuota: async (data: ShowtimePlannerPreviewRequest, signal?: AbortSignal) => {
    const res = await apiClient.post('/showtimes/admin/planner/validate-quota', data, { signal });
    return res.data.result as ShowtimePlannerPreviewResponse;
  },

  getPlannerCapacity: async (data: ShowtimePlannerCapacityRequest, signal?: AbortSignal) => {
    const res = await apiClient.post('/showtimes/admin/planner/capacity', data, { signal });
    return res.data.result as ShowtimePlannerCapacityResponse;
  },

  confirmPlanner: async (data: ShowtimePlannerConfirmRequest) => {
    const res = await apiClient.post('/showtimes/admin/planner/confirm', data);
    return res.data.result as ShowtimeResponse[];
  },

  updateShowtime: async (showtimeId: number, data: ShowtimeAdminRequest) => {
    const res = await apiClient.put(`/showtimes/admin/${showtimeId}`, data);
    return res.data.result as ShowtimeResponse;
  },

  cancelShowtime: async (showtimeId: number) => {
    const res = await apiClient.patch(`/showtimes/admin/${showtimeId}/cancel`);
    return res.data;
  },

  cancelShowtimes: async (showtimeIds: number[]) => {
    const res = await apiClient.patch('/showtimes/admin/bulk-cancel', showtimeIds);
    return res.data.result as number;
  },

  getAutoShowtimeConfig: async () => {
    return {
      openingTime: "08:00",
      latestFinishTime: "02:00",
      turnaroundMinutes: 20,
      basePrice: 85000,
      maxShowtimesPerMoviePerDay: 8,
      maxHotShowtimesPerMoviePerDay: 24,
      primeStartTime: "18:00",
      primeEndTime: "22:30",
      draftExpireMinutes: 30,
    };
  },

  updateAutoShowtimeConfig: async (config: unknown) => {
    return config;
  },

  previewAutoGenerateShowtimes: async (data: unknown) => {
    const res = await apiClient.post('/showtimes/admin/auto-generate/preview', data);
    return res.data.result;
  },

  confirmAutoShowtimeDraft: async (draftId: string | number) => {
    const res = await apiClient.post(`/showtimes/admin/auto-generate/confirm/${draftId}`);
    return res.data.result;
  },
};

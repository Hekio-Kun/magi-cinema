import apiClient from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export type MovieStatus = "NOW_SHOWING" | "COMING_SOON" | "ENDED" | "INACTIVE";
export type MovieFormat = "STANDARD" | "IMAX" | "_4DX";
export type MovieProjectionType = "TWO_D" | "THREE_D" | "2D" | "3D";
export type MovieLanguageType = "SUBTITLE" | "DUBBED" | "ORIGINAL";
export interface MoviePresentationRequest {
  presentationId?: number | null;
  format?: MovieFormat | string | null;
  projectionType?: MovieProjectionType | string | null;
  languageType?: MovieLanguageType | string | null;
  audioLanguage?: string | null;
  subtitleLanguage?: string | null;
  label?: string | null;
  active?: boolean | null;
  sortOrder?: number | null;
}

export interface MoviePresentationResponse extends MoviePresentationRequest {
  presentationId: number;
  displayName?: string | null;
}

export interface MoviePresentationOption {
  value: string;
  label: string;
}

export interface MoviePresentationOptionsResponse {
  formats: MoviePresentationOption[];
  projectionTypes: MoviePresentationOption[];
  languageTypes: MoviePresentationOption[];
}

export interface ShowtimeRequest {
  cinemaRoomId?: number | null;
  presentationId?: number | null;
  showDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: number | string | null;
}

export interface ShowtimeResponse extends ShowtimeRequest {
  showtimeId: number;
  movieId: number;
  cinemaRoomName?: string | null;
  presentationName?: string | null;
  presentationFormat?: string | null;
  projectionType?: string | null;
  languageType?: string | null;
}

export interface MovieResponse {
  movieId: number;
  movieNameVn: string;
  title?: string | null;
  movieNameEnglish?: string | null;
  actor?: string | null;
  director?: string | null;
  content?: string | null;
  duration?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  movieProductionCompany?: string | null;
  largeImage?: string | null;
  smallImage?: string | null;
  backdropImage?: string | null;
  rating?: number | null;
  ageRating?: string | null;
  showOnHero?: boolean | null;
  isHot?: boolean | null;
  status?: MovieStatus;
  types?: string[] | null;
  formats?: string[] | null;
  presentations?: MoviePresentationResponse[] | null;
  genres?: import('@/types/genre').Genre[] | null;
  showtimes?: ShowtimeResponse[] | null;
  trailer?: string | null;
}

export interface MovieCreateRequest {
  movieNameVn: string;
  movieNameEnglish?: string | null;
  actor?: string | null;
  director?: string | null;
  content?: string | null;
  duration?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  movieProductionCompany?: string | null;
  largeImage?: string | null;
  smallImage?: string | null;
  backdropImage?: string | null;
  rating?: number | null;
  ageRating?: string | null;
  showOnHero?: boolean | null;
  isHot?: boolean | null;
  status?: MovieStatus;
  types?: string[] | null;
  formats?: string[] | null;
  presentations?: MoviePresentationRequest[] | null;
  genreIds?: number[] | null;
  showtimes?: ShowtimeRequest[] | null;
  trailer?: string | null;
}

export type MovieUpdateRequest = Partial<MovieCreateRequest>;

export interface PageMovieResponse {
  content: MovieResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GetMoviesParams {
  keyword?: string;
  status?: MovieStatus;
  statuses?: MovieStatus[];
  genreId?: number;
  searchDate?: string;
  sortBy?: string;
  direction?: string;
  page?: number;
  size?: number;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const movieService = {
  getPresentationOptions: async (): Promise<MoviePresentationOptionsResponse> => {
    const response = await apiClient.get('/movies/presentation-options');
    return response.data.result;
  },

  getMovies: async (params: GetMoviesParams = {}): Promise<PageMovieResponse> => {
    const response = await apiClient.get('/movies', {
      params,
      paramsSerializer: {
        indexes: null,
      },
    });
    return response.data.result;
  },


  getById: async (movieId: number): Promise<MovieResponse> => {
    const response = await apiClient.get(`/movies/${movieId}`);
    return response.data.result;
  },

  create: async (payload: MovieCreateRequest): Promise<MovieResponse> => {
    const response = await apiClient.post('/movies', payload);
    return response.data.result;
  },

  update: async (movieId: number, payload: MovieUpdateRequest): Promise<MovieResponse> => {
    const response = await apiClient.put(`/movies/${movieId}`, payload);
    return response.data.result;
  },

  setHeroVisibility: async (movieId: number, showOnHero: boolean): Promise<MovieResponse> => {
    const response = await apiClient.patch(`/movies/${movieId}/hero-visibility`, { showOnHero });
    return response.data.result;
  },

  delete: async (movieId: number): Promise<void> => {
    await apiClient.delete(`/movies/${movieId}`);
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/movies/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.result;
  },

  checkConstraints: async (movieId: number): Promise<{ hasBookings: boolean; hasShowtimes: boolean }> => {
    const response = await apiClient.get(`/movies/${movieId}/constraints`);
    return response.data.result;
  },
};

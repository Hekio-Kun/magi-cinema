import api from "./api";
import type { MovieResponse } from "./movieApi";

interface ApiResponse<T> {
  code?: number;
  message?: string;
  result: T;
}

export interface TmdbMovieResult {
  id: number;
  title: string;
  original_title: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  overview: string;
}

export interface TmdbMovieSearchResponse {
  page: number;
  results: TmdbMovieResult[];
  total_pages: number;
  total_results: number;
}

export const tmdbApi = {
  searchMovies: (query: string, page = 1, language = "vi-VN") =>
    api.get<ApiResponse<TmdbMovieSearchResponse>>("/tmdb/search", {
      params: { query, page, language },
    }),

  getMovieById: (tmdbId: number, language = "vi-VN") =>
    api.get<ApiResponse<MovieResponse>>(`/tmdb/movie/${tmdbId}`, {
      params: { language },
    }),
};

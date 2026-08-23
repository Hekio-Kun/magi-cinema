import apiClient from './api';

export type LandingMovieStatus = 'NOW_SHOWING' | 'COMING_SOON' | 'ENDED' | 'INACTIVE';

// ── Type trả về từ Backend cho Landing Page ──────────────────────────────────
export interface MovieLandingItem {
  id: number;
  title: string;
  titleVn?: string | null;
  titleEnglish?: string | null;
  genre: string;
  rating: number | null;
  durationStr: string | null;
  description: string | null;
  poster: string | null;
  bg: string | null;
  releaseDate: string | null;
  hot: boolean;
  trailer: string | null;
  status: LandingMovieStatus | null;
  hasShowtimes: boolean | null;
}

type LandingMovieTitleSource = Pick<MovieLandingItem, 'title' | 'titleVn' | 'titleEnglish'>;

export const getLandingMovieTitle = (movie: LandingMovieTitleSource) => {
  const titleVn = movie.titleVn?.trim();
  if (titleVn) return titleVn;

  const title = movie.title?.trim();
  const titleEnglish = movie.titleEnglish?.trim();
  if (title && title !== titleEnglish) return title;

  return 'Chưa cập nhật tên phim';
};

// ── Service ───────────────────────────────────────────────────────────────────
export const landingMovieService = {
  /** Lấy các phim được admin bật hiển thị trên Hero. */
  getHeroMovies: async (): Promise<MovieLandingItem[]> => {
    const res = await apiClient.get('/movies/landing/hero');
    return res.data.result ?? [];
  },

  /** Lấy danh sách phim đang chiếu cho Now Showing */
  getNowShowing: async (): Promise<MovieLandingItem[]> => {
    const res = await apiClient.get('/movies/landing/now-showing');
    return res.data.result ?? [];
  },

  /** Lấy danh sách phim sắp chiếu cho Coming Soon */
  getComingSoon: async (): Promise<MovieLandingItem[]> => {
    const res = await apiClient.get('/movies/landing/coming-soon');
    return res.data.result ?? [];
  },
};

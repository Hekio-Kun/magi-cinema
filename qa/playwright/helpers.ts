import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const API_BASE_URL = (process.env.API_BASE_URL?.trim() || 'http://localhost:8080').replace(/\/$/, '');
export const BOT_PASSWORD = process.env.BOT_PASSWORD || 'password';
export const BOT_USER_PREFIX = process.env.BOT_USER_PREFIX || 'demo.customer.';

export interface ApiEnvelope<T> {
  result?: T;
  message?: string;
  code?: number;
}

export interface AuthResult {
  token: string;
  authenticated: boolean;
}

export interface Showtime {
  showtimeId: number;
  showDate: string;
  startTime: string;
  status?: string;
  basePrice?: number;
}

export interface ShowtimeGroup {
  showtimes?: Showtime[];
}

export interface ShowtimeSeat {
  showtimeSeatId: number;
  seatType?: string | null;
  status: string;
}

export interface SeatPage {
  content?: ShowtimeSeat[];
}

export interface HoldResult {
  showtimeId: number;
  showtimeSeatIds: number[];
  clientToken?: string | null;
  expiresAt?: string | null;
}

export interface AuthenticatedUser {
  username: string;
  token: string;
  headers: Record<string, string>;
}

export const apiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export function isLocalTarget(url = API_BASE_URL) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function assertSafeTarget(operation: string) {
  if (!isLocalTarget() && process.env.ALLOW_REMOTE_BOT_TEST !== 'true') {
    throw new Error(
      `${operation} bị chặn vì API_BASE_URL đang trỏ tới môi trường ngoài local. ` +
      'Đặt ALLOW_REMOTE_BOT_TEST=true nếu bạn đã chuẩn bị database kiểm thử riêng.',
    );
  }
}

async function expectJson<T>(response: APIResponse, expectedStatus = 200): Promise<ApiEnvelope<T>> {
  expect(response.status(), await response.text()).toBe(expectedStatus);
  return (await response.json()) as ApiEnvelope<T>;
}

export async function login(request: APIRequestContext, username: string, password = BOT_PASSWORD): Promise<AuthenticatedUser> {
  const response = await request.post(apiUrl('/auth/login'), { data: { username, password } });
  const body = await expectJson<AuthResult>(response);
  const result = body.result;
  if (!result?.authenticated || !result.token) {
    throw new Error(`Không lấy được JWT cho tài khoản ${username}.`);
  }
  return { username, token: result.token, headers: { Authorization: `Bearer ${result.token}` } };
}

export async function findBookableShowtime(request: APIRequestContext): Promise<Showtime> {
  const datesResponse = await request.get(apiUrl('/showtimes/dates'));
  const datesBody = await expectJson<string[]>(datesResponse);
  const dates = datesBody.result || [];
  const now = Date.now();

  for (const date of dates) {
    const response = await request.get(apiUrl(`/showtimes?date=${encodeURIComponent(date)}`));
    const body = await expectJson<ShowtimeGroup[]>(response);
    for (const group of body.result || []) {
      for (const showtime of group.showtimes || []) {
        const startsAt = Date.parse(`${showtime.showDate}T${showtime.startTime}`);
        const isOpen = showtime.status !== 'CANCELLED' && showtime.status !== 'COMPLETED';
        if (isOpen && Number.isFinite(startsAt) && startsAt > now) return showtime;
      }
    }
  }
  throw new Error('Không tìm thấy suất chiếu tương lai để chạy bot.');
}

export async function getAvailableSeatIds(request: APIRequestContext, showtimeId: number, minimum = 2): Promise<number[]> {
  const response = await request.get(apiUrl(`/showtime-seats?showtimeId=${showtimeId}&page=0&size=500`));
  const body = await expectJson<SeatPage>(response);
  const seats = (body.result?.content || []).filter(
    (seat) => seat.status === 'AVAILABLE' && seat.seatType !== 'DISABLED',
  );
  if (seats.length < minimum) throw new Error(`Suất ${showtimeId} không còn đủ ghế trống cho test.`);
  return seats.slice(0, minimum).map((seat) => seat.showtimeSeatId);
}

export async function holdSeats(
  request: APIRequestContext,
  user: AuthenticatedUser,
  showtimeId: number,
  showtimeSeatIds: number[],
  clientToken = `bot-${randomUUID()}`,
) {
  const response = await request.put(apiUrl('/seat-selections'), {
    headers: user.headers,
    data: { showtimeId, showtimeSeatIds, clientToken },
  });
  return { response, body: response.ok() ? await response.json() as ApiEnvelope<HoldResult> : null, clientToken };
}

export async function releaseSeats(request: APIRequestContext, user: AuthenticatedUser, showtimeId: number) {
  return request.delete(apiUrl(`/seat-selections?showtimeId=${showtimeId}`), { headers: user.headers });
}

export function websocketUrl(showtimeId: number) {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/seat-updates';
  url.search = `?showtimeId=${encodeURIComponent(showtimeId)}`;
  return url.toString();
}

import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

const BASE_URL = (__ENV.API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const SCENARIO = __ENV.K6_SCENARIO || 'browse';
const BOT_USER_PREFIX = __ENV.K6_BOT_USER_PREFIX || 'demo.customer.';
const BOT_PASSWORD = __ENV.K6_BOT_PASSWORD || 'password';
const ALLOW_REMOTE = __ENV.ALLOW_REMOTE_LOAD === 'true';

function isLocal(url) {
  try {
    const host = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '::1'].includes(host);
  } catch (_) {
    return false;
  }
}

if (!isLocal(BASE_URL) && !ALLOW_REMOTE) {
  throw new Error('K6 bị chặn: API_BASE_URL không phải local. Dùng database kiểm thử riêng và ALLOW_REMOTE_LOAD=true.');
}

export const options = {
  scenarios: {
    traffic: {
      executor: __ENV.K6_EXECUTOR || 'ramping-vus',
      startVUs: Number(__ENV.K6_START_VUS || 1),
      stages: [
        { duration: __ENV.K6_RAMP_UP || '20s', target: Number(__ENV.K6_TARGET_VUS || 20) },
        { duration: __ENV.K6_HOLD || '40s', target: Number(__ENV.K6_TARGET_VUS || 20) },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.90'],
  },
};

function json(response, path, fallback = null) {
  try { return response.json(path) ?? fallback; } catch (_) { return fallback; }
}

function login() {
  const username = __ENV.K6_BOT_USER || `${BOT_USER_PREFIX}${String(__VU).padStart(5, '0')}`;
  const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ username, password: BOT_PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'login' },
  });
  check(response, { 'login succeeds': (r) => r.status === 200 && Boolean(json(r, 'result.token')) });
  return json(response, 'result.token', '');
}

function browse(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const dates = http.get(`${BASE_URL}/showtimes/dates`, { headers, tags: { operation: 'showtime-dates' } });
  check(dates, { 'dates endpoint succeeds': (r) => r.status === 200 });
  const date = json(dates, 'result.0', '');
  if (!date) return;
  const showtimes = http.get(`${BASE_URL}/showtimes?date=${encodeURIComponent(date)}`, { headers, tags: { operation: 'showtimes' } });
  check(showtimes, { 'showtimes endpoint succeeds': (r) => r.status === 200 });
  const showtimeId = json(showtimes, 'result.0.showtimes.0.showtimeId', null);
  if (!showtimeId) return;
  const seats = http.get(`${BASE_URL}/showtime-seats?showtimeId=${showtimeId}&page=0&size=500`, { headers, tags: { operation: 'seat-map' } });
  check(seats, { 'seat map endpoint succeeds': (r) => r.status === 200 });
  http.get(`${BASE_URL}/combos`, { headers, tags: { operation: 'combos' } });
  http.get(`${BASE_URL}/food-items`, { headers, tags: { operation: 'food-items' } });
  http.get(`${BASE_URL}/bookings/my-bookings`, { headers, tags: { operation: 'my-bookings' } });
}

function seatContention(token) {
  const dates = http.get(`${BASE_URL}/showtimes/dates`, { tags: { operation: 'showtime-dates' } });
  const date = json(dates, 'result.0', '');
  if (!date) return;
  const showtimes = http.get(`${BASE_URL}/showtimes?date=${encodeURIComponent(date)}`, { tags: { operation: 'showtimes' } });
  const showtimeId = json(showtimes, 'result.0.showtimes.0.showtimeId', null);
  if (!showtimeId) return;
  const seats = http.get(`${BASE_URL}/showtime-seats?showtimeId=${showtimeId}&page=0&size=500`, { tags: { operation: 'seat-map' } });
  const available = (json(seats, 'result.content', []) || []).filter((seat) => seat.status === 'AVAILABLE' && seat.seatType !== 'DISABLED' && seat.seatType !== 'COUPLE');
  if (!available.length) return;
  // All VUs intentionally target the same first available seat to exercise row locking.
  const seatId = available[0].showtimeSeatId;
  const selectionToken = `k6-${exec.vu.idInTest}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const hold = http.put(`${BASE_URL}/seat-selections`, JSON.stringify({ showtimeId, showtimeSeatIds: [seatId], clientToken: selectionToken }), { headers, tags: { operation: 'seat-hold' } });
  check(hold, { 'seat hold is serialized': (r) => [200, 400, 409, 422].includes(r.status) });
  http.del(`${BASE_URL}/seat-selections?showtimeId=${showtimeId}`, { headers, tags: { operation: 'seat-release' } });
}

function authz(token) {
  const response = http.get(`${BASE_URL}/bookings/all?page=1&size=1`, { headers: { Authorization: `Bearer ${token}` }, tags: { operation: 'rbac-bookings' } });
  check(response, { 'customer is forbidden from admin bookings': (r) => [401, 403].includes(r.status) });
}

export default function () {
  const token = login();
  if (!token) return;
  if (SCENARIO === 'seat-contention') seatContention(token);
  else if (SCENARIO === 'authz') authz(token);
  else browse(token);
  sleep(Number(__ENV.K6_SLEEP_SECONDS || 1));
}

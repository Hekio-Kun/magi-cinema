import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  assertSafeTarget,
  BOT_PASSWORD,
  findBookableShowtime,
  getAvailableSeatIds,
  holdSeats,
  login,
  releaseSeats,
  websocketUrl,
} from './helpers';

test.describe('seat locking and realtime updates', () => {
  test.beforeAll(() => assertSafeTarget('Seat contention test'));

  test('one concurrent holder wins and the observer receives a WebSocket update', async ({ browser, request }) => {
    const showtime = await findBookableShowtime(request);
    const [targetSeat] = await getAvailableSeatIds(request, showtime.showtimeId, 1);
    const [holder, competitor] = await Promise.all([
      login(request, process.env.CONTENTION_USER_A || 'demo.customer.00001', BOT_PASSWORD),
      login(request, process.env.CONTENTION_USER_B || 'demo.customer.00002', BOT_PASSWORD),
    ]);
    const observerContext = await browser.newContext({
      baseURL: process.env.UI_BASE_URL || 'http://localhost:3000',
    });
    const observer = await observerContext.newPage();
    const ws = websocketUrl(showtime.showtimeId);
    const token = `bot-ws-${randomUUID()}`;

    try {
      // Navigate first so the WebSocket handshake carries the same allowed Origin as the app.
      await observer.goto('/');
      await observer.evaluate((url) => new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(url);
        const timer = window.setTimeout(() => reject(new Error('WebSocket không mở trong thời gian cho phép.')), 8_000);
        socket.onopen = () => {
          window.clearTimeout(timer);
          (window as unknown as { __magiSocket?: WebSocket }).__magiSocket = socket;
          resolve();
        };
        socket.onerror = () => reject(new Error('Không thể mở WebSocket seat updates.'));
      }), ws);

      const messagePromise = observer.evaluate(() => new Promise<unknown>((resolve, reject) => {
        const socket = (window as unknown as { __magiSocket?: WebSocket }).__magiSocket;
        if (!socket) return reject(new Error('WebSocket observer chưa sẵn sàng.'));
        const timer = window.setTimeout(() => reject(new Error('Không nhận được broadcast ghế.')), 8_000);
        socket.onmessage = (event) => {
          window.clearTimeout(timer);
          try { resolve(JSON.parse(event.data as string)); } catch { reject(new Error('Broadcast không phải JSON.')); }
        };
      }));

      const firstHold = await holdSeats(request, holder, showtime.showtimeId, [targetSeat], token);
      expect(firstHold.response.status(), await firstHold.response.text()).toBe(200);
      const message = await messagePromise as { type?: string; showtimeId?: number; seats?: Array<{ showtimeSeatId?: number; status?: string }> };
      expect(message.type).toBe('SEAT_STATUS_CHANGED');
      expect(message.showtimeId).toBe(showtime.showtimeId);
      expect(message.seats?.some((seat) => seat.showtimeSeatId === targetSeat && seat.status === 'HOLDING')).toBe(true);

      await releaseSeats(request, holder, showtime.showtimeId);
      const raceTokens = [`bot-race-a-${randomUUID()}`, `bot-race-b-${randomUUID()}`];
      const race = await Promise.all([
        holdSeats(request, holder, showtime.showtimeId, [targetSeat], raceTokens[0]),
        holdSeats(request, competitor, showtime.showtimeId, [targetSeat], raceTokens[1]),
      ]);
      const winners = race.filter((result) => result.response.status() === 200 && result.body?.result?.showtimeSeatIds?.includes(targetSeat));
      expect(winners).toHaveLength(1);
    } finally {
      await Promise.allSettled([
        releaseSeats(request, holder, showtime.showtimeId),
        releaseSeats(request, competitor, showtime.showtimeId),
      ]);
      await observer.evaluate(() => (window as unknown as { __magiSocket?: WebSocket }).__magiSocket?.close());
      await observerContext.close();
    }
  });
});

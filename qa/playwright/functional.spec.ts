import { test, expect } from '@playwright/test';
import {
  assertSafeTarget,
  BOT_PASSWORD,
  BOT_USER_PREFIX,
  cancelPendingBooking,
  createPendingBooking,
  findBookableShowtime,
  getAvailableSeatIds,
  holdSeats,
  login,
  releaseSeats,
} from './helpers';

test.describe('Magi Cinema customer flow', () => {
  test.beforeAll(() => assertSafeTarget('UI functional test'));

  test('customer logs in, browses a showtime and opens the seat map', async ({ page, request }) => {
    const username = `${BOT_USER_PREFIX}${String(process.env.BOT_USER_NUMBER || '1').padStart(5, '0')}`;
    const showtime = await findBookableShowtime(request);

    await page.goto('/auth');
    await page.locator('input[type="text"]').first().fill(username);
    await page.locator('input[type="password"]').fill(BOT_PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).not.toHaveURL(/\/auth/);

    await page.goto(`/booking/${showtime.showtimeId}`);
    await expect(page.getByText('Màn hình')).toBeVisible();
    await expect(page.locator('button[title*="·"]').first()).toBeVisible();
  });

  test('customer token is accepted for own profile and booking history', async ({ request }) => {
    const username = `${BOT_USER_PREFIX}${String(process.env.BOT_USER_NUMBER || '1').padStart(5, '0')}`;
    const user = await login(request, username);
    const profile = await request.get(`${process.env.API_BASE_URL || 'http://localhost:8080'}/users/me`, { headers: user.headers });
    expect(profile.status(), await profile.text()).toBe(200);
    const bookings = await request.get(`${process.env.API_BASE_URL || 'http://localhost:8080'}/bookings/my-bookings`, { headers: user.headers });
    expect(bookings.status(), await bookings.text()).toBe(200);
  });

  test('customer can hold a seat and create a pending booking without calling a real gateway', async ({ request }) => {
    const username = `${BOT_USER_PREFIX}${String(process.env.BOT_USER_NUMBER || '1').padStart(5, '0')}`;
    const user = await login(request, username);
    const showtime = await findBookableShowtime(request);
    const [seatId] = await getAvailableSeatIds(request, showtime.showtimeId, 1);
    let bookingId: number | undefined;

    try {
      const hold = await holdSeats(request, user, showtime.showtimeId, [seatId]);
      expect(hold.response.status(), await hold.response.text()).toBe(200);
      const booking = await createPendingBooking(request, user, showtime.showtimeId, [seatId]);
      expect(booking.response.status(), await booking.response.text()).toBe(200);
      expect(booking.body?.result?.status).toBe('PENDING');
      bookingId = booking.body?.result?.bookingId;
      expect(bookingId).toBeTruthy();
    } finally {
      if (bookingId) await cancelPendingBooking(request, user, bookingId);
      await releaseSeats(request, user, showtime.showtimeId);
    }
  });
});

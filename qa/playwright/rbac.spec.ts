import { test, expect } from '@playwright/test';
import { assertSafeTarget, login } from './helpers';

test.describe('role-based access control', () => {
  test.beforeAll(() => assertSafeTarget('RBAC test'));

  test('customer cannot access admin booking and dashboard endpoints', async ({ request }) => {
    const customer = await login(request, 'demo.customer.00001');
    for (const path of ['/bookings/all?page=1&size=1', '/dashboard/stats']) {
      const response = await request.get(`${process.env.API_BASE_URL || 'http://localhost:8080'}${path}`, { headers: customer.headers });
      expect([401, 403], `${path} unexpectedly allowed a customer`).toContain(response.status());
    }
  });

  test('manager can access the same operational read endpoints', async ({ request }) => {
    const manager = await login(request, process.env.MANAGER_USERNAME || 'demo.manager', process.env.MANAGER_PASSWORD || 'password');
    const bookings = await request.get(`${process.env.API_BASE_URL || 'http://localhost:8080'}/bookings/all?page=1&size=1`, { headers: manager.headers });
    expect(bookings.status(), await bookings.text()).toBe(200);
    const stats = await request.get(`${process.env.API_BASE_URL || 'http://localhost:8080'}/dashboard/stats`, { headers: manager.headers });
    expect(stats.status(), await stats.text()).toBe(200);
  });
});

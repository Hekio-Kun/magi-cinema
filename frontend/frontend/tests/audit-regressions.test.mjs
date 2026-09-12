import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadSource(path, globals = {}) {
  const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, ...globals };
  vm.runInNewContext(outputText, context, { filename: path });
  return context.exports;
}

test('unknown API errors keep the fallback, including null and generic server messages', () => {
  const { getApiErrorMessage, getApiErrorMessages } = loadSource('api/errors.ts');
  for (const error of [null, undefined, 0, '', { response: { data: { message: 'Uncategorized' } } }]) {
    assert.equal(getApiErrorMessage(error, 'Vui lòng thử lại'), 'Vui lòng thử lại');
  }
  assert.equal(getApiErrorMessage({ response: { data: { message: '  Ghế đã được đặt  ' } } }, 'Lỗi'), 'Ghế đã được đặt');
  assert.deepEqual(Array.from(getApiErrorMessages({ message: 'Thiếu email; Thiếu họ tên' }, 'Lỗi')), ['Thiếu email', 'Thiếu họ tên']);
});

test('token writes notify same-tab subscribers after storage and unsubscribe removes listeners', () => {
  const values = new Map();
  const window = new EventTarget();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const auth = loadSource('utils/authSession.ts', { window, localStorage, Event });
  const observed = [];
  const unsubscribe = auth.subscribeAuthChanges(() => observed.push(auth.getAuthToken()));
  auth.setAuthToken('  token-A  ');
  assert.deepEqual(observed, ['token-A']);
  assert.throws(() => auth.setAuthToken('null'));
  assert.equal(auth.getAuthToken(), 'token-A');
  auth.clearAuthToken();
  assert.deepEqual(observed, ['token-A', null]);
  unsubscribe();
  auth.setAuthToken('token-B');
  assert.equal(observed.length, 2);
});

test('storage notifications synchronize other tabs and ignore unrelated keys', () => {
  const window = new EventTarget();
  const auth = loadSource('utils/authSession.ts', { window, localStorage: { getItem: () => null }, Event });
  let calls = 0;
  const unsubscribe = auth.subscribeAuthChanges(() => { calls += 1; });
  for (const key of ['theme', 'jwt_token', null]) {
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: key });
    window.dispatchEvent(event);
  }
  assert.equal(calls, 2);
  unsubscribe();
});

test('MoMo QR uses the payment URL when the optional QR and deeplink fields are absent', () => {
  const { getPaymentLinks } = loadSource('utils/paymentLinks.ts');
  const fallback = getPaymentLinks({ payUrl: 'https://momo.test/pay' });
  assert.equal(fallback.payUrl, 'https://momo.test/pay');
  assert.equal(fallback.qrContent, 'https://momo.test/pay');
  assert.equal(getPaymentLinks({ payUrl: 'pay', deeplink: 'momo://pay' }).qrContent, 'momo://pay');
  assert.equal(getPaymentLinks({ payUrl: 'pay', qrCodeUrl: 'qr', deeplink: 'deep' }).qrContent, 'qr');
  assert.equal(getPaymentLinks({ orderUrl: 'https://zalopay.test/pay' }).qrContent, 'https://zalopay.test/pay');
});

test('late requests cannot replace newer results, and cleanup invalidates pending work', async () => {
  const cleanups = [];
  const { useLatestRequest } = loadSource('hooks/useLatestRequest.ts', {
    require: (name) => {
      assert.equal(name, 'react');
      // Exercise the request ordering contract without a DOM or a new test framework.
      return { useRef: (current) => ({ current }), useCallback: (fn) => fn, useEffect: (fn) => cleanups.push(fn()) };
    },
  });
  const tracker = useLatestRequest();
  let resolveOld;
  let visible;
  const oldIsCurrent = tracker.startRequest();
  const oldRequest = new Promise((resolve) => { resolveOld = resolve; })
    .then((value) => { if (oldIsCurrent()) visible = value; });
  const newIsCurrent = tracker.startRequest();
  await Promise.resolve('new').then((value) => { if (newIsCurrent()) visible = value; });
  resolveOld('old');
  await oldRequest;
  assert.equal(visible, 'new');
  const pending = tracker.startRequest();
  cleanups.forEach((cleanup) => cleanup());
  assert.equal(pending(), false);
  const afterRemount = tracker.startRequest();
  assert.equal(afterRemount(), true);
  tracker.invalidateRequests();
  assert.equal(afterRemount(), false);
});

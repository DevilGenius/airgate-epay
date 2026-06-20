import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

const TOKEN_KEY = 'ag:web:auth:token';
const TOKEN_MODE_KEY = 'ag:web:auth:token_mode';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
}

function textResponse(body: string, init?: ResponseInit) {
  return new Response(body, { status: init?.status ?? 200, headers: init?.headers });
}

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the session token and unwraps core API responses', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'session-token');
    fetchMock.mockResolvedValueOnce(jsonResponse({
      code: 0,
      message: 'ok',
      data: { configured: true, methods: [{ key: 'alipay', label: '支付宝', icon: 'alipay' }] },
    }));

    const result = await api.methods();

    expect(result.configured).toBe(true);
    expect(result.methods[0].key).toBe('alipay');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/ext-user/payment-epay/user/methods');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer session-token');
    expect(init.body).toBeUndefined();
  });

  it('falls back to the local token only when token_mode is local', async () => {
    localStorage.setItem(TOKEN_KEY, 'local-token');
    fetchMock.mockResolvedValueOnce(jsonResponse({ list: [] }));

    await api.listOrders(25);

    let init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();

    fetchMock.mockClear();
    localStorage.setItem(TOKEN_MODE_KEY, 'local');
    fetchMock.mockResolvedValueOnce(jsonResponse({ list: [] }));

    await api.listOrders(25);

    const [url, secondInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/ext-user/payment-epay/user/orders?limit=25');
    init = secondInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer local-token');
  });

  it('serializes POST bodies and returns raw plugin JSON', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      id: 1,
      out_trade_no: 'AG1',
      user_id: 7,
      method: 'alipay',
      provider_id: 'cai',
      amount: 10,
      status: 'pending',
      subject: 'AirGate',
      expires_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }));

    const order = await api.createOrder({ amount: 10, method: 'alipay' });

    expect(order.out_trade_no).toBe('AG1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/ext-user/payment-epay/user/orders');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ amount: 10, method: 'alipay' }));
  });

  it('builds encoded user and admin paths', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ok: true, list: [], total: 0, stats: {} })));

    await api.getOrder('AG/1');
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/v1/ext-user/payment-epay/user/orders/AG%2F1');

    await api.adminListOrders({ page: 2, pageSize: 50, email: ' user@example.com ', status: 'paid' });
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/v1/ext/payment-epay/admin/orders?page=2&page_size=50&email=user%40example.com&status=paid');

    await api.adminListOrders({ status: 'all' });
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/v1/ext/payment-epay/admin/orders?page=1&page_size=20');

    await api.adminDeleteProvider('cai/hong');
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/v1/ext/payment-epay/admin/providers/cai%2Fhong');

    await api.adminReloadProviders();
    const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{}');
  });

  it('uses the most specific error message for failed responses', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 400, message: 'wrapped bad' }, { status: 400 }));
    await expect(api.methods()).rejects.toThrow('wrapped bad');

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'raw bad' }, { status: 400 }));
    await expect(api.methods()).rejects.toThrow('raw bad');

    fetchMock.mockResolvedValueOnce(textResponse('not json', { status: 502 }));
    await expect(api.methods()).rejects.toThrow('HTTP 502');
  });

  it('throws when a successful core wrapper has a non-zero code', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 123, message: 'business failed', data: null }));
    await expect(api.methods()).rejects.toThrow('business failed');
  });

  it('survives storage access failures', async () => {
    const sessionSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ configured: false, methods: [] }));

    await api.methods();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    sessionSpy.mockRestore();
  });
});

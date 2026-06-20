import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOrdersPage from './AdminOrdersPage';
import AdminProvidersPage from './AdminProvidersPage';
import OrdersPage from './OrdersPage';
import RechargePage from './RechargePage';
import plugin from './index';

const apiMock = vi.hoisted(() => ({
  methods: vi.fn(),
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  listOrders: vi.fn(),
  adminListOrders: vi.fn(),
  adminListProviders: vi.fn(),
  adminUpsertProvider: vi.fn(),
  adminDeleteProvider: vi.fn(),
  adminReloadProviders: vi.fn(),
}));

const qrMock = vi.hoisted(() => ({
  toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,qr')),
}));

vi.mock('./api', () => ({ api: apiMock }));
vi.mock('qrcode', () => ({ default: qrMock }));

const baseOrder = {
  id: 1,
  out_trade_no: 'AG1',
  user_id: 7,
  method: 'alipay',
  provider_id: 'cai',
  channel: 'cai',
  amount: 30,
  status: 'pending' as const,
  subject: 'AirGate 余额充值',
  payment_url: 'https://pay.example.com',
  qr_code_content: 'qr-content',
  expires_at: '2026-01-01T00:30:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const providerKind = {
  kind: 'epay_caihong',
  name: '彩虹易支付',
  description: '标准易支付',
  technical_detail: 'pid+key',
  supported_methods: ['alipay', 'wxpay'],
  field_descriptors: [
    { key: 'pid', label: 'PID', type: 'text', required: true },
    { key: 'key', label: 'Key', type: 'password', required: true },
    { key: 'enabled_methods', label: '启用的支付方式', type: 'method-multi', required: true },
  ],
};

const providerItem = {
  id: 'cai',
  kind: 'epay_caihong',
  name: '彩虹易支付 (cai)',
  enabled: true,
  config: { pid: 'p', key: 'k', enabled_methods: 'alipay' },
  supported_methods: ['alipay'],
  is_running: true,
};

describe('plugin pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    qrMock.toDataURL.mockResolvedValue('data:image/png;base64,qr');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    document.getElementById('airgate-epay-toast-keyframes')?.remove();
  });

  it('exports all declared plugin routes', () => {
    expect(plugin.routes?.map((route) => route.path)).toEqual([
      '/recharge',
      '/orders',
      '/admin/orders',
      '/admin/providers',
    ]);
  });

  it('renders recharge empty, pending, paid, and error states', async () => {
    apiMock.methods.mockResolvedValueOnce({ configured: false, methods: [] });
    const { unmount } = render(<RechargePage />);
    expect(await screen.findByText('充值功能暂未开放，请联系管理员。')).not.toBeNull();
    unmount();

    apiMock.methods.mockRejectedValueOnce(new Error('methods failed'));
    render(<RechargePage />);
    expect(await screen.findByText('加载支付方式失败: methods failed')).not.toBeNull();
    cleanup();

    apiMock.methods.mockResolvedValueOnce({
      configured: true,
      methods: [{ key: 'alipay', label: '支付宝', icon: 'alipay' }],
    });
    apiMock.createOrder.mockResolvedValueOnce(baseOrder);
    render(<RechargePage />);
    expect(await screen.findByText('选择金额')).not.toBeNull();
    fireEvent.click(screen.getByText('¥50'));
    fireEvent.click(screen.getByText('立即支付'));
    expect(await screen.findByText('扫码付款')).not.toBeNull();
    expect(qrMock.toDataURL).toHaveBeenCalledWith('qr-content', expect.objectContaining({ width: 240 }));
    expect(await screen.findByAltText('付款二维码')).not.toBeNull();
    fireEvent.click(screen.getByText('取消'));
    expect(screen.getByText('选择金额')).not.toBeNull();
    cleanup();

    apiMock.methods.mockResolvedValueOnce({
      configured: true,
      methods: [{ key: 'alipay', label: '支付宝', icon: 'alipay' }],
    });
    apiMock.createOrder.mockResolvedValueOnce({ ...baseOrder, status: 'paid' });
    render(<RechargePage />);
    fireEvent.click(await screen.findByText('立即支付'));
    expect(await screen.findByText(/已支付，金额/)).not.toBeNull();
  });

  it('renders user orders empty, error, and continue-pay modal states', async () => {
    apiMock.listOrders.mockResolvedValueOnce({ list: [] });
    const { unmount } = render(<OrdersPage />);
    expect(await screen.findByText('暂无充值记录')).not.toBeNull();
    unmount();

    apiMock.listOrders.mockRejectedValueOnce(new Error('orders failed'));
    render(<OrdersPage />);
    expect(await screen.findByText('加载失败: orders failed')).not.toBeNull();
    cleanup();

    apiMock.listOrders.mockResolvedValueOnce({ list: [baseOrder, { ...baseOrder, id: 2, out_trade_no: 'AG2', status: 'paid' }] });
    render(<OrdersPage />);
    expect(await screen.findByText('AG1')).not.toBeNull();
    expect(screen.getByText('已支付')).not.toBeNull();
    fireEvent.click(screen.getByText('继续支付'));
    expect(await screen.findByText('扫码付款')).not.toBeNull();
    expect(await screen.findByAltText('付款二维码')).not.toBeNull();
    fireEvent.click(screen.getByText('取消'));
    expect(screen.queryByText('扫码付款')).toBeNull();
  });

  it('handles recharge validation, rejected submits, and terminal unpaid orders', async () => {
    apiMock.methods.mockResolvedValueOnce({
      configured: true,
      methods: [{ key: 'alipay', label: '支付宝', icon: 'alipay' }],
    });
    apiMock.createOrder.mockRejectedValueOnce('plain failure');
    render(<RechargePage />);
    expect(await screen.findByText('选择金额')).not.toBeNull();

    fireEvent.change(document.querySelector('.ag-epay-amount-input') as HTMLInputElement, {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByText('立即支付'));
    expect(screen.getByText('请输入有效金额')).not.toBeNull();

    fireEvent.change(document.querySelector('.ag-epay-amount-input') as HTMLInputElement, {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByText('立即支付'));
    expect(await screen.findByText('plain failure')).not.toBeNull();
    cleanup();

    apiMock.methods.mockResolvedValueOnce({
      configured: true,
      methods: [{ key: 'wxpay', label: '微信支付', icon: 'wxpay' }],
    });
    apiMock.createOrder.mockResolvedValueOnce({ ...baseOrder, method: 'wxpay', status: 'expired' });
    render(<RechargePage />);
    fireEvent.click(await screen.findByText('立即支付'));
    expect(await screen.findByText('订单已过期')).not.toBeNull();
    fireEvent.click(screen.getByText('重新发起'));
    expect(screen.getByText('选择金额')).not.toBeNull();
  });

  it('polls user orders and handles QR generation failures', async () => {
    apiMock.listOrders.mockResolvedValue({ list: [baseOrder] });
    apiMock.getOrder.mockResolvedValue({ ...baseOrder, status: 'paid', paid_at: '2026-01-01T00:05:00Z' });
    const intervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((handler: TimerHandler) => {
      if (typeof handler === 'function') void handler();
      return 1;
    });
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
    const { unmount } = render(<OrdersPage />);
    expect(await screen.findByText('AG1')).not.toBeNull();
    fireEvent.click(screen.getByText('继续支付'));
    expect(await screen.findByText('扫码付款')).not.toBeNull();
    expect(apiMock.getOrder).toHaveBeenCalledWith('AG1');
    expect(await screen.findByText('支付成功')).not.toBeNull();
    unmount();
    intervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    cleanup();

    qrMock.toDataURL.mockRejectedValueOnce(new Error('qr failed'));
    apiMock.listOrders.mockResolvedValueOnce({ list: [baseOrder] });
    render(<OrdersPage />);
    expect(await screen.findByText('AG1')).not.toBeNull();
    fireEvent.click(screen.getByText('继续支付'));
    expect(await screen.findByText('生成二维码中...')).not.toBeNull();
    await waitFor(() => expect(screen.queryByAltText('付款二维码')).toBeNull());
    cleanup();

    apiMock.listOrders.mockResolvedValueOnce({
      list: [{ ...baseOrder, payment_url: '', qr_code_content: '', status: 'pending' }],
    });
    render(<OrdersPage />);
    expect(await screen.findByText('AG1')).not.toBeNull();
    expect(screen.queryByText('继续支付')).toBeNull();
  });

  it('loads admin orders, filters by status/email, and changes page size', async () => {
    apiMock.adminListOrders.mockResolvedValue({
      list: [{ ...baseOrder, user_email: 'user@example.com', status: 'paid', paid_at: '2026-01-01T00:05:00Z' }],
      total: 1,
      stats: {
        total: 1,
        paid: 1,
        pending: 0,
        expired: 0,
        failed: 0,
        cancelled: 0,
        refunded: 0,
        total_amount_paid: 30,
        today_amount_paid: 30,
      },
    });

    render(<AdminOrdersPage />);
    expect(await screen.findByText('user@example.com')).not.toBeNull();
    expect(screen.getAllByText('¥30.00').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('订单状态'));
    fireEvent.click(screen.getByRole('option', { name: '已支付' }));
    await waitFor(() => expect(apiMock.adminListOrders).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'paid', page: 1 })));

    fireEvent.change(screen.getByPlaceholderText('搜索用户邮箱'), { target: { value: 'user' } });
    await waitFor(() => expect(apiMock.adminListOrders).toHaveBeenLastCalledWith(expect.objectContaining({ email: 'user', page: 1 })));

    fireEvent.click(screen.getByLabelText('每页条数'));
    fireEvent.click(screen.getByRole('option', { name: '50' }));
    await waitFor(() => expect(apiMock.adminListOrders).toHaveBeenLastCalledWith(expect.objectContaining({ pageSize: 50, page: 1 })));
  });

  it('renders admin orders error and empty states with stored page size', async () => {
    localStorage.setItem('payment-epay.admin-orders.page-size', '100');
    apiMock.adminListOrders.mockResolvedValueOnce({
      list: [],
      total: 0,
      stats: undefined,
    });
    const { unmount } = render(<AdminOrdersPage />);
    expect(await screen.findByText('暂无订单')).not.toBeNull();
    expect(apiMock.adminListOrders).toHaveBeenLastCalledWith(expect.objectContaining({ pageSize: 100 }));
    unmount();

    apiMock.adminListOrders.mockRejectedValueOnce('admin failed');
    render(<AdminOrdersPage />);
    expect(await screen.findByText('加载失败: admin failed')).not.toBeNull();
  });

  it('renders admin providers and handles edit, toggle, and delete actions', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    apiMock.adminListProviders.mockResolvedValue({ providers: [providerItem], kinds: [providerKind] });
    apiMock.adminUpsertProvider.mockResolvedValue({ ok: true, id: 'cai' });
    apiMock.adminDeleteProvider.mockResolvedValue({ ok: true });

    render(<AdminProvidersPage />);
    expect(await screen.findByText('彩虹易支付')).not.toBeNull();
    expect(screen.getByText('运行中')).not.toBeNull();

    fireEvent.click(screen.getByText('禁用'));
    await waitFor(() => expect(apiMock.adminUpsertProvider).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cai',
      enabled: false,
    })));

    fireEvent.click(screen.getByText('编辑'));
    expect(await screen.findByText('编辑服务商 - 彩虹易支付')).not.toBeNull();
    fireEvent.change(screen.getByDisplayValue('p'), { target: { value: 'p2' } });
    fireEvent.click(screen.getByText('保存'));
    await waitFor(() => expect(apiMock.adminUpsertProvider).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cai',
      original_id: 'cai',
      config: expect.objectContaining({ pid: 'p2' }),
    })));

    fireEvent.click(screen.getByText('删除'));
    await waitFor(() => expect(apiMock.adminDeleteProvider).toHaveBeenCalledWith('cai'));
  });

  it('renders provider error and empty states, validates create forms, and honors cancelled confirms', async () => {
    apiMock.adminListProviders.mockRejectedValueOnce('provider failed');
    const { unmount } = render(<AdminProvidersPage />);
    expect((await screen.findAllByText('加载失败: provider failed')).length).toBe(2);
    unmount();

    apiMock.adminListProviders.mockResolvedValueOnce({ providers: [], kinds: [] });
    render(<AdminProvidersPage />);
    expect(await screen.findByText('暂无可添加的服务商类型')).not.toBeNull();
    expect(screen.getByText('暂未配置任何服务商')).not.toBeNull();
    cleanup();

    const detailedKind = {
      ...providerKind,
      field_descriptors: [
        { key: 'pid', label: 'PID', type: 'text', required: true, placeholder: '输入 PID' },
        { key: 'key', label: 'Key', type: 'password', required: true, placeholder: '输入 Key' },
        { key: 'note', label: '备注', type: 'textarea', placeholder: '输入备注' },
        { key: 'sandbox', label: '沙箱模式', type: 'bool' },
        { key: 'enabled_methods', label: '启用的支付方式', type: 'method-multi', required: true },
      ],
    };
    apiMock.adminListProviders.mockResolvedValueOnce({ providers: [], kinds: [detailedKind] });
    apiMock.adminUpsertProvider.mockRejectedValueOnce(new Error('save failed'));
    render(<AdminProvidersPage />);
    fireEvent.click(await screen.findByText('添加'));
    expect(await screen.findByText('添加服务商 - 彩虹易支付')).not.toBeNull();
    fireEvent.click(screen.getByText('保存'));
    expect(await screen.findByText('「PID」必填')).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText('输入 PID'), { target: { value: 'p' } });
    fireEvent.change(screen.getByPlaceholderText('输入 Key'), { target: { value: 'k' } });
    fireEvent.change(screen.getByPlaceholderText('输入备注'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByLabelText('已关闭'));
    fireEvent.click(screen.getByLabelText('支付宝'));
    fireEvent.click(screen.getByText('保存'));
    expect(await screen.findByText('保存失败: save failed')).not.toBeNull();
    cleanup();

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    apiMock.adminListProviders.mockResolvedValueOnce({ providers: [providerItem], kinds: [providerKind] });
    render(<AdminProvidersPage />);
    expect(await screen.findByText('彩虹易支付')).not.toBeNull();
    fireEvent.click(screen.getByText('删除'));
    await waitFor(() => expect(apiMock.adminDeleteProvider).not.toHaveBeenCalled());
  });
});

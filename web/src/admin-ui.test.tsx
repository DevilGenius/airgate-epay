import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  FormField,
  MethodChips,
  MethodMultiSelect,
  MetricCard,
  Modal,
  PageShell,
  Pagination,
  PaymentQrPanel,
  Select,
  StatusBadge,
  Switch,
  TableState,
} from './admin-ui';

describe('admin-ui components', () => {
  afterEach(() => cleanup());

  it('renders basic shells and controls with expected attributes', () => {
    const onClick = vi.fn();
    render(
      <PageShell>
        <MetricCard label="累计收款" tone="success" value="¥10.00" />
        <StatusBadge tone="warning">待支付</StatusBadge>
        <TableState tone="danger">加载失败</TableState>
        <FormField label="App ID" required description="必填">
          <input aria-label="App ID" />
        </FormField>
        <Button iconOnly onClick={onClick} title="刷新" variant="danger">R</Button>
      </PageShell>,
    );

    expect(document.querySelector('.ag-epay-page')).not.toBeNull();
    expect(screen.getByText('累计收款').parentElement?.getAttribute('data-tone')).toBe('success');
    expect(screen.getByText('待支付').getAttribute('data-tone')).toBe('warning');
    expect(screen.getByText('加载失败').getAttribute('data-tone')).toBe('danger');
    expect(screen.getByText('*')).not.toBeNull();

    fireEvent.click(screen.getByTitle('刷新'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle('刷新').className).toContain('ag-epay-button--danger');
  });

  it('opens select options, emits changes, and closes on Escape/outside click', () => {
    const onChange = vi.fn();
    render(
      <Select
        ariaLabel="订单状态"
        onChange={onChange}
        options={[
          { value: 'all', label: '全部状态' },
          { value: 'paid', label: '已支付' },
        ]}
        value="all"
      />,
    );

    fireEvent.click(screen.getByLabelText('订单状态'));
    expect(screen.getByRole('listbox')).not.toBeNull();
    fireEvent.click(screen.getByText('已支付'));
    expect(onChange).toHaveBeenCalledWith('paid');
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(screen.getByLabelText('订单状态'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(screen.getByLabelText('订单状态'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('renders pagination and clamps previous/next page actions', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={4}
        pageSize={20}
        pageSizeOptions={[20, 50]}
        total={200}
        totalPages={10}
      />,
    );

    fireEvent.click(screen.getByLabelText('上一页'));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByLabelText('下一页'));
    expect(onPageChange).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByText('5'));
    expect(onPageChange).toHaveBeenCalledWith(5);

    fireEvent.click(screen.getByLabelText('每页条数'));
    fireEvent.click(screen.getByRole('option', { name: '50' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('renders method chips and multi-select toggles in candidate order', () => {
    const format = (method: string) => ({ alipay: '支付宝', wxpay: '微信支付' } as Record<string, string>)[method] || method;
    const onChange = vi.fn();
    const { rerender } = render(<MethodChips format={format} methods={[]} />);
    expect(screen.getByText('-')).not.toBeNull();

    rerender(<MethodChips format={format} methods={['alipay', 'wxpay']} />);
    expect(screen.getByText('支付宝')).not.toBeNull();
    expect(screen.getByText('微信支付')).not.toBeNull();

    rerender(
      <MethodMultiSelect
        candidates={['alipay', 'wxpay']}
        format={format}
        onChange={onChange}
        value="wxpay"
      />,
    );
    fireEvent.click(screen.getByLabelText('支付宝'));
    expect(onChange).toHaveBeenCalledWith('alipay,wxpay');
    fireEvent.click(screen.getByLabelText('微信支付'));
    expect(onChange).toHaveBeenCalledWith('alipay');

    rerender(<MethodMultiSelect candidates={[]} format={format} onChange={onChange} value="" />);
    expect(screen.getByText('该协议没有可选的支付方式')).not.toBeNull();
  });

  it('renders QR panel placeholders, images, and optional payment links', () => {
    const { rerender } = render(
      <PaymentQrPanel
        amountLabel="¥ 10.00"
        methodLabel="支付宝"
        note="请稍候"
        orderNo="AG1"
        paymentUrl="https://pay.example.com"
        qrDataUrl={null}
      />,
    );
    expect(screen.getByText('生成二维码中...')).not.toBeNull();
    expect((screen.getByText('点此在新窗口打开付款页') as HTMLAnchorElement).href).toBe('https://pay.example.com/');

    rerender(
      <PaymentQrPanel
        amountLabel="¥ 10.00"
        methodLabel="支付宝"
        note="请稍候"
        orderNo="AG1"
        qrDataUrl="data:image/png;base64,abc"
      />,
    );
    expect((screen.getByAltText('付款二维码') as HTMLImageElement).src).toBe('data:image/png;base64,abc');
    expect(screen.queryByText('点此在新窗口打开付款页')).toBeNull();
  });

  it('closes modal via Escape, backdrop, and close button but not content clicks', () => {
    const onClose = vi.fn();
    render(
      <Modal
        description="说明"
        footer={<Button onClick={onClose}>取消</Button>}
        onClose={onClose}
        title="编辑服务商"
      >
        <button type="button">内部按钮</button>
      </Modal>,
    );

    fireEvent.click(screen.getByText('内部按钮'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(document.querySelector('.ag-epay-modal-backdrop') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('switch reports checked state changes', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} label="启用后参与路由" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('启用后参与路由'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

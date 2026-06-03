import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api, type Order } from './api';
import {
  Button,
  MethodChips,
  Modal,
  PageShell,
  Panel,
  PaymentQrPanel,
  StatusBadge,
  TableState,
  type Tone,
} from './admin-ui';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const reload = () => {
    setLoading(true);
    api.listOrders(100)
      .then((res) => setOrders(res.list || []))
      .catch((error) => setErr(errorMessage(error)))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  // QR code generation when payingOrder changes
  useEffect(() => {
    if (!payingOrder) {
      setQrDataUrl(null);
      return;
    }
    const target = payingOrder.qr_code_content || payingOrder.payment_url;
    if (!target) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(target, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [payingOrder?.payment_url, payingOrder?.qr_code_content]);

  // Poll order status while paying
  useEffect(() => {
    if (!payingOrder || payingOrder.status !== 'pending') {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = window.setInterval(async () => {
      try {
        const fresh = await api.getOrder(payingOrder.out_trade_no);
        setPayingOrder(fresh);
        if (fresh.status !== 'pending') {
          reload();
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [payingOrder?.out_trade_no, payingOrder?.status]);

  const handleContinuePay = (order: Order) => {
    setPayingOrder(order);
  };

  const closePayModal = () => {
    setPayingOrder(null);
    setQrDataUrl(null);
  };

  return (
    <PageShell>
      <div className="ag-epay-page-body ag-epay-user-page-body">
        {payingOrder ? (
          <ContinuePayModal
            onClose={closePayModal}
            order={payingOrder}
            qrDataUrl={qrDataUrl}
          />
        ) : null}

        <Panel title="充值记录">
          <div className="ag-epay-table-shell">
            <div className="ag-epay-table-scroll">
              <table aria-label="充值记录" className="ag-epay-table ag-epay-user-orders-table" data-slot="table">
                <thead data-slot="thead">
                  <tr data-slot="tr">
                    <th data-slot="th" scope="col">订单号</th>
                    <th data-slot="th" scope="col">金额</th>
                    <th data-slot="th" scope="col">支付方式</th>
                    <th data-slot="th" scope="col">状态</th>
                    <th data-slot="th" scope="col">创建时间</th>
                    <th data-slot="th" scope="col">支付时间</th>
                    <th data-slot="th" scope="col">操作</th>
                  </tr>
                </thead>
                <tbody data-slot="tbody">
                  {renderOrdersTable({
                    err,
                    loading,
                    onContinuePay: handleContinuePay,
                    orders,
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function ContinuePayModal({
  onClose,
  order,
  qrDataUrl,
}: {
  onClose: () => void;
  order: Order;
  qrDataUrl: string | null;
}) {
  if (order.status === 'paid') {
    return (
      <Modal
        footer={<Button variant="primary" onClick={onClose}>关闭</Button>}
        onClose={onClose}
        title="支付成功"
      >
        <p className="ag-epay-result-message">
          订单 <code className="ag-epay-code">{order.out_trade_no}</code> 已支付{' '}
          <span className="ag-epay-result-amount">¥{order.amount.toFixed(2)}</span>
        </p>
      </Modal>
    );
  }

  if (order.status === 'pending') {
    return (
      <Modal
        footer={<Button onClick={onClose}>取消</Button>}
        onClose={onClose}
        title="扫码付款"
      >
        <PaymentQrPanel
          amountLabel={`¥ ${order.amount.toFixed(2)}`}
          methodLabel={methodLabel(order.method)}
          note="支付完成后将自动刷新（每 3 秒检查一次）"
          orderNo={order.out_trade_no}
          paymentUrl={order.payment_url}
          qrDataUrl={qrDataUrl}
        />
      </Modal>
    );
  }

  return (
    <Modal
      footer={<Button variant="primary" onClick={onClose}>关闭</Button>}
      onClose={onClose}
      title={`订单已${statusLabel(order.status)}`}
    >
      <p className="ag-epay-result-message ag-epay-result-message--muted">
        该订单无法继续支付，请重新发起充值。
      </p>
    </Modal>
  );
}

function renderOrdersTable({
  err,
  loading,
  onContinuePay,
  orders,
}: {
  err: string | null;
  loading: boolean;
  onContinuePay: (order: Order) => void;
  orders: Order[];
}) {
  if (err) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={7} data-slot="td">
          <TableState tone="danger">加载失败: {err}</TableState>
        </td>
      </tr>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={7} data-slot="td">
          <TableState>加载中...</TableState>
        </td>
      </tr>
    );
  }

  if (orders.length === 0) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={7} data-slot="td">
          <TableState>暂无充值记录</TableState>
        </td>
      </tr>
    );
  }

  return orders.map((order) => {
    const canContinuePay = order.status === 'pending' && Boolean(order.qr_code_content || order.payment_url);
    return (
      <tr key={order.id} data-slot="tr">
        <td data-slot="td">
          <code className="ag-epay-code">{order.out_trade_no}</code>
        </td>
        <td data-slot="td">
          <span className="ag-epay-amount">¥{order.amount.toFixed(2)}</span>
        </td>
        <td data-slot="td">
          <MethodChips format={methodLabel} methods={[order.method].filter(Boolean)} />
        </td>
        <td data-slot="td">
          <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
        </td>
        <td data-slot="td">
          <span className="ag-epay-code">{formatTime(order.created_at)}</span>
        </td>
        <td data-slot="td">
          {order.paid_at ? <span className="ag-epay-code">{formatTime(order.paid_at)}</span> : <span className="ag-epay-text-muted">-</span>}
        </td>
        <td data-slot="td">
          {canContinuePay ? (
            <Button onClick={() => onContinuePay(order)}>继续支付</Button>
          ) : (
            <span className="ag-epay-text-muted">-</span>
          )}
        </td>
      </tr>
    );
  });
}

function methodLabel(method: string): string {
  return ({ alipay: '支付宝', wxpay: '微信支付', qqpay: 'QQ 钱包' } as Record<string, string>)[method] || method || '-';
}

function statusLabel(status: string): string {
  return ({
    pending: '待支付',
    paid: '已支付',
    expired: '已过期',
    failed: '失败',
    cancelled: '已取消',
    refunded: '已退款',
  } as Record<string, string>)[status] || status;
}

function statusTone(status: string): Tone {
  return ({
    pending: 'warning',
    paid: 'success',
    expired: 'muted',
    failed: 'danger',
    cancelled: 'muted',
    refunded: 'muted',
  } as Record<string, Tone>)[status] || 'muted';
}

function formatTime(value: string): string {
  try {
    return new Date(value).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

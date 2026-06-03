import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { api, type MethodInfo, type Order } from './api';
import {
  Button,
  FormField,
  PageShell,
  Panel,
  PaymentQrPanel,
  TableState,
} from './admin-ui';

const PRESET_AMOUNTS = [10, 30, 50, 100, 200, 500];

/**
 * RechargePage 充值页面（用户级独立页面）
 *
 * 流程：
 *   1. 加载时拉取可用支付方式（PayMethod，对用户友好的"支付宝/微信/QQ"按钮）
 *   2. 用户选择金额（预设按钮 / 自定义输入） + 选择支付方式 → 「立即支付」
 *   3. 后端 service 通过 Router 自动选一个能服务此 method 的 Provider 实例
 *   4. 创建订单成功 → 渲染收款二维码并轮询订单状态
 *   5. 状态变 paid → 切换到成功页面，提示「余额已到账」
 *   6. 用户可点「再次充值」回到第 1 步
 */
export default function RechargePage() {
  const [methods, setMethods] = useState<MethodInfo[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsErr, setMethodsErr] = useState<string | null>(null);

  const [amount, setAmount] = useState<number>(30);
  const [method, setMethod] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // 1) 拉可用支付方式
  useEffect(() => {
    api.methods()
      .then((res) => {
        setMethods(res.methods || []);
        if (res.methods?.length) setMethod(res.methods[0].key);
      })
      .catch((err) => setMethodsErr(errorMessage(err)))
      .finally(() => setMethodsLoading(false));
  }, []);

  // 2) 订单状态轮询
  useEffect(() => {
    if (!order || order.status !== 'pending') {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    const tick = async () => {
      try {
        const next = await api.getOrder(order.out_trade_no);
        setOrder(next);
      } catch {
        /* 静默失败，下次重试 */
      }
    };
    pollRef.current = window.setInterval(tick, 3000);
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [order?.out_trade_no, order?.status]);

  // 3) 订单创建后把付款链接渲染成二维码（dataURL，可直接 <img src=...>）
  // 优先使用渠道返回的 qr_code_content（虎皮椒/微信原生二维码 schema），没有则用 payment_url
  useEffect(() => {
    if (!order) {
      setQrDataUrl(null);
      return;
    }
    const target = order.qr_code_content || order.payment_url;
    if (!target) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(target, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.payment_url, order?.qr_code_content]);

  const handleSubmit = async () => {
    setError(null);
    if (!method) {
      setError('请选择支付方式');
      return;
    }
    if (!amount || amount <= 0) {
      setError('请输入有效金额');
      return;
    }
    setSubmitting(true);
    try {
      const nextOrder = await api.createOrder({ amount, method, subject: 'AirGate 余额充值' });
      setOrder(nextOrder);
      // 不再 window.open 跳转新窗口；二维码会由上面的 useEffect 自动渲染到当前页
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setOrder(null);
    setError(null);
  };

  if (methodsLoading) {
    return (
      <RechargeFrame>
        <div className="ag-epay-user-card">
          <TableState>加载中...</TableState>
        </div>
      </RechargeFrame>
    );
  }

  if (methodsErr) {
    return (
      <RechargeFrame>
        <div className="ag-epay-user-card">
          <TableState tone="danger">加载支付方式失败: {methodsErr}</TableState>
        </div>
      </RechargeFrame>
    );
  }

  if (methods.length === 0) {
    return (
      <RechargeFrame>
        <Panel title="账户充值">
          <div className="ag-epay-user-card">
            <TableState>充值功能暂未开放，请联系管理员。</TableState>
          </div>
        </Panel>
      </RechargeFrame>
    );
  }

  if (order) {
    if (order.status === 'paid') {
      return (
        <RechargeFrame>
          <Panel title="充值成功">
            <div className="ag-epay-user-card ag-epay-user-card--center">
              <p className="ag-epay-result-message">
                订单 <code className="ag-epay-code">{order.out_trade_no}</code> 已支付，金额{' '}
                <span className="ag-epay-result-amount">¥{order.amount.toFixed(2)}</span> 已入账。
              </p>
              <div className="ag-epay-result-actions">
                <Button variant="primary" onClick={handleReset}>再次充值</Button>
              </div>
            </div>
          </Panel>
        </RechargeFrame>
      );
    }

    if (order.status === 'pending') {
      return (
        <RechargeFrame>
          <Panel title="扫码付款">
            <div className="ag-epay-user-card">
              <PaymentQrPanel
                amountLabel={`¥ ${order.amount.toFixed(2)}`}
                methodLabel={methodLabel(order.method)}
                note="支付完成后本页将自动跳转到结果页（每 3 秒检查一次）"
                orderNo={order.out_trade_no}
                paymentUrl={order.payment_url}
                qrDataUrl={qrDataUrl}
              />
              <div className="ag-epay-result-actions">
                <Button onClick={handleReset}>取消</Button>
              </div>
            </div>
          </Panel>
        </RechargeFrame>
      );
    }

    return (
      <RechargeFrame>
        <Panel title={`订单已${statusLabel(order.status)}`}>
          <div className="ag-epay-user-card ag-epay-user-card--center">
            <p className="ag-epay-result-message ag-epay-result-message--muted">
              订单号：<code className="ag-epay-code">{order.out_trade_no}</code>
            </p>
            <div className="ag-epay-result-actions">
              <Button variant="primary" onClick={handleReset}>重新发起</Button>
            </div>
          </div>
        </Panel>
      </RechargeFrame>
    );
  }

  return (
    <RechargeFrame>
      <Panel title="账户充值">
        <div className="ag-epay-user-card">
          <div className="ag-epay-recharge-form">
            <section className="ag-epay-recharge-section">
              <h3 className="ag-epay-section-title">选择金额</h3>
              <div className="ag-epay-amount-grid">
                {PRESET_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    aria-pressed={amount === value}
                    className="ag-epay-choice-button"
                    data-selected={amount === value ? 'true' : undefined}
                    onClick={() => setAmount(value)}
                    type="button"
                  >
                    ¥{value}
                  </button>
                ))}
              </div>

              <FormField label="自定义金额">
                <div className="ag-epay-amount-input-row">
                  <input
                    className="ag-epay-control ag-epay-input ag-epay-amount-input"
                    max={10000}
                    min={1}
                    onChange={(event) => setAmount(Number(event.target.value))}
                    step={1}
                    type="number"
                    value={amount}
                  />
                  <span className="ag-epay-field-unit">元</span>
                </div>
              </FormField>
            </section>

            <section className="ag-epay-recharge-section">
              <h3 className="ag-epay-section-title">选择支付方式</h3>
              <div className="ag-epay-method-grid">
                {methods.map((item) => (
                  <button
                    key={item.key}
                    aria-pressed={method === item.key}
                    className="ag-epay-choice-button ag-epay-method-choice"
                    data-selected={method === item.key ? 'true' : undefined}
                    onClick={() => setMethod(item.key)}
                    title={item.description}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {error ? <p className="ag-epay-form-error">{error}</p> : null}

            <Button
              className="ag-epay-submit-button"
              disabled={submitting}
              onClick={handleSubmit}
              variant="primary"
            >
              {submitting ? '处理中...' : '立即支付'}
            </Button>
          </div>
        </div>
      </Panel>
    </RechargeFrame>
  );
}

function RechargeFrame({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <div className="ag-epay-page-body ag-epay-user-page-body ag-epay-recharge-page">
        {children}
      </div>
    </PageShell>
  );
}

function methodLabel(method: string): string {
  return ({ alipay: '支付宝', wxpay: '微信支付', qqpay: 'QQ 钱包' } as Record<string, string>)[method] || method;
}

function statusLabel(status: string): string {
  return ({
    expired: '过期',
    failed: '失败',
    cancelled: '取消',
    refunded: '退款',
  } as Record<string, string>)[status] || status;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { cssVar } from '@doudou-start/airgate-theme';
import { api, type Order } from './api';

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
      .catch((e) => setErr(String(e?.message || e)))
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
      } catch { /* ignore */ }
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

  if (loading) return <div style={containerStyle}><div style={hintStyle}>加载中...</div></div>;
  if (err) return <div style={containerStyle}><div style={{ ...hintStyle, color: cssVar('danger') }}>加载失败: {err}</div></div>;

  return (
    <div style={containerStyle}>
      {/* QR code modal for continue-pay */}
      {payingOrder && (
        <div style={overlayStyle} onClick={closePayModal}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            {payingOrder.status === 'paid' ? (
              <>
                <h3 style={{ margin: '0 0 12px', color: cssVar('success') }}>支付成功</h3>
                <p style={{ margin: 0, color: cssVar('text'), fontSize: 14 }}>
                  订单 <code style={codeStyle}>{payingOrder.out_trade_no}</code> 已支付{' '}
                  <strong>¥{payingOrder.amount.toFixed(2)}</strong>
                </p>
                <button style={{ ...btnStyle, marginTop: 16 }} onClick={closePayModal}>关闭</button>
              </>
            ) : payingOrder.status === 'pending' ? (
              <>
                <h3 style={{ margin: '0 0 12px', color: cssVar('text') }}>扫码付款</h3>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="付款二维码" style={{ width: 240, height: 240, borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cssVar('textTertiary'), border: `1px solid ${cssVar('glassBorder')}`, borderRadius: 8 }}>
                    生成二维码中...
                  </div>
                )}
                <div style={{ marginTop: 12, fontWeight: 600, fontSize: 20, color: cssVar('text') }}>¥ {payingOrder.amount.toFixed(2)}</div>
                <div style={{ color: cssVar('textSecondary'), fontSize: 13, marginTop: 4 }}>
                  请使用 {methodLabel(payingOrder.method)} 扫码完成付款
                </div>
                <div style={{ marginTop: 6, color: cssVar('textTertiary'), fontSize: 12 }}>
                  订单号：<code style={codeStyle}>{payingOrder.out_trade_no}</code>
                </div>
                <p style={{ color: cssVar('textTertiary'), fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                  支付完成后将自动刷新（每 3 秒检查一次）
                </p>
                {payingOrder.payment_url && (
                  <p style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
                    扫码不便？{' '}
                    <a href={payingOrder.payment_url} target="_blank" rel="noreferrer" style={{ color: cssVar('primary'), textDecoration: 'none' }}>
                      点此在新窗口打开付款页 →
                    </a>
                  </p>
                )}
                <button style={{ ...btnSecondaryStyle, marginTop: 16 }} onClick={closePayModal}>取消</button>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 12px', color: cssVar('textSecondary') }}>订单已{statusLabel(payingOrder.status)}</h3>
                <p style={{ margin: 0, color: cssVar('textSecondary'), fontSize: 14 }}>该订单无法继续支付，请重新发起充值。</p>
                <button style={{ ...btnStyle, marginTop: 16 }} onClick={closePayModal}>关闭</button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={panelStyle}>
        {orders.length === 0 ? (
          <p style={emptyStyle}>暂无充值记录</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>订单号</th>
                  <th style={thStyle}>金额</th>
                  <th style={thStyle}>支付方式</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>创建时间</th>
                  <th style={thStyle}>支付时间</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, index) => (
                  <tr key={o.id} style={tableRowStyle(index)}>
                    <td style={tdStyle}><code style={codeStyle}>{o.out_trade_no}</code></td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>¥{o.amount.toFixed(2)}</td>
                    <td style={tdStyle}>{methodLabel(o.method)}</td>
                    <td style={{ ...tdStyle, color: statusColor(o.status), fontWeight: 600 }}>{statusLabel(o.status)}</td>
                    <td style={{ ...tdStyle, color: cssVar('textSecondary') }}>{formatTime(o.created_at)}</td>
                    <td style={{ ...tdStyle, color: cssVar('textSecondary') }}>{o.paid_at ? formatTime(o.paid_at) : '-'}</td>
                    <td style={tdStyle}>
                      {o.status === 'pending' && (o.qr_code_content || o.payment_url) ? (
                        <button style={continuePayBtnStyle} onClick={() => handleContinuePay(o)}>
                          继续支付
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function methodLabel(m: string): string {
  return ({ alipay: '支付宝', wxpay: '微信支付' } as Record<string, string>)[m] || m || '-';
}
function statusLabel(s: string): string {
  return ({
    pending: '待支付',
    paid: '已支付',
    expired: '已过期',
    failed: '失败',
    cancelled: '已取消',
    refunded: '已退款',
  } as Record<string, string>)[s] || s;
}
function statusColor(s: string): string {
  return ({
    pending: cssVar('warning'),
    paid: cssVar('success'),
    expired: cssVar('textTertiary'),
    failed: cssVar('danger'),
    cancelled: cssVar('textTertiary'),
    refunded: cssVar('textTertiary'),
  } as Record<string, string>)[s] || 'inherit';
}
function formatTime(t: string): string {
  try { return new Date(t).toLocaleString(); } catch { return t; }
}

const containerStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '24px 24px 48px',
  color: cssVar('text'),
};

const hintStyle: React.CSSProperties = {
  padding: '40px 0',
  textAlign: 'center',
  color: cssVar('textSecondary'),
};

const panelStyle: React.CSSProperties = {
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: cssVar('radiusLg'),
  background: cssVar('bgElevated'),
  padding: '8px 0',
  overflow: 'hidden',
};

const emptyStyle: React.CSSProperties = {
  color: cssVar('textTertiary'),
  textAlign: 'center',
  padding: '40px 0',
  fontSize: 14,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

function tableRowStyle(index: number): React.CSSProperties {
  return index % 2 === 0 ? tableRowLightStyle : tableRowDarkStyle;
}

const tableRowLightStyle: React.CSSProperties = {
  background: cssVar('bgSurface'),
};

const tableRowDarkStyle: React.CSSProperties = {
  background: cssVar('bgHover'),
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  borderBottom: `1px solid ${cssVar('glassBorder')}`,
  background: cssVar('bgSurface'),
  color: cssVar('textSecondary'),
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: `1px solid ${cssVar('glassBorder')}`,
  fontSize: 13,
  color: cssVar('text'),
  whiteSpace: 'nowrap',
};

const codeStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: cssVar('fontMono'),
  color: cssVar('textSecondary'),
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: cssVar('bgElevated'),
  borderRadius: cssVar('radiusLg'),
  padding: '32px',
  textAlign: 'center',
  minWidth: 320,
  maxWidth: 400,
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 24px',
  border: 'none',
  borderRadius: cssVar('radiusMd'),
  background: cssVar('primary'),
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: '8px 24px',
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: cssVar('radiusMd'),
  background: 'transparent',
  color: cssVar('textSecondary'),
  fontSize: 14,
  cursor: 'pointer',
};

const continuePayBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: `1px solid ${cssVar('primary')}`,
  borderRadius: cssVar('radiusMd'),
  background: 'transparent',
  color: cssVar('primary'),
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

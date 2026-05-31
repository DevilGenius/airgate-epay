import { useCallback, useEffect, useRef, useState } from 'react';
import { cssVar } from '@doudou-start/airgate-theme';
import { api, type Order, type OrderStats } from './api';

const EMPTY_STATS: OrderStats = {
  total: 0, paid: 0, pending: 0, expired: 0, failed: 0, cancelled: 0, refunded: 0,
  total_amount_paid: 0, today_amount_paid: 0,
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'expired', label: '已过期' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
];

type SelectOption = { value: string; label: string };

/**
 * AdminOrdersPage 管理员订单总览
 *
 * 与用户的「充值记录」不同：
 *   - 这里调 /admin/orders 拉所有用户的全量订单
 *   - 顶部展示统计概览：总订单数 / 已支付 / 待支付 / 今日金额
 *   - 支持按状态筛选（客户端）+ 用户邮箱搜索（服务端 ILIKE，300ms 防抖）
 *
 * 样式说明：使用 @doudou-start/airgate-theme 的语义 token，确保跟随宿主明/暗主题。
 *   - 背景层次：bgSurface（卡片）/ bgHover（hover）
 *   - 边框：glassBorder（柔和边框，配合 bgSurface 制造层次）
 *   - 文字：text（主）/ textSecondary（次）/ textTertiary（提示）
 *   - 圆角：radiusLg（卡片）/ radiusMd（输入/按钮）
 */
export default function AdminOrdersPage() {
  const [list, setList] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<OrderStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailFilter, setEmailFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const reload = useCallback(() => {
    setLoading(true);
    setErr(null);
    api.adminListOrders({ page, pageSize, email: emailFilter, status: statusFilter })
      .then((res) => {
        setList(res.list || []);
        setTotal(res.total || 0);
        setStats(res.stats || EMPTY_STATS);
      })
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [page, pageSize, emailFilter, statusFilter]);

  // emailFilter 输入做 300ms 防抖；其他依赖（page/pageSize/status）变化立即拉取
  useEffect(() => {
    const delay = emailFilter ? 300 : 0;
    const t = setTimeout(reload, delay);
    return () => clearTimeout(t);
  }, [reload, emailFilter]);

  // 切换 status / email / pageSize 时回到第 1 页
  useEffect(() => { setPage(1); }, [statusFilter, emailFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={containerStyle}>
      {/* 统计卡片（来自后端，跨所有 status，仅按 email 过滤）*/}
      <div style={statsGridStyle}>
        <StatCard label="总订单数" value={stats.total} />
        <StatCard label="已支付" value={stats.paid} accent={cssVar('success')} />
        <StatCard label="待支付" value={stats.pending} accent={cssVar('warning')} />
        <StatCard label="已过期" value={stats.expired} />
        <StatCard label="累计收款" value={`¥${stats.total_amount_paid.toFixed(2)}`} accent={cssVar('success')} />
        <StatCard label="今日收款" value={`¥${stats.today_amount_paid.toFixed(2)}`} accent={cssVar('success')} />
      </div>

      {/* 筛选 + 表格 + 分页 卡片 */}
      <div style={panelStyle}>
        <div style={filterRowStyle}>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            style={selectStyle}
          />
          <input
            type="text"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="搜索用户邮箱"
            style={{ ...inputStyle, width: 240 }}
          />
          <RefreshIconButton onClick={reload} loading={loading} />
        </div>

        {err ? (
          <p style={{ ...emptyStyle, color: cssVar('danger') }}>加载失败: {err}</p>
        ) : loading && list.length === 0 ? (
          <p style={emptyStyle}>加载中...</p>
        ) : list.length === 0 ? (
          <p style={emptyStyle}>暂无订单</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>订单号</th>
                  <th style={thStyle}>用户邮箱</th>
                  <th style={thStyle}>金额</th>
                  <th style={thStyle}>支付方式</th>
                  <th style={thStyle}>服务商</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>创建时间</th>
                  <th style={thStyle}>支付时间</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o, index) => (
                  <tr key={o.id} style={tableRowStyle(index)}>
                    <td style={tdStyle}><code style={codeStyle}>{o.out_trade_no}</code></td>
                    <td style={tdStyle}>
                      {o.user_email
                        ? <span style={{ color: cssVar('text') }}>{o.user_email}</span>
                        : <span style={{ color: cssVar('textTertiary') }}>#{o.user_id}</span>}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>¥{o.amount.toFixed(2)}</td>
                    <td style={tdStyle}>{methodLabel(o.method)}</td>
                    <td style={{ ...tdStyle, color: cssVar('textSecondary') }}>{o.provider_id || '-'}</td>
                    <td style={{ ...tdStyle, color: statusColor(o.status), fontWeight: 600 }}>{statusLabel(o.status)}</td>
                    <td style={{ ...tdStyle, color: cssVar('textSecondary') }}>{formatTime(o.created_at)}</td>
                    <td style={{ ...tdStyle, color: cssVar('textSecondary') }}>{o.paid_at ? formatTime(o.paid_at) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={{ ...statValueStyle, color: accent || cssVar('text') }}>
        {value}
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

// ========== 刷新按钮 ==========
// 视觉对齐 core 的 SubscriptionsPage：36×36 圆角方块，内嵌 lucide-react RefreshCw 的 SVG
// 路径（避免引入整个图标库）。loading 时图标旋转。

function RefreshIconButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <>
      {/* keyframes 通过一次性注入的 <style> 提供 */}
      <style>{`@keyframes ag-epay-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        type="button"
        aria-label="刷新"
        onClick={onClick}
        disabled={loading}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          marginLeft: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          border: `1px solid ${cssVar('glassBorder')}`,
          borderRadius: 10,
          background: hover ? cssVar('bgHover') : 'transparent',
          color: hover ? cssVar('textSecondary') : cssVar('textTertiary'),
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: cssVar('transition'),
          padding: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: loading ? 'ag-epay-spin 1s linear infinite' : undefined,
          }}
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      </button>
    </>
  );
}

function CustomSelect({
  value,
  options,
  onChange,
  style,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} style={selectWrapStyle}>
      <button
        type="button"
        style={{ ...style, ...selectButtonStyle, ...(open ? selectButtonOpenStyle : null) }}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span style={selectButtonTextStyle}>{selected?.label ?? ''}</span>
        <span aria-hidden="true" style={selectCaretStyle}>v</span>
      </button>
      {open && (
        <div role="listbox" style={selectDropdownStyle}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                style={{ ...selectOptionStyle, ...(isSelected ? selectOptionActiveStyle : null) }}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========== 分页组件 ==========
// 视觉对齐 core 的 Table.tsx Pagination：左侧 "共 X 条 · 第 N/M 页 + 页大小下拉"，
// 右侧上下页箭头 + 数字页码（>7 页时带省略号）。

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}

function Pagination({ page, pageSize, total, totalPages, onPageChange, onPageSizeChange }: PaginationProps) {
  const numbers = generatePageNumbers(page, totalPages);
  return (
    <div style={paginationRowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={paginationSummaryStyle}>
          共 {total} 条 · 第 {page}/{totalPages} 页
        </span>
        <CustomSelect
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
          options={PAGE_SIZE_OPTIONS.map((s) => ({ value: String(s), label: `${s} 条/页` }))}
          style={paginationSizeSelectStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          aria-label="上一页"
          style={pageArrowStyle(page <= 1)}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        {numbers.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} style={pageEllipsisStyle}>···</span>
          ) : (
            <button
              key={p}
              type="button"
              style={p === page ? pageNumActiveStyle : pageNumStyle}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="下一页"
          style={pageArrowStyle(page >= totalPages)}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// ========== 样式 ==========

const containerStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '24px 24px 48px',
  color: cssVar('text'),
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginBottom: 20,
};

const statCardStyle: React.CSSProperties = {
  padding: '18px 20px',
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: cssVar('radiusLg'),
  background: cssVar('bgSurface'),
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: cssVar('textSecondary'),
  fontWeight: 500,
  letterSpacing: '0.02em',
};

const statValueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  marginTop: 8,
  letterSpacing: '-0.02em',
};

const panelStyle: React.CSSProperties = {
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: cssVar('radiusLg'),
  background: cssVar('bgSurface'),
  padding: '20px 20px 8px',
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  minWidth: 140,
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: cssVar('radiusMd'),
  background: cssVar('bgElevated'),
  color: cssVar('text'),
  fontSize: 13,
};

const selectWrapStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
};

const selectButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
};

const selectButtonOpenStyle: React.CSSProperties = {
  borderColor: cssVar('primary'),
  boxShadow: `0 0 0 3px ${cssVar('primarySubtle')}`,
};

const selectButtonTextStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const selectCaretStyle: React.CSSProperties = {
  flexShrink: 0,
  color: cssVar('textTertiary'),
  fontSize: 10,
  lineHeight: 1,
};

const selectDropdownStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 'calc(100% + 6px)',
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  minWidth: '100%',
  width: 'max-content',
  maxHeight: 260,
  padding: 6,
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: cssVar('radiusMd'),
  background: cssVar('bgSurface'),
  boxShadow: '0 18px 48px rgba(0, 0, 0, 0.28)',
  overflowY: 'auto',
};

const selectOptionStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: cssVar('textSecondary'),
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: 1.35,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

const selectOptionActiveStyle: React.CSSProperties = {
  background: cssVar('primarySubtle'),
  color: cssVar('primary'),
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  width: 200,
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: cssVar('radiusMd'),
  background: cssVar('bgElevated'),
  color: cssVar('text'),
  fontSize: 13,
  outline: 'none',
};

const emptyStyle: React.CSSProperties = {
  color: cssVar('textTertiary'),
  textAlign: 'center',
  padding: '40px 0',
  fontSize: 14,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  margin: '0 -20px',
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
  borderTop: `1px solid ${cssVar('glassBorder')}`,
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

// ---------- 分页样式 ----------

const paginationRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 4px 6px',
  flexWrap: 'wrap',
  gap: 12,
};

const paginationSummaryStyle: React.CSSProperties = {
  fontSize: 12,
  color: cssVar('textTertiary'),
  fontFamily: cssVar('fontMono'),
};

const paginationSizeSelectStyle: React.CSSProperties = {
  fontSize: 12,
  color: cssVar('textSecondary'),
  background: 'transparent',
  border: `1px solid ${cssVar('glassBorder')}`,
  borderRadius: 6,
  padding: '2px 8px',
  cursor: 'pointer',
  outline: 'none',
};

const pageNumStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: cssVar('textSecondary'),
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  transition: cssVar('transition'),
};

const pageNumActiveStyle: React.CSSProperties = {
  ...pageNumStyle,
  background: cssVar('primary'),
  color: cssVar('textInverse'),
  fontWeight: 600,
};

function pageArrowStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: cssVar('textSecondary'),
    fontSize: 18,
    lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.3 : 1,
    transition: cssVar('transition'),
  };
}

const pageEllipsisStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  color: cssVar('textTertiary'),
  fontSize: 12,
};

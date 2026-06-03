import { useCallback, useEffect, useState } from 'react';
import { api, type Order, type OrderStats } from './api';
import {
  Button,
  MetricCard,
  MethodChips,
  PageShell,
  Pagination,
  RefreshIcon,
  Select,
  StatusBadge,
  TableState,
  type Tone,
} from './admin-ui';

const EMPTY_STATS: OrderStats = {
  total: 0,
  paid: 0,
  pending: 0,
  expired: 0,
  failed: 0,
  cancelled: 0,
  refunded: 0,
  total_amount_paid: 0,
  today_amount_paid: 0,
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const PAGE_SIZE_STORAGE_KEY = 'payment-epay.admin-orders.page-size';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'expired', label: '已过期' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
];

export default function AdminOrdersPage() {
  const [list, setList] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<OrderStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailFilter, setEmailFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(readStoredPageSize);

  const reload = useCallback(() => {
    setLoading(true);
    setErr(null);
    api.adminListOrders({ page, pageSize, email: emailFilter, status: statusFilter })
      .then((res) => {
        setList(res.list || []);
        setTotal(res.total || 0);
        setStats(res.stats || EMPTY_STATS);
      })
      .catch((error) => setErr(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [emailFilter, page, pageSize, statusFilter]);

  useEffect(() => {
    const delay = emailFilter ? 300 : 0;
    const timer = setTimeout(reload, delay);
    return () => clearTimeout(timer);
  }, [emailFilter, reload]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleEmailChange = (value: string) => {
    setEmailFilter(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    if (!PAGE_SIZE_OPTIONS.includes(value)) return;
    setPageSize(value);
    writeStoredPageSize(value);
    setPage(1);
  };

  return (
    <PageShell>
      <div className="ag-epay-page-body">
        <div className="ag-epay-metrics-grid">
          <MetricCard label="总订单数" value={formatInteger(stats.total)} />
          <MetricCard label="已支付" value={formatInteger(stats.paid)} tone="success" />
          <MetricCard label="待支付" value={formatInteger(stats.pending)} tone="warning" />
          <MetricCard label="已过期" value={formatInteger(stats.expired)} />
          <MetricCard label="累计收款" value={formatCurrency(stats.total_amount_paid)} tone="success" />
          <MetricCard label="今日收款" value={formatCurrency(stats.today_amount_paid)} tone="success" />
        </div>

        <section className="ag-epay-panel">
          <div className="ag-epay-toolbar">
            <div className="ag-epay-toolbar-group">
              <Select
                ariaLabel="订单状态"
                onChange={handleStatusChange}
                options={STATUS_OPTIONS}
                value={statusFilter}
              />
              <input
                className="ag-epay-control ag-epay-input ag-epay-email-filter"
                onChange={(event) => handleEmailChange(event.target.value)}
                placeholder="搜索用户邮箱"
                type="text"
                value={emailFilter}
              />
            </div>
            <div className="ag-epay-toolbar-actions">
              <Button disabled={loading} iconOnly onClick={reload} title="刷新">
                <RefreshIcon className={loading ? 'ag-epay-icon ag-epay-spin' : 'ag-epay-icon'} />
              </Button>
            </div>
          </div>

          <div className="ag-epay-table-frame">
            <div className="ag-epay-table-shell">
              <div className="ag-epay-table-scroll">
                <table aria-label="支付订单" className="ag-epay-table ag-epay-orders-table" data-slot="table">
                  <thead data-slot="thead">
                    <tr data-slot="tr">
                      <th data-slot="th" scope="col">订单号</th>
                      <th data-slot="th" scope="col">用户邮箱</th>
                      <th data-slot="th" scope="col">金额</th>
                      <th data-slot="th" scope="col">支付方式</th>
                      <th data-slot="th" scope="col">服务商</th>
                      <th data-slot="th" scope="col">状态</th>
                      <th data-slot="th" scope="col">创建时间</th>
                      <th data-slot="th" scope="col">支付时间</th>
                    </tr>
                  </thead>
                  <tbody data-slot="tbody">
                    {renderTableBody({ err, list, loading })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="ag-epay-table-footer table__footer" data-slot="table-footer">
              <Pagination
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                total={total}
                totalPages={totalPages}
              />
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function renderTableBody({
  err,
  list,
  loading,
}: {
  err: string | null;
  list: Order[];
  loading: boolean;
}) {
  if (err) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={8} data-slot="td">
          <TableState tone="danger">加载失败: {err}</TableState>
        </td>
      </tr>
    );
  }

  if (loading && list.length === 0) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={8} data-slot="td">
          <TableState>加载中...</TableState>
        </td>
      </tr>
    );
  }

  if (list.length === 0) {
    return (
      <tr className="ag-epay-table-empty-row" data-slot="tr">
        <td colSpan={8} data-slot="td">
          <TableState>暂无订单</TableState>
        </td>
      </tr>
    );
  }

  return list.map((order) => (
    <tr key={order.id} data-slot="tr">
      <td data-slot="td">
        <code className="ag-epay-code">{order.out_trade_no}</code>
      </td>
      <td data-slot="td">
        {order.user_email ? (
          <span>{order.user_email}</span>
        ) : (
          <span className="ag-epay-text-muted">#{order.user_id}</span>
        )}
      </td>
      <td data-slot="td">
        <span className="ag-epay-amount">{formatCurrency(order.amount)}</span>
      </td>
      <td data-slot="td">
        <MethodChips format={methodLabel} methods={[order.method].filter(Boolean)} />
      </td>
      <td data-slot="td">
        {order.provider_id ? <code className="ag-epay-code">{order.provider_id}</code> : <span className="ag-epay-text-muted">-</span>}
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
    </tr>
  ));
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

function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

function formatInteger(value: number): string {
  return value.toLocaleString('zh-CN');
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

function readStoredPageSize(): number {
  if (typeof window === 'undefined') return PAGE_SIZE_OPTIONS[0];

  try {
    const stored = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : PAGE_SIZE_OPTIONS[0];
  } catch {
    return PAGE_SIZE_OPTIONS[0];
  }
}

function writeStoredPageSize(value: number) {
  try {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures, pagination still works for the current session.
  }
}

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type Tone = 'success' | 'warning' | 'danger' | 'muted';

export interface SelectOption {
  value: string;
  label: string;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="ag-epay-page">{children}</div>;
}

export function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="ag-epay-metric" data-tone={tone}>
      <div className="ag-epay-metric-label">{label}</div>
      <div className="ag-epay-metric-value">{value}</div>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ag-epay-panel">
      {(title || description || actions) ? (
        <div className="ag-epay-panel-header">
          <div>
            {title ? <h2 className="ag-epay-panel-title">{title}</h2> : null}
            {description ? <p className="ag-epay-panel-description">{description}</p> : null}
          </div>
          {actions ? <div className="ag-epay-toolbar-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="ag-epay-panel-body">{children}</div>
    </section>
  );
}

export function Button({
  children,
  className,
  disabled,
  iconOnly,
  onClick,
  title,
  type = 'button',
  variant = 'secondary',
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  onClick?: () => void;
  title?: string;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <button
      className={cx(
        'ag-epay-button',
        variant === 'primary' && 'ag-epay-button--primary',
        variant === 'danger' && 'ag-epay-button--danger',
        iconOnly && 'ag-epay-button--icon',
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  );
}

export function Select({
  ariaLabel,
  className,
  compact,
  onChange,
  optionClassName,
  options,
  popoverClassName,
  triggerClassName,
  value,
}: {
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  onChange: (value: string) => void;
  optionClassName?: string;
  options: SelectOption[];
  popoverClassName?: string;
  triggerClassName?: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={cx('ag-epay-select', compact && 'ag-epay-select--compact', className)}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cx('ag-epay-control ag-epay-select-trigger', triggerClassName)}
        data-open={open || undefined}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="ag-epay-select-value">{selected?.label ?? ''}</span>
        <ChevronDownIcon className="ag-epay-select-caret" />
      </button>
      {open ? (
        <div className={cx('ag-epay-select-popover', popoverClassName)} role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                aria-selected={isSelected}
                className={cx('ag-epay-select-option', optionClassName)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  pageSizeOptions,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const pages = useMemo(() => generatePageNumbers(page, safeTotalPages), [page, safeTotalPages]);
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(safeTotalPages, page + 1);

  return (
    <div className="ag-epay-pagination ag-table-pagination">
      <div className="ag-epay-pagination-summary ag-table-pagination-summary">
        <span>共</span>
        <span className="ag-epay-pagination-number ag-table-pagination-number">{total}</span>
        <span>条</span>
        <span className="ag-epay-pagination-separator ag-table-pagination-separator" />
        <span>第</span>
        <span className="ag-epay-pagination-number ag-table-pagination-number">{page}</span>
        <span>/</span>
        <span className="ag-epay-pagination-number ag-table-pagination-number">{safeTotalPages}</span>
        <span>页</span>
        <span className="ag-epay-page-size ag-table-page-size">
          <span>每页</span>
          <Select
            ariaLabel="每页条数"
            className="ag-table-page-size-select"
            compact
            onChange={(next) => onPageSizeChange(Number(next))}
            optionClassName="ag-table-page-size-option"
            options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
            popoverClassName="ag-table-page-size-popover"
            triggerClassName="ag-table-page-size-trigger"
            value={String(pageSize)}
          />
          <span>条</span>
        </span>
      </div>
      <div className="ag-epay-pagination-links pagination__content">
        <button
          aria-label="上一页"
          className="ag-epay-page-link ag-epay-page-link--nav pagination__link pagination__link--nav"
          onClick={() => onPageChange(previousPage)}
          type="button"
        >
          <ChevronLeftIcon className="ag-epay-icon" />
          <span>上一页</span>
        </button>
        {pages.map((item, index) => item === '...' ? (
          <span key={`ellipsis-${index}`} className="ag-epay-page-ellipsis pagination__ellipsis">...</span>
        ) : (
          <button
            key={item}
            aria-current={item === page ? 'page' : undefined}
            className="ag-epay-page-link pagination__link"
            data-active={item === page ? 'true' : undefined}
            onClick={() => onPageChange(item as number)}
            type="button"
          >
            {item}
          </button>
        ))}
        <button
          aria-label="下一页"
          className="ag-epay-page-link ag-epay-page-link--nav pagination__link pagination__link--nav"
          onClick={() => onPageChange(nextPage)}
          type="button"
        >
          <span>下一页</span>
          <ChevronRightIcon className="ag-epay-icon" />
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ children, tone }: { children: ReactNode; tone: Tone }) {
  return <span className="ag-epay-status" data-tone={tone}>{children}</span>;
}

export function MethodChips({ methods, format }: { methods: string[]; format: (method: string) => string }) {
  if (methods.length === 0) return <span className="ag-epay-text-muted">-</span>;
  return (
    <span className="ag-epay-methods">
      {methods.map((method) => (
        <span key={method} className="ag-epay-method-chip">{format(method)}</span>
      ))}
    </span>
  );
}

export function TableState({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <div className="ag-epay-table-state" data-tone={tone}>{children}</div>;
}

export function PaymentQrPanel({
  amountLabel,
  methodLabel,
  note,
  orderNo,
  paymentUrl,
  qrDataUrl,
}: {
  amountLabel: ReactNode;
  methodLabel: ReactNode;
  note: ReactNode;
  orderNo: string;
  paymentUrl?: string;
  qrDataUrl: string | null;
}) {
  return (
    <div className="ag-epay-qr-panel">
      {qrDataUrl ? (
        <img className="ag-epay-qr-image" src={qrDataUrl} alt="付款二维码" />
      ) : (
        <div className="ag-epay-qr-placeholder">生成二维码中...</div>
      )}
      <div className="ag-epay-qr-amount">{amountLabel}</div>
      <div className="ag-epay-qr-method">请使用 {methodLabel} 扫码完成付款</div>
      <div className="ag-epay-qr-order">
        订单号：<code className="ag-epay-code">{orderNo}</code>
      </div>
      <p className="ag-epay-qr-note">{note}</p>
      {paymentUrl ? (
        <p className="ag-epay-qr-link-row">
          扫码不便？{' '}
          <a className="ag-epay-payment-link" href={paymentUrl} target="_blank" rel="noreferrer">
            点此在新窗口打开付款页
          </a>
        </p>
      ) : null}
    </div>
  );
}

export function Modal({
  children,
  description,
  footer,
  onClose,
  title,
}: {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  title: ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="ag-epay-modal-backdrop" onClick={onClose}>
      <div
        aria-modal="true"
        className="ag-epay-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="ag-epay-modal-header">
          <div>
            <h2 className="ag-epay-modal-title">{title}</h2>
            {description ? <p className="ag-epay-modal-description">{description}</p> : null}
          </div>
          <button aria-label="关闭" className="ag-epay-modal-close" onClick={onClose} type="button">
            x
          </button>
        </div>
        <div className="ag-epay-modal-body">
          <div className="ag-epay-modal-surface">{children}</div>
        </div>
        {footer ? <div className="ag-epay-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export function FormField({
  children,
  description,
  label,
  required,
}: {
  children: ReactNode;
  description?: ReactNode;
  label: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="ag-epay-field">
      <span className="ag-epay-field-label">
        {label}
        {required ? <span className="ag-epay-field-required">*</span> : null}
      </span>
      {children}
      {description ? <span className="ag-epay-field-hint">{description}</span> : null}
    </div>
  );
}

export function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="ag-epay-switch">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span className="ag-epay-switch-control" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function MethodMultiSelect({
  candidates,
  format,
  onChange,
  value,
}: {
  candidates: string[];
  format: (method: string) => string;
  onChange: (value: string) => void;
  value: string;
}) {
  const selected = new Set(value.split(',').map((part) => part.trim()).filter(Boolean));

  const toggle = (key: string) => {
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    onChange(candidates.filter((candidate) => selected.has(candidate)).join(','));
  };

  if (candidates.length === 0) {
    return <span className="ag-epay-field-hint">该协议没有可选的支付方式</span>;
  }

  return (
    <div className="ag-epay-method-options">
      {candidates.map((key) => (
        <label key={key} className="ag-epay-method-option">
          <input
            checked={selected.has(key)}
            onChange={() => toggle(key)}
            type="checkbox"
          />
          {format(key)}
        </label>
      ))}
    </div>
  );
}

export function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function generatePageNumbers(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: Array<number | '...'> = [1];
  if (current > 3) pages.push('...');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) {
    pages.push(page);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

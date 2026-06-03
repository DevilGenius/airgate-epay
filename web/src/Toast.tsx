import { useState, useCallback, useEffect, useRef } from 'react';
import { cssVar } from '@devilgenius/airgate-theme';

/**
 * 插件本地的 toast 实现，视觉风格对齐 core 的 ToastProvider：
 *   - 右上角固定 (top:20px, right:20px)
 *   - 圆角 + 半透明边框 + 阴影
 *   - 单条最多展示 4 秒，有手动关闭按钮
 *   - 滑入动画
 *
 * 为什么不直接用 core 的 Toast：
 *   插件前端是独立 ESM bundle，不与 core 共享 React Context，
 *   useToast() 拿不到 Provider。所以只能在插件里复刻一个轻量版本。
 *
 * 用法：
 *   const { toast } = useToast();
 *   toast.success('hupi 已禁用');
 *   toast.error('保存失败: ...');
 */

type ToastType = 'success' | 'error';

interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

let nextId = 0;

/**
 * useToast 是组件本地的 toast 控制器（每个使用它的组件维护自己的列表）。
 *
 * 之所以不做成全局 singleton：插件页只有 RechargePage / OrdersPage /
 * AdminOrdersPage / AdminProvidersPage 四个独立路由，每个页面同时只渲染一个，
 * 用本地 state 足够了，避免引入 context provider 增加复杂度。
 */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  // 用 ref 持有 setter，让 toast 函数引用稳定（避免依赖数组每次变化触发 effect）
  const setterRef = useRef(setMessages);
  setterRef.current = setMessages;

  const remove = useCallback((id: number) => {
    setterRef.current((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const push = useCallback((type: ToastType, text: string) => {
    const id = nextId++;
    setterRef.current((prev) => [...prev, { id, type, text }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const success = useCallback((text: string) => push('success', text), [push]);
  const error = useCallback((text: string) => push('error', text), [push]);

  return {
    toast: { success, error },
    Toaster: <ToastViewport messages={messages} onClose={remove} />,
  };
}

function ToastViewport({
  messages,
  onClose,
}: {
  messages: ToastMessage[];
  onClose: (id: number) => void;
}) {
  // 注入一次全局滑入动画 keyframes（与 core 的 ag-slide-down 同效）
  useEffect(() => {
    const STYLE_ID = 'airgate-epay-toast-keyframes';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@keyframes airgate-epay-toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}`;
    document.head.appendChild(style);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div style={viewportStyle}>
      {messages.map((m) => (
        <ToastItem key={m.id} message={m} onClose={() => onClose(m.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  message,
  onClose,
}: {
  message: ToastMessage;
  onClose: () => void;
}) {
  const isSuccess = message.type === 'success';
  const accent = isSuccess ? cssVar('success') : cssVar('danger');
  const borderColor = isSuccess ? cssVar('success') : cssVar('danger');

  return (
    <div
      style={{
        ...itemStyle,
        borderColor,
      }}
    >
      <span style={{ ...iconStyle, color: accent }}>{isSuccess ? '✓' : '✕'}</span>
      <span style={{ ...textStyle, color: cssVar('text') }}>{message.text}</span>
      <button onClick={onClose} style={closeBtnStyle} aria-label="关闭">×</button>
    </div>
  );
}

// ============ 样式 ============

const viewportStyle: React.CSSProperties = {
  position: 'fixed',
  top: 20,
  right: 20,
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  pointerEvents: 'none',
};

const itemStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 260,
  maxWidth: 400,
  padding: '12px 14px',
  borderRadius: cssVar('radiusLg'),
  border: '1px solid',
  background: cssVar('bgElevated'),
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  animation: 'airgate-epay-toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
};

const iconStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  width: 18,
  textAlign: 'center',
  flexShrink: 0,
};

const textStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 13,
  lineHeight: 1.4,
};

const closeBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  background: 'transparent',
  border: 'none',
  color: cssVar('textTertiary'),
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 0,
  width: 18,
  height: 18,
};

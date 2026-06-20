import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from './Toast';

function ToastHarness() {
  const { toast, Toaster } = useToast();
  return (
    <>
      <button onClick={() => toast.success('保存成功')} type="button">success</button>
      <button onClick={() => toast.error('保存失败')} type="button">error</button>
      {Toaster}
    </>
  );
}

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.getElementById('airgate-epay-toast-keyframes')?.remove();
  });

  it('pushes, closes, and expires toast messages', () => {
    render(<ToastHarness />);

    fireEvent.click(screen.getByText('success'));
    fireEvent.click(screen.getByText('error'));

    expect(screen.getByText('保存成功')).not.toBeNull();
    expect(screen.getByText('保存失败')).not.toBeNull();
    expect(document.getElementById('airgate-epay-toast-keyframes')).not.toBeNull();

    fireEvent.click(screen.getAllByLabelText('关闭')[0]);
    expect(screen.queryByText('保存成功')).toBeNull();
    expect(screen.getByText('保存失败')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('保存失败')).toBeNull();
  });
});

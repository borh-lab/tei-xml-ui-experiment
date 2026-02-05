import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });

    // Should still be initial before delay
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // After delay, should update
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'update1' });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Should still be initial (not enough time)
    expect(result.current).toBe('initial');

    rerender({ value: 'update2' });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Still initial (timer was reset)
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Now should be update2 (500ms after last update)
    expect(result.current).toBe('update2');
  });

  it('should work with number values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 0 },
    });

    rerender({ value: 42 });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(42);
  });

  it('should use default delay of 500ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should cleanup previous timer', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Unmount before timer completes
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should not cause errors, value should remain as it was
    expect(result.current).toBe('initial');
  });
});

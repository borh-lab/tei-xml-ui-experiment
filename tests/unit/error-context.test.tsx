import { renderHook, act } from '@testing-library/react';
import { ErrorProvider, useErrorContext } from '@/lib/context/ErrorContext';

describe('ErrorContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ErrorProvider>{children}</ErrorProvider>
  );

  describe('logError', () => {
    test('should log error with context', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.logError(new Error('Test error'), 'TestComponent', {
          additionalInfo: 'test data',
        });
      });

      const history = result.current.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        message: 'Test error',
        component: 'TestComponent',
        context: { additionalInfo: 'test data' },
      });
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('id');
    });

    test('should keep only last 50 errors', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      // Log 51 errors
      act(() => {
        for (let i = 0; i < 51; i++) {
          result.current.logError(new Error(`Error ${i}`), 'TestComponent');
        }
      });

      const history = result.current.getHistory();
      expect(history).toHaveLength(50);
      expect(history[0].message).toBe('Error 1'); // First error should be gone
      expect(history[49].message).toBe('Error 50'); // Last error should be present
    });
  });

  describe('getStats', () => {
    test('should return error statistics', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.logError(new Error('Parse error'), 'ComponentA');
        result.current.logError(new Error('Network error'), 'ComponentB');
        result.current.logError(new Error('Parse error'), 'ComponentA');
      });

      const stats = result.current.getStats();
      expect(stats).toMatchObject({
        total: 3,
        byType: {
          Error: 3, // All three are Error type
        },
      });
      expect(stats.recentErrors).toHaveLength(3);
      expect(stats.timestamps).toHaveLength(3);
    });

    test('should return empty stats when no errors logged', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      const stats = result.current.getStats();
      expect(stats).toMatchObject({
        total: 0,
        byType: {},
        recentErrors: [],
        timestamps: [],
      });
    });

    test('should group errors by type', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.logError(new TypeError('Type error'), 'ComponentA');
        result.current.logError(new Error('Generic error'), 'ComponentB');
        result.current.logError(new TypeError('Another type error'), 'ComponentC');
        result.current.logError(new RangeError('Range error'), 'ComponentD');
      });

      const stats = result.current.getStats();
      expect(stats.byType).toMatchObject({
        TypeError: 2,
        Error: 1,
        RangeError: 1,
      });
    });
  });

  describe('getHistory', () => {
    test('should return all logged errors', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.logError(new Error('Error 1'), 'ComponentA');
        result.current.logError(new Error('Error 2'), 'ComponentB');
      });

      const history = result.current.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Error 1');
      expect(history[1].message).toBe('Error 2');
    });

    test('should return errors with timestamps', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      const beforeLog = Date.now();

      act(() => {
        result.current.logError(new Error('Test error'), 'ComponentA');
      });

      const afterLog = Date.now();

      const history = result.current.getHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeLog);
      expect(history[0].timestamp).toBeLessThanOrEqual(afterLog);
    });
  });

  describe('clearHistory', () => {
    test('should clear all logged errors', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.logError(new Error('Error 1'), 'ComponentA');
        result.current.logError(new Error('Error 2'), 'ComponentB');
      });

      expect(result.current.getHistory()).toHaveLength(2);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.getHistory()).toHaveLength(0);
      const stats = result.current.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('error context structure', () => {
    test('should include all required fields in error entry', () => {
      const { result } = renderHook(() => useErrorContext(), { wrapper });

      act(() => {
        result.current.logError(new Error('Test error'), 'TestComponent', { key: 'value' });
      });

      const history = result.current.getHistory();
      const errorEntry = history[0];

      expect(errorEntry).toMatchObject({
        id: expect.any(String),
        message: 'Test error',
        component: 'TestComponent',
        context: { key: 'value' },
        timestamp: expect.any(Number),
      });
      expect(errorEntry.id).toHaveLength(36); // UUID format
    });
  });
});

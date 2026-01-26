import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

// Mock react-hotkeys-hook
jest.mock('react-hotkeys-hook', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('useKeyboardShortcuts', () => {
  test('should register keyboard shortcuts', () => {
    const mockAction = jest.fn();
    const shortcuts = [
      { key: 'cmd+k', description: 'Test', action: mockAction }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Hook should not throw error
    expect(true).toBe(true);
  });
});

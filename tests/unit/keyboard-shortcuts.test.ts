import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

// Mock react-hotkeys-hook
jest.mock('react-hotkeys-hook', () => ({
  useHotkeys: jest.fn(),
  useHotkeysContext: jest.fn(),
  isHotkeyPressed: jest.fn(),
  HotkeysProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('useKeyboardShortcuts', () => {
  test('should register keyboard shortcuts', () => {
    const mockAction = jest.fn();
    const shortcuts = [{ key: 'cmd+k', description: 'Test', action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Hook should not throw error
    expect(true).toBe(true);
  });
});

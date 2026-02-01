import { renderHook, act } from '@testing-library/react'
import { DocumentProvider, useDocumentContext } from '@/lib/context/DocumentContext'
import { ErrorProvider } from '@/lib/context/ErrorContext'
import { toast } from '@/components/ui/use-toast'

jest.mock('@/lib/samples/sampleLoader', () => ({
  loadSample: jest.fn(),
}))

jest.mock('@/components/ui/use-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

import { loadSample } from '@/lib/samples/sampleLoader'

describe('DocumentContext error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('shows error toast when sample loading fails', async () => {
    jest.mocked(loadSample).mockRejectedValue(new Error('Failed to fetch sample'))

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorProvider>
        <DocumentProvider>{children}</DocumentProvider>
      </ErrorProvider>
    )

    const { result } = renderHook(() => useDocumentContext(), { wrapper })

    await act(async () => {
      try {
        await result.current.loadSample('test-sample')
      } catch (error) {
        // Expected to throw
      }
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to load sample',
      expect.objectContaining({
        description: expect.any(String),
      })
    )
  })
})

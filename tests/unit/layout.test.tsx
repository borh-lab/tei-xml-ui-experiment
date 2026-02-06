// @ts-nocheck
import { render, screen } from '@testing-library/react';
import RootLayout from '@/app/layout';
import { useRouter, useSearchParams } from 'next/navigation';

jest.mock('next/navigation');

describe('RootLayout', () => {
  beforeEach(() => {
    (useRouter as any).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
    (useSearchParams as any).mockReturnValue(new URLSearchParams());
  });

  test('includes Toaster for notifications', () => {
    const { container } = render(
      <RootLayout>
        <div>Test content</div>
      </RootLayout>
    );
    // Should render the Toaster component
    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toBeInTheDocument();
  });
});

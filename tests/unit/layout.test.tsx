import { render, screen } from '@testing-library/react';
import RootLayout from '@/app/layout';

describe('RootLayout', () => {
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

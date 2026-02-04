import { render, screen } from '@testing-library/react';
import { Toaster } from '@/components/ui/toaster';

describe('Toaster', () => {
  test('renders without crashing', () => {
    render(<Toaster />);
    // Toaster renders a div with role="region" and aria-label for notifications
    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toBeInTheDocument();
  });
});

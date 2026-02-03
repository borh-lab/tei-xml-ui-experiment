import { render, screen, waitFor } from '@testing-library/react';
import { ValidationPanel } from '@/components/validation/ValidationPanel';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      schemas: [
        {
          id: 'tei-minimal',
          name: 'TEI Minimal',
          description: 'Core TEI for dialogue',
          tags: ['dialogue', 'fast']
        },
        {
          id: 'tei-all',
          name: 'TEI Complete',
          description: 'Full TEI P5',
          tags: ['complete']
        }
      ]
    })
  })
) as any;

describe('ValidationPanel schema selection', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should load available schemas on mount', async () => {
    render(<ValidationPanel validationResults={null} visible={true} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/validation schema/i)).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/schemas');
  });

  it('should display schema selector', async () => {
    render(<ValidationPanel validationResults={null} visible={true} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/validation schema/i)).toBeInTheDocument();
    });

    const selector = screen.getByLabelText(/validation schema/i);
    expect(selector).toHaveValue('tei-minimal'); // default
  });

  it('should show schema description', async () => {
    render(<ValidationPanel validationResults={null} visible={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Core TEI for dialogue/i)).toBeInTheDocument();
    });
  });
});

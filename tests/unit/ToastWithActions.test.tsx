import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastWithActions } from '@/components/ui/ToastWithActions';

describe('ToastWithActions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders with message', () => {
    render(<ToastWithActions message="Test message" type="info" />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  test('renders with different types', () => {
    const { rerender } = render(
      <ToastWithActions message="Success message" type="success" />
    );
    expect(screen.getByText('Success message')).toBeInTheDocument();

    rerender(<ToastWithActions message="Error message" type="error" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();

    rerender(<ToastWithActions message="Warning message" type="warning" />);
    expect(screen.getByText('Warning message')).toBeInTheDocument();

    rerender(<ToastWithActions message="Info message" type="info" />);
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  test('renders action buttons', () => {
    const mockAction = jest.fn();
    const actions = [
      { label: 'Apply Fix', onClick: mockAction },
      { label: 'Cancel', onClick: jest.fn() },
    ];

    render(
      <ToastWithActions
        message="Validation error"
        type="error"
        actions={actions}
      />
    );

    expect(screen.getByText('Apply Fix')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('calls action handler when button is clicked', () => {
    const mockAction = jest.fn();
    const actions = [{ label: 'Apply Fix', onClick: mockAction }];

    render(
      <ToastWithActions
        message="Validation error"
        type="error"
        actions={actions}
        autoClose={false}
      />
    );

    const button = screen.getByText('Apply Fix');
    fireEvent.click(button);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is clicked', async () => {
    const mockOnClose = jest.fn();

    render(
      <ToastWithActions
        message="Test message"
        type="info"
        onClose={mockOnClose}
        autoClose={false}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Wait for the animation delay
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('auto-closes after duration', async () => {
    const mockOnClose = jest.fn();
    const duration = 3000;

    render(
      <ToastWithActions
        message="Test message"
        type="info"
        onClose={mockOnClose}
        autoClose={true}
        duration={duration}
      />
    );

    // Fast-forward time
    jest.advanceTimersByTime(duration);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('does not auto-close when autoClose is false', () => {
    const mockOnClose = jest.fn();

    render(
      <ToastWithActions
        message="Test message"
        type="info"
        onClose={mockOnClose}
        autoClose={false}
      />
    );

    // Fast-forward time past default duration
    jest.advanceTimersByTime(6000);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('cancels auto-close when action is clicked', () => {
    const mockOnClose = jest.fn();
    const mockAction = jest.fn();
    const actions = [{ label: 'Apply Fix', onClick: mockAction }];

    render(
      <ToastWithActions
        message="Validation error"
        type="error"
        actions={actions}
        onClose={mockOnClose}
        autoClose={true}
        duration={3000}
      />
    );

    // Click action before auto-close duration
    jest.advanceTimersByTime(1000);
    fireEvent.click(screen.getByText('Apply Fix'));

    // Fast-forward past original duration
    jest.advanceTimersByTime(3000);

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('renders with primary and secondary button variants', () => {
    const actions = [
      { label: 'Primary Action', onClick: jest.fn(), variant: 'primary' as const },
      { label: 'Secondary Action', onClick: jest.fn(), variant: 'secondary' as const },
    ];

    render(
      <ToastWithActions
        message="Test message"
        type="info"
        actions={actions}
        autoClose={false}
      />
    );

    expect(screen.getByText('Primary Action')).toBeInTheDocument();
    expect(screen.getByText('Secondary Action')).toBeInTheDocument();
  });

  test('is accessible via keyboard navigation', () => {
    const mockAction = jest.fn();
    const actions = [{ label: 'Apply Fix', onClick: mockAction }];

    render(
      <ToastWithActions
        message="Validation error"
        type="error"
        actions={actions}
        autoClose={false}
      />
    );

    const button = screen.getByText('Apply Fix');

    // Test keyboard accessibility
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('renders without actions when actions array is empty', () => {
    render(
      <ToastWithActions
        message="Test message"
        type="info"
        actions={[]}
        autoClose={false}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
    // Should only have close button, no action buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1); // Only close button
  });

  test('renders with default duration', async () => {
    const mockOnClose = jest.fn();

    render(
      <ToastWithActions
        message="Test message"
        type="info"
        onClose={mockOnClose}
        autoClose={true}
      />
    );

    // Default duration is 5000ms
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});

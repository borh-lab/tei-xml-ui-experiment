import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkOperationsPanel } from '@/components/editor/BulkOperationsPanel';

describe('BulkOperationsPanel', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    selectedPassages: ['passage-1', 'passage-2', 'passage-3'],
    onTagAll: jest.fn(),
    onSelectAllUntagged: jest.fn(),
    onSelectLowConfidence: jest.fn(),
    onExportSelection: jest.fn(),
    onValidate: jest.fn(),
    onConvert: jest.fn(),
    speakers: [
      { id: 'speaker1', name: 'Speaker 1' },
      { id: 'speaker2', name: 'Speaker 2' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show bulk operations when open', () => {
    render(<BulkOperationsPanel {...mockProps} />);

    expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
    expect(screen.getByText('Tag all as:')).toBeInTheDocument();
    expect(screen.getByText(/3 passages selected/)).toBeInTheDocument();
  });

  test('should not render when closed', () => {
    render(<BulkOperationsPanel {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Bulk Operations')).not.toBeInTheDocument();
  });

  test('should display selection count', () => {
    render(<BulkOperationsPanel {...mockProps} selectedPassages={['p1', 'p2']} />);

    expect(screen.getByText(/2 passages selected/)).toBeInTheDocument();
  });

  test('should call onClose when close button clicked', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    await user.click(screen.getByText('✕'));

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('should disable tag button when no speaker selected', () => {
    render(<BulkOperationsPanel {...mockProps} />);

    const tagButton = screen.getByText('Tag Selected Passages');
    expect(tagButton).toBeDisabled();
  });

  test('should enable tag button when speaker selected', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'speaker1');

    const tagButton = screen.getByText('Tag Selected Passages');
    expect(tagButton).toBeEnabled();
  });

  test('should call onTagAll with speaker ID when tag button clicked', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'speaker2');

    const tagButton = screen.getByText('Tag Selected Passages');
    await user.click(tagButton);

    expect(mockProps.onTagAll).toHaveBeenCalledWith('speaker2');
  });

  test('should show keyboard shortcuts for operations', () => {
    render(<BulkOperationsPanel {...mockProps} />);

    expect(screen.getByText(/⇧⌘U/)).toBeInTheDocument();
    expect(screen.getByText(/⇧⌘L/)).toBeInTheDocument();
    expect(screen.getByText(/⇧⌘V/)).toBeInTheDocument();
    expect(screen.getByText(/⇧⌘E/)).toBeInTheDocument();
    expect(screen.getByText(/⇧⌘D/)).toBeInTheDocument();
  });

  test('should call onSelectAllUntagged when button clicked', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    await user.click(screen.getByText('Select All Untagged'));

    expect(mockProps.onSelectAllUntagged).toHaveBeenCalledTimes(1);
  });

  test('should call onSelectLowConfidence when button clicked', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    await user.click(screen.getByText(/Select Low Confidence/));

    expect(mockProps.onSelectLowConfidence).toHaveBeenCalledTimes(1);
  });

  test('should disable operation buttons when no passages selected', () => {
    render(<BulkOperationsPanel {...mockProps} selectedPassages={[]} />);

    expect(screen.getByText('Validate Selection')).toBeDisabled();
    expect(screen.getByText('Export Selection')).toBeDisabled();
    expect(screen.getByText('Convert to Dialogue')).toBeDisabled();
  });

  test('should call onExportSelection when button clicked', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    await user.click(screen.getByText('Export Selection'));

    expect(mockProps.onExportSelection).toHaveBeenCalledTimes(1);
  });

  test('should call onValidate when button clicked', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    await user.click(screen.getByText('Validate Selection'));

    expect(mockProps.onValidate).toHaveBeenCalledTimes(1);
  });

  test('should call onConvert when button clicked', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    await user.click(screen.getByText('Convert to Dialogue'));

    expect(mockProps.onConvert).toHaveBeenCalledTimes(1);
  });

  test('should display custom speakers in dropdown', () => {
    render(<BulkOperationsPanel {...mockProps} />);

    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));

    expect(options).toHaveLength(7); // Empty option + 2 custom + 4 default
    expect(options[1]).toHaveTextContent('Speaker 1');
    expect(options[2]).toHaveTextContent('Speaker 2');
  });

  test('should show progress indicator during operation', async () => {
    const user = userEvent.setup();
    render(<BulkOperationsPanel {...mockProps} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'speaker1');

    const tagButton = screen.getByText('Tag Selected Passages');
    fireEvent.click(tagButton);

    // Button text should change to 'Tagging...'
    expect(screen.getByText('Tagging...')).toBeInTheDocument();
  });
});

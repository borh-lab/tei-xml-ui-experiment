import { render, screen } from '@testing-library/react';
import { BulkOperationsPanel } from '@/components/editor/BulkOperationsPanel';
import userEvent from '@testing-library/user-event';

// Mock the PatternDB
jest.mock('@/lib/db/PatternDB', () => ({
  db: {
    logCorrection: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Bulk Operations Integration', () => {
  const mockHandlers = {
    onTagAll: jest.fn(),
    onSelectAllUntagged: jest.fn(),
    onSelectLowConfidence: jest.fn(),
    onExportSelection: jest.fn(),
    onValidate: jest.fn(),
    onConvert: jest.fn(),
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call onTagAll when tagging selected passages', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    // Select speaker
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'speaker1');

    // Click tag button
    const tagButton = screen.getByText('Tag Selected Passages');
    await user.click(tagButton);

    expect(mockHandlers.onTagAll).toHaveBeenCalledWith('speaker1');
  });

  test('should call onSelectAllUntagged when button clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    await user.click(screen.getByText('Select All Untagged'));

    expect(mockHandlers.onSelectAllUntagged).toHaveBeenCalledTimes(1);
  });

  test('should call onExportSelection when button clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    await user.click(screen.getByText('Export Selection'));

    expect(mockHandlers.onExportSelection).toHaveBeenCalledTimes(1);
  });

  test('should call onValidate when button clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    await user.click(screen.getByText('Validate Selection'));

    expect(mockHandlers.onValidate).toHaveBeenCalledTimes(1);
  });
});

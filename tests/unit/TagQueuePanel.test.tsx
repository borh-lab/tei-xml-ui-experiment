// @ts-nocheck
import { render, screen, fireEvent } from '@testing-library/react';
import { TagQueuePanel } from '@/components/queue/TagQueuePanel';
import type { TagQueueState, QueuedTag } from '@/lib/queue/TagQueue';

describe('TagQueuePanel', () => {
  const createMockQueue = (pending: QueuedTag[] = []): TagQueueState => ({
    pending,
    applied: [],
    failed: [],
  });

  const mockTag1: QueuedTag = {
    id: 'tag-1',
    tagType: 'said',
    attributes: { who: 'char-1' },
    passageId: 'passage-0',
    range: { start: 0, end: 10 },
    timestamp: Date.now(),
  };

  const mockTag2: QueuedTag = {
    id: 'tag-2',
    tagType: 'persName',
    attributes: { ref: 'char-2' },
    passageId: 'passage-1',
    range: { start: 20, end: 35 },
    timestamp: Date.now(),
  };

  it('should render empty state when queue is empty', () => {
    const emptyQueue = createMockQueue();
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={emptyQueue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText(/no pending tags/i)).toBeInTheDocument();
  });

  it('should render pending tags', () => {
    const queue = createMockQueue([mockTag1, mockTag2]);
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText('said')).toBeInTheDocument();
    expect(screen.getByText('persName')).toBeInTheDocument();
    expect(screen.getByText(/@who=char-1/i)).toBeInTheDocument();
    expect(screen.getByText(/@ref=char-2/i)).toBeInTheDocument();
  });

  it('should show count of pending tags', () => {
    const queue = createMockQueue([mockTag1, mockTag2]);
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText(/2 pending tags/i)).toBeInTheDocument();
  });

  it('should call onApplyAll when Apply All button is clicked', () => {
    const queue = createMockQueue([mockTag1]);
    const onApplyAll = jest.fn().mockResolvedValue(undefined);
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    const applyButton = screen.getByText(/apply all/i);
    fireEvent.click(applyButton);

    expect(onApplyAll).toHaveBeenCalledTimes(1);
  });

  it('should call onClearAll when Clear All button is clicked', () => {
    const queue = createMockQueue([mockTag1]);
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    const clearButton = screen.getByText(/clear all/i);
    fireEvent.click(clearButton);

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('should call onRemoveTag when remove button is clicked', () => {
    const queue = createMockQueue([mockTag1]);
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    const removeButton = screen.getByRole('button', { name: /remove.*tag-1/i });
    fireEvent.click(removeButton);

    expect(onRemoveTag).toHaveBeenCalledWith('tag-1');
  });

  it('should disable Apply All button when isApplying is true', () => {
    const queue = createMockQueue([mockTag1]);
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
        isApplying={true}
      />
    );

    const applyButton = screen.getByText(/applying/i);
    expect(applyButton).toBeDisabled();
  });

  it('should not show Apply All button when queue is empty', () => {
    const emptyQueue = createMockQueue();
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={emptyQueue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    const applyButton = screen.queryByRole('button', { name: /apply all/i });
    expect(applyButton).not.toBeInTheDocument();
  });

  it('should show loading state when isApplying', () => {
    const queue = createMockQueue([mockTag1]);
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
        isApplying={true}
      />
    );

    expect(screen.getByText(/applying/i)).toBeInTheDocument();
  });

  it('should display passage ID and range for each tag', () => {
    const queue = createMockQueue([mockTag1]);
    const onApplyAll = jest.fn();
    const onRemoveTag = jest.fn();
    const onClearAll = jest.fn();

    render(
      <TagQueuePanel
        queue={queue}
        onApplyAll={onApplyAll}
        onRemoveTag={onRemoveTag}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText(/passage-0/i)).toBeInTheDocument();
    expect(screen.getByText(/0-10/i)).toBeInTheDocument();
  });
});

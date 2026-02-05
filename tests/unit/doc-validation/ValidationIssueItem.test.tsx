/**
 * Tests for ValidationIssueItem component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationIssueItem } from '@/components/doc-validation/ValidationIssueItem';
import type { ValidationIssue } from '@/lib/values/ValidationSummary';

describe('ValidationIssueItem', () => {
  const mockIssue: ValidationIssue = {
    id: 'issue-1',
    severity: 'critical',
    passageId: 'passage-1',
    tagId: 'tag-1',
    message: 'Missing required attribute @who',
    code: 'MISSING_REQUIRED_ATTR',
  };

  test('should render issue with critical severity', () => {
    const { container } = render(<ValidationIssueItem issue={mockIssue} />);

    expect(container.textContent).toContain('MISSING REQUIRED ATTR');
    expect(screen.getByText('Missing required attribute @who')).toBeInTheDocument();
    expect(screen.getByText(/Passage: passage-1/)).toBeInTheDocument();
    expect(screen.getByText(/Tag: tag-1/)).toBeInTheDocument();
  });

  test('should render issue with warning severity', () => {
    const warningIssue: ValidationIssue = {
      ...mockIssue,
      severity: 'warning',
      code: 'INVALID_ENTITY_REF',
      message: 'Invalid entity reference',
    };

    const { container } = render(<ValidationIssueItem issue={warningIssue} />);

    expect(container.textContent).toContain('INVALID ENTITY REF');
    expect(screen.getByText('Invalid entity reference')).toBeInTheDocument();
  });

  test('should render issue with info severity', () => {
    const infoIssue: ValidationIssue = {
      ...mockIssue,
      severity: 'info',
      code: 'MISSING_RECOMMENDED_ATTR',
      message: 'Missing recommended attribute',
    };

    const { container } = render(<ValidationIssueItem issue={infoIssue} />);

    expect(container.textContent).toContain('MISSING RECOMMENDED ATTR');
    expect(screen.getByText('Missing recommended attribute')).toBeInTheDocument();
  });

  test('should call onNavigate when clicked', () => {
    const onNavigate = jest.fn();

    const { container } = render(<ValidationIssueItem issue={mockIssue} onNavigate={onNavigate} />);

    const item = container.querySelector('.validation-issue-item');
    if (item) {
      fireEvent.click(item);
    }

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(mockIssue);
  });

  test('should not call onNavigate when not provided', () => {
    const onNavigate = jest.fn();

    const { container } = render(<ValidationIssueItem issue={mockIssue} />);

    const item = container.querySelector('.validation-issue-item');
    if (item) {
      fireEvent.click(item);
    }

    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('should be keyboard accessible', () => {
    const onNavigate = jest.fn();

    const { container } = render(<ValidationIssueItem issue={mockIssue} onNavigate={onNavigate} />);

    const item = container.querySelector('.validation-issue-item');
    if (item) {
      fireEvent.keyDown(item, { key: 'Enter' });
    }

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(mockIssue);
  });

  test('should handle Space key', () => {
    const onNavigate = jest.fn();

    const { container } = render(<ValidationIssueItem issue={mockIssue} onNavigate={onNavigate} />);

    const item = container.querySelector('.validation-issue-item');
    if (item) {
      fireEvent.keyDown(item, { key: ' ' });
    }

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(mockIssue);
  });

  test('should format issue codes correctly', () => {
    const { container } = render(<ValidationIssueItem issue={mockIssue} />);

    // Should convert MISSING_REQUIRED_ATTR to "MISSING REQUIRED ATTR"
    expect(container.textContent).toContain('MISSING REQUIRED ATTR');
  });

  test('should display severity icon', () => {
    const { rerender } = render(<ValidationIssueItem issue={mockIssue} />);

    // Critical - ❌
    expect(screen.getByText('❌')).toBeInTheDocument();

    const warningIssue: ValidationIssue = {
      ...mockIssue,
      severity: 'warning',
    };
    rerender(<ValidationIssueItem issue={warningIssue} />);

    // Warning - ⚠️
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    const infoIssue: ValidationIssue = {
      ...mockIssue,
      severity: 'info',
    };
    rerender(<ValidationIssueItem issue={infoIssue} />);

    // Info - ℹ️
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });
});

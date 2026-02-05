/**
 * Tests for IssueList component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueList } from '@/components/doc-validation/IssueList';
import { createValidationSummary, createValidationIssue, createTagStats } from '@/lib/values/ValidationSummary';
import type { ValidationIssue } from '@/lib/values/ValidationSummary';

describe('IssueList', () => {
  const mockIssues: ValidationIssue[] = [
    createValidationIssue(
      'issue-1',
      'critical',
      'passage-1',
      'tag-1',
      'Missing required attribute @who',
      'MISSING_REQUIRED_ATTR'
    ),
    createValidationIssue(
      'issue-2',
      'warning',
      'passage-1',
      'tag-2',
      'Invalid entity reference',
      'INVALID_ENTITY_REF'
    ),
    createValidationIssue(
      'issue-3',
      'info',
      'passage-2',
      'tag-3',
      'Missing recommended attribute',
      'MISSING_RECOMMENDED_ATTR'
    ),
  ];

  const mockSummary = createValidationSummary(
    3,
    mockIssues,
    {
      said: createTagStats(2, 1),
      q: createTagStats(1, 0),
    },
    {
      critical: 1,
      warning: 1,
      info: 1,
    }
  );

  test('should render all issues by default', () => {
    render(<IssueList summary={mockSummary} />);

    expect(screen.getByText(/All \(3\)/)).toBeInTheDocument();
    expect(screen.getByText('Missing required attribute @who')).toBeInTheDocument();
    expect(screen.getByText('Invalid entity reference')).toBeInTheDocument();
    expect(screen.getByText('Missing recommended attribute')).toBeInTheDocument();
  });

  test('should filter issues by severity', () => {
    render(<IssueList summary={mockSummary} />);

    // Click on Critical filter
    const criticalButton = screen.getByText(/Critical \(1\)/);
    fireEvent.click(criticalButton);

    expect(screen.getByText('Missing required attribute @who')).toBeInTheDocument();
    expect(screen.queryByText('Invalid entity reference')).not.toBeInTheDocument();

    // Click on Warning filter
    const warningButton = screen.getByText(/Warning \(1\)/);
    fireEvent.click(warningButton);

    expect(screen.queryByText('Missing required attribute @who')).not.toBeInTheDocument();
    expect(screen.getByText('Invalid entity reference')).toBeInTheDocument();
  });

  test('should sort issues by severity', () => {
    const { container } = render(<IssueList summary={mockSummary} />);

    // Select sort by severity
    const sortSelect = screen.getByDisplayValue('Severity');
    fireEvent.change(sortSelect, { target: { value: 'severity' } });

    // Critical should come first
    const issueItems = container.querySelectorAll('.validation-issue-item');
    expect(issueItems[0].textContent).toContain('MISSING REQUIRED ATTR');
  });

  test('should call onNavigate when issue is clicked', () => {
    const onNavigate = jest.fn();

    render(<IssueList summary={mockSummary} onNavigate={onNavigate} />);

    const firstIssue = screen.getAllByText(/MISSING/)[0].closest('.validation-issue-item');
    if (firstIssue) {
      fireEvent.click(firstIssue);
    }

    expect(onNavigate).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'issue-1'
    }));
  });

  test('should show empty message when no issues match filter', () => {
    const summaryWithNoCritical = createValidationSummary(
      0,
      [],
      {},
      { critical: 0, warning: 0, info: 0 }
    );

    render(<IssueList summary={summaryWithNoCritical} />);

    // Click on Critical filter
    const criticalButton = screen.getByText(/Critical \(0\)/);
    fireEvent.click(criticalButton);

    expect(screen.getByText(/No critical issues found/)).toBeInTheDocument();
  });

  test('should display issue counts in filter buttons', () => {
    render(<IssueList summary={mockSummary} />);

    expect(screen.getByText(/All \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Critical \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Warning \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Info \(1\)/)).toBeInTheDocument();
  });
});

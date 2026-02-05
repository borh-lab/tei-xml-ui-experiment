/**
 * Tests for IssueDashboard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IssueDashboard } from '@/components/doc-validation/IssueDashboard';
import { createValidationSummary, createValidationIssue, createTagStats } from '@/lib/values/ValidationSummary';

describe('IssueDashboard', () => {
  const mockIssues = [
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
    10,
    mockIssues,
    {
      said: createTagStats(5, 1),
      q: createTagStats(3, 0),
      persName: createTagStats(2, 1),
    },
    {
      critical: 1,
      warning: 1,
      info: 1,
    }
  );

  test('should render health score', () => {
    render(<IssueDashboard summary={mockSummary} />);

    expect(screen.getByText(/Validation Health/)).toBeInTheDocument();
    expect(screen.getByText(/Health Score/)).toBeInTheDocument();
  });

  test('should display severity breakdown', () => {
    const { container } = render(<IssueDashboard summary={mockSummary} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();

    // Check that critical count is displayed
    const criticalSection = container.querySelectorAll('.bg-red-50')[0];
    expect(criticalSection.textContent).toContain('1');
  });

  test('should show tag type breakdown', () => {
    render(<IssueDashboard summary={mockSummary} />);

    expect(screen.getByText(/Tags by Type/)).toBeInTheDocument();
    expect(screen.getByText(/<said>/)).toBeInTheDocument();
    expect(screen.getByText(/<q>/)).toBeInTheDocument();
    expect(screen.getByText(/<persName>/)).toBeInTheDocument();
  });

  test('should display total tags', () => {
    render(<IssueDashboard summary={mockSummary} />);

    expect(screen.getByText('10')).toBeInTheDocument(); // 10 total tags
    expect(screen.getByText(/Total Tags/)).toBeInTheDocument();
  });

  test('should show healthy status for good scores', () => {
    const healthySummary = createValidationSummary(
      10,
      [],
      {},
      { critical: 0, warning: 0, info: 0 }
    );

    render(<IssueDashboard summary={healthySummary} />);

    expect(screen.getByText(/HEALTHY/)).toBeInTheDocument();
  });

  test('should show critical status for poor scores', () => {
    const criticalSummary = createValidationSummary(
      10,
      [
        createValidationIssue(
          'issue-1',
          'critical',
          'passage-1',
          'tag-1',
          'Critical error',
          'CRITICAL_ERROR'
        ),
        createValidationIssue(
          'issue-2',
          'critical',
          'passage-1',
          'tag-2',
          'Another critical',
          'CRITICAL_ERROR'
        ),
      ],
      {},
      { critical: 10, warning: 0, info: 0 }
    );

    render(<IssueDashboard summary={criticalSummary} />);

    expect(screen.getByText(/CRITICAL/)).toBeInTheDocument();
  });
});

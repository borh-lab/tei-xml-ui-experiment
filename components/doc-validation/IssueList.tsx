/**
 * IssueList Component
 *
 * Lists all validation issues with filtering and sorting.
 */

import React, { useState, useMemo } from 'react';
import type { ValidationIssue, ValidationSummary } from '@/lib/values/ValidationSummary';
import { ValidationIssueItem } from './ValidationIssueItem';

export interface IssueListProps {
  /** Validation summary containing issues */
  summary: ValidationSummary;
  /** Click handler to navigate to issue location */
  onNavigate?: (issue: ValidationIssue) => void;
}

type FilterType = 'all' | 'critical' | 'warning' | 'info';
type SortType = 'severity' | 'type' | 'passage';

/**
 * Sort issues by severity (critical > warning > info)
 */
function sortBySeverity(issues: ValidationIssue[]): ValidationIssue[] {
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Sort issues by type (code)
 */
function sortByType(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Sort issues by passage ID
 */
function sortByPassage(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => a.passageId.localeCompare(b.passageId));
}

/**
 * IssueList component
 *
 * Displays list of validation issues with filtering and sorting options.
 */
export function IssueList({ summary, onNavigate }: IssueListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('severity');

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (filter === 'all') {
      return summary.issues;
    }
    return summary.issues.filter((issue) => issue.severity === filter);
  }, [summary.issues, filter]);

  // Sort issues
  const sortedIssues = useMemo(() => {
    switch (sort) {
      case 'severity':
        return sortBySeverity(filteredIssues);
      case 'type':
        return sortByType(filteredIssues);
      case 'passage':
        return sortByPassage(filteredIssues);
      default:
        return filteredIssues;
    }
  }, [filteredIssues, sort]);

  const issueCount = filteredIssues.length;
  const criticalCount = summary.issues.filter((i) => i.severity === 'critical').length;
  const warningCount = summary.issues.filter((i) => i.severity === 'warning').length;
  const infoCount = summary.issues.filter((i) => i.severity === 'info').length;

  return (
    <div className="issue-list">
      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 border-b">
        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All ({summary.issues.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'critical'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'warning'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
            }`}
          >
            Warning ({warningCount})
          </button>
          <button
            onClick={() => setFilter('info')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            Info ({infoCount})
          </button>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-1 text-sm rounded-md border bg-background"
          >
            <option value="severity">Severity</option>
            <option value="type">Type</option>
            <option value="passage">Passage</option>
          </select>
        </div>
      </div>

      {/* Issues list */}
      <div className="space-y-2 p-4">
        {issueCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No {filter === 'all' ? '' : filter} issues found</p>
          </div>
        ) : (
          sortedIssues.map((issue) => (
            <ValidationIssueItem key={issue.id} issue={issue} onNavigate={onNavigate} />
          ))
        )}
      </div>
    </div>
  );
}

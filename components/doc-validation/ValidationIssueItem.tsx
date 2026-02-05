/**
 * ValidationIssueItem Component
 *
 * Displays a single validation issue with:
 * - Severity icon
 * - Issue message
 * - Location (passage, tag)
 * - Click to navigate to location
 */

import React from 'react';
import type { ValidationIssue } from '@/lib/values/ValidationSummary';

export interface ValidationIssueItemProps {
  /** The issue to display */
  issue: ValidationIssue;
  /** Click handler to navigate to issue location */
  onNavigate?: (issue: ValidationIssue) => void;
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: ValidationIssue['severity']): string {
  switch (severity) {
    case 'critical':
      return '❌'; // Critical error
    case 'warning':
      return '⚠️'; // Warning
    case 'info':
      return 'ℹ️'; // Info
    default:
      return '•';
  }
}

/**
 * Get severity color class
 */
function getSeverityColor(severity: ValidationIssue['severity']): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600';
    case 'warning':
      return 'text-yellow-600';
    case 'info':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get severity background class
 */
function getSeverityBg(severity: ValidationIssue['severity']): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'info':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

/**
 * Format issue code for display
 */
function formatIssueCode(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * ValidationIssueItem component
 *
 * Displays a single validation issue with severity icon and message.
 * Clickable to navigate to the issue location.
 */
export function ValidationIssueItem({ issue, onNavigate }: ValidationIssueItemProps) {
  const { severity, message, code, passageId, tagId } = issue;
  const icon = getSeverityIcon(severity);
  const colorClass = getSeverityColor(severity);
  const bgClass = getSeverityBg(severity);
  const formattedCode = formatIssueCode(code);

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(issue);
    }
  };

  return (
    <div
      className={`validation-issue-item p-3 border rounded-md cursor-pointer hover:opacity-80 transition-opacity ${bgClass}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <span className="text-xl flex-shrink-0">{icon}</span>

        {/* Issue details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm ${colorClass}`}>{formattedCode}</span>
          </div>

          <p className="text-sm text-gray-700 mb-1">{message}</p>

          {/* Location info */}
          <div className="text-xs text-gray-500">
            <span>Passage: {passageId}</span>
            <span className="mx-1">•</span>
            <span>Tag: {tagId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

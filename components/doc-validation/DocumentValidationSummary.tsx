/**
 * DocumentValidationSummary Component
 *
 * Container component that includes IssueDashboard and IssueList.
 * Provides export functionality.
 */

import React, { useState } from 'react';
import './DocumentValidationSummary.css';
import type { ValidationSummary, ValidationIssue } from '@/lib/values/ValidationSummary';
import { IssueDashboard } from './IssueDashboard';
import { IssueList } from './IssueList';

export interface DocumentValidationSummaryProps {
  /** Validation summary */
  summary: ValidationSummary;
  /** Click handler to navigate to issue location */
  onNavigate?: (issue: ValidationIssue) => void;
}

/**
 * Export as JSON
 */
function exportAsJSON(summary: ValidationSummary): void {
  const data = JSON.stringify(summary, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `validation-summary-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export as HTML
 */
function exportAsHTML(summary: ValidationSummary): void {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Validation Summary</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    .issue { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
    .critical { border-color: #dc2626; background: #fef2f2; }
    .warning { border-color: #f59e0b; background: #fffbeb; }
    .info { border-color: #2563eb; background: #eff6ff; }
    .issue-code { font-weight: bold; }
    .issue-message { margin: 5px 0; }
    .issue-location { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>Validation Summary</h1>
  <p><strong>Total Tags:</strong> ${summary.totalTags}</p>
  <p><strong>Total Issues:</strong> ${summary.issues.length}</p>
  <p><strong>Critical:</strong> ${summary.bySeverity.critical || 0} |
     <strong>Warning:</strong> ${summary.bySeverity.warning || 0} |
     <strong>Info:</strong> ${summary.bySeverity.info || 0}</p>

  <h2>Issues</h2>
  ${summary.issues.map(issue => `
    <div class="issue ${issue.severity}">
      <div class="issue-code">${issue.code}</div>
      <div class="issue-message">${issue.message}</div>
      <div class="issue-location">
        Passage: ${issue.passageId} | Tag: ${issue.tagId}
      </div>
    </div>
  `).join('')}
</body>
</html>
  `.trim();

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `validation-summary-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export as PDF (using browser print)
 */
function exportAsPDF(): void {
  window.print();
}

/**
 * DocumentValidationSummary component
 *
 * Container for validation dashboard and issue list with export functionality.
 */
export function DocumentValidationSummary({
  summary,
  onNavigate
}: DocumentValidationSummaryProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportJSON = () => {
    exportAsJSON(summary);
    setShowExportMenu(false);
  };

  const handleExportHTML = () => {
    exportAsHTML(summary);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    exportAsPDF();
    setShowExportMenu(false);
  };

  return (
    <div className="document-validation-summary space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">Document Validation</h1>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Export
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-10">
              <button
                onClick={handleExportJSON}
                className="block w-full text-left px-4 py-2 hover:bg-accent transition-colors"
              >
                Export as JSON
              </button>
              <button
                onClick={handleExportHTML}
                className="block w-full text-left px-4 py-2 hover:bg-accent transition-colors"
              >
                Export as HTML
              </button>
              <button
                onClick={handleExportPDF}
                className="block w-full text-left px-4 py-2 hover:bg-accent transition-colors"
              >
                Print / PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard */}
      <IssueDashboard summary={summary} />

      {/* Issue List */}
      <div className="border-t pt-6">
        <h2 className="text-xl font-bold mb-4">Issues</h2>
        <IssueList summary={summary} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

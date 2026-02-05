/**
 * IssueDashboard Component
 *
 * Shows validation health score and breakdown by severity/tag type.
 * Displays charts and metrics.
 */

import React from 'react';
import type { ValidationSummary } from '@/lib/values/ValidationSummary';
import { calculateHealthScore, getOverallStatus } from '@/lib/values/ValidationSummary';

export interface IssueDashboardProps {
  /** Validation summary */
  summary: ValidationSummary;
}

/**
 * Get health score color
 */
function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get health score background
 */
function getHealthScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 50) return 'bg-yellow-100';
  return 'bg-red-100';
}

/**
 * Get status color
 */
function getStatusColor(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
  }
}

/**
 * IssueDashboard component
 *
 * Displays validation health score, status, and breakdown metrics.
 */
export function IssueDashboard({ summary }: IssueDashboardProps) {
  const healthScore = calculateHealthScore(summary);
  const status = getOverallStatus(summary);
  const scoreColor = getHealthScoreColor(healthScore);
  const scoreBg = getHealthScoreBg(healthScore);
  const statusColor = getStatusColor(status);

  return (
    <div className="issue-dashboard p-6 space-y-6">
      {/* Health Score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Validation Health</h2>
          <p className="text-sm text-muted-foreground">Overall document status</p>
        </div>
        <div className={`px-6 py-4 rounded-lg ${scoreBg} ${scoreColor}`}>
          <div className="text-4xl font-bold">{healthScore}</div>
          <div className="text-sm font-medium">Health Score</div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-center">
        <span className={`px-4 py-2 rounded-full border font-semibold ${statusColor}`}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Severity Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Critical */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">Critical</span>
            <span className="text-2xl">❌</span>
          </div>
          <div className="text-3xl font-bold text-red-600">
            {summary.bySeverity.critical || 0}
          </div>
          <div className="text-xs text-red-500 mt-1">Issues requiring immediate attention</div>
        </div>

        {/* Warning */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">Warning</span>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-3xl font-bold text-yellow-600">
            {summary.bySeverity.warning || 0}
          </div>
          <div className="text-xs text-yellow-500 mt-1">Issues that should be reviewed</div>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Info</span>
            <span className="text-2xl">ℹ️</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {summary.bySeverity.info || 0}
          </div>
          <div className="text-xs text-blue-500 mt-1">Suggestions and recommendations</div>
        </div>
      </div>

      {/* Tag Type Breakdown */}
      {Object.keys(summary.byTagType).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Tags by Type</h3>
          <div className="space-y-2">
            {Object.entries(summary.byTagType).map(([tagType, stats]) => {
              const invalidPercentage = stats.total > 0 ? (stats.invalid / stats.total) * 100 : 0;
              const isValid = stats.invalid === 0;

              return (
                <div key={tagType} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{`<${tagType}>`}</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.invalid} / {stats.total} invalid
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isValid ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${invalidPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total Tags */}
      <div className="text-center p-4 bg-muted rounded-lg">
        <div className="text-2xl font-bold">{summary.totalTags}</div>
        <div className="text-sm text-muted-foreground">Total Tags</div>
      </div>
    </div>
  );
}

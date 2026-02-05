import type { PassageID, TagID } from '@/lib/tei/types';

export interface ValidationIssue {
  readonly id: string;
  readonly severity: 'critical' | 'warning' | 'info';
  readonly passageId: PassageID;
  readonly tagId: TagID;
  readonly message: string;
  readonly code: string;
}

export interface TagStats {
  readonly total: number;
  readonly invalid: number;
}

export interface ValidationSummary {
  readonly totalTags: number;
  readonly issues: ValidationIssue[];
  readonly byTagType: Record<string, TagStats>;
  readonly bySeverity: Record<string, number>;
}

export function createValidationIssue(
  id: string,
  severity: ValidationIssue['severity'],
  passageId: PassageID,
  tagId: TagID,
  message: string,
  code: string
): ValidationIssue {
  return { id, severity, passageId, tagId, message, code };
}

export function createTagStats(total: number, invalid: number): TagStats {
  return { total, invalid };
}

export function createValidationSummary(
  totalTags: number,
  issues: ValidationIssue[],
  byTagType: Record<string, TagStats>,
  bySeverity: Record<string, number>
): ValidationSummary {
  return { totalTags, issues, byTagType, bySeverity };
}

export function getIssuesBySeverity(
  summary: ValidationSummary,
  severity: ValidationIssue['severity']
): ValidationIssue[] {
  return summary.issues.filter((issue) => issue.severity === severity);
}

export function calculateHealthScore(summary: ValidationSummary): number {
  if (summary.totalTags === 0) return 100;
  const criticalCount = summary.bySeverity.critical || 0;
  const warningCount = summary.bySeverity.warning || 0;
  const deduction = criticalCount * 10 + warningCount * 2;
  return Math.max(0, 100 - deduction);
}

export function getOverallStatus(summary: ValidationSummary): 'healthy' | 'warning' | 'critical' {
  const score = calculateHealthScore(summary);
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

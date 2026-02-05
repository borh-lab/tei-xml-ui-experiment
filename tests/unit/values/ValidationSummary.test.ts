import {
  createValidationIssue,
  createValidationSummary,
  getIssuesBySeverity,
  calculateHealthScore,
  getOverallStatus,
} from '@/lib/values/ValidationSummary';

describe('ValidationSummary value', () => {
  it('should create summary', () => {
    const issue = createValidationIssue('i1', 'critical', 'p1', 't1', 'Error', 'ERR');
    const summary = createValidationSummary(10, [issue], { said: { total: 5, invalid: 1 } }, { critical: 1 });
    expect(summary.totalTags).toBe(10);
    expect(summary.issues).toHaveLength(1);
  });

  it('should create validation issue', () => {
    const issue = createValidationIssue('i1', 'critical', 'p1', 't1', 'Error message', 'ERR_CODE');
    expect(issue.id).toBe('i1');
    expect(issue.severity).toBe('critical');
    expect(issue.passageId).toBe('p1');
    expect(issue.tagId).toBe('t1');
    expect(issue.message).toBe('Error message');
    expect(issue.code).toBe('ERR_CODE');
  });

  it('should filter by severity', () => {
    const issues = [
      createValidationIssue('i1', 'critical', 'p1', 't1', 'E', 'ERR'),
      createValidationIssue('i2', 'warning', 'p1', 't2', 'W', 'WARN'),
      createValidationIssue('i3', 'critical', 'p2', 't3', 'E2', 'ERR2'),
    ];
    const summary = createValidationSummary(10, issues, {}, { critical: 2, warning: 1 });
    const critical = getIssuesBySeverity(summary, 'critical');
    expect(critical).toHaveLength(2);

    const warnings = getIssuesBySeverity(summary, 'warning');
    expect(warnings).toHaveLength(1);

    const info = getIssuesBySeverity(summary, 'info');
    expect(info).toHaveLength(0);
  });

  it('should calculate health score with no issues', () => {
    const summary = createValidationSummary(10, [], {}, {});
    expect(calculateHealthScore(summary)).toBe(100);
  });

  it('should calculate health score with issues', () => {
    const summary = createValidationSummary(10, [], {}, { critical: 1, warning: 1 });
    expect(calculateHealthScore(summary)).toBe(88); // 100 - (1*10) - (1*2) = 88
  });

  it('should calculate health score with zero tags as 100', () => {
    const summary = createValidationSummary(0, [], {}, { critical: 5, warning: 5 });
    expect(calculateHealthScore(summary)).toBe(100);
  });

  it('should return healthy status for high score', () => {
    const summary = createValidationSummary(10, [], {}, {});
    expect(getOverallStatus(summary)).toBe('healthy');
  });

  it('should return warning status for medium score', () => {
    const summary = createValidationSummary(10, [], {}, { critical: 3, warning: 5 });
    expect(calculateHealthScore(summary)).toBe(60);
    expect(getOverallStatus(summary)).toBe('warning');
  });

  it('should return critical status for low score', () => {
    const summary = createValidationSummary(10, [], {}, { critical: 8, warning: 5 });
    expect(calculateHealthScore(summary)).toBe(10); // 100 - (8*10) - (5*2) = 10
    expect(getOverallStatus(summary)).toBe('critical');
  });

  it('should not go below zero health score', () => {
    const summary = createValidationSummary(10, [], {}, { critical: 50, warning: 50 });
    expect(calculateHealthScore(summary)).toBe(0);
  });
});

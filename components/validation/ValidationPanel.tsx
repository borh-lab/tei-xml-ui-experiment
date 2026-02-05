'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  FixSuggestion,
} from '@/lib/validation';
import { AlertCircle, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import {
  SchemaSelectionManager,
  SchemaSelectionHistory,
} from '@/lib/schema/SchemaSelection';
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';
import { SchemaInfo } from '@/lib/schema/SchemaResolver';

interface ValidationPanelProps {
  validationResults: ValidationResult | null;
  onFixClick?: (suggestion: FixSuggestion) => void;
  onErrorClick?: (error: ValidationError) => void;
  visible?: boolean;
}

type SeverityFilter = 'all' | 'errors' | 'warnings';

export function ValidationPanel({
  validationResults,
  onFixClick,
  onErrorClick,
  visible = true,
}: ValidationPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  // Schema selection state
  const resolver = createDefaultResolver();
  const selectionManager = new SchemaSelectionManager(resolver);

  const [selectionHistory, setSelectionHistory] = useState<SchemaSelectionHistory>(() => ({
    current: selectionManager.load(),
    previous: [],
  }));
  const [availableSchemas, setAvailableSchemas] = useState<SchemaInfo[]>([]);

  // Load schemas on mount
  useEffect(() => {
    fetch('/api/schemas')
      .then((r) => r.json())
      .then((data) => setAvailableSchemas(data.schemas))
      .catch((err) => console.error('Failed to load schemas:', err));
  }, []);

  // Handle schema change
  const handleSchemaChange = useCallback((newSchemaId: string) => {
    setSelectionHistory((prev) => selectionManager.transition(prev, newSchemaId));
  }, []);

  // Get current schema info
  const currentSchema = useMemo(() => {
    return availableSchemas.find((s) => s.id === selectionHistory.current.schemaId);
  }, [availableSchemas, selectionHistory.current.schemaId]);

  if (!visible) {
    return null;
  }

  // No validation results yet
  if (!validationResults) {
    return (
      <Card className="w-full" role="region" aria-label="Validation Results">
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
          <CardDescription>No validation results</CardDescription>

          {/* Schema Selector */}
          {availableSchemas.length > 0 && (
            <div className="schema-selector mt-4">
              <label htmlFor="schema-select" className="text-sm font-medium mb-2 block">
                Validation Schema
              </label>
              <select
                id="schema-select"
                value={selectionHistory.current.schemaId}
                onChange={(e) => handleSchemaChange(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                aria-label="Validation Schema"
              >
                {availableSchemas.map((schema) => (
                  <option key={schema.id} value={schema.id}>
                    {schema.name}
                  </option>
                ))}
              </select>

              {currentSchema && (
                <div className="schema-info mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">{currentSchema.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {currentSchema.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Run validation to see results</p>
        </CardContent>
      </Card>
    );
  }

  const { valid, errors, warnings, suggestions } = validationResults;
  const totalErrors = errors.length;
  const totalWarnings = warnings.length;

  // Filter issues based on selected severity
  const filteredErrors = severityFilter === 'all' || severityFilter === 'errors' ? errors : [];
  const filteredWarnings =
    severityFilter === 'all' || severityFilter === 'warnings' ? warnings : [];

  const hasIssues = totalErrors > 0 || totalWarnings > 0;
  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <Card className="w-full" role="region" aria-label="Validation Results">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>
              {totalErrors} errors, {totalWarnings} warnings
            </CardDescription>
          </div>
          {valid && !hasIssues && <CheckCircle2 className="h-6 w-6 text-green-500" />}
        </div>

        {/* Schema Selector */}
        {availableSchemas.length > 0 && (
          <div className="schema-selector mt-4">
            <label htmlFor="schema-select" className="text-sm font-medium mb-2 block">
              Validation Schema
            </label>
            <select
              id="schema-select"
              value={selectionHistory.current.schemaId}
              onChange={(e) => handleSchemaChange(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              aria-label="Validation Schema"
            >
              {availableSchemas.map((schema) => (
                <option key={schema.id} value={schema.id}>
                  {schema.name}
                </option>
              ))}
            </select>

            {currentSchema && (
              <div className="schema-info mt-3 pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-2">{currentSchema.description}</p>
                <div className="flex gap-2 flex-wrap">
                  {currentSchema.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Severity Filter Buttons */}
        {hasIssues && (
          <div className="flex gap-2 mt-4">
            <Button
              variant={severityFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter('all')}
            >
              All ({totalErrors + totalWarnings})
            </Button>
            <Button
              variant={severityFilter === 'errors' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter('errors')}
              disabled={totalErrors === 0}
            >
              Errors ({totalErrors})
            </Button>
            <Button
              variant={severityFilter === 'warnings' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter('warnings')}
              disabled={totalWarnings === 0}
            >
              Warnings ({totalWarnings})
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {valid && !hasIssues ? (
          <Alert variant="default">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Document is valid</AlertTitle>
            <AlertDescription>Your TEI document passed all validation checks.</AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Render Errors */}
              {filteredErrors.map((error, index) => (
                <ErrorItem
                  key={`error-${index}`}
                  error={error}
                  onClick={() => onErrorClick?.(error)}
                />
              ))}

              {/* Render Warnings */}
              {filteredWarnings.map((warning, index) => (
                <WarningItem key={`warning-${index}`} warning={warning} />
              ))}

              {/* Show message if no issues match filter */}
              {filteredErrors.length === 0 && filteredWarnings.length === 0 && hasIssues && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No issues match the current filter.
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Fix Suggestions */}
        {hasSuggestions && onFixClick && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Suggested Fixes
            </h4>
            {suggestions.map((suggestion, index) => (
              <FixSuggestionItem
                key={`suggestion-${index}`}
                suggestion={suggestion}
                onApply={() => onFixClick(suggestion)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ErrorItemProps {
  error: ValidationError;
  onClick?: () => void;
}

function ErrorItem({ error, onClick }: ErrorItemProps) {
  const hasLocation = error.line !== undefined || error.column !== undefined;
  const hasContext = error.context !== undefined && error.context.length > 0;

  return (
    <Alert
      variant="destructive"
      className={onClick ? 'cursor-pointer hover:bg-destructive/10' : ''}
      onClick={onClick}
      role="button"
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <AlertCircle className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <AlertTitle className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
              {hasLocation && (
                <span className="text-xs font-normal text-muted-foreground">
                  {error.line && `Line ${error.line}`}
                  {error.line && error.column && ', '}
                  {error.column && `Col ${error.column}`}
                </span>
              )}
            </AlertTitle>
            <AlertDescription className="mt-1">{error.message}</AlertDescription>
          </div>
        </div>
        {hasContext && (
          <pre className="mt-2 text-xs bg-background/50 rounded p-2 overflow-x-auto">
            {error.context}
          </pre>
        )}
      </div>
    </Alert>
  );
}

interface WarningItemProps {
  warning: ValidationWarning;
}

function WarningItem({ warning }: WarningItemProps) {
  const hasLocation = warning.line !== undefined || warning.column !== undefined;
  const hasCode = warning.code !== undefined;

  return (
    <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <div className="flex-1">
        <AlertTitle className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs border-yellow-600 text-yellow-700 dark:text-yellow-500"
          >
            Warning
          </Badge>
          {hasCode && (
            <span className="text-xs font-mono text-muted-foreground">{warning.code}</span>
          )}
          {hasLocation && (
            <span className="text-xs font-normal text-muted-foreground">
              {warning.line && `Line ${warning.line}`}
              {warning.line && warning.column && ', '}
              {warning.column && `Col ${warning.column}`}
            </span>
          )}
        </AlertTitle>
        <AlertDescription className="mt-1">{warning.message}</AlertDescription>
      </div>
    </Alert>
  );
}

interface FixSuggestionItemProps {
  suggestion: FixSuggestion;
  onApply: () => void;
}

function FixSuggestionItem({ suggestion, onApply }: FixSuggestionItemProps) {
  const hasLocation = suggestion.line !== undefined || suggestion.column !== undefined;
  const hasDetailedSuggestion = suggestion.suggestion !== undefined;

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{suggestion.message}</p>
            {hasLocation && (
              <span className="text-xs text-muted-foreground">
                {suggestion.line && `Line ${suggestion.line}`}
                {suggestion.line && suggestion.column && ', '}
                {suggestion.column && `Col ${suggestion.column}`}
              </span>
            )}
          </div>
          {hasDetailedSuggestion && (
            <p className="text-xs text-muted-foreground">{suggestion.suggestion}</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onApply}>
          Apply Fix
        </Button>
      </div>
    </div>
  );
}

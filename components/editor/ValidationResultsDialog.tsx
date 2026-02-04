'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  location: { index: number; dialogueIndex?: number };
  suggestion?: string;
}

interface ValidationResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: ValidationIssue[];
  passageCount: number;
}

export function ValidationResultsDialog({
  open,
  onOpenChange,
  issues,
  passageCount,
}: ValidationResultsDialogProps) {
  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;
  const infoCount = issues.filter((i) => i.type === 'info').length;

  const getIcon = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />;
    }
  };

  const getVariant = (type: ValidationIssue['type']): 'default' | 'destructive' => {
    return type === 'error' ? 'destructive' : 'default';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {issues.length === 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                Validation Complete
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                Validation Found Issues
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {issues.length === 0
              ? `All ${passageCount} selected passages passed validation!`
              : `Found ${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}, and ${infoCount} info message${infoCount !== 1 ? 's' : ''} in ${passageCount} passage${passageCount !== 1 ? 's' : ''}.`}
          </DialogDescription>
        </DialogHeader>

        {issues.length > 0 ? (
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
            <div className="space-y-3">
              {issues.map((issue, idx) => (
                <Alert key={idx} variant={getVariant(issue.type)}>
                  <div className="flex items-start gap-2">
                    {getIcon(issue.type)}
                    <div className="flex-1 space-y-1">
                      <AlertTitle className="flex items-center gap-2">
                        {issue.type === 'error' && 'Error'}
                        {issue.type === 'warning' && 'Warning'}
                        {issue.type === 'info' && 'Info'}
                        <Badge variant="outline" className="ml-auto text-xs">
                          Para #{issue.location.index + 1}
                          {issue.location.dialogueIndex !== undefined &&
                            ` · Dialogue ${issue.location.dialogueIndex + 1}`}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        {issue.message}
                        {issue.suggestion && (
                          <div className="mt-2 text-xs">
                            <span className="font-medium">Suggestion: </span>
                            {issue.suggestion}
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
            <p className="text-sm text-muted-foreground text-center">
              No issues detected in the selected passages. All dialogues are properly tagged and
              validated.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {issues.length === 0 ? 'Close' : 'Acknowledge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

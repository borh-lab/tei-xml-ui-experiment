'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { detectDialogueInDocument } from '@/lib/ai/pattern-detector';
import { createPatternDatabase } from '@/lib/ai/PatternManager';
import type { DialogueDetection } from '@/lib/ai/types';
import type { Character } from '@/lib/tei/types';
import { Check, X, Wand2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface AIAssistantProps {
  onApplySuggestion?: (detection: DialogueDetection, speakerIndex: number) => void;
  onClose?: () => void;
}

export function AIAssistant({ onApplySuggestion, onClose }: AIAssistantProps) {
  const { document } = useDocumentService();
  const [suggestions, setSuggestions] = useState<readonly DialogueDetection[]>([]);
  const [scanned, setScanned] = useState(false);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(0.9);

  // Detect dialogue when document changes
  const detections = useMemo(() => {
    if (!document) return [];
    const patternDb = createPatternDatabase();
    return detectDialogueInDocument(document, patternDb.patterns);
  }, [document]);

  // Filter detections to those with speakers
  const speakerDetections = useMemo(() => {
    return detections.filter((d) => d.detectedSpeakers.length > 0);
  }, [detections]);

  // Scan for suggestions
  const handleScan = useCallback(() => {
    setSuggestions(speakerDetections);
    setScanned(true);
    toast.success(`Found ${speakerDetections.length} dialogue suggestions`);
  }, [speakerDetections]);

  // Apply suggestion
  const handleApplySuggestion = useCallback(
    (detection: DialogueDetection, speakerIndex: number) => {
      const speaker = detection.detectedSpeakers[speakerIndex];
      if (!speaker) return;

      if (onApplySuggestion) {
        onApplySuggestion(detection, speakerIndex);
      }

      // Remove from suggestions
      setSuggestions((prev) => prev.filter((s) => s !== detection));
    },
    [onApplySuggestion]
  );

  // Reject suggestion
  const handleRejectSuggestion = useCallback((detection: DialogueDetection) => {
    setSuggestions((prev) => prev.filter((s) => s !== detection));
  }, []);

  // Auto-apply high confidence suggestions
  const handleAutoApply = useCallback(() => {
    const highConfidence = suggestions.filter((s) =>
      s.detectedSpeakers.some((d) => d.confidence >= autoApplyThreshold)
    );

    highConfidence.forEach((detection) => {
      const topSpeaker = detection.detectedSpeakers[0];
      if (topSpeaker) {
        handleApplySuggestion(detection, 0);
      }
    });

    toast.success(`Auto-applied ${highConfidence.length} high-confidence suggestions`);
    setSuggestions((prev) => prev.filter((s) => !highConfidence.includes(s)));
  }, [suggestions, autoApplyThreshold, handleApplySuggestion]);

  // Clear suggestions
  const handleClear = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Get character name from ID
  const getCharacterName = useCallback(
    (speakerId: string) => {
      if (!document) return speakerId;
      const char = document.state.characters.find((c: Character) => c.id === speakerId);
      return char?.name || speakerId;
    },
    [document]
  );

  if (!document) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Assistant
            <Badge variant="secondary" className="text-xs">Effect</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Load a document to enable AI dialogue detection.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Count auto-appliable suggestions
  const autoAppliableCount = suggestions.filter((s) =>
    s.detectedSpeakers.some((d) => d.confidence >= autoApplyThreshold)
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Assistant
            <Badge variant="secondary" className="text-xs">Effect</Badge>
          </CardTitle>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              X
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Detected {speakerDetections.length} dialogue passages with speaker attributions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan button */}
        {!scanned && (
          <Button onClick={handleScan} className="w-full">
            Scan Document
          </Button>
        )}

        {/* Auto-apply high confidence */}
        {scanned && autoAppliableCount > 0 && (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div>
              <p className="text-sm font-medium">
                {autoAppliableCount} high-confidence suggestions
              </p>
              <p className="text-xs text-muted-foreground">
                Confidence ≥ {Math.round(autoApplyThreshold * 100)}%
              </p>
            </div>
            <Button size="sm" onClick={handleAutoApply}>
              Auto-Apply All
            </Button>
          </div>
        )}

        {/* Suggestions list */}
        {suggestions.length === 0 && scanned && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No suggestions remaining. All processed!
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{suggestions.length} suggestions</span>
              <Button size="sm" variant="ghost" onClick={handleClear}>
                Clear All
              </Button>
            </div>

            {suggestions.map((detection) => (
              <div
                key={`${detection.passageId}-${detection.range.start}`}
                className="p-3 border rounded-lg space-y-2"
              >
                {/* Dialogue text */}
                <p className="text-sm italic">
                  &ldquo;
                  {detection.text.length > 100
                    ? detection.text.substring(0, 100) + '...'
                    : detection.text}
                  &rdquo;
                </p>

                {/* Speakers */}
                <div className="space-y-1">
                  {detection.detectedSpeakers.map((speaker, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={speaker.confidence >= 0.9 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {Math.round(speaker.confidence * 100)}% confidence
                        </Badge>
                        <span>{getCharacterName(speaker.speaker)}</span>
                      </div>
                      <div className="flex gap-1">
                        {speaker.confidence >= autoApplyThreshold && idx === 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApplySuggestion(detection, idx)}
                            className="h-7 w-7 p-0"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectSuggestion(detection)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reason */}
                {detection.detectedSpeakers[0]?.reason && (
                  <p className="text-xs text-muted-foreground">
                    {detection.detectedSpeakers[0].reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {scanned && (
          <div className="pt-3 border-t">
            <label className="text-sm font-medium">Auto-Apply Threshold</label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={autoApplyThreshold}
              onChange={(e) => setAutoApplyThreshold(parseFloat(e.target.value))}
              className="w-full mt-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span>{Math.round(autoApplyThreshold * 100)}%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

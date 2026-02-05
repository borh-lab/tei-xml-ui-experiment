// @ts-nocheck
/**
 * Accuracy Metrics for Pattern Engine Evaluation
 *
 * Provides functions to calculate precision, recall, F1 score,
 * and speaker attribution accuracy for the pattern engine.
 */

export interface DialogueSpan {
  start: number;
  end: number;
  text: string;
  confidence: number;
  who?: string; // Speaker ID if available
}

export interface Annotation {
  start: number;
  end: number;
  text: string;
  who: string;
}

export interface DetectionResult {
  predicted: DialogueSpan[];
  actual: Annotation[];
}

export interface Metrics {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface SpeakerMetrics {
  accuracy: number;
  correct: number;
  total: number;
  perSpeaker: Map<string, SpeakerAccuracy>;
}

export interface SpeakerAccuracy {
  correct: number;
  total: number;
  accuracy: number;
}

/**
 * Calculate precision, recall, and F1 score for dialogue detection
 *
 * True Positive (TP): Predicted dialogue that matches an actual dialogue
 * False Positive (FP): Predicted dialogue that doesn't match anything
 * False Negative (FN): Actual dialogue not detected
 */
export function calculateMetrics(result: DetectionResult): Metrics {
  const { predicted, actual } = result;

  // Calculate True Positives, False Positives, False Negatives
  let truePositives = 0;
  const predictedMatches = new Set<number>();

  for (let i = 0; i < predicted.length; i++) {
    const pred = predicted[i];

    // Check if this prediction matches any actual annotation
    for (let j = 0; j < actual.length; j++) {
      const act = actual[j];

      // Check for overlap (IoU > 0.5)
      const overlap = calculateOverlap(pred, act);
      const union = pred.end - pred.start + (act.end - act.start) - overlap;
      const iou = union > 0 ? overlap / union : 0;

      if (iou > 0.5) {
        truePositives++;
        predictedMatches.add(i);
        break;
      }
    }
  }

  const falsePositives = predicted.length - truePositives;
  const falseNegatives = actual.length - truePositives;

  // Calculate precision, recall, F1
  const precision =
    truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;

  const recall =
    truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

  const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

  return {
    precision,
    recall,
    f1,
    truePositives,
    falsePositives,
    falseNegatives,
  };
}

/**
 * Calculate overlap between two spans
 */
function calculateOverlap(span1: DialogueSpan, span2: Annotation): number {
  const start = Math.max(span1.start, span2.start);
  const end = Math.min(span1.end, span2.end);
  return Math.max(0, end - start);
}

/**
 * Calculate speaker attribution accuracy
 *
 * For each correctly detected dialogue (TP), check if the speaker matches
 */
export function calculateSpeakerAccuracy(
  predicted: DialogueSpan[],
  actual: Annotation[]
): SpeakerMetrics {
  let correct = 0;
  let total = 0;
  const perSpeaker = new Map<string, SpeakerAccuracy>();

  // Match predictions to actual annotations
  for (const pred of predicted) {
    for (const act of actual) {
      const overlap = calculateOverlap(pred, act);
      const union = pred.end - pred.start + (act.end - act.start) - overlap;
      const iou = union > 0 ? overlap / union : 0;

      if (iou > 0.5) {
        // This is a true positive - check speaker
        total++;
        const actualSpeaker = act.who;
        const predictedSpeaker = pred.who || '';

        if (actualSpeaker === predictedSpeaker) {
          correct++;
        }

        // Track per-speaker accuracy
        if (!perSpeaker.has(actualSpeaker)) {
          perSpeaker.set(actualSpeaker, {
            correct: 0,
            total: 0,
            accuracy: 0,
          });
        }

        const speakerStats = perSpeaker.get(actualSpeaker)!;
        speakerStats.total++;

        if (actualSpeaker === predictedSpeaker) {
          speakerStats.correct++;
        }

        speakerStats.accuracy = speakerStats.correct / speakerStats.total;

        break;
      }
    }
  }

  const accuracy = total > 0 ? correct / total : 0;

  return {
    accuracy,
    correct,
    total,
    perSpeaker,
  };
}

/**
 * Find optimal confidence threshold for predictions
 *
 * Tests different confidence thresholds and returns the one that maximizes F1 score
 */
export function optimizeConfidenceThreshold(
  results: Array<{ confidence: number; isCorrect: boolean }>,
  step: number = 0.05
): { threshold: number; f1: number; precision: number; recall: number } {
  let bestThreshold = 0;
  let bestF1 = 0;
  let bestPrecision = 0;
  let bestRecall = 0;

  for (let threshold = 0; threshold <= 1; threshold += step) {
    const filtered = results.filter((r) => r.confidence >= threshold);

    if (filtered.length === 0) continue;

    const truePositives = filtered.filter((r) => r.isCorrect).length;
    const falsePositives = filtered.length - truePositives;

    // Calculate false negatives (items below threshold that are correct)
    const falseNegatives = results.filter((r) => r.confidence < threshold && r.isCorrect).length;

    const precision =
      truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;

    const recall =
      truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

    const f1 = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

    if (f1 > bestF1) {
      bestF1 = f1;
      bestThreshold = threshold;
      bestPrecision = precision;
      bestRecall = recall;
    }
  }

  return {
    threshold: bestThreshold,
    f1: bestF1,
    precision: bestPrecision,
    recall: bestRecall,
  };
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: Metrics): string {
  return `Precision: ${(metrics.precision * 100).toFixed(1)}%
Recall: ${(metrics.recall * 100).toFixed(1)}%
F1 Score: ${(metrics.f1 * 100).toFixed(1)}%
True Positives: ${metrics.truePositives}
False Positives: ${metrics.falsePositives}
False Negatives: ${metrics.falseNegatives}`;
}

/**
 * Format speaker metrics for display
 */
export function formatSpeakerMetrics(metrics: SpeakerMetrics): string {
  let output = `Overall Speaker Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%
Correct: ${metrics.correct} / ${metrics.total}

Per-Speaker Accuracy:
`;

  for (const [speaker, stats] of metrics.perSpeaker) {
    output += `  ${speaker}: ${(stats.accuracy * 100).toFixed(1)}% (${stats.correct}/${stats.total})\n`;
  }

  return output;
}

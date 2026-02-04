/**
 * Unit Tests for Accuracy Metrics
 *
 * Tests the accuracy metrics calculation functions
 */

import {
  calculateMetrics,
  calculateSpeakerAccuracy,
  optimizeConfidenceThreshold,
  formatMetrics,
  formatSpeakerMetrics,
  DialogueSpan,
  Annotation,
} from '@/lib/evaluation/AccuracyMetrics';

describe('AccuracyMetrics', () => {
  describe('calculateMetrics', () => {
    test('should calculate perfect precision, recall, and F1', () => {
      const predicted: DialogueSpan[] = [
        { start: 0, end: 10, text: 'Hello', confidence: 0.9 },
        { start: 20, end: 30, text: 'World', confidence: 0.8 },
      ];

      const actual: Annotation[] = [
        { start: 0, end: 10, text: 'Hello', who: '#speaker1' },
        { start: 20, end: 30, text: 'World', who: '#speaker2' },
      ];

      const metrics = calculateMetrics({ predicted, actual });

      expect(metrics.precision).toBe(1);
      expect(metrics.recall).toBe(1);
      expect(metrics.f1).toBe(1);
      expect(metrics.truePositives).toBe(2);
      expect(metrics.falsePositives).toBe(0);
      expect(metrics.falseNegatives).toBe(0);
    });

    test('should handle false positives', () => {
      const predicted: DialogueSpan[] = [
        { start: 0, end: 10, text: 'Hello', confidence: 0.9 },
        { start: 20, end: 30, text: 'Not dialogue', confidence: 0.5 },
      ];

      const actual: Annotation[] = [{ start: 0, end: 10, text: 'Hello', who: '#speaker1' }];

      const metrics = calculateMetrics({ predicted, actual });

      expect(metrics.truePositives).toBe(1);
      expect(metrics.falsePositives).toBe(1);
      expect(metrics.falseNegatives).toBe(0);
      expect(metrics.precision).toBe(0.5);
      expect(metrics.recall).toBe(1);
    });

    test('should handle false negatives', () => {
      const predicted: DialogueSpan[] = [{ start: 0, end: 10, text: 'Hello', confidence: 0.9 }];

      const actual: Annotation[] = [
        { start: 0, end: 10, text: 'Hello', who: '#speaker1' },
        { start: 20, end: 30, text: 'Missed', who: '#speaker2' },
      ];

      const metrics = calculateMetrics({ predicted, actual });

      expect(metrics.truePositives).toBe(1);
      expect(metrics.falsePositives).toBe(0);
      expect(metrics.falseNegatives).toBe(1);
      expect(metrics.precision).toBe(1);
      expect(metrics.recall).toBe(0.5);
    });

    test('should calculate IoU-based matching', () => {
      const predicted: DialogueSpan[] = [{ start: 0, end: 10, text: 'Hello', confidence: 0.9 }];

      const actual: Annotation[] = [{ start: 2, end: 12, text: 'Hello', who: '#speaker1' }];

      const metrics = calculateMetrics({ predicted, actual });

      // Overlap: 8 characters (2-10)
      // Union: 12 characters (0-12)
      // IoU: 8/12 = 0.667 > 0.5 threshold
      expect(metrics.truePositives).toBe(1);
      expect(metrics.f1).toBeGreaterThan(0);
    });

    test('should handle empty predictions', () => {
      const predicted: DialogueSpan[] = [];
      const actual: Annotation[] = [{ start: 0, end: 10, text: 'Hello', who: '#speaker1' }];

      const metrics = calculateMetrics({ predicted, actual });

      expect(metrics.truePositives).toBe(0);
      expect(metrics.falsePositives).toBe(0);
      expect(metrics.falseNegatives).toBe(1);
      expect(metrics.precision).toBe(0);
      expect(metrics.recall).toBe(0);
    });

    test('should handle empty actual', () => {
      const predicted: DialogueSpan[] = [{ start: 0, end: 10, text: 'Hello', confidence: 0.9 }];
      const actual: Annotation[] = [];

      const metrics = calculateMetrics({ predicted, actual });

      expect(metrics.truePositives).toBe(0);
      expect(metrics.falsePositives).toBe(1);
      expect(metrics.falseNegatives).toBe(0);
      expect(metrics.precision).toBe(0);
      expect(metrics.recall).toBe(0);
    });
  });

  describe('calculateSpeakerAccuracy', () => {
    test('should calculate perfect speaker accuracy', () => {
      const predicted: DialogueSpan[] = [
        { start: 0, end: 10, text: 'Hello', confidence: 0.9, who: '#speaker1' },
        { start: 20, end: 30, text: 'World', confidence: 0.8, who: '#speaker2' },
      ];

      const actual: Annotation[] = [
        { start: 0, end: 10, text: 'Hello', who: '#speaker1' },
        { start: 20, end: 30, text: 'World', who: '#speaker2' },
      ];

      const metrics = calculateSpeakerAccuracy(predicted, actual);

      expect(metrics.accuracy).toBe(1);
      expect(metrics.correct).toBe(2);
      expect(metrics.total).toBe(2);
    });

    test('should calculate speaker accuracy with errors', () => {
      const predicted: DialogueSpan[] = [
        { start: 0, end: 10, text: 'Hello', confidence: 0.9, who: '#speaker1' },
        { start: 20, end: 30, text: 'World', confidence: 0.8, who: '#wrong' },
      ];

      const actual: Annotation[] = [
        { start: 0, end: 10, text: 'Hello', who: '#speaker1' },
        { start: 20, end: 30, text: 'World', who: '#speaker2' },
      ];

      const metrics = calculateSpeakerAccuracy(predicted, actual);

      expect(metrics.accuracy).toBe(0.5);
      expect(metrics.correct).toBe(1);
      expect(metrics.total).toBe(2);
    });

    test('should track per-speaker accuracy', () => {
      const predicted: DialogueSpan[] = [
        { start: 0, end: 10, text: 'Hello', confidence: 0.9, who: '#speaker1' },
        { start: 20, end: 30, text: 'Hi', confidence: 0.8, who: '#speaker1' },
        { start: 40, end: 50, text: 'Hey', confidence: 0.7, who: '#speaker2' },
      ];

      const actual: Annotation[] = [
        { start: 0, end: 10, text: 'Hello', who: '#speaker1' },
        { start: 20, end: 30, text: 'Hi', who: '#speaker2' },
        { start: 40, end: 50, text: 'Hey', who: '#speaker2' },
      ];

      const metrics = calculateSpeakerAccuracy(predicted, actual);

      // 2 correct out of 3 total (first is correct, last is correct)
      expect(metrics.accuracy).toBe(2 / 3);
      expect(metrics.perSpeaker.get('#speaker1')?.accuracy).toBe(1);
      expect(metrics.perSpeaker.get('#speaker1')?.correct).toBe(1);
      expect(metrics.perSpeaker.get('#speaker1')?.total).toBe(1);
      expect(metrics.perSpeaker.get('#speaker2')?.accuracy).toBe(0.5);
      expect(metrics.perSpeaker.get('#speaker2')?.correct).toBe(1);
      expect(metrics.perSpeaker.get('#speaker2')?.total).toBe(2);
    });

    test('should handle missing speaker predictions', () => {
      const predicted: DialogueSpan[] = [
        { start: 0, end: 10, text: 'Hello', confidence: 0.9, who: '' },
      ];

      const actual: Annotation[] = [{ start: 0, end: 10, text: 'Hello', who: '#speaker1' }];

      const metrics = calculateSpeakerAccuracy(predicted, actual);

      expect(metrics.accuracy).toBe(0);
      expect(metrics.correct).toBe(0);
      expect(metrics.total).toBe(1);
    });
  });

  describe('optimizeConfidenceThreshold', () => {
    test('should find optimal threshold', () => {
      const results = [
        { confidence: 0.9, isCorrect: true },
        { confidence: 0.8, isCorrect: true },
        { confidence: 0.7, isCorrect: false },
        { confidence: 0.6, isCorrect: true },
        { confidence: 0.5, isCorrect: false },
        { confidence: 0.4, isCorrect: false },
        { confidence: 0.3, isCorrect: true },
      ];

      const optimal = optimizeConfidenceThreshold(results, 0.1);

      expect(optimal.threshold).toBeGreaterThanOrEqual(0);
      expect(optimal.threshold).toBeLessThanOrEqual(1);
      expect(optimal.f1).toBeGreaterThan(0);
      expect(optimal.precision).toBeGreaterThan(0);
      expect(optimal.recall).toBeGreaterThan(0);
    });

    test('should handle all correct predictions', () => {
      const results = [
        { confidence: 0.9, isCorrect: true },
        { confidence: 0.8, isCorrect: true },
        { confidence: 0.7, isCorrect: true },
      ];

      const optimal = optimizeConfidenceThreshold(results, 0.1);

      expect(optimal.f1).toBe(1);
      expect(optimal.precision).toBe(1);
      expect(optimal.recall).toBe(1);
    });

    test('should handle all incorrect predictions', () => {
      const results = [
        { confidence: 0.9, isCorrect: false },
        { confidence: 0.8, isCorrect: false },
        { confidence: 0.7, isCorrect: false },
      ];

      const optimal = optimizeConfidenceThreshold(results, 0.1);

      // With threshold at 1.0, no predictions pass
      expect(optimal.f1).toBe(0);
    });
  });

  describe('formatMetrics', () => {
    test('should format metrics correctly', () => {
      const metrics = {
        precision: 0.85,
        recall: 0.75,
        f1: 0.796,
        truePositives: 17,
        falsePositives: 3,
        falseNegatives: 6,
      };

      const formatted = formatMetrics(metrics);

      expect(formatted).toContain('85.0%');
      expect(formatted).toContain('75.0%');
      expect(formatted).toContain('79.6%');
      expect(formatted).toContain('17');
      expect(formatted).toContain('3');
      expect(formatted).toContain('6');
    });
  });

  describe('formatSpeakerMetrics', () => {
    test('should format speaker metrics correctly', () => {
      const perSpeaker = new Map([
        ['#speaker1', { correct: 8, total: 10, accuracy: 0.8 }],
        ['#speaker2', { correct: 5, total: 10, accuracy: 0.5 }],
      ]);

      const metrics = {
        accuracy: 0.65,
        correct: 13,
        total: 20,
        perSpeaker,
      };

      const formatted = formatSpeakerMetrics(metrics);

      expect(formatted).toContain('65.0%');
      expect(formatted).toContain('13 / 20');
      expect(formatted).toContain('#speaker1');
      expect(formatted).toContain('80.0%');
      expect(formatted).toContain('8/10');
      expect(formatted).toContain('#speaker2');
      expect(formatted).toContain('50.0%');
      expect(formatted).toContain('5/10');
    });
  });
});

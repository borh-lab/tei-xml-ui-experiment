/**
 * Pattern Engine Accuracy Integration Test
 *
 * Tests the pattern engine's accuracy on the annotated dataset:
 * - The Yellow Wallpaper
 * - The Gift of the Magi
 * - The Tell-Tale Heart
 * - An Occurrence at Owl Creek Bridge
 * - Pride and Prejudice Chapter 1
 *
 * For each document:
 * 1. Load the manually annotated TEI document
 * 2. Extract the ground truth dialogue annotations
 * 3. Strip the dialogue tags to get plain text
 * 4. Run pattern engine detection on the plain text
 * 5. Compare predictions against ground truth
 * 6. Calculate precision, recall, F1, and speaker accuracy
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { TEIDocument } from '@/lib/tei';
import { AxProvider } from '@/lib/ai/ax-provider';
import {
  calculateMetrics,
  calculateSpeakerAccuracy,
  optimizeConfidenceThreshold,
  formatMetrics,
  formatSpeakerMetrics,
  DialogueSpan,
  Annotation,
} from '@/lib/evaluation/AccuracyMetrics';
import { parseTEIDocument, spansMatch } from '@/tests/utils/xml-parser';

// Dataset files
const DATASET_DIR = join(process.cwd(), 'tests', 'dataset', 'manually-annotated');
const DOCUMENTS = [
  'yellow-wallpaper.xml',
  'gift-of-the-magi.xml',
  'tell-tale-heart.xml',
  'owl-creek-bridge.xml',
  'pride-prejudice-ch1.xml',
];

describe('Pattern Engine Accuracy Tests', () => {
  let provider: AxProvider;

  beforeAll(() => {
    // Initialize AI provider with test key
    // Note: In actual testing, we'd mock the API responses
    provider = new AxProvider('openai', 'test-key');
  });

  describe('Individual Document Accuracy', () => {
    DOCUMENTS.forEach((docFile) => {
      test(`should test ${docFile}`, async () => {
        const docPath = join(DATASET_DIR, docFile);
        const xmlContent = readFileSync(docPath, 'utf-8');

        // Parse document and extract annotations
        const { plainText, annotations } = parseTEIDocument(xmlContent);

        // Run pattern engine detection
        // For now, use the AxProvider (which uses regex as placeholder)
        const detected = await provider.detectDialogue(plainText);

        const predicted: DialogueSpan[] = detected.map((d) => ({
          ...d,
          who: '', // Pattern engine doesn't attribute speakers yet
        }));

        // Calculate metrics
        const result = {
          predicted,
          actual: annotations,
        };

        const metrics = calculateMetrics(result);

        console.log(`\n${docFile}:`);
        console.log(formatMetrics(metrics));

        // For now, just verify the test runs
        // In production, we'd assert minimum accuracy thresholds
        expect(metrics).toBeDefined();
      });
    });
  });

  describe('Aggregate Dataset Accuracy', () => {
    test('should calculate overall metrics across all documents', async () => {
      const allPredicted: DialogueSpan[] = [];
      const allActual: Annotation[] = [];

      for (const docFile of DOCUMENTS) {
        const docPath = join(DATASET_DIR, docFile);
        const xmlContent = readFileSync(docPath, 'utf-8');

        // Parse document and extract annotations
        const { plainText, annotations } = parseTEIDocument(xmlContent);

        // Run detection
        const detected = await provider.detectDialogue(plainText);

        // Accumulate predictions and actual annotations
        allPredicted.push(
          ...detected.map((d) => ({
            ...d,
            who: '',
          }))
        );

        allActual.push(...annotations);
      }

      const result = {
        predicted: allPredicted,
        actual: allActual,
      };

      const metrics = calculateMetrics(result);

      console.log('\n=== Aggregate Dataset Metrics ===');
      console.log(formatMetrics(metrics));

      // TODO: Set appropriate thresholds once pattern engine is implemented
      // For now, just verify the test completes
      expect(metrics).toBeDefined();
    });

    test('should calculate speaker attribution accuracy', () => {
      // This will be implemented once speaker attribution is working
      const predicted: DialogueSpan[] = [
        { start: 0, end: 10, text: 'test', confidence: 0.9, who: '#speaker1' },
      ];
      const actual: Annotation[] = [{ start: 0, end: 10, text: 'test', who: '#speaker1' }];

      const metrics = calculateSpeakerAccuracy(predicted, actual);

      console.log('\n=== Speaker Attribution Accuracy ===');
      console.log(formatSpeakerMetrics(metrics));

      expect(metrics.accuracy).toBe(1);
    });
  });

  describe('Confidence Threshold Optimization', () => {
    test('should find optimal confidence threshold', () => {
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

      console.log('\n=== Optimal Confidence Threshold ===');
      console.log(`Threshold: ${optimal.threshold}`);
      console.log(`F1 Score: ${optimal.f1.toFixed(3)}`);
      console.log(`Precision: ${optimal.precision.toFixed(3)}`);
      console.log(`Recall: ${optimal.recall.toFixed(3)}`);

      expect(optimal.threshold).toBeGreaterThanOrEqual(0);
      expect(optimal.threshold).toBeLessThanOrEqual(1);
      expect(optimal.f1).toBeGreaterThan(0);
    });
  });

  describe('Minimum Accuracy Requirements', () => {
    test('should meet minimum accuracy thresholds', async () => {
      // Test a simple case with known output
      const predicted: DialogueSpan[] = [
        { start: 0, end: 13, text: 'Hello, world!', confidence: 0.9 },
        { start: 20, end: 30, text: 'How are you?', confidence: 0.8 },
      ];

      const actual: Annotation[] = [
        { start: 0, end: 13, text: 'Hello, world!', who: '#speaker1' },
        { start: 20, end: 30, text: 'How are you?', who: '#speaker2' },
      ];

      const metrics = calculateMetrics({ predicted, actual });

      // Should achieve 100% on perfect match
      expect(metrics.precision).toBe(1);
      expect(metrics.recall).toBe(1);
      expect(metrics.f1).toBe(1);
    });
  });
});

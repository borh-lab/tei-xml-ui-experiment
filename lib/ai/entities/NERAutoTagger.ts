// @ts-nocheck
import { TEIDocument } from '@/lib/tei';
import { serializeDocument } from '@/lib/tei/operations';
import { EntityDetector } from './EntityDetector';
import { EntitySpan } from './types';

export interface ScanResult {
  persNames: EntitySpan[];
  places: EntitySpan[];
  dates: EntitySpan[];
}

export class NERAutoTagger {
  private detector: EntityDetector;
  private confidenceThreshold: number;

  constructor(confidenceThreshold: number = 0.7) {
    this.detector = new EntityDetector();
    this.confidenceThreshold = confidenceThreshold;
  }

  scan(document: TEIDocument): ScanResult {
    const text = serializeDocument(document);

    return {
      persNames: this.detector.detectPersonalNames(text),
      places: this.detector.detectPlaces(text),
      dates: [], // TODO: implement date detection
    };
  }

  getHighConfidenceEntities(result: ScanResult): EntitySpan[] {
    return [
      ...result.persNames.filter((e) => e.confidence >= this.confidenceThreshold),
      ...result.places.filter((e) => e.confidence >= this.confidenceThreshold),
      ...result.dates.filter((e) => e.confidence >= this.confidenceThreshold),
    ];
  }

  getMediumConfidenceEntities(result: ScanResult): EntitySpan[] {
    const threshold = this.confidenceThreshold - 0.2;
    return [
      ...result.persNames.filter(
        (e) => e.confidence >= threshold && e.confidence < this.confidenceThreshold
      ),
      ...result.places.filter(
        (e) => e.confidence >= threshold && e.confidence < this.confidenceThreshold
      ),
      ...result.dates.filter(
        (e) => e.confidence >= threshold && e.confidence < this.confidenceThreshold
      ),
    ];
  }

  autoApply(document: TEIDocument, _minConfidence: number = 0.9): void {
    const result = this.scan(document);
    const highConfidence = this.getHighConfidenceEntities(result);

    highConfidence.forEach((entity) => {
      // Skip dialogue entities - those are handled separately
      if (entity.type === 'dialogue') {
        return;
      }

      // Apply each high-confidence entity to the document
      // TODO: Implement NER tag application via tag operations
      console.warn(`NER tag application not yet implemented for immutable document model`);
      console.warn(`Entity: ${entity.type} at [${entity.start}-${entity.end}]`);
    });
  }
}

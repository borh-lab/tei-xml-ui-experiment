import { TEIDocument } from '@/lib/tei/TEIDocument';
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
    const text = document.serialize();

    return {
      persNames: this.detector.detectPersonalNames(text),
      places: this.detector.detectPlaces(text),
      dates: [] // TODO: implement date detection
    };
  }

  getHighConfidenceEntities(result: ScanResult): EntitySpan[] {
    return [
      ...result.persNames.filter(e => e.confidence >= this.confidenceThreshold),
      ...result.places.filter(e => e.confidence >= this.confidenceThreshold),
      ...result.dates.filter(e => e.confidence >= this.confidenceThreshold)
    ];
  }

  getMediumConfidenceEntities(result: ScanResult): EntitySpan[] {
    const threshold = this.confidenceThreshold - 0.2;
    return [
      ...result.persNames.filter(e => e.confidence >= threshold && e.confidence < this.confidenceThreshold),
      ...result.places.filter(e => e.confidence >= threshold && e.confidence < this.confidenceThreshold),
      ...result.dates.filter(e => e.confidence >= threshold && e.confidence < this.confidenceThreshold)
    ];
  }

  autoApply(document: TEIDocument, minConfidence: number = 0.9): void {
    const result = this.scan(document);
    const highConfidence = this.getHighConfidenceEntities(result);

    highConfidence.forEach(entity => {
      // Apply each high-confidence entity to the document
      document.addNERTag(
        { start: entity.start, end: entity.end },
        entity.type,
        undefined // TODO: match to character ID if persName
      );
    });
  }
}

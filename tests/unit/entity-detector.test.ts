import { EntityDetector } from '@/lib/ai/entities/EntityDetector';

describe('EntityDetector', () => {
  let detector: EntityDetector;

  beforeEach(() => {
    detector = new EntityDetector();
  });

  describe('detectPersonalNames', () => {
    test('detects names with titles', () => {
      const text = 'Mr. Darcy looked at Elizabeth';
      const result = detector.detectPersonalNames(text);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        text: 'Mr. Darcy',
        type: 'persName',
        confidence: expect.any(Number),
      });
      expect(result[1]).toMatchObject({
        text: 'Elizabeth',
        type: 'persName',
      });
    });

    test('detects multiple titles', () => {
      const text = 'Mrs. Bennet and Miss Bingley arrived';
      const result = detector.detectPersonalNames(text);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Mrs. Bennet');
      expect(result[1].text).toBe('Miss Bingley');
    });

    test('excludes common words at sentence start', () => {
      const text = 'The sun was bright';
      const result = detector.detectPersonalNames(text);

      expect(result).toHaveLength(0);
    });
  });

  describe('detectPlaces', () => {
    test('detects locations with prepositions', () => {
      const text = 'in London and at Hertfordshire';
      const result = detector.detectPlaces(text);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('London');
      expect(result[1].text).toBe('Hertfordshire');
    });
  });
});

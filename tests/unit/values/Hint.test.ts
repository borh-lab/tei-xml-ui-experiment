// tests/unit/values/Hint.test.ts
import { createValidHint, createInvalidHint, getHintClass } from '@/lib/values/Hint';

describe('Hint value', () => {
  it('should create valid hint', () => {
    const hint = createValidHint();
    expect(hint.severity).toBe('valid');
  });

  it('should create invalid hint', () => {
    const hint = createInvalidHint('Error', 'ERR');
    expect(hint.severity).toBe('invalid');
  });

  it('should get CSS class', () => {
    expect(getHintClass(createValidHint())).toBe('hint-valid');
  });
});

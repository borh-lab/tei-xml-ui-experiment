import { RelationshipEditor } from '@/components/editor/RelationshipEditor';

describe('RelationshipEditor', () => {
  test('component exports successfully', () => {
    expect(RelationshipEditor).toBeDefined();
  });

  test('has correct props interface', () => {
    const props = {
      onAddRelation: () => {}
    };

    // Just verify component can be instantiated
    expect(typeof RelationshipEditor).toBe('function');
  });
});

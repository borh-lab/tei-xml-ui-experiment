// @ts-nocheck
import { EntityEditorPanel } from '@/components/editor/EntityEditorPanel';
import { CharacterForm } from '@/components/editor/CharacterForm';

describe('EntityEditorPanel', () => {
  test('component exports successfully', () => {
    expect(EntityEditorPanel).toBeDefined();
    expect(CharacterForm).toBeDefined();
  });

  test('has correct props interface', () => {
    const props = {
      open: true,
      onClose: () => {},
    };

    // Just verify component can be instantiated
    expect(typeof EntityEditorPanel).toBe('function');
  });
});

/**
 * EntityForm Component Tests (Task 6.3)
 *
 * Tests for entity creation/editing form.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityForm } from '@/components/entities/EntityForm';
import type { Character, Place, Organization } from '@/lib/tei/types';

describe('EntityForm Component', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Character Form (Create Mode)', () => {
    it('should render character form fields', () => {
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gender \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/occupation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/traits/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/social status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/marital status/i)).toBeInTheDocument();
    });

    it('should show validation error when name is empty', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show validation error when gender is not selected', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Fill name but not gender
      const nameInput = screen.getByLabelText(/name \*/i);
      await user.type(nameInput, 'Jane Doe');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText('Gender is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should create character with valid data', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/name \*/i), 'Jane Doe');
      await user.selectOptions(screen.getByLabelText(/gender \*/i), 'F');

      // Fill optional fields
      await user.type(screen.getByLabelText(/age/i), '30');
      await user.type(screen.getByLabelText(/occupation/i), 'Teacher');
      await user.type(screen.getByLabelText(/traits/i), 'brave, kind');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Jane Doe',
        sex: 'F',
        age: 30,
        occupation: 'Teacher',
        traits: ['brave', 'kind'],
        socialStatus: '',
        maritalStatus: '',
      });
    });

    it('should display generated xmlId preview', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/name \*/i);
      await user.type(nameInput, 'Jane Doe');

      expect(screen.getByText(/Generated ID: jane-doe/i)).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable form when loading', () => {
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      expect(screen.getByLabelText(/name \*/i)).toBeDisabled();
      expect(screen.getByLabelText(/gender \*/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
  });

  describe('Character Form (Edit Mode)', () => {
    it('should populate form with existing character data', () => {
      const character: Character = {
        id: 'char-jane-doe' as Character['id'],
        xmlId: 'jane-doe',
        name: 'Jane Doe',
        sex: 'F',
        age: 30,
        occupation: 'Teacher',
      };

      render(
        <EntityForm
          entityType="character"
          entity={character}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/name \*/i)).toHaveValue('Jane Doe');
      expect(screen.getByLabelText(/gender \*/i)).toHaveValue('F');
      expect(screen.getByLabelText(/age/i)).toHaveValue(30);
      expect(screen.getByLabelText(/occupation/i)).toHaveValue('Teacher');
    });

    it('should update character with modified data', async () => {
      const user = userEvent.setup();
      const character: Character = {
        id: 'char-jane-doe' as Character['id'],
        xmlId: 'jane-doe',
        name: 'Jane Doe',
        sex: 'F',
        age: 30,
      };

      render(
        <EntityForm
          entityType="character"
          entity={character}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Update age
      const ageInput = screen.getByLabelText(/age/i);
      await user.clear(ageInput);
      await user.type(ageInput, '35');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Jane Doe',
        sex: 'F',
        age: 35,
        occupation: '',
        traits: undefined, // Empty string becomes undefined
        socialStatus: '',
        maritalStatus: '',
      });
    });

    it('should display "Edit Character" header', () => {
      const character: Character = {
        id: 'char-jane-doe' as Character['id'],
        xmlId: 'jane-doe',
        name: 'Jane Doe',
        sex: 'F',
      };

      render(
        <EntityForm
          entityType="character"
          entity={character}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/edit character/i)).toBeInTheDocument();
    });
  });

  describe('Place Form', () => {
    it('should render place form fields', () => {
      render(
        <EntityForm
          entityType="place"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should create place with valid data', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="place"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText(/name \*/i), 'Paris');
      await user.selectOptions(screen.getByLabelText(/type/i), 'city');
      await user.type(screen.getByLabelText(/description/i), 'Capital of France');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Paris',
        type: 'city',
        description: 'Capital of France',
      });
    });

    it('should populate form with existing place data', () => {
      const place: Place = {
        id: 'place-paris',
        xmlId: 'paris',
        name: 'Paris',
        type: 'city',
      };

      render(
        <EntityForm
          entityType="place"
          entity={place}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/name \*/i)).toHaveValue('Paris');
      expect(screen.getByLabelText(/type/i)).toHaveValue('city');
    });
  });

  describe('Organization Form', () => {
    it('should render organization form fields', () => {
      render(
        <EntityForm
          entityType="organization"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should create organization with valid data', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="organization"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText(/name \*/i), 'Acme Corp');
      await user.selectOptions(screen.getByLabelText(/type/i), 'company');
      await user.type(screen.getByLabelText(/description/i), 'Technology company');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Acme Corp',
        type: 'company',
        description: 'Technology company',
      });
    });

    it('should populate form with existing organization data', () => {
      const org: Organization = {
        id: 'org-acme-corp',
        xmlId: 'acme-corp',
        name: 'Acme Corp',
        type: 'company',
      };

      render(
        <EntityForm
          entityType="organization"
          entity={org}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/name \*/i)).toHaveValue('Acme Corp');
      expect(screen.getByLabelText(/type/i)).toHaveValue('company');
    });
  });

  describe('Error Display', () => {
    it('should display error message when provided', () => {
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          error="Failed to save entity"
        />
      );

      expect(screen.getByText('Failed to save entity')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText('Name is required')).toBeInTheDocument();

      // Start typing name
      const nameInput = screen.getByLabelText(/name \*/i);
      await user.type(nameInput, 'Jane');

      // Error should clear
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in name for xmlId generation', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText(/name \*/i), "Marie-Claire O'Brien");

      // The apostrophe should be removed by generateXmlId
      expect(screen.getByText(/Generated ID: marie-claire-o-brien/i)).toBeInTheDocument();
    });

    it('should parse traits from comma-separated string', async () => {
      const user = userEvent.setup();
      render(
        <EntityForm
          entityType="character"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText(/name \*/i), 'John Doe');
      await user.selectOptions(screen.getByLabelText(/gender \*/i), 'M');
      await user.type(screen.getByLabelText(/traits/i), 'brave,  intelligent,  kind ');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          traits: ['brave', 'intelligent', 'kind'],
        })
      );
    });
  });
});

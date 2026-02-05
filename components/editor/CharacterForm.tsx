// @ts-nocheck
'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Character } from '@/lib/tei/types';
import type { ValidationResult } from '@/lib/entities/EntityRepository';

interface CharacterFormProps {
  onSave: (character: Character) => void;
  onCancel: () => void;
  initialCharacter?: Partial<Character>;
  validation?: ValidationResult;
}

export function CharacterForm({
  onSave,
  onCancel,
  initialCharacter,
  validation,
}: CharacterFormProps) {
  const [name, setName] = useState(initialCharacter?.name || '');
  const [xmlId, setXmlId] = useState(initialCharacter?.xmlId || '');
  const [sex, setSex] = useState<Character['sex']>(initialCharacter?.sex || undefined);
  const [age, setAge] = useState<number | undefined>(initialCharacter?.age);
  const [occupation, setOccupation] = useState(initialCharacter?.occupation || '');
  const [traits, setTraits] = useState(initialCharacter?.traits?.join(', ') || '');
  const [socialStatus, setSocialStatus] = useState(initialCharacter?.socialStatus || '');
  const [maritalStatus, setMaritalStatus] = useState(initialCharacter?.maritalStatus || '');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const character: Character = {
        id: initialCharacter?.id || `char-${xmlId}`,
        xmlId,
        name,
        sex,
        age,
        occupation: occupation || undefined,
        traits: traits
          ? traits
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        socialStatus: socialStatus || undefined,
        maritalStatus: maritalStatus || undefined,
      };

      onSave(character);
    },
    [
      name,
      xmlId,
      sex,
      age,
      occupation,
      traits,
      socialStatus,
      maritalStatus,
      initialCharacter,
      onSave,
    ]
  );

  // Generate xml:id from name if not set
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!xmlId) {
        const generatedId = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        setXmlId(generatedId || '');
      }
    },
    [xmlId]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="char-name">Name *</Label>
        <Input
          id="char-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Character name"
          required
        />
      </div>

      {/* xml:id */}
      <div className="space-y-2">
        <Label htmlFor="char-xmlid">xml:id *</Label>
        <Input
          id="char-xmlid"
          value={xmlId}
          onChange={(e) => setXmlId(e.target.value)}
          placeholder="character-id"
          pattern="[a-zA-Z_][a-zA-Z0-9_-]*"
          required
          title="Must start with a letter or underscore, followed by letters, numbers, hyphens, or underscores"
        />
      </div>

      {/* Sex */}
      <div className="space-y-2">
        <Label htmlFor="char-sex">Sex</Label>
        <Select
          value={sex || 'none'}
          onValueChange={(value) =>
            setSex(value === 'none' ? undefined : (value as Character['sex']))
          }
        >
          <SelectTrigger id="char-sex">
            <SelectValue placeholder="Select sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unspecified</SelectItem>
            <SelectItem value="M">Male</SelectItem>
            <SelectItem value="F">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Age */}
      <div className="space-y-2">
        <Label htmlFor="char-age">Age</Label>
        <Input
          id="char-age"
          type="number"
          value={age || ''}
          onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          placeholder="Age"
          min="0"
        />
      </div>

      {/* Occupation */}
      <div className="space-y-2">
        <Label htmlFor="char-occupation">Occupation</Label>
        <Input
          id="char-occupation"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          placeholder="Occupation"
        />
      </div>

      {/* Traits */}
      <div className="space-y-2">
        <Label htmlFor="char-traits">Traits (comma-separated)</Label>
        <Input
          id="char-traits"
          value={traits}
          onChange={(e) => setTraits(e.target.value)}
          placeholder="brave, kind, ambitious"
        />
      </div>

      {/* Social Status */}
      <div className="space-y-2">
        <Label htmlFor="char-social">Social Status</Label>
        <Input
          id="char-social"
          value={socialStatus}
          onChange={(e) => setSocialStatus(e.target.value)}
          placeholder="Noble, merchant, peasant"
        />
      </div>

      {/* Marital Status */}
      <div className="space-y-2">
        <Label htmlFor="char-marital">Marital Status</Label>
        <Input
          id="char-marital"
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          placeholder="Single, married, widowed"
        />
      </div>

      {/* Validation Errors */}
      {validation && !validation.valid && (
        <div className="text-sm text-destructive">
          {validation.errors.map((error, i) => (
            <div key={i}>• {error}</div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Character</Button>
      </div>
    </form>
  );
}

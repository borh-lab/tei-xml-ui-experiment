'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Character, Relationship, RelationshipType } from '@/lib/tei/types';
import type { ValidationResult } from '@/lib/entities/EntityRepository';

interface RelationshipEditorProps {
  characters: readonly Character[];
  onAddRelation: (relation: Omit<Relationship, 'id'>) => void;
  validation?: ValidationResult;
}

export function RelationshipEditor({
  characters,
  onAddRelation,
  validation,
}: RelationshipEditorProps) {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [type, setType] = useState<RelationshipType | undefined>();
  const [subtype, setSubtype] = useState<string>('');
  const [mutual, setMutual] = useState<boolean>(true);

  // Filter out selected character from "to" options (no self-relationships)
  const toOptions = from ? characters.filter((c) => c.id !== from) : characters;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!from || !to || !type) {
        return;
      }

      const relation: Omit<Relationship, 'id'> = {
        from,
        to,
        type,
        subtype: subtype || undefined,
        mutual,
      };

      onAddRelation(relation);

      // Reset form
      setFrom('');
      setTo('');
      setType(undefined);
      setSubtype('');
      setMutual(true);
    },
    [from, to, type, subtype, mutual, onAddRelation]
  );

  const isValid = from && to && type && from !== to;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* From Character */}
      <div className="space-y-2">
        <Label htmlFor="rel-from">From *</Label>
        <Select value={from} onValueChange={setFrom}>
          <SelectTrigger id="rel-from">
            <SelectValue placeholder="Select character" />
          </SelectTrigger>
          <SelectContent>
            {characters.map((char) => (
              <SelectItem key={char.id} value={char.id}>
                {char.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* To Character */}
      <div className="space-y-2">
        <Label htmlFor="rel-to">To *</Label>
        <Select value={to} onValueChange={setTo} disabled={!from}>
          <SelectTrigger id="rel-to">
            <SelectValue placeholder="Select character" />
          </SelectTrigger>
          <SelectContent>
            {toOptions.map((char) => (
              <SelectItem key={char.id} value={char.id}>
                {char.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Relationship Type */}
      <div className="space-y-2">
        <Label htmlFor="rel-type">Relationship Type *</Label>
        <Select
          value={type || 'none'}
          onValueChange={(value) =>
            setType(value === 'none' ? undefined : (value as RelationshipType))
          }
        >
          <SelectTrigger id="rel-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select type...</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="romantic">Romantic</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="antagonistic">Antagonistic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subtype (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="rel-subtype">Subtype (optional)</Label>
        <Input
          id="rel-subtype"
          value={subtype}
          onChange={(e) => setSubtype(e.target.value)}
          placeholder="e.g., courtship, sibling, spouse"
        />
      </div>

      {/* Mutual Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="rel-mutual"
          checked={mutual}
          onCheckedChange={(checked) => setMutual(checked === true)}
        />
        <Label htmlFor="rel-mutual" className="cursor-pointer">
          Mutual (creates reciprocal relationship)
        </Label>
      </div>

      {/* Validation Errors */}
      {validation && !validation.valid && (
        <div className="text-sm text-destructive">
          {validation.errors.map((error, i) => (
            <div key={i}>• {error}</div>
          ))}
        </div>
      )}

      {/* Add Button */}
      <Button type="submit" size="sm" disabled={!isValid}>
        Add Relationship
      </Button>
    </form>
  );
}

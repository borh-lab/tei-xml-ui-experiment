'use client';

import React, { useState } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RelationshipEditorProps {
  onAddRelation: (relation: any) => void;
}

export function RelationshipEditor({ onAddRelation }: RelationshipEditorProps) {
  const { document } = useDocumentContext();
  const characters = document?.getCharacters() || [];

  const [formData, setFormData] = useState({
    from: '',
    to: '',
    type: '',
    subtype: '',
    mutual: true
  });

  const characterOptions = characters.map((c: any) => ({
    value: c['xml:id'],
    label: c.persName
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const relation = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...formData
    };

    onAddRelation(relation);

    // Reset form
    setFormData({
      from: '',
      to: '',
      type: '',
      subtype: '',
      mutual: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="rel-from">From</Label>
        <Select value={formData.from} onValueChange={(value) => setFormData({ ...formData, from: value })}>
          <SelectTrigger id="rel-from">
            <SelectValue placeholder="Select character" />
          </SelectTrigger>
          <SelectContent>
            {characterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="rel-to">To</Label>
        <Select value={formData.to} onValueChange={(value) => setFormData({ ...formData, to: value })}>
          <SelectTrigger id="rel-to">
            <SelectValue placeholder="Select character" />
          </SelectTrigger>
          <SelectContent>
            {characterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="rel-type">Relationship Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger id="rel-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="romantic">Romantic</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="antagonistic">Antagonistic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="rel-subtype">Subtype (optional)</Label>
        <Input
          id="rel-subtype"
          value={formData.subtype}
          onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
          placeholder="e.g., courtship, sibling, spouse"
        />
      </div>

      <Button type="submit" size="sm">Add Relationship</Button>
    </form>
  );
}

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CharacterFormProps {
  onSave: (character: any) => void;
  onCancel: () => void;
}

export function CharacterForm({ onSave, onCancel }: CharacterFormProps) {
  const [formData, setFormData] = useState({
    'xml:id': '',
    persName: '',
    sex: '',
    age: '',
    occupation: '',
    role: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const character: any = {
      'xml:id': formData['xml:id'],
      persName: formData.persName
    };

    if (formData.sex) character.sex = formData.sex;
    if (formData.age) character.age = parseInt(formData.age);
    if (formData.occupation) character.occupation = formData.occupation;
    if (formData.role) character.role = formData.role;

    onSave(character);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div>
        <Label htmlFor="xml:id">ID</Label>
        <Input
          id="xml:id"
          value={formData['xml:id']}
          onChange={(e) => setFormData({ ...formData, 'xml:id': e.target.value })}
          placeholder="darcy"
          required
        />
      </div>

      <div>
        <Label htmlFor="persName">Name</Label>
        <Input
          id="persName"
          value={formData.persName}
          onChange={(e) => setFormData({ ...formData, persName: e.target.value })}
          placeholder="Mr. Darcy"
          required
        />
      </div>

      <div>
        <Label htmlFor="sex">Sex</Label>
        <Input
          id="sex"
          value={formData.sex}
          onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
          placeholder="M or F"
        />
      </div>

      <div>
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          placeholder="28"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm">Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

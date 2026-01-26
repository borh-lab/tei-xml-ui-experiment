'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface Sample {
  id: string;
  title: string;
  author: string;
  year: number;
  wordCount: number;
  dialogueCount: number;
  characters: number;
  patterns: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const samples: Sample[] = [
  {
    id: 'yellow-wallpaper',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    year: 1892,
    wordCount: 6000,
    dialogueCount: 15,
    characters: 3,
    patterns: ['first-person', 'indirect-speech', 'internal-monologue'],
    difficulty: 'intermediate'
  },
  {
    id: 'gift-of-the-magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    year: 1905,
    wordCount: 3000,
    dialogueCount: 12,
    characters: 4,
    patterns: ['third-person', 'direct-speech', 'dialogue-heavy'],
    difficulty: 'intermediate'
  },
  {
    id: 'tell-tale-heart',
    title: 'The Tell-Tale Heart',
    author: 'Edgar Allan Poe',
    year: 1843,
    wordCount: 2000,
    dialogueCount: 8,
    characters: 3,
    patterns: ['first-person', 'unreliable-narrator', 'internal-monologue'],
    difficulty: 'advanced'
  },
  {
    id: 'owl-creek-bridge',
    title: 'An Occurrence at Owl Creek Bridge',
    author: 'Ambrose Bierce',
    year: 1890,
    wordCount: 3000,
    dialogueCount: 10,
    characters: 5,
    patterns: ['third-person', 'direct-speech', 'narrative-shift'],
    difficulty: 'intermediate'
  },
  {
    id: 'pride-prejudice-ch1',
    title: 'Pride and Prejudice - Chapter 1',
    author: 'Jane Austen',
    year: 1813,
    wordCount: 5000,
    dialogueCount: 20,
    characters: 3,
    patterns: ['third-person', 'direct-speech', 'dialogue-heavy', 'wit'],
    difficulty: 'intermediate'
  }
];

function getDifficultyColor(difficulty: Sample['difficulty']): string {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'advanced':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
  }
}

interface SampleGalleryProps {
  onSelect: (sampleId: string) => void;
}

export function SampleGallery({ onSelect }: SampleGalleryProps) {
  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to TEI Dialogue Editor</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Explore dialogue annotation with our curated sample collection. Each document includes
          pre-annotated dialogue passages with speaker attributions, perfect for learning and
          experimentation.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">Beginner</Badge>
            <span>Simple dialogue patterns</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800">Intermediate</Badge>
            <span>Mixed narrative styles</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-100 text-red-800">Advanced</Badge>
            <span>Complex attribution</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {samples.map((sample) => (
          <Card key={sample.id} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xl line-clamp-2">{sample.title}</CardTitle>
                <Badge className={getDifficultyColor(sample.difficulty)} variant="secondary">
                  {sample.difficulty}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {sample.author} • {sample.year}
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-3 mb-4 flex-1">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">{sample.dialogueCount}</span>{' '}
                    <span className="text-muted-foreground">dialogue passages</span>
                  </div>
                  <div>
                    <span className="font-medium">{sample.characters}</span>{' '}
                    <span className="text-muted-foreground">characters</span>
                  </div>
                  <div>
                    <span className="font-medium">{sample.wordCount.toLocaleString()}</span>{' '}
                    <span className="text-muted-foreground">words</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {sample.patterns.map((pattern) => (
                    <Badge
                      key={pattern}
                      variant="outline"
                      className="text-xs"
                    >
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => onSelect(sample.id)}
                className="w-full"
              >
                Load Sample
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Want to use your own documents?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You can upload your own TEI XML files or start with a blank document.
          Use the file upload button in the editor toolbar.
        </p>
      </div>
    </div>
  );
}

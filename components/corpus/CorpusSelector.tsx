'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CORPORA = [
  {
    id: 'wright-american-fiction',
    name: 'Wright American Fiction',
    description: '3,000+ novels from 1851-1875',
    icon: '📚',
  },
  {
    id: 'victorian-women-writers',
    name: 'Victorian Women Writers',
    description: 'Literary works by Victorian-era women authors',
    icon: '✍️',
  },
  {
    id: 'indiana-magazine-history',
    name: 'Indiana Magazine of History',
    description: 'Scholarly articles on Indiana history',
    icon: '🏛️',
  },
  {
    id: 'indiana-authors-books',
    name: 'Indiana Authors Books',
    description: 'Works by notable Indiana authors',
    icon: '📖',
  },
  {
    id: 'brevier-legislative',
    name: 'Brevier Legislative',
    description: 'Legislative documents and records',
    icon: '⚖️',
  },
  {
    id: 'tei-texts',
    name: 'TEI Texts',
    description: 'Collection of TEI-encoded texts',
    icon: '📄',
  },
  {
    id: 'novel-dialogism',
    name: 'Novel Dialogism',
    description: 'Novels with rich quotation and dialogue annotations',
    icon: '💬',
  },
];

interface CorpusSelectorProps {
  onSelectCorpus: (corpusId: string) => void;
}

export function CorpusSelector({ onSelectCorpus }: CorpusSelectorProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Browse TEI Corpora</h1>
        <p className="text-muted-foreground">
          Select a corpus to explore its collection of TEI-encoded documents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CORPORA.map((corpus) => (
          <Card
            key={corpus.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => onSelectCorpus(corpus.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{corpus.name}</CardTitle>
                  <CardDescription className="text-sm">{corpus.description}</CardDescription>
                </div>
                <div className="text-4xl">{corpus.icon}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary font-medium">
                <span>Browse Collection</span>
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">About These Corpora</h3>
        <p className="text-sm text-muted-foreground mb-4">
          These collections contain TEI-encoded XML documents with varying levels of markup, from
          minimal metadata to rich dialogue annotations. Select a corpus to view its documents and
          explore their encoding patterns.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Total Documents</div>
            <div className="text-muted-foreground">10,800+</div>
          </div>
          <div>
            <div className="font-medium">Total Corpora</div>
            <div className="text-muted-foreground">7</div>
          </div>
          <div>
            <div className="font-medium">TEI Versions</div>
            <div className="text-muted-foreground">P4, P5</div>
          </div>
          <div>
            <div className="font-medium">Formats</div>
            <div className="text-muted-foreground">XML</div>
          </div>
        </div>
      </div>
    </div>
  );
}

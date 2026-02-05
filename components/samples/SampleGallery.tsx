// @ts-nocheck
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CorpusBrowser } from '@/components/samples/CorpusBrowser';
import { SAMPLES, getSamplesByDifficulty, type Sample } from '@/lib/samples/SampleManager';

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
  onLoadSample?: (sampleId: string) => Promise<void>;
}

export function SampleGallery({ onSelect, onLoadSample }: SampleGalleryProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<
    'all' | 'beginner' | 'intermediate' | 'advanced'
  >('all');

  // Filter samples by difficulty
  const filteredSamples = useMemo(() => {
    if (difficultyFilter === 'all') return SAMPLES;
    return getSamplesByDifficulty(difficultyFilter);
  }, [difficultyFilter]);

  const handleLoadSample = async (sampleId: string) => {
    setError(null);
    setLoading(true);

    try {
      if (onLoadSample) {
        await onLoadSample(sampleId);
      }
      // Call the onSelect callback
      onSelect(sampleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample');
      console.error('Failed to load sample:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleLoadNovel = (title: string) => {
    // Automatically hide gallery when a novel is loaded from corpus
    onSelect(title);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      {error && (
        <div className="mb-4 bg-destructive text-destructive-foreground p-4 rounded">
          <p className="font-semibold">Failed to load sample</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-bold mb-4">Welcome to TEI Dialogue Editor</h1>
        <p className="text-base md:text-lg text-muted-foreground mb-6">
          Explore dialogue annotation with our curated sample collection or browse the Wright
          American Fiction corpus. Each document includes pre-annotated dialogue passages with
          speaker attributions, perfect for learning and experimentation.
        </p>
        <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 text-xs">Beginner</Badge>
            <span className="hidden sm:inline">Simple dialogue patterns</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Intermediate</Badge>
            <span className="hidden sm:inline">Mixed narrative styles</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-100 text-red-800 text-xs">Advanced</Badge>
            <span className="hidden sm:inline">Complex attribution</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="samples" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 mx-auto md:mx-0">
          <TabsTrigger value="samples" className="text-sm">
            Sample Gallery
          </TabsTrigger>
          <TabsTrigger value="corpus" className="text-sm">
            Browse Corpus
          </TabsTrigger>
        </TabsList>

        <TabsContent value="samples" className="space-y-6">
          {/* Difficulty filter */}
          <div className="flex gap-2 justify-center">
            <Badge
              variant={difficultyFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setDifficultyFilter('all')}
            >
              All ({SAMPLES.length})
            </Badge>
            <Badge
              variant={difficultyFilter === 'beginner' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setDifficultyFilter('beginner')}
            >
              Beginner ({getSamplesByDifficulty('beginner').length})
            </Badge>
            <Badge
              variant={difficultyFilter === 'intermediate' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setDifficultyFilter('intermediate')}
            >
              Intermediate ({getSamplesByDifficulty('intermediate').length})
            </Badge>
            <Badge
              variant={difficultyFilter === 'advanced' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setDifficultyFilter('advanced')}
            >
              Advanced ({getSamplesByDifficulty('advanced').length})
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSamples.map((sample) => (
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
                  {sample.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {sample.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-3 mb-4 flex-1">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">{sample.dialogueCount}</span>{' '}
                        <span className="text-muted-foreground">dialogue passages</span>
                      </div>
                      <div>
                        <span className="font-medium">{sample.wordCount.toLocaleString()}</span>{' '}
                        <span className="text-muted-foreground">words</span>
                      </div>
                      <div>
                        <span className="font-medium">{sample.characters}</span>{' '}
                        <span className="text-muted-foreground">characters</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {sample.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleLoadSample(sample.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Loading...' : 'Load Sample'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Want to use your own documents?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You can upload your own TEI XML files or start with a blank document. Use the file
              upload button in the editor toolbar.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="corpus" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <CorpusBrowser onLoadNovel={handleLoadNovel} />
            <div className="mt-6 p-6 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">About the Wright American Fiction Corpus</h3>
              <p className="text-sm text-muted-foreground mb-2">
                A comprehensive collection of 3,000+ novels published in the United States between
                1851 and 1875. This corpus provides a rich resource for exploring 19th-century
                American literature and dialogue patterns.
              </p>
              <p className="text-xs text-muted-foreground">
                Source: Wright American Fiction, hosted on GitHub by iulibdcs
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

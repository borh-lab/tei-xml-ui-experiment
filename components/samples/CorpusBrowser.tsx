'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDocumentService } from '@/lib/effect';
import { TEIDocument } from '@/lib/tei';

interface Novel {
  title: string;
  author: string;
  path: string;
}

interface CorpusBrowserProps {
  onLoadNovel?: (title: string) => void;
}

export function CorpusBrowser({ onLoadNovel }: CorpusBrowserProps) {
  const { loadDocument } = useDocumentService();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNovels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        'https://api.github.com/repos/iulibdcs/Wright-American-Fiction/contents/'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const files = await response.json();

      const novels: Novel[] = files
        .filter((f: any) => f.name?.endsWith('.xml'))
        .map((f: any) => ({
          title: f.name.replace('.xml', ''),
          author: 'Various',
          path: f.download_url,
        }))
        .slice(0, 20); // Limit to 20 for now

      setNovels(novels);
    } catch (err) {
      console.error('Failed to fetch corpus:', err);
      setError('Failed to load corpus. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch from Wright American Fiction GitHub API
    fetchNovels();
  }, []);

  const filtered = novels.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()));

  const loadNovel = async (path: string, title: string) => {
    setError(null);
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const teiContent = await response.text();

      // Validate XML before loading
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(teiContent, 'text/xml');

      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Failed to parse XML file. The file may be corrupted or invalid.');
      }

      // Load the document using the XML string
      loadDocument(teiContent);
      onLoadNovel?.(title);
    } catch (err) {
      console.error('Failed to load novel:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load novel. Please try again.';
      setError(`${errorMessage} Please check your internet connection and try again.`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Browse Wright American Fiction Corpus</CardTitle>
        <p className="text-sm text-muted-foreground">Access 3,000+ novels from 1851-1875</p>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search novels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        {error ? (
          <div className="text-destructive p-4 border border-destructive rounded">
            <p className="mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchNovels}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading corpus...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No novels found matching "{search}"
              </p>
            ) : (
              filtered.map((novel) => (
                <div
                  key={novel.path}
                  className="flex justify-between items-center p-3 border rounded hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{novel.title}</p>
                    <p className="text-sm text-muted-foreground">{novel.author}</p>
                  </div>
                  <Button size="sm" onClick={() => loadNovel(novel.path, novel.title)}>
                    Load
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

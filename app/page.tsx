'use client';

import { useEffect } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { FileUpload } from '@/components/editor/FileUpload';
import { SampleGallery } from '@/components/samples/SampleGallery';

function HomeContent() {
  const { document, loadSample } = useDocumentService();

  // Expose app state for E2E tests
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const state = {
      location: document ? 'editor' : 'gallery',
      document: document ? {
        loaded: true,
        title: document.title || 'Untitled',
        passageCount: document.state?.passages?.length || 0,
      } : null,
      viewMode: 'wysiwyg', // Default view mode
      panels: {
        validation: false,
        bulk: false,
        entities: false,
        viz: false,
      },
    };

    (window as any).__TEI_EDITOR_STATE__ = state;
  }, [document]);

  // Show welcome screen with sample gallery when no document is loaded
  if (!document) {
    return <SampleGallery onLoadSample={loadSample} onSelect={() => {}} />;
  }

  // Show editor when document is loaded
  return (
    <>
      <FileUpload />
      <EditorLayout />
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <HomeContent />
    </main>
  );
}

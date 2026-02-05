'use client';

import { useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { FileUpload } from '@/components/editor/FileUpload';
import { SampleGallery } from '@/components/samples/SampleGallery';

function HomeContent() {
  const documentService = useDocumentContext();
  const { document } = documentService;

  // Expose app state for E2E tests
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const state = {
      location: document ? 'editor' : 'gallery',
      document: document ? {
        loaded: true,
        title: document.state?.metadata?.title || 'Untitled',
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

    console.log('[app/page] Exposing state:', state);
    (window as any).__TEI_EDITOR_STATE__ = state;
  }, [document]);

  // Show welcome screen with sample gallery when no document is loaded
  if (!document) {
    return <SampleGallery onLoadSample={documentService.loadSample} onSelect={() => {}} />;
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

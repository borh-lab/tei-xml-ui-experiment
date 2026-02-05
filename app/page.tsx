// @ts-nocheck
'use client';

import { useDocumentService } from '@/lib/effect';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { FileUpload } from '@/components/editor/FileUpload';
import { SampleGallery } from '@/components/samples/SampleGallery';

function HomeContent() {
  const { document, loadSample } = useDocumentService();

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

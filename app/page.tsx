'use client';

import { DocumentProvider } from '@/lib/context/DocumentContext';
import { EditorLayout } from '@/components/editor/EditorLayout';

export default function Home() {
  return (
    <DocumentProvider>
      <main className="min-h-screen">
        <EditorLayout />
      </main>
    </DocumentProvider>
  );
}

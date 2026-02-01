'use client';

import { DocumentProvider } from '@/lib/context/DocumentContext';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { FileUpload } from '@/components/editor/FileUpload';

export default function Home() {
  return (
    <DocumentProvider>
      <main className="min-h-screen">
        <FileUpload />
        <EditorLayout />
      </main>
    </DocumentProvider>
  );
}

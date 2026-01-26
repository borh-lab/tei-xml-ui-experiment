'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentContext } from '@/lib/context/DocumentContext';

export function FileUpload() {
  const { loadDocument } = useDocumentContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    loadDocument(text);
  };

  return (
    <div className="p-4 border-b">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button onClick={() => fileInputRef.current?.click()}>
        Upload TEI File
      </Button>
    </div>
  );
}

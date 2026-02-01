'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { toast } from '@/components/ui/use-toast';
import { categorizeError } from '@/lib/utils/error-categorization';

export function FileUpload() {
  const { loadDocument } = useDocumentContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      loadDocument(text);
      toast.success('Document uploaded successfully');
    } catch (error) {
      const errorInfo = categorizeError(error as Error);
      toast.error(errorInfo.message, {
        description: errorInfo.description,
        action: errorInfo.action,
      });
    }
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

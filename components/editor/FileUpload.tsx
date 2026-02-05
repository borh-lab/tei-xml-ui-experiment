// @ts-nocheck
'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { useErrorContext } from '@/lib/context/ErrorContext';
import { toast } from '@/components/ui/use-toast';
import { categorizeError } from '@/lib/utils/error-categorization';

export function FileUpload() {
  const { loadDocument } = useDocumentContext();
  const { logError } = useErrorContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File size checks
    const fileSizeKB = file.size / 1024;
    const fileSizeMB = file.size / (1024 * 1024);

    // Reject files larger than 5MB
    if (fileSizeMB > 5) {
      const errorMsg = `File size (${fileSizeMB.toFixed(2)}MB) exceeds 5MB limit. Please upload a smaller file.`;
      logError(new Error(errorMsg), 'FileUpload', {
        action: 'upload',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });
      toast.error(errorMsg);
      // Reset the input so the same file can be selected again if needed
      event.target.value = '';
      return;
    }

    // Show warning for files larger than 100KB
    if (fileSizeKB > 100) {
      toast.warning(
        `Large file detected (${fileSizeKB.toFixed(2)}KB). Processing may take longer.`,
        {
          description: 'Consider splitting large files for better performance.',
        }
      );
    }

    try {
      const text = await file.text();
      loadDocument(text);
      toast.success('Document uploaded successfully');
    } catch (error) {
      logError(error as Error, 'FileUpload', {
        action: 'upload',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });
      const errorInfo = categorizeError(error as Error, () => handleFileUpload(event));
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
      <Button onClick={() => fileInputRef.current?.click()}>Upload TEI File</Button>
    </div>
  );
}

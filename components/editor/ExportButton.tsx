'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { exportToHTML, downloadFile } from '@/lib/tei/export';
import { serializeDocument } from '@/lib/tei/operations';

export function ExportButton() {
  const { document } = useDocumentContext();

  const handleExportHTML = () => {
    if (!document) return;
    const html = exportToHTML(document);
    downloadFile(html, 'document.html', 'text/html');
  };

  const handleExportTEI = () => {
    if (!document) return;
    const xml = serializeDocument(document);
    downloadFile(xml, 'document.xml', 'application/xml');
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleExportHTML} disabled={!document}>
        Export HTML
      </Button>
      <Button onClick={handleExportTEI} disabled={!document}>
        Export TEI
      </Button>
    </div>
  );
}

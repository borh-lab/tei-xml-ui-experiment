// @ts-nocheck
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { exportToHTML, downloadFile } from '@/lib/tei/export';
import { serializeDocument } from '@/lib/tei/operations';

/**
 * ExportButton - Effect-based version
 *
 * Uses useDocumentService hook instead of React Context.
 */
export function EffectExportButton() {
  const { document } = useDocumentService();

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

/**
 * ExportButton with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on useEffectExport feature flag.
 */
export default function ExportButton() {
  // Effect version is now the default and only implementation
  return <EffectExportButton />;
}

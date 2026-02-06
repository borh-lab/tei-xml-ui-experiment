'use client';


import { Button } from '@/components/ui/button';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';
import { exportToHTML, downloadFile } from '@/lib/tei/export';
import { serializeDocument } from '@/lib/tei/operations';

interface ExportButtonProps {
  initialState?: DocumentState;
}

/**
 * ExportButton
 *
 * Uses V2 state protocol.
 */
export function ExportButton({ initialState }: ExportButtonProps) {
  const { state } = useDocumentV2(initialState);

  const handleExportHTML = () => {
    if (!state.document) return;
    const html = exportToHTML(state.document);
    downloadFile(html, 'document.html', 'text/html');
  };

  const handleExportTEI = () => {
    if (!state.document) return;
    const xml = serializeDocument(state.document);
    downloadFile(xml, 'document.xml', 'application/xml');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button onClick={handleExportHTML} disabled={!state.document}>
          Export HTML
        </Button>
        <Button onClick={handleExportTEI} disabled={!state.document}>
          Export TEI
        </Button>
      </div>
    </div>
  );
}

export default ExportButton;

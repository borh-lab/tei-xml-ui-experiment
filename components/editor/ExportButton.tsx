// @ts-nocheck
'use client';


import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { exportToHTML, downloadFile } from '@/lib/tei/export';
import { serializeDocument } from '@/lib/tei/operations';
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';

/**
 * ExportButton
 *
 * Uses Effect-based useDocumentService hook.
 */
export function ExportButton() {
  const { document } = useDocumentService();
  const useEffectEditor = isFeatureEnabled('useEffectEditor');

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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {useEffectEditor ? 'Effect-Based' : 'React-Based'}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleExportHTML} disabled={!document}>
          Export HTML
        </Button>
        <Button onClick={handleExportTEI} disabled={!document}>
          Export TEI
        </Button>
      </div>
    </div>
  );
}

export default ExportButton;

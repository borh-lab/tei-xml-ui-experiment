// @ts-nocheck
'use client';

import { useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'cmdk';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { downloadFile } from '@/lib/tei/export';
import { serializeDocument } from '@/lib/tei/operations';
import { getSamples } from '@/lib/samples/sampleLoader';
import {
  FileDown,
  FileText,
  FolderOpen,
  Trash2,
  Eye,
  Layers,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onToggleBulkMode?: () => void;
  onToggleVisualizations?: () => void;
  isBulkMode?: boolean;
  isVizPanelOpen?: boolean;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  type: ToastType;
  message: string;
  duration: number;
}

export function CommandPalette({
  open,
  onClose,
  onToggleBulkMode,
  onToggleVisualizations,
  isBulkMode = false,
  isVizPanelOpen = false,
}: CommandPaletteProps) {
  const { document, loadDocument: _loadDocument, loadSample, clearDocument } = useDocumentService();
  const [toast, setToast] = useState<Toast | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (type: ToastType, message: string, duration = 3000) => {
    setToast({ type, message, duration });
    setTimeout(() => setToast(null), duration);
  };

  const handleSaveDocument = () => {
    if (!document) {
      showToast('error', 'No document to save. Please load a document first.');
      onClose();
      return;
    }

    try {
      const xml = serializeDocument(document);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadFile(xml, `tei-document-${timestamp}.xml`, 'application/xml');
      showToast('success', 'Document saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving document:', error);
      showToast('error', 'Failed to save document. Please try again.');
      onClose();
    }
  };

  const handleExportTEI = () => {
    if (!document) {
      showToast('error', 'No document to export. Please load a document first.');
      onClose();
      return;
    }

    try {
      const xml = serializeDocument(document);
      downloadFile(xml, 'document.xml', 'application/xml');
      showToast('success', 'TEI XML exported successfully!');
      onClose();
    } catch (error) {
      console.error('Error exporting TEI:', error);
      showToast('error', 'Failed to export TEI. Please try again.');
      onClose();
    }
  };

  const handleExportHTML = () => {
    if (!document) {
      showToast('error', 'No document to export. Please load a document first.');
      onClose();
      return;
    }

    try {
      const xml = serializeDocument(document);

      // Simplified HTML conversion
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>TEI Document</title>
  <style>
    body { font-family: serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    said { background: #f0f0f0; padding: 0.25rem 0.5rem; }
  </style>
</head>
<body>
  ${xml.replace(/<said[^>]*>/g, '<said>').replace(/<\/said>/g, '</said>')}
</body>
</html>`;

      downloadFile(html, 'document.html', 'text/html');
      showToast('success', 'HTML exported successfully!');
      onClose();
    } catch (error) {
      console.error('Error exporting HTML:', error);
      showToast('error', 'Failed to export HTML. Please try again.');
      onClose();
    }
  };

  const handleLoadSample = async (sampleId: string) => {
    setIsLoading(true);
    try {
      await loadSample(sampleId);
      showToast('success', `Loaded sample: ${sampleId.replace(/-/g, ' ')}`);
      onClose();
    } catch (error) {
      console.error('Error loading sample:', error);
      showToast('error', `Failed to load sample: ${sampleId}`);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearDocument = () => {
    if (!document) {
      showToast('info', 'No document to clear.');
      onClose();
      return;
    }

    clearDocument();
    showToast('success', 'Document cleared successfully.');
    onClose();
  };

  const handleToggleBulkMode = () => {
    if (!document) {
      showToast('error', 'Please load a document first.');
      onClose();
      return;
    }

    onToggleBulkMode?.();
    showToast('success', isBulkMode ? 'Bulk mode disabled' : 'Bulk mode enabled');
    onClose();
  };

  const handleToggleVisualizations = () => {
    if (!document) {
      showToast('error', 'Please load a document first.');
      onClose();
      return;
    }

    onToggleVisualizations?.();
    showToast('success', isVizPanelOpen ? 'Visualizations hidden' : 'Visualizations shown');
    onClose();
  };

  const samples = getSamples();

  return (
    <>
      <CommandDialog open={open} onOpenChange={onClose}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Document Actions */}
          <CommandGroup heading="Document Actions">
            <CommandItem onSelect={handleSaveDocument} disabled={!document || isLoading}>
              <FileDown className="mr-2 h-4 w-4" />
              <span>Save document</span>
              {!document && <span className="ml-auto text-xs text-muted-foreground">(No doc)</span>}
              <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">⌘S</kbd>
            </CommandItem>
            <CommandItem onSelect={handleExportTEI} disabled={!document || isLoading}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Export TEI XML</span>
              {!document && <span className="ml-auto text-xs text-muted-foreground">(No doc)</span>}
            </CommandItem>
            <CommandItem onSelect={handleExportHTML} disabled={!document || isLoading}>
              <FileDown className="mr-2 h-4 w-4" />
              <span>Export HTML</span>
              {!document && <span className="ml-auto text-xs text-muted-foreground">(No doc)</span>}
            </CommandItem>
            <CommandItem onSelect={handleClearDocument} disabled={!document || isLoading}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Clear document</span>
              {!document && <span className="ml-auto text-xs text-muted-foreground">(No doc)</span>}
            </CommandItem>
          </CommandGroup>

          {/* View Options */}
          <CommandGroup heading="View Options">
            <CommandItem onSelect={handleToggleBulkMode} disabled={!document || isLoading}>
              <Layers className="mr-2 h-4 w-4" />
              <span>Toggle bulk mode</span>
              {!document && <span className="ml-auto text-xs text-muted-foreground">(No doc)</span>}
              {isBulkMode && (
                <span className="ml-auto text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                  Active
                </span>
              )}
              <kbd className="ml-2 text-xs bg-muted px-2 py-1 rounded">⌘B</kbd>
            </CommandItem>
            <CommandItem onSelect={handleToggleVisualizations} disabled={!document || isLoading}>
              <Eye className="mr-2 h-4 w-4" />
              <span>Toggle visualizations</span>
              {!document && <span className="ml-auto text-xs text-muted-foreground">(No doc)</span>}
              {isVizPanelOpen && (
                <span className="ml-auto text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                  Visible
                </span>
              )}
            </CommandItem>
          </CommandGroup>

          {/* Sample Documents */}
          <CommandGroup heading="Load Sample">
            {samples.map((sample) => (
              <CommandItem
                key={sample.id}
                onSelect={() => handleLoadSample(sample.id)}
                disabled={isLoading}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{sample.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {sample.author} · {sample.year} · {sample.difficulty}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                : toast.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {toast.type === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
            {toast.type === 'info' && <AlertCircle className="h-4 w-4 text-blue-600" />}
            <span
              className={`text-sm font-medium ${
                toast.type === 'success'
                  ? 'text-green-900 dark:text-green-100'
                  : toast.type === 'error'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-blue-900 dark:text-blue-100'
              }`}
            >
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

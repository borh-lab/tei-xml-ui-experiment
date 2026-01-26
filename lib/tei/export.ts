import { TEIDocument } from './TEIDocument';

export function exportToHTML(document: TEIDocument): string {
  const xml = document.serialize();

  // Simplified HTML conversion
  // In production, use TEI stylesheets
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

  return html;
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// @ts-nocheck
// lib/utils/sanitizer.ts
import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['mark', 'strong', 'em', 'u', 's'],
    ALLOWED_ATTR: [],
  });
}

// @ts-nocheck
/**
 * Markdown Helper
 *
 * Generate consistent HTML <video> tags for embedding in markdown.
 */

import { pathFor } from './demo-config.js';

export type DemoType = 'highlight' | 'workflow';

export interface VideoOptions {
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
  muted?: boolean;
  width?: number;
}

/**
 * Generate HTML <video> tag for embedding in markdown.
 * Options control autoplay, loop, controls.
 *
 * @param name - Demo name
 * @param type - Demo type (highlight or workflow)
 * @param options - Video tag options (optional)
 * @returns HTML string with <video> tag
 */
export function videoTag(
  name: string,
  type: DemoType,
  options: VideoOptions = {}
): string {
  // Default options based on demo type
  const defaults: VideoOptions =
    type === 'highlight'
      ? { autoplay: true, loop: true, controls: false, muted: true, width: 800 }
      : { autoplay: false, loop: false, controls: true, muted: false, width: 800 };

  const opts = { ...defaults, ...options };
  const path = pathFor(name, { type });

  // Build attributes
  const attributes: string[] = [];
  if (opts.width) attributes.push(`width="${opts.width}"`);
  if (opts.autoplay) attributes.push('autoplay');
  if (opts.loop) attributes.push('loop');
  if (opts.controls) attributes.push('controls');
  if (opts.muted) attributes.push('muted');
  attributes.push('playsinline');

  // Generate HTML tag
  return `<video ${attributes.join(' ')}>\n  <source src="/${path}" type="video/webm">\n</video>`;
}

/**
 * Generate markdown section for a demo with title and description.
 *
 * @param title - Demo title
 * @param name - Demo name
 * @param type - Demo type
 * @param description - Demo description
 * @returns Markdown section string
 */
export function demoSection(
  title: string,
  name: string,
  type: DemoType,
  description: string
): string {
  return `### ${title}

${videoTag(name, type)}

${description}
`;
}

/**
 * Generate all demo sections for the demos page.
 *
 * @returns Complete markdown for demos page
 */
export function generateDemosPage(): string {
  const { demos } = import('./demo-config.js');

  let markdown = `# Feature Demos

This page showcases all the documentation videos demonstrating key features of the TEI Dialogue Editor.

## Quick Highlights

Short videos showing UI elements in motion.

`;

  // Add highlights
  const highlights = ['ai-suggestions', 'command-palette', 'bulk-operations', 'keyboard-shortcuts', 'character-network'];
  const highlightDescriptions: Record<string, string> = {
    'ai-suggestions':
      'The AI suggestions panel analyzes dialogue passages and suggests speaker tags. Click accept or reject to speed up annotation.',
    'command-palette':
      'Press `Cmd+K` (or `Ctrl+K`) to quickly access any command. Search and navigate to features without leaving the keyboard.',
    'bulk-operations':
      'Press `Cmd+B` to open bulk operations. Select all untagged passages, export TEI, or validate document structure.',
    'keyboard-shortcuts':
      'Press `?` to view all keyboard shortcuts. Navigate passages, tag speakers, and access commands without touching the mouse.',
    'character-network':
      'View character relationships and dialogue statistics in the visualizations panel. Explore network graphs and interaction patterns.'
  };

  for (const name of highlights) {
    const desc = highlightDescriptions[name];
    markdown += demoSection(
      name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      name,
      'highlight',
      desc
    );
    markdown += '\n';
  }

  markdown += `## Full Workflows

Complete step-by-step demonstrations of key features.

`;

  // Add workflows
  const workflows = ['annotation-workflow', 'ai-assisted-session', 'bulk-operations-workflow'];
  const workflowDescriptions: Record<string, string> = {
    'annotation-workflow':
      `Complete walkthrough of manual annotation:
1. Open the editor with auto-loaded document
2. Click on a passage to select it
3. Press \`1-5\` to tag with a speaker
4. Use \`j/k\` to navigate between passages
5. Export TEI document when complete`,
    'ai-assisted-session':
      `Using AI suggestions to speed up annotation:
1. Enable "AI Suggest" mode
2. Review suggested tags with confidence scores
3. Accept or reject with one click
4. System learns from your corrections
5. Export final TEI document`,
    'bulk-operations-workflow':
      `Process multiple passages at once:
1. Open bulk operations with \`Cmd+B\`
2. Select all untagged passages (\`Shift+Cmd+U\`)
3. Tag all selections with chosen speaker
4. Export or validate the complete document`
  };

  for (const name of workflows) {
    const desc = workflowDescriptions[name];
    markdown += demoSection(
      name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      name,
      'workflow',
      desc
    );
    markdown += '\n';
  }

  return markdown;
}

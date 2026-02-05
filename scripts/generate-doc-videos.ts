// @ts-nocheck
/**
 * Documentation Video Generator - CLI Entry Point
 *
 * Main CLI for generating documentation videos.
 * Delegates to recording module and watch orchestrator.
 */

import { recordAll, recordMatching, listDemos } from './record-demo.js';
import { watchDocs } from './watch-docs.js';

/**
 * Print usage information.
 */
function printUsage(): void {
  console.log(`
Usage: bun run docs:videos [demo-name] [--watch] [--help]

Generate documentation videos as WebM files.

Arguments:
  demo-name        Optional: Generate specific demo only
                   If omitted, generates all demos

Options:
  --watch, -w      Watch mode: regenerate videos on source changes
  --help, -h       Show this help message

Examples:
  bun run docs:videos              Generate all videos
  bun run docs:videos ai-suggestions  Generate one demo
  bun run docs:videos --watch      Watch mode

Available demos:
  ${listDemos().join('\n  ')}
`);
}

/**
 * Parse CLI arguments.
 */
function parseArgs(args: string[]): {
  filter: string | null;
  watch: boolean;
  help: boolean;
} {
  let filter: string | null = null;
  let watch = false;
  let help = false;

  for (const arg of args) {
    if (arg === '--watch' || arg === '-w') {
      watch = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (!arg.startsWith('--')) {
      filter = arg;
    }
  }

  return { filter, watch, help };
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { filter, watch, help } = parseArgs(args);

  if (help) {
    printUsage();
    return;
  }

  // Watch mode: delegate to watch orchestrator
  if (watch) {
    console.log('🎬 Starting video generation watch mode...');
    console.log('Press Ctrl+C to stop\n');
    await watchDocs();
    return;
  }

  // Recording mode: generate videos
  const startTime = Date.now();
  console.log('🎬 Generating documentation videos...\n');

  const recordings = filter
    ? await recordMatching(filter)
    : await recordAll();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Generated ${recordings.length} video(s) in ${elapsed}s`);
  if (recordings.length > 0) {
    console.log('\nOutput files:');
    recordings.forEach(path => console.log(`  ${path}`));
  }

  // Report file sizes
  if (recordings.length > 0) {
    console.log('\nFile sizes:');
    const { stat } = await import('node:fs/promises');
    for (const path of recordings) {
      try {
        const stats = await stat(path);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`  ${path}: ${sizeMB} MB`);
      } catch {
        // File might not exist yet, skip
      }
    }
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

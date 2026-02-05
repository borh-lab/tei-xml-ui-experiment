// @ts-nocheck
/**
 * Watch Mode with Auto-Optimization
 *
 * Watches for changes in test files or app source,
 * runs doc video tests, and optimizes output.
 */

import { watch, type FSWatcher } from 'chokidar';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

let watcher: FSWatcher | null = null;
let timeout: NodeJS.Timeout | null = null;
let runCount = 0;

async function runTestsAndOptimize(): Promise<void> {
  runCount++;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 Running doc video generation #${runCount}...`);
  console.log(`${'='.repeat(60)}\n`);

  // Run tests
  exec('bun run test:e2e --project=doc-videos', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Tests failed:', error.message);
      return;
    }

    console.log(stdout);

    // Optimize videos
    console.log('\n📦 Optimizing and copying videos...');
    exec('bun run docs:videos:optimize', (optError, optStdout) => {
      if (optError) {
        console.warn('⚠️  Optimization failed:', optError.message);
        return;
      }

      console.log(optStdout);
      console.log('\n✅ Done! Videos ready in docs/videos/\n');
      console.log(`Watching for changes... (Press Ctrl+C to stop)\n`);
    });
  });
}

export async function watchWithOptimize(): Promise<void> {
  if (watcher) {
    console.log('Already watching');
    return;
  }

  console.log('👀 Watching for changes...');
  console.log('   Will regenerate and optimize videos on changes\n');
  console.log('   Watching: tests/e2e/doc-videos.spec.ts');
  console.log('            src/**/*.tsx, src/**/*.ts\n');

  // Run initial generation
  await runTestsAndOptimize();

  // Watch for changes
  watcher = watch([
    join(cwd(), 'tests/e2e/doc-videos.spec.ts'),
    join(cwd(), 'src/**/*.tsx'),
    join(cwd(), 'src/**/*.ts'),
    join(cwd(), 'app/**/*.tsx'),
    join(cwd(), 'app/**/*.ts'),
    join(cwd(), 'components/**/*.tsx')
  ], {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('change', (path) => {
    console.log(`\n📝 Changed: ${path}`);

    // Debounce: wait for file to stop changing
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      runTestsAndOptimize();
    }, 1000); // 1s debounce
  });

  watcher.on('error', error => {
    console.error('Watcher error:', error);
  });

  // Keep process alive
  await new Promise(() => {});
}

export async function stopWatching(): Promise<void> {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }

  if (watcher) {
    await watcher.close();
    watcher = null;
  }

  console.log('\n👋 Stopped watching');
}

export function setupSignalHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n⚠️  Received ${signal}, stopping...`);
    await stopWatching();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Setup signal handlers when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSignalHandlers();
  watchWithOptimize().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

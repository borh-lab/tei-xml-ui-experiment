// @ts-nocheck
/**
 * Watch Orchestrator
 *
 * Separate orchestration concern - no recording logic.
 * Watches source files and regenerates videos on change.
 * Automatically copies and optimizes videos to docs/videos/.
 */

import { watch, type FSWatcher } from 'chokidar';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

let watcher: FSWatcher | null = null;
let timeout: NodeJS.Timeout | null = null;
let regenerateCount = 0;

/**
 * Regenerate videos and optimize them
 */
async function regenerateVideos(): Promise<void> {
  regenerateCount++;
  console.log(`\n🔄 Regenerating videos (#${regenerateCount})...`);

  exec('bun run docs:videos', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Regeneration failed:', error.message);
      if (stderr) console.error(stderr);
      return;
    }

    console.log(stdout);

    // After successful generation, run optimization
    console.log('📦 Optimizing and copying videos...');
    exec('bun run docs:videos:optimize', (optError, optStdout, optStderr) => {
      if (optError) {
        console.warn('⚠️  Optimization failed:', optError.message);
        return;
      }

      console.log(optStdout);
      console.log('✅ Regeneration and optimization complete\n');
    });
  });
}

/**
 * Watch source files and regenerate videos on change.
 * Orchestration only - no recording logic here.
 *
 * @returns Promise that never resolves (keeps process alive)
 */
export async function watchDocs(): Promise<void> {
  if (watcher) {
    console.log('Already watching');
    return;
  }

  console.log('📁 Watching for changes in src/**/*.tsx');
  console.log('   Videos will regenerate 1s after changes stop\n');

  watcher = watch(join(cwd(), 'src/**/*.tsx'), {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('change', (path) => {
    console.log(`📝 Changed: ${path}`);

    // Debounce: wait for file to stop changing
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      regenerateVideos();
    }, 1000); // 1s debounce
  });

  watcher.on('error', error => {
    console.error('Watcher error:', error);
  });

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Clean shutdown (call from process signal handlers).
 */
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

/**
 * Setup signal handlers for graceful shutdown.
 */
export function setupSignalHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n⚠️  Received ${signal}, stopping...`);
    await stopWatching();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

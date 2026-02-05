// @ts-nocheck
/**
 * Generate One UI Video
 *
 * Simple standalone script to capture the UI in action.
 * No complex tests, just record and save.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

async function generateVideo() {
  console.log('🎬 Generating one UI video...\n');

  // Clean cache to avoid Turbopack errors
  console.log('0️⃣  Cleaning build cache...');
  const { rm } = await import('node:fs/promises');
  await rm('.next', { recursive: true, force: true });
  console.log('   ✅ Cache cleaned\n');

  // Start dev server in background
  console.log('1️⃣  Starting dev server on port 3003...');
  const server = spawn('bun', ['run', 'dev'], {
    env: { ...process.env, PORT: '3003' },
    stdio: 'pipe'
  });

  // Log server output for debugging
  server.stderr.on('data', (data) => {
    console.error('Server stderr:', data.toString());
  });
  server.stdout.on('data', (data) => {
    console.log('Server stdout:', data.toString());
  });

  // Wait for server to be ready
  console.log('   Waiting for server...');
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const response = await fetch('http://localhost:3003/');
      if (response.ok) {
        console.log('   ✅ Server is ready!\n');
        break;
      }
    } catch {
      if (i === 19) throw new Error('Server failed to start');
    }
  }

  // Launch browser
  console.log('2️⃣  Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: 'test-results',
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  console.log('3️⃣  Navigating to app...');
  await page.goto('http://localhost:3003/');
  await page.waitForLoadState('domcontentloaded');
  console.log('   ✅ Page loaded\n');

  console.log('4️⃣  Recording UI interactions (10 seconds)...');
  await page.waitForTimeout(2000);

  // Show navigation
  await page.keyboard.press('j');
  await page.waitForTimeout(1000);
  await page.keyboard.press('k');
  await page.waitForTimeout(1000);

  // Open command palette
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');

  // Wait a bit more to show UI
  await page.waitForTimeout(3000);

  console.log('   ✅ Recording complete\n');

  // Close and save
  await context.close();
  await browser.close();

  // Kill dev server
  server.kill('SIGTERM');

  // Get the video
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir('test-results');
  const videoFile = entries.find(e => e.endsWith('.webm'));

  if (videoFile) {
    const videoPath = join('test-results', videoFile);
    const outputDir = 'docs/videos/highlights';
    const outputPath = join(outputDir, 'ui-demo.webm');

    await mkdir(outputDir, { recursive: true });

    // Copy video
    const { copyFile } = await import('node:fs/promises');
    await copyFile(videoPath, outputPath);

    // Get file size
    const { stat } = await import('node:fs/promises');
    const stats = await stat(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`5️⃣  Video saved!`);
    console.log(`   Path: ${outputPath}`);
    console.log(`   Size: ${sizeMB} MB\n`);

    // Generate thumbnail
    console.log('6️⃣  Generating thumbnail...');
    const thumbnailPath = outputPath.replace('.webm', '.png');
    const ffmpeg = spawn('ffmpeg', [
      '-i', outputPath,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-y',
      thumbnailPath
    ], { stdio: 'pipe' });

    await new Promise<void>((resolve) => {
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.warn('   ⚠️  Thumbnail generation failed (non-critical)');
        } else {
          console.log('   ✅ Done!\n');
        }
        resolve();
      });
    });

    console.log('🎉 Done! Video ready at docs/videos/highlights/ui-demo.webm');
  } else {
    console.error('❌ No video generated');
  }
}

generateVideo().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

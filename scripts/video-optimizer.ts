// @ts-nocheck
/**
 * Video Optimizer
 *
 * Explicit type-based presets for WebM optimization.
 * No hidden motion detection - predictable and debuggable.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type DemoType = 'highlight' | 'workflow';

/**
 * Explicit presets based on demo type.
 * No "smart" adaptation - predictable and debuggable.
 */
const presets = {
  highlight: {
    codec: 'libvpx-vp9',
    bitrate: '500K',
    fps: 15,
    crf: 32,
    'cpu-used': 4, // Faster encoding
    args: ['-c:v', 'libvpx-vp9', '-b:v', '500K', '-r', '15', '-crf', '32', '-cpu-used', '4']
  },
  workflow: {
    codec: 'libvpx-vp9',
    bitrate: '1M',
    fps: 24,
    crf: 28,
    'cpu-used': 2, // Better quality
    args: ['-c:v', 'libvpx-vp9', '-b:v', '1M', '-r', '24', '-crf', '28', '-cpu-used', '2']
  }
} as const;

/**
 * Optimize a WebM video using ffmpeg with type-based preset.
 *
 * @param input - Input video file path (raw Playwright recording)
 * @param output - Output video file path (optimized WebM)
 * @param type - Demo type (highlight or workflow)
 * @throws Error if ffmpeg fails
 */
export async function optimizeVideo(
  input: string,
  output: string,
  type: DemoType
): Promise<void> {
  const preset = presets[type];

  // Build ffmpeg command with explicit arguments
  const args = [
    '-i', input,
    ...preset.args,
    '-y', // Overwrite output
    output
  ];

  const cmd = `ffmpeg ${args.join(' ')}`;

  try {
    const { stderr } = await execAsync(cmd);

    // ffmpeg writes progress to stderr, check for errors
    if (stderr && stderr.includes('Error')) {
      throw new Error(`FFmpeg error: ${stderr}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Video optimization failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * (Optional) Measure motion in a video.
 * Returns a motion score - you decide what to do with it.
 *
 * This is explicit measurement, not hidden adaptation.
 * Use it if you need adaptive bitrate in the future.
 *
 * @param videoPath - Path to video file
 * @returns Motion score (number of scene changes detected)
 */
export async function measureMotion(videoPath: string): Promise<number> {
  try {
    // Use ffmpeg to detect scene changes
    const { stdout } = await execAsync(
      `ffmpeg -i ${videoPath} -filter:v "select='gt(scene,0.1)'" -f null - 2>&1 | grep -c "pts_time:" || echo 0`
    );

    const frameCount = parseInt(stdout.trim(), 10);
    return frameCount;
  } catch {
    // If motion detection fails, return default
    return 0;
  }
}

/**
 * Select preset based on explicit motion measurement.
 * Decision is visible in code, not hidden in optimizer.
 *
 * @param motion - Motion score from measureMotion()
 * @returns Preset type (highlight or workflow)
 */
export function selectPresetForMotion(motion: number): DemoType {
  // Explicit threshold - visible in code
  return motion > 50 ? 'workflow' : 'highlight';
}

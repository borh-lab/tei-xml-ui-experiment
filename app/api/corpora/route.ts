/**
 * API route for listing all corpora
 * GET /api/corpora
 */

import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const CORPORA_ROOT = join(process.cwd(), 'corpora');

export async function GET() {
  try {
    const entries = await readdir(CORPORA_ROOT, { withFileTypes: true });
    const corpora = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const corpusPath = join(CORPORA_ROOT, entry.name);
        const statResult = await stat(corpusPath);
        corpora.push({
          id: entry.name,
          name: entry.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          path: corpusPath,
          documentCount: 0, // TODO: Count actual documents
          lastModified: statResult.mtime,
        });
      }
    }

    return NextResponse.json(corpora);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list corpora', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

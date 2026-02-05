/**
 * API route for listing documents in a corpus
 * GET /api/corpora/[corpusId]
 */

import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

const CORPORA_ROOT = join(process.cwd(), 'corpora');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ corpusId: string }> }
) {
  try {
    const { corpusId } = await params;
    const corpusPath = join(CORPORA_ROOT, corpusId);

    // List XML files in the corpus directory
    const entries = await readdir(corpusPath);
    const documents = entries
      .filter(entry => entry.endsWith('.xml'))
      .map(filename => filename.replace('.xml', ''));

    return NextResponse.json({
      corpusId,
      documents,
      total: documents.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list documents', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

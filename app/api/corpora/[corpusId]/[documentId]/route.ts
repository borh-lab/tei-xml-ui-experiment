/**
 * API route for loading a specific document
 * GET /api/corpora/[corpusId]/[documentId]
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const CORPORA_ROOT = join(process.cwd(), 'corpora');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ corpusId: string; documentId: string }> }
) {
  try {
    const { corpusId, documentId } = await params;
    const filePath = join(CORPORA_ROOT, corpusId, `${documentId}.xml`);

    const xmlContent = await readFile(filePath, 'utf-8');

    // Return the raw XML content
    return new NextResponse(xmlContent, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load document', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

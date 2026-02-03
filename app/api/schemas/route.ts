import { NextResponse } from 'next/server';
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

const resolver = createDefaultResolver();

export async function GET() {
  try {
    const schemas = resolver.list();

    return NextResponse.json({
      schemas: schemas.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        tags: s.tags
      }))
    });
  } catch (error) {
    console.error('Schema list API error:', error);
    return NextResponse.json(
      { error: 'Failed to list schemas' },
      { status: 500 }
    );
  }
}

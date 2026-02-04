/**
 * API route for validating TEI documents
 *
 * POST /api/validate
 * Body: { xml: string; schemaId?: string }
 * Returns: ValidationResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidationService } from '@/lib/validation/ValidationService';
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

const resolver = createDefaultResolver();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xml, schemaId } = body;

    if (!xml) {
      return NextResponse.json({ error: 'Missing XML content' }, { status: 400 });
    }

    // Default to tei-minimal for fast validation
    const effectiveSchemaId = schemaId || 'tei-minimal';

    // Constraint: Validate schema ID
    if (!resolver.has(effectiveSchemaId)) {
      const availableSchemas = resolver.list();
      return NextResponse.json(
        {
          error: `Unknown schema: ${effectiveSchemaId}`,
          availableSchemas: availableSchemas.map((s) => s.id),
        },
        { status: 400 }
      );
    }

    // Resolve schema path
    const schemaPath = resolver.resolve(effectiveSchemaId);
    if (!schemaPath) {
      return NextResponse.json(
        { error: `Schema path not found for: ${effectiveSchemaId}` },
        { status: 404 }
      );
    }

    // Validate
    const validationService = new ValidationService({
      defaultSchemaPath: schemaPath,
      enableSuggestions: true,
      maxErrors: 100,
    });

    const result = await validationService.validateDocument(xml, schemaPath);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      {
        valid: false,
        errors: [
          {
            message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
          },
        ],
        warnings: [],
      },
      { status: 500 }
    );
  }
}

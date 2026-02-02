/**
 * API route for validating TEI documents
 *
 * POST /api/validate
 * Body: { xml: string; schemaPath?: string }
 * Returns: ValidationResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidationService } from '@/lib/validation/ValidationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xml, schemaPath } = body;

    if (!xml) {
      return NextResponse.json(
        { error: 'Missing XML content' },
        { status: 400 }
      );
    }

    // Use default TEI schema if not provided
    const effectiveSchemaPath = schemaPath || '/schemas/tei-all.rng';

    // Create validation service instance
    const validationService = new ValidationService({
      defaultSchemaPath: effectiveSchemaPath,
      enableSuggestions: true,
      maxErrors: 100,
    });

    // Validate the document
    const result = await validationService.validateDocument(xml, effectiveSchemaPath);

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

export function detectSchemaPath(): string {
  // For now, default to tei-novel schema
  // TODO: Implement proper schema detection when teiHeader is added to DocumentState
  return '/public/schemas/tei-novel.rng';
}

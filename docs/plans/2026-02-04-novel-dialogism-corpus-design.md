# Novel-Dialogism Corpus Integration Design

**Date:** 2026-02-04
**Status:** Approved
**Goal:** Convert the novel-dialogism corpus (text + CSV files) to TEI/XML format for integration with the corpus browser and use as training data for the AI dialogue classifier.

## Overview

The novel-dialogism corpus provides rich annotation data for novels including:
- Quotations with speaker/addressee attribution
- Quote types (implicit, anaphoric, explicit)
- Character entities with aliases, gender, and category
- Mention spans and entity references

This design converts the corpus to TEI/XML format with full annotation preservation, enabling seamless integration with the existing corpus browser and providing high-quality training data for the AI classifier.

## Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Annotation level** | Full conversion | Preserves all novel-dialogism fields for AI training |
| **Character encoding** | Standard TEI `<particDesc>` + custom `@category` | TEI compatibility + AI-specific data |
| **Span handling** | Hybrid: `@span` for quotes, `<anchor>` for mentions | Quote-level context + mention-level precision |
| **Corpus structure** | Flat: `corpora/novel-dialogism/{novel-id}.xml` | Simple, handled by existing split pipeline |
| **Build integration** | Standalone utility + automatic detection | Development flexibility + build convenience |
| **TEI mapping** | Custom attributes (`@novel-dialogism:*`) | Standard TEI + original field preservation |

## Architecture

```
novel-dialogism/ (git submodule, not in git)
  └── data/
      ├── novel-1/
      │   ├── text.txt
      │   ├── quotations.csv
      │   └── character_info.csv
      └── novel-2/
          └── ...

scripts/
  └── convert-novel-dialogism.ts  (standalone converter)

corpora/
  └── novel-dialogism/  (generated, .gitignore'd)
      ├── novel-1.xml
      ├── novel-2.xml
      └── ...

tests/
  └── corpora/
      └── metadata/
          └── novel-dialogism.json  (corpus metadata)
```

## TEI Document Structure

### TEI Header

```xml
<teiHeader>
  <fileDesc>
    <titleStmt>
      <title>{Novel Title}</title>
      <author>{Author}</author>
    </titleStmt>
    <sourceDesc>
      <p>Converted from novel-dialogism corpus</p>
      <p>Original source: {novel-id}</p>
    </sourceDesc>
  </fileDesc>

  <particDesc>
    <listPerson>
      <person xml:id="char-1" novel-dialogism:category="major" sex="F">
        <persName>Main Character Name</persName>
        <alias>Alias 1</alias>
        <alias>Alias 2</alias>
      </person>
    </listPerson>
  </particDesc>

  <encodingDesc>
    <p>Annotations converted from quotations.csv and character_info.csv</p>
  </encodingDesc>
</teiHeader>
```

### Character Encoding

| Source Field | TEI Mapping |
|--------------|-------------|
| Character ID | `xml:id` attribute |
| Main Name | `<persName>` element content |
| Aliases | Multiple `<alias>` elements |
| Gender | `sex` attribute (M/F/U/X) |
| Category | `novel-dialogism:category` attribute (major/intermediate/minor) |

### Quotation Encoding

```xml
<quote novel-dialogism:id="q-1"
       novel-dialogism:type="explicit"
       novel-dialogism:referringExpression="he said"
       who="#char-5"
       spanStart="1234"
       spanEnd="1290">
  <anchor xml:id="q-1-start" span="0"/>
  <s said="said">
    <rs xml:id="m-1" ref="#char-3" span="10-20">She</rs>
    <anchor xml:id="m-1-start"/>
    walked into the room.
    <anchor xml:id="m-1-end" span="30"/>
  </s>
  <anchor xml:id="q-1-end" span="156"/>
</quote>
```

### Field Mappings

| Source Field | TEI Mapping |
|--------------|-------------|
| quoteId | `novel-dialogism:id` attribute |
| quoteText | Element content (with nested annotations) |
| speaker | `@who` attribute (references character xml:id) |
| addressees | `@addr` attribute (space-separated character IDs) |
| quoteType | `novel-dialogism:type` attribute |
| referringExpression | `novel-dialogism:referringExpression` attribute |
| quoteByteSpans | `@spanStart`, `@spanEnd` attributes |
| mentionTextList | `<rs>` element content |
| mentionSpansList | `<anchor>` elements with span offsets |
| mentionEntitiesList | `@ref` attribute on `<rs>` (references character xml:id) |

## Conversion Script Implementation

**File:** `scripts/convert-novel-dialogism.ts`

### Pipeline

```typescript
// 1. Load novel data
for (const novelDir of await fs.readdir('novel-dialogism/data')) {
  const text = await fs.readFile(`${novelDir}/text.txt`, 'utf8');
  const quotations = await parseCSV(`${novelDir}/quotations.csv`);
  const characters = await parseCSV(`${novelDir}/character_info.csv`);

  // 2. Build character index
  const characterMap = buildCharacterIndex(characters);

  // 3. Generate TEI document
  const tei = generateTEI({
    novelId: novelDir,
    text,
    quotations,
    characters: characterMap
  });

  // 4. Write output
  await fs.writeFile(
    `corpora/novel-dialogism/${novelDir}.xml`,
    tei
  );
}
```

### Key Functions

- **`parseCSV(path)`** - Parse CSV files using Node.js built-in parsing or simple library
- **`buildCharacterIndex(characters)`** - Map character IDs to data, resolve aliases
- **`generateTEI(data)`** - Assemble TEI document:
  - Build `<particDesc>` from character_info.csv
  - Process quotations in byte-span order
  - Insert `<anchor>` elements at mention boundaries
  - Add TEI namespace and custom attributes
- **`insertQuotes(text, quotations)`** - Merge quotations into novel text using byte spans

### Error Handling

| Error Type | Handling |
|------------|----------|
| Missing CSV files | Skip novel, log warning |
| Malformed CSV | Log error, continue with other novels |
| Invalid byte spans | Throw error (manual review required) |
| Invalid character references | Log warning, use "unknown" speaker |

## Build Integration

### Package.json Scripts

```json
{
  "scripts": {
    "corpus:convert": "bun scripts/convert-novel-dialogism.ts",
    "corpus:setup": "scripts/setup-corpora.sh",
    "corpus:analyze": "bun scripts/analyze-corpora.ts",
    "corpus:split": "bun scripts/generate-splits.ts",
    "corpus:all": "bun run corpus:convert && bun run corpus:analyze && bun run corpus:split"
  }
}
```

### Automatic Detection

The `corpus:setup` script will:
1. Check if `novel-dialogism/` submodule exists
2. If present and `corpora/novel-dialogism/` is missing or outdated, run conversion
3. Log conversion results (novels processed, errors encountered)

### Corpus Metadata

**File:** `tests/corpora/metadata/novel-dialogism.json`

```json
{
  "id": "novel-dialogism",
  "name": "Novel Dialogism Corpus",
  "description": "Novels with rich quotation and character annotations for dialogue research",
  "totalDocuments": 0,
  "encodingTypes": ["dialogue-focused"],
  "teiVersion": "P5"
}
```

## Integration with Corpus Browser

### Protocol Updates

Add `novel-dialogism` to the `CorpusId` union type in `lib/effect/protocols/CorpusDataSource.ts`:

```typescript
export const CorpusId = Schema.Union(
  Schema.Literal('wright-american-fiction'),
  Schema.Literal('victorian-women-writers'),
  Schema.Literal('indiana-magazine-history'),
  Schema.Literal('indiana-authors-books'),
  Schema.Literal('brevier-legislative'),
  Schema.Literal('tei-texts'),
  Schema.Literal('novel-dialogism')  // NEW
);
```

### API Route Updates

The `/api/corpora` endpoint will automatically include the novel-dialogism corpus once:
1. Conversion has been run
2. XML files exist in `corpora/novel-dialogism/`
3. Metadata file exists

## Testing Strategy

### Unit Tests

**File:** `scripts/__tests__/convert-novel-dialogism.test.ts`

- Test CSV parsing with sample data
- Test character index building
- Test TEI generation for single quotation
- Test span insertion accuracy
- Test error handling for malformed data

### Integration Tests

**File:** `lib/effect/__tests__/NovelDialogismCorpus.test.ts`

- Verify corpus can be loaded via CorpusDataSource
- Verify quotations are accessible
- Verify character entities are present
- Verify custom attributes are preserved
- Test pagination with novel documents

### Validation

- Use existing TEI validation (SchemaLoader) to ensure well-formedness
- Spot-check converted documents against source data
- Verify byte spans correspond correctly to text positions

## Success Criteria

1. **Conversion completeness**: All novels in novel-dialogism/data/ convert to TEI
2. **Annotation preservation**: All source fields present in TEI (via custom attributes)
3. **Corpus browser integration**: Novel-dialogism appears and is browsable at /corpus
4. **AI training compatibility**: Converted data usable for dialogue classifier training
5. **Build reproducibility**: `bun run corpus:convert` produces identical output on re-runs
6. **Error handling**: Graceful handling of edge cases with clear logging

## Future Enhancements

- **Validation tool**: Spot-check converted TEI against original CSV data
- **Incremental conversion**: Only reconvert changed novels (mtime comparison)
- **Statistics dashboard**: Show conversion metrics (novels processed, quotations per novel, character counts)
- **Reverse conversion**: Generate novel-dialogism format from TEI (for round-trip testing)

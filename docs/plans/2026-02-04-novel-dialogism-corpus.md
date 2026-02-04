# Novel-Dialogism Corpus Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the novel-dialogism corpus (text + CSV files) to TEI/XML format with full annotation preservation and integrate it with the corpus browser for AI classifier training data.

**Architecture:** Standalone TypeScript converter script that reads text/CSV files, builds TEI documents with custom attributes, outputs to generated corpus directory. Integration with existing corpus build pipeline via automatic detection.

**Tech Stack:** TypeScript, Bun runtime, TEI/XML generation, CSV parsing, Effect-based corpus browser integration

---

## Task 1: Add Git Submodule for Novel-Dialogism Corpus

**Files:**
- Modify: `.gitmodules`
- Create: `novel-dialogism/` (submodule)

**Step 1: Add submodule to .gitmodules**

```bash
git submodule add https://github.com/Priya22/project-dialogism-novel-corpus.git novel-dialogism
```

Expected: Submodule cloned to `novel-dialogism/` directory

**Step 2: Verify submodule structure**

Run: `ls novel-dialogism/data/ | head -5`

Expected: List of novel directories (e.g., `A_Connecticut_Yankee_in_King_Arthur_Court_Mark_Twain/`)

**Step 3: Check sample novel files**

Run: `ls novel-dialogism/data/*/novel_text.txt | head -1 | xargs head -20`

Expected: Plain text content of a novel

**Step 4: Commit submodule**

```bash
git add .gitmodules novel-dialogism
git commit -m "feat: add novel-dialogism corpus as git submodule"
```

---

## Task 2: Create Conversion Script Structure

**Files:**
- Create: `scripts/convert-novel-dialogism.ts`

**Step 1: Create script stub**

```typescript
#!/usr/bin/env bun
/**
 * Convert novel-dialogism corpus to TEI/XML format
 *
 * Reads novel_text.txt + CSV files from novel-dialogism/data/
 * Outputs TEI/XML files to corpora/novel-dialogism/
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const SOURCE_DIR = 'novel-dialogism/data';
const OUTPUT_DIR = 'corpora/novel-dialogism';

async function main() {
  console.log('Converting novel-dialogism corpus...');

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // List all novel directories
  const novels = await fs.readdir(SOURCE_DIR);
  const novelDirs = novels.filter(async (name) => {
    const stat = await fs.stat(path.join(SOURCE_DIR, name));
    return stat.isDirectory();
  });

  console.log(`Found ${novelDirs.length} novels to convert`);

  // TODO: Process each novel
  for (const novelId of novelDirs) {
    console.log(`Processing ${novelId}...`);
    // Conversion will be implemented in next tasks
  }

  console.log('Conversion complete!');
}

main().catch((err) => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
```

**Step 2: Make script executable**

Run: `chmod +x scripts/convert-novel-dialogism.ts`

**Step 3: Test script runs**

Run: `bun scripts/convert-novel-dialogism.ts`

Expected: Output "Found X novels to convert" and "Conversion complete!"

**Step 4: Commit**

```bash
git add scripts/convert-novel-dialogism.ts
git commit -m "feat: add novel-dialogism conversion script stub"
```

---

## Task 3: Implement CSV Parsing

**Files:**
- Modify: `scripts/convert-novel-dialogism.ts`

**Step 1: Add CSV parsing utilities**

Add to top of file after imports:

```typescript
// ============================================================================
// CSV Parsing
// ============================================================================

interface QuotationRow {
  quoteId: string;
  quoteText: string;
  subQuotationList: string;
  quoteByteSpans: string;
  speaker: string;
  addressees: string;
  quoteType: string;
  referringExpression: string;
  mentionTextList: string;
  mentionSpansList: string;
  mentionEntitiesList: string;
}

interface CharacterRow {
  'Character ID': string;
  'Main Name': string;
  Aliases: string;
  Gender: string;
  Category: string;
}

async function parseCSV(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  return lines;
}

function parseQuotationsCSV(lines: string[]): QuotationRow[] {
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: QuotationRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row as QuotationRow);
  }

  return rows;
}

function parseCharactersCSV(lines: string[]): CharacterRow[] {
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CharacterRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row as CharacterRow);
  }

  return rows;
}
```

**Step 2: Add test data loading**

Update main() to load and parse sample CSV:

```typescript
async function main() {
  console.log('Converting novel-dialogism corpus...');
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const novels = await fs.readdir(SOURCE_DIR);
  const novelDirs = (await Promise.all(
    novels.map(async (name) => {
      const stat = await fs.stat(path.join(SOURCE_DIR, name));
      return stat.isDirectory() ? name : null;
    })
  )).filter(Boolean) as string[];

  console.log(`Found ${novelDirs.length} novels to convert`);

  // Test with first novel
  const firstNovel = novelDirs[0];
  console.log(`Testing CSV parsing for ${firstNovel}...`);

  const quotationsPath = path.join(SOURCE_DIR, firstNovel, 'quotation_info.csv');
  const charactersPath = path.join(SOURCE_DIR, firstNovel, 'character_info.csv');

  const quoteLines = await parseCSV(quotationsPath);
  const quotations = parseQuotationsCSV(quoteLines);
  console.log(`  Loaded ${quotations.length} quotations`);

  const charLines = await parseCSV(charactersPath);
  const characters = parseCharactersCSV(charLines);
  console.log(`  Loaded ${characters.length} characters`);

  console.log('CSV parsing test complete!');
}
```

**Step 3: Run CSV parsing test**

Run: `bun scripts/convert-novel-dialogism.ts`

Expected: Output showing loaded quotations and characters count

**Step 4: Commit**

```bash
git add scripts/convert-novel-dialogism.ts
git commit -m "feat: add CSV parsing for novel-dialogism corpus"
```

---

## Task 4: Implement Character Index Building

**Files:**
- Modify: `scripts/convert-novel-dialogism.ts`

**Step 1: Add character index types and function**

```typescript
// ============================================================================
// Character Index
// ============================================================================

interface CharacterData {
  id: string;
  mainName: string;
  aliases: string[];
  gender: string;
  category: string;
}

function buildCharacterIndex(characters: CharacterRow[]): Map<string, CharacterData> {
  const index = new Map<string, CharacterData>();

  for (const char of characters) {
    const data: CharacterData = {
      id: char['Character ID'],
      mainName: char['Main Name'],
      aliases: char.Aliases ? char.Aliases.split('|').map(a => a.trim()) : [],
      gender: char.Gender,
      category: char.Category
    };

    index.set(data.id, data);

    // Also index by aliases for lookup
    for (const alias of data.aliases) {
      index.set(alias, data);
    }
  }

  return index;
}
```

**Step 2: Test character index**

Update main() to test character indexing:

```typescript
  const charIndex = buildCharacterIndex(characters);
  console.log(`  Character index has ${charIndex.size} entries (including aliases)`);

  // Show sample character
  const firstChar = characters[0];
  const charData = charIndex.get(firstChar['Character ID']);
  if (charData) {
    console.log(`  Sample character: ${charData.mainName} (${charData.aliases.length} aliases)`);
  }
```

**Step 3: Run character index test**

Run: `bun scripts/convert-novel-dialogism.ts`

Expected: Output showing character index size and sample character

**Step 4: Commit**

```bash
git add scripts/convert-novel-dialogism.ts
git commit -m "feat: add character index building"
```

---

## Task 5: Implement TEI Header Generation

**Files:**
- Modify: `scripts/convert-novel-dialogism.ts`

**Step 1: Add TEI header generation function**

```typescript
// ============================================================================
// TEI Generation
// ============================================================================

function generateTEIHeader(
  novelId: string,
  characterIndex: Map<string, CharacterData>
): string {
  const characters = Array.from(characterIndex.values())
    .filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx); // Unique by ID

  const particDesc = characters.map(char => {
    const aliases = char.aliases.map(a => `        <alias>${a}</alias>`).join('\n');
    return `    <person xml:id="${char.id}" novel-dialogism:category="${char.category}" sex="${char.gender}">
      <persName>${char.mainName}</persName>
${aliases}
    </person>`;
  }).join('\n');

  return `  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>${novelId.replace(/_/g, ' ')}</title>
        <author>Unknown</author>
      </titleStmt>
      <sourceDesc>
        <p>Converted from novel-dialogism corpus</p>
        <p>Original source: ${novelId}</p>
      </sourceDesc>
    </fileDesc>

    <particDesc>
      <listPerson>
${particDesc}
      </listPerson>
    </particDesc>

    <encodingDesc>
      <p>Annotations converted from quotations.csv and character_info.csv</p>
    </encodingDesc>
  </teiHeader>`;
}
```

**Step 2: Test TEI header generation**

Add to main() after character index test:

```typescript
  const teiHeader = generateTEIHeader(firstNovel, charIndex);
  console.log('  Generated TEI header:');
  console.log('  ' + teiHeader.split('\n').slice(0, 5).join('\n  '));
```

**Step 3: Run TEI header test**

Run: `bun scripts/convert-novel-dialogism.ts`

Expected: Output showing TEI header structure

**Step 4: Commit**

```bash
git add scripts/convert-novel-dialogism.ts
git commit -m "feat: add TEI header generation"
```

---

## Task 6: Implement Quotation to TEI Conversion

**Files:**
- Modify: `scripts/convert-novel-dialogism.ts`

**Step 1: Add quotation conversion function**

```typescript
function parseJSONField(field: string): any {
  if (!field || field === '[]') return [];
  try {
    return JSON.parse(field.replace(/'/g, '"'));
  } catch {
    return [];
  }
}

function convertQuotationToTEI(quote: QuotationRow): string {
  const quoteId = quote.quoteId;
  const quoteType = quote.quoteType;
  const referringExpr = quote.referringExpression || '';
  const speaker = quote.speaker || 'unknown';
  const addressees = quote.addressees || '';

  const subQuotations = parseJSONField(quote.subQuotationList);
  const quoteByteSpans = parseJSONField(quote.quoteByteSpans);
  const mentionTextList = parseJSONField(quote.mentionTextList);
  const mentionSpansList = parseJSONField(quote.mentionSpansList);
  const mentionEntitiesList = parseJSONField(quote.mentionEntitiesList);

  // Build quote element with custom attributes
  const attrs = [
    `novel-dialogism:id="${quoteId}"`,
    `novel-dialogism:type="${quoteType}"`,
    `novel-dialogism:referringExpression="${referringExpr}"`,
    `who="#${speaker}"`,
    addressees ? `addr="${addressees}"` : ''
  ].filter(Boolean).join(' ');

  let content = '';

  // Process sub-quotations
  for (let i = 0; i < subQuotations.length; i++) {
    const subQuote = subQuotations[i];
    const span = quoteByteSpans[i] || [0, 0];

    content += `      <anchor xml:id="${quoteId}-start-${i}" span="${span[0]}"/>\n`;
    content += `      <s said="said">${subQuote}</s>\n`;
    content += `      <anchor xml:id="${quoteId}-end-${i}" span="${span[1]}"/>\n`;

    // Process mentions within this sub-quotation
    if (mentionTextList[i] && mentionSpansList[i] && mentionEntitiesList[i]) {
      const mentions = mentionTextList[i];
      const spans = mentionSpansList[i];
      const entities = mentionEntitiesList[i];

      for (let j = 0; j < mentions.length; j++) {
        const mentionSpan = spans[j];
        content += `      <rs xml:id="${quoteId}-mention-${i}-${j}" ref="#${entities[j]}" span="${mentionSpan.join('-')}">${mentions[j]}</rs>\n`;
      }
    }
  }

  return `    <quote ${attrs}>
${content}    </quote>`;
}
```

**Step 2: Test quotation conversion**

Add to main():

```typescript
  // Test quotation conversion
  if (quotations.length > 0) {
    const firstQuote = quotations[0];
    const quoteTEI = convertQuotationToTEI(firstQuote);
    console.log('  Sample quotation TEI:');
    console.log('  ' + quoteTEI.split('\n').slice(0, 5).join('\n  '));
  }
```

**Step 3: Run quotation conversion test**

Run: `bun scripts/convert-novel-dialogism.ts`

Expected: Output showing TEI quotation structure

**Step 4: Commit**

```bash
git add scripts/convert-novel-dialogism.ts
git commit -m "feat: add quotation to TEI conversion"
```

---

## Task 7: Implement Full Document Generation

**Files:**
- Modify: `scripts/convert-novel-dialogism.ts`

**Step 1: Add complete TEI document generation**

```typescript
async function generateTEIDocument(
  novelId: string,
  text: string,
  quotations: QuotationRow[],
  characterIndex: Map<string, CharacterData>
): Promise<string> {
  const header = generateTEIHeader(novelId, characterIndex);

  // Convert quotations to TEI
  const quoteElements = quotations.map(q => convertQuotationToTEI(q));

  // Wrap in TEI structure
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:novel-dialogism="http://novel-dialogism">
${header}
  <text>
    <body>
      <p>
${quoteElements.join('\n')}
      </p>
    </body>
  </text>
</TEI>`;

  return doc;
}

async function convertNovel(novelId: string): Promise<void> {
  const novelDir = path.join(SOURCE_DIR, novelId);

  // Load files
  const textPath = path.join(novelDir, 'novel_text.txt');
  const quotationsPath = path.join(novelDir, 'quotation_info.csv');
  const charactersPath = path.join(novelDir, 'character_info.csv');

  const text = await fs.readFile(textPath, 'utf8');
  const quoteLines = await parseCSV(quotationsPath);
  const quotations = parseQuotationsCSV(quoteLines);
  const charLines = await parseCSV(charactersPath);
  const characters = parseCharactersCSV(charLines);

  // Build character index
  const characterIndex = buildCharacterIndex(characters);

  // Generate TEI
  const tei = await generateTEIDocument(novelId, text, quotations, characterIndex);

  // Write output
  const outputPath = path.join(OUTPUT_DIR, `${novelId}.xml`);
  await fs.writeFile(outputPath, tei, 'utf8');

  console.log(`  Converted ${novelId}: ${quotations.length} quotations, ${characters.length} characters`);
}
```

**Step 2: Update main to convert all novels**

```typescript
async function main() {
  console.log('Converting novel-dialogism corpus...');
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const novels = await fs.readdir(SOURCE_DIR);
  const novelDirs = (await Promise.all(
    novels.map(async (name) => {
      const stat = await fs.stat(path.join(SOURCE_DIR, name));
      return stat.isDirectory() ? name : null;
    })
  )).filter(Boolean) as string[];

  console.log(`Found ${novelDirs.length} novels to convert`);

  for (const novelId of novelDirs) {
    try {
      await convertNovel(novelId);
    } catch (err) {
      console.error(`  Error converting ${novelId}:`, err);
    }
  }

  console.log('Conversion complete!');
}
```

**Step 3: Run full conversion**

Run: `bun scripts/convert-novel-dialogism.ts`

Expected: Converts all novels, outputs progress for each

**Step 4: Verify output files**

Run: `ls corpora/novel-dialogism/ | head -5`

Expected: List of .xml files

**Step 5: Commit**

```bash
git add scripts/convert-novel-dialogism.ts
git add corpora/novel-dialogism/
git commit -m "feat: implement full novel-dialogism conversion"
```

---

## Task 8: Add Package.json Script

**Files:**
- Modify: `package.json`

**Step 1: Add conversion script**

Add to scripts section:

```json
"corpus:convert": "bun scripts/convert-novel-dialogism.ts",
```

Place it before `corpus:setup` in the list.

**Step 2: Update corpus:all to include conversion**

Modify `corpus:all` to:

```json
"corpus:all": "bun run corpus:convert && bun run corpus:analyze && bun run corpus:split"
```

**Step 3: Test script**

Run: `bun run corpus:convert`

Expected: Conversion runs successfully

**Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add corpus:convert script to package.json"
```

---

## Task 9: Create Corpus Metadata

**Files:**
- Create: `tests/corpora/metadata/novel-dialogism.json`

**Step 1: Create metadata file**

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

**Step 2: Update document count after conversion**

Run: `ls corpora/novel-dialogism/*.xml | wc -l`

Then update `totalDocuments` with actual count.

**Step 3: Commit**

```bash
git add tests/corpora/metadata/novel-dialogism.json
git commit -m "feat: add novel-dialogism corpus metadata"
```

---

## Task 10: Update Corpus Browser Protocol

**Files:**
- Modify: `lib/effect/protocols/CorpusDataSource.ts`

**Step 1: Add novel-dialogism to CorpusId union**

Find the `CorpusId` Schema.Union and add:

```typescript
export const CorpusId = Schema.Union(
  Schema.Literal('wright-american-fiction'),
  Schema.Literal('victorian-women-writers'),
  Schema.Literal('indiana-magazine-history'),
  Schema.Literal('indiana-authors-books'),
  Schema.Literal('brevier-legislative'),
  Schema.Literal('tei-texts'),
  Schema.Literal('novel-dialogism')
);
```

**Step 2: Update FetchCorpusDataSource info**

Modify `lib/effect/services/FetchCorpusDataSource.ts` to add novel-dialogism to `CORPORA_INFO`:

```typescript
const CORPORA_INFO: Record<CorpusId, { name: string; description: string; totalDocuments: number }> = {
  // ... existing corpora ...
  'novel-dialogism': {
    name: 'Novel Dialogism Corpus',
    description: 'Novels with rich quotation and character annotations',
    totalDocuments: 0, // Will be updated after conversion
  },
};
```

**Step 3: Commit**

```bash
git add lib/effect/protocols/CorpusDataSource.ts
git add lib/effect/services/FetchCorpusDataSource.ts
git commit -m "feat: add novel-dialogism to corpus browser"
```

---

## Task 11: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add generated corpus directory**

```
# Generated corpus files
corpora/novel-dialogism/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore generated novel-dialogism corpus files"
```

---

## Task 12: Write Unit Tests for Conversion

**Files:**
- Create: `scripts/__tests__/convert-novel-dialogism.test.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { parseQuotationsCSV, parseCharactersCSV, buildCharacterIndex, generateTEIHeader } from '../convert-novel-dialogism';

describe('NovelDialogism Converter', () => {
  describe('CSV Parsing', () => {
    it('should parse quotations CSV', () => {
      const lines = [
        'quoteId,quoteText,speaker,quoteType',
        'q1,"Hello world","char1","explicit"'
      ];
      const quotations = parseQuotationsCSV(lines);
      expect(quotations).toHaveLength(1);
      expect(quotations[0].quoteId).toBe('q1');
      expect(quotations[0].speaker).toBe('char1');
    });

    it('should parse characters CSV', () => {
      const lines = [
        'Character ID,Main Name,Aliases,Gender,Category',
        'char1,"John Doe","Johnny|JD",M,major'
      ];
      const characters = parseCharactersCSV(lines);
      expect(characters).toHaveLength(1);
      expect(characters[0]['Character ID']).toBe('char1');
      expect(characters[0].Aliases).toBe('Johnny|JD');
    });
  });

  describe('Character Index', () => {
    it('should build character index with aliases', () => {
      const characters = [
        {
          'Character ID': 'char1',
          'Main Name': 'John Doe',
          Aliases: 'Johnny|JD',
          Gender: 'M',
          Category: 'major'
        }
      ];

      const index = buildCharacterIndex(characters);

      expect(index.get('char1')?.mainName).toBe('John Doe');
      expect(index.get('Johnny')?.mainName).toBe('John Doe');
      expect(index.get('JD')?.mainName).toBe('John Doe');
    });
  });

  describe('TEI Generation', () => {
    it('should generate TEI header with characters', () => {
      const characterIndex = new Map([
        ['char1', {
          id: 'char1',
          mainName: 'John Doe',
          aliases: ['Johnny'],
          gender: 'M',
          category: 'major'
        }]
      ]);

      const header = generateTEIHeader('test-novel', characterIndex);

      expect(header).toContain('<person xml:id="char1"');
      expect(header).toContain('novel-dialogism:category="major"');
      expect(header).toContain('sex="M"');
      expect(header).toContain('<persName>John Doe</persName>');
      expect(header).toContain('<alias>Johnny</alias>');
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test scripts/__tests__/convert-novel-dialogism.test.ts`

Expected: Tests pass

**Step 3: Commit**

```bash
git add scripts/__tests__/convert-novel-dialogism.test.ts
git commit -m "test: add unit tests for novel-dialogism converter"
```

---

## Task 13: Write Integration Tests

**Files:**
- Create: `lib/effect/__tests__/NovelDialogismCorpus.test.ts`

**Step 1: Create integration test**

```typescript
import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@jest/globals';
import { CorpusBrowser } from '../services/CorpusBrowser';
import { LocalCorpusDataSourceLive } from '../services/LocalCorpusDataSource';
import { CorpusBrowserLive } from '../services/CorpusBrowser';

const TestLayer = Layer.mergeAll(LocalCorpusDataSourceLive, CorpusBrowserLive);

describe('NovelDialogism Corpus - Integration Tests', () => {
  it('should load novel-dialogism corpus metadata', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);
      yield* _(browser.loadCorpus('novel-dialogism' as any));
      const state = yield* _(browser.getState());

      expect(state._tag).toBe('loaded');
      if (state._tag === 'loaded') {
        expect(state.metadata.id).toBe('novel-dialogism');
        expect(state.metadata.totalDocuments).toBeGreaterThan(0);
      }
    });

    await Effect.runPromise(pipe(program, Effect.provide(TestLayer)));
  });

  it('should list documents in novel-dialogism corpus', async () => {
    const program = Effect.gen(function* (_) {
      const browser = yield* _(CorpusBrowser);
      yield* _(browser.loadCorpus('novel-dialogism' as any));

      const docs = yield* _(browser.listDocuments({ page: 0, pageSize: 20 }));

      expect(docs.length).toBeGreaterThan(0);
    });

    await Effect.runPromise(pipe(program, Effect.provide(TestLayer)));
  });
});
```

**Step 2: Run integration tests**

Run: `bun test lib/effect/__tests__/NovelDialogismCorpus.test.ts`

Expected: Tests pass

**Step 3: Commit**

```bash
git add lib/effect/__tests__/NovelDialogismCorpus.test.ts
git commit -m "test: add integration tests for novel-dialogism corpus"
```

---

## Task 14: Update Documentation

**Files:**
- Modify: `docs/corpus-browsing.md`
- Modify: `README.md`

**Step 1: Update corpus-browsing.md**

Add to the available corpora table:

```markdown
| Novel Dialogism Corpus        | TBD       | dialogue-focused | P5          | Novels with rich quotation annotations |
```

**Step 2: Update README.md**

Add to corpus section or create new entry about novel-dialogism.

**Step 3: Commit**

```bash
git add docs/corpus-browsing.md README.md
git commit -m "docs: add novel-dialogism corpus to documentation"
```

---

## Task 15: Final Verification and E2E Test

**Files:**
- Modify: `tests/e2e/corpus-browsing.spec.ts` (if needed)

**Step 1: Run full corpus pipeline**

Run: `bun run corpus:all`

Expected: Conversion runs, analysis completes, splits generated

**Step 2: Start dev server**

Run: `bun run dev`

**Step 3: Verify corpus in browser**

Open: http://localhost:3001/corpus

Expected: Novel Dialogism Corpus card appears

**Step 4: Click on novel-dialogism corpus**

Expected: Document list loads, shows converted novels

**Step 5: Click on a document**

Expected: Document viewer shows TEI content with custom attributes

**Step 6: Run all tests**

Run: `bun test`

Expected: All tests pass

**Step 7: Commit**

```bash
git add .
git commit -m "feat: complete novel-dialogism corpus integration"
```

---

## Success Criteria Verification

- [ ] All novels converted to TEI format
- [ ] Custom attributes present in converted documents
- [ ] Corpus browser shows novel-dialogism corpus
- [ ] Documents are viewable in browser
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Conversion can be re-run reproducibly
- [ ] Generated files are .gitignore'd
- [ ] Documentation updated

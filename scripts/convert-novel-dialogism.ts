#!/usr/bin/env bun
import { readdir, mkdir, access, readFile } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const SOURCE_DIR = 'novel-dialogism/data';
const OUTPUT_DIR = 'corpora/novel-dialogism/';

/**
 * Interface for a row in quotation_info.csv
 */
interface QuotationRow {
  quoteID: string;
  quoteText: string;
  subQuotationList: string;
  quoteByteSpans: string;
  speaker: string;
  addressees: string;
  quoteType: string;
  referringExpression: string;
  mentionTextsList: string;
  mentionSpansList: string;
  mentionEntitiesList: string;
}

/**
 * Interface for a row in character_info.csv
 */
interface CharacterRow {
  characterId: number;
  mainName: string;
  aliases: string;
  gender: string;
  category: string;
}

/**
 * Character data structure for indexing
 */
interface CharacterData {
  id: string;
  mainName: string;
  aliases: string[];
  gender: string;
  category: string;
}

/**
 * Generic CSV parser that handles quoted fields with embedded commas and newlines
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        // Windows line ending
        currentRow.push(currentField);
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++; // Skip \n
      } else if (char === '\n' || char === '\r') {
        // Unix or old Mac line ending
        currentRow.push(currentField);
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Add last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parse quotation_info.csv into an array of QuotationRow objects
 */
function parseQuotationsCSV(content: string): QuotationRow[] {
  const rows = parseCSV(content);

  if (rows.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const colIndex = (header: string) => headers.indexOf(header);

  return dataRows.map((row, idx) => ({
    quoteID: row[colIndex('quoteID')] || `Q${idx}`,
    quoteText: row[colIndex('quoteText')] || '',
    subQuotationList: row[colIndex('subQuotationList')] || '[]',
    quoteByteSpans: row[colIndex('quoteByteSpans')] || '[]',
    speaker: row[colIndex('speaker')] || '',
    addressees: row[colIndex('addressees')] || '[]',
    quoteType: row[colIndex('quoteType')] || '',
    referringExpression: row[colIndex('referringExpression')] || '',
    mentionTextsList: row[colIndex('mentionTextsList')] || '[]',
    mentionSpansList: row[colIndex('mentionSpansList')] || '[]',
    mentionEntitiesList: row[colIndex('mentionEntitiesList')] || '[]'
  }));
}

/**
 * Parse character_info.csv into an array of CharacterRow objects
 */
function parseCharactersCSV(content: string): CharacterRow[] {
  const rows = parseCSV(content);

  if (rows.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const colIndex = (header: string) => headers.indexOf(header);

  return dataRows.map(row => ({
    characterId: parseInt(row[colIndex('Character ID')] || '0', 10),
    mainName: row[colIndex('Main Name')] || '',
    aliases: row[colIndex('Aliases')] || '',
    gender: row[colIndex('Gender')] || '',
    category: row[colIndex('Category')] || ''
  }));
}

/**
 * Build a character index that allows lookup by ID or alias
 *
 * Creates a Map where keys can be:
 * - Character ID (string)
 * - Any alias name
 *
 * All keys point to the same CharacterData object, enabling
 * flexible lookup regardless of which identifier is available.
 */
function buildCharacterIndex(characters: CharacterRow[]): Map<string, CharacterData> {
  const index = new Map<string, CharacterData>();

  for (const char of characters) {
    // Parse aliases from Python set notation: {'alias1', 'alias2'}
    let aliases: string[] = [];
    if (char.aliases && char.aliases.trim()) {
      // Remove Python set notation and quotes
      const cleaned = char.aliases
        .replace(/^[\[{]/, '')  // Remove opening { or [
        .replace(/[\]}]$/, '')   // Remove closing } or ]
        .replace(/'/g, '')       // Remove single quotes
        .replace(/"/g, '');      // Remove double quotes

      // Split by comma and trim
      aliases = cleaned
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
    }

    const data: CharacterData = {
      id: String(char.characterId),
      mainName: char.mainName,
      aliases: aliases,
      gender: char.gender,
      category: char.category
    };

    // Index by character ID
    index.set(data.id, data);

    // Also index by aliases for lookup
    for (const alias of data.aliases) {
      index.set(alias, data);
    }
  }

  return index;
}

/**
 * Main conversion function
 */
async function main() {
  console.log('Novel Dialogism to TEI Converter');
  console.log('================================\n');

  // Create output directory if it doesn't exist
  try {
    await access(OUTPUT_DIR);
    console.log(`✓ Output directory exists: ${OUTPUT_DIR}`);
  } catch {
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
  }

  // Check if source directory exists
  try {
    await access(SOURCE_DIR);
  } catch {
    console.error(`\n✗ Source directory not found: ${SOURCE_DIR}`);
    console.error('  Please ensure novel-dialogism submodule is initialized:');
    console.error('    git submodule update --init --recursive');
    process.exit(1);
  }

  // List novel directories
  const dirents = await readdir(SOURCE_DIR, { withFileTypes: true });
  const novels = dirents
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();

  console.log(`\nFound ${novels.length} novels to convert:\n`);

  // Task 3: Test CSV parsing with first novel
  if (novels.length > 0) {
    const firstNovel = novels[0];
    const novelPath = join(SOURCE_DIR, firstNovel);
    const characterInfoPath = join(novelPath, 'character_info.csv');
    const quotationInfoPath = join(novelPath, 'quotation_info.csv');

    console.log(`[Task 3 Test] Parsing CSV files for: ${firstNovel}`);

    try {
      // Parse quotations
      const quotationsContent = await readFile(quotationInfoPath, 'utf-8');
      const quotations = parseQuotationsCSV(quotationsContent);
      console.log(`  ✓ Parsed ${quotations.length} quotations`);
      console.log(`    First quotation ID: ${quotations[0]?.quoteID}`);
      console.log(`    First quotation speaker: ${quotations[0]?.speaker}`);
      console.log(`    First quote type: ${quotations[0]?.quoteType}`);

      // Parse characters
      const charactersContent = await readFile(characterInfoPath, 'utf-8');
      const characters = parseCharactersCSV(charactersContent);
      console.log(`  ✓ Parsed ${characters.length} characters`);
      console.log(`    First character: ${characters[0]?.mainName} (${characters[0]?.category})`);

      // Show sample of parsed data
      console.log(`\n  Sample quotation data:`);
      console.log(`    Quote ID: ${quotations[0]?.quoteID}`);
      console.log(`    Speaker: ${quotations[0]?.speaker}`);
      console.log(`    Text length: ${quotations[0]?.quoteText.length} chars`);
      console.log(`    Text preview: ${quotations[0]?.quoteText.substring(0, 100)}...`);

      console.log(`\n  Sample character data:`);
      const majorChars = characters.filter(c => c.category === 'major');
      console.log(`    Major characters: ${majorChars.length}`);
      if (majorChars.length > 0) {
        console.log(`    First major character: ${majorChars[0]?.mainName}`);
      }

      // Task 4: Test character index building
      console.log(`\n[Task 4 Test] Building character index...`);
      const charIndex = buildCharacterIndex(characters);
      console.log(`  ✓ Character index has ${charIndex.size} entries (including aliases)`);

      // Show sample character
      const firstChar = characters[0];
      const charData = charIndex.get(String(firstChar.characterId));
      if (charData) {
        console.log(`  ✓ Sample character: ${charData.mainName}`);
        console.log(`    - ID: ${charData.id}`);
        console.log(`    - Aliases: ${charData.aliases.length > 0 ? charData.aliases.join(', ') : '(none)'}`);
        console.log(`    - Gender: ${charData.gender}`);
        console.log(`    - Category: ${charData.category}`);

        // Test alias lookup if aliases exist
        if (charData.aliases.length > 0) {
          const firstAlias = charData.aliases[0];
          const lookupByAlias = charIndex.get(firstAlias);
          if (lookupByAlias && lookupByAlias.id === charData.id) {
            console.log(`  ✓ Alias lookup works: "${firstAlias}" → ${lookupByAlias.mainName}`);
          }
        }
      }
    } catch (error) {
      console.error(`  ✗ Error parsing CSV files:`, error);
    }

    console.log(`\n[Task 4] Character index building test complete. Stopping here for now.\n`);
    process.exit(0);
  }

  // Process each novel
  let successCount = 0;
  let skipCount = 0;

  for (const novel of novels) {
    const novelPath = join(SOURCE_DIR, novel);
    const outputPath = join(OUTPUT_DIR, `${novel}.tei.xml`);

    console.log(`[${novels.indexOf(novel) + 1}/${novels.length}] Processing: ${novel}`);

    // Check if novel has required files
    const characterInfoPath = join(novelPath, 'character_info.csv');
    const quotationInfoPath = join(novelPath, 'quotation_info.csv');
    const novelTextPath = join(novelPath, 'novel_text.txt');

    let hasAllFiles = true;

    try {
      await access(characterInfoPath, constants.F_OK);
    } catch {
      console.log(`  ⚠ Skipping: character_info.csv not found`);
      skipCount++;
      hasAllFiles = false;
    }

    try {
      await access(quotationInfoPath, constants.F_OK);
    } catch {
      console.log(`  ⚠ Skipping: quotation_info.csv not found`);
      skipCount++;
      hasAllFiles = false;
    }

    try {
      await access(novelTextPath, constants.F_OK);
    } catch {
      console.log(`  ⚠ Skipping: novel_text.txt not found`);
      skipCount++;
      hasAllFiles = false;
    }

    if (!hasAllFiles) {
      continue;
    }

    console.log(`  ✓ Found all required files`);

    // TODO: Implement actual conversion
    // TODO: Parse character_info.csv
    // TODO: Parse quotation_info.csv
    // TODO: Read novel_text.txt
    // TODO: Generate TEI header with character index
    // TODO: Convert quotations to TEI elements
    // TODO: Write complete TEI document to outputPath

    console.log(`  ⏳ Conversion not yet implemented`);
    console.log(`  → Target: ${outputPath}`);

    successCount++;
  }

  // Summary
  console.log('\n================================');
  console.log('Conversion Summary:');
  console.log(`  Total novels: ${novels.length}`);
  console.log(`  Ready to convert: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log('\n✓ Script structure complete!');
  console.log('  TODO: Implement conversion logic in future tasks\n');
}

main().catch(error => {
  console.error('\n✗ Error during conversion:', error);
  process.exit(1);
});

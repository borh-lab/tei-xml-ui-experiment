#!/usr/bin/env bun
import { readdir, mkdir, access, readFile, writeFile } from 'fs/promises';
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
 * Generate TEI header with file description and participant description
 *
 * Creates a complete TEI header including:
 * - fileDesc with title and author
 * - sourceDesc with conversion information
 * - particDesc with listPerson containing person elements
 * - Each person has xml:id, novel-dialogism:category, sex, persName, and alias tags
 * - Filters to unique characters by ID
 */
function generateTEIHeader(
  novelId: string,
  characterIndex: Map<string, CharacterData>
): string {
  // Filter to unique characters by ID (not by alias lookups)
  const uniqueCharacters = Array.from(characterIndex.values())
    .filter((char, index, self) =>
      index === self.findIndex((c) => c.id === char.id)
    );

  // Generate listPerson with person elements
  const personElements = uniqueCharacters.map(char => {
    // Generate alias elements if aliases exist
    const aliasElements = char.aliases.length > 0
      ? char.aliases.map(alias => `        <alias>${alias}</alias>`).join('\n')
      : '';

    return `    <person xml:id="${char.id}" novel-dialogism:category="${char.category}" sex="${char.gender}">
      <persName>${char.mainName}</persName>
${aliasElements}
    </person>`;
  }).join('\n');

  // Build complete TEI header
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
${personElements}
      </listPerson>
    </particDesc>

    <encodingDesc>
      <p>Annotations converted from quotation_info.csv and character_info.csv</p>
    </encodingDesc>
  </teiHeader>`;
}

/**
 * Parse JSON field from CSV, handling Python-style quotes
 *
 * Converts Python list notation to valid JSON and parses it.
 * Handles single quotes, empty lists, and malformed data gracefully.
 *
 * @param field - The field value to parse
 * @returns Parsed array or object, or empty array if parsing fails
 */
function parseJSONField(field: string): any {
  if (!field || field === '[]' || field === '""') return [];

  try {
    // Convert Python-style quotes to JSON
    // Replace single quotes with double quotes, but be careful with nested quotes
    let normalized = field
      .replace(/'/g, '"')  // Replace single quotes with double quotes
      .replace(/\\"/g, "'"); // Fix escaped quotes that got mangled

    // Handle Python None/null
    normalized = normalized.replace(/\bNone\b/g, 'null');

    // Handle Python True/False
    normalized = normalized.replace(/\bTrue\b/g, 'true');
    normalized = normalized.replace(/\bFalse\b/g, 'false');

    return JSON.parse(normalized);
  } catch (error) {
    // If parsing fails, return empty array
    console.warn(`  ⚠ Warning: Failed to parse JSON field: ${field.substring(0, 50)}...`);
    return [];
  }
}

/**
 * Convert a quotation row to TEI XML format
 *
 * Creates a <quote> element with:
 * - Custom attributes (novel-dialogism:id, novel-dialogism:type, etc.)
 * - <anchor> elements for byte spans
 * - <s> elements for sub-quotations
 * - <rs> elements for entity mentions
 *
 * @param quote - The quotation row to convert
 * @param characterIndex - Map for looking up character IDs by name/alias
 * @returns TEI XML string representation of the quotation
 */
function convertQuotationToTEI(quote: QuotationRow, characterIndex: Map<string, CharacterData>): string {
  const quoteId = quote.quoteID;
  const quoteType = quote.quoteType;
  const referringExpr = quote.referringExpression || '';
  const speaker = quote.speaker || 'unknown';
  const addressees = quote.addressees || '';

  // Parse JSON fields
  const subQuotationList = parseJSONField(quote.subQuotationList);
  const quoteByteSpans = parseJSONField(quote.quoteByteSpans);
  const mentionTextsList = parseJSONField(quote.mentionTextsList);
  const mentionSpansList = parseJSONField(quote.mentionSpansList);
  const mentionEntitiesList = parseJSONField(quote.mentionEntitiesList);

  // Build quote element with custom attributes
  const attrs = [
    `xml:id="${quoteId}"`,
    `novel-dialogism:type="${quoteType}"`,
    `novel-dialogism:referringExpression="${referringExpr.replace(/"/g, '&quot;')}"`
  ].join(' ');

  // Look up speaker Character ID from characterIndex
  // The CSV contains main names (e.g., "John Beaver"), but we need Character IDs for TEI references
  let speakerId = speaker;
  const speakerCharData = characterIndex.get(speaker);
  if (speakerCharData) {
    speakerId = speakerCharData.id;
  }

  // Build who attribute with speaker Character ID reference
  const whoAttr = `who="#${speakerId}"`;

  // Build addr attribute if addressees exist
  // Look up each addressee's Character ID from characterIndex
  let addrAttr = '';
  if (addressees && addressees.trim() !== '[]') {
    const parsedAddressees = parseJSONField(addressees);
    if (Array.isArray(parsedAddressees) && parsedAddressees.length > 0) {
      const addresseeIds = parsedAddressees
        .map(name => {
          const charData = characterIndex.get(name);
          return charData ? charData.id : name;
        })
        .map(id => `#${id}`)
        .join(' ');
      addrAttr = `addr="${addresseeIds}"`;
    }
  }

  let content = '';

  // Process each sub-quotation
  // subQuotationList is an array where each element is an array of sub-quotations for that span
  // We need to join them with spaces to create the full text for that span
  for (let i = 0; i < subQuotationList.length; i++) {
    const subQuoteParts = subQuotationList[i];
    const span = quoteByteSpans[i] || [0, 0];

    // Add anchor elements for span start/end
    content += `      <anchor xml:id="${quoteId}-start-${i}" spanTo="${quoteId}-end-${i}"/>\n`;

    // Join sub-quote parts and add the sub-quotation text in an <s> element
    const subQuoteText = Array.isArray(subQuoteParts) ? subQuoteParts.join(' ') : subQuoteParts;
    const escapedText = subQuoteText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    content += `      <s said="direct">${escapedText}</s>\n`;
    content += `      <anchor xml:id="${quoteId}-end-${i}"/>\n`;

    // Process mentions within this sub-quotation
    if (mentionTextsList[i] && mentionSpansList[i] && mentionEntitiesList[i]) {
      const mentions = mentionTextsList[i];
      const spans = mentionSpansList[i];
      const entities = mentionEntitiesList[i];

      if (Array.isArray(mentions) && Array.isArray(spans) && Array.isArray(entities)) {
        for (let j = 0; j < mentions.length; j++) {
          const mentionText = mentions[j];
          const mentionSpan = spans[j];
          const entityList = entities[j];

          // Build ref attribute from entity list
          let refAttr = '';
          if (Array.isArray(entityList) && entityList.length > 0) {
            const refs = entityList.map((e: any) => `#${e}`).join(' ');
            refAttr = ` ref="${refs}"`;
          } else if (typeof entityList === 'string') {
            refAttr = ` ref="#${entityList}"`;
          }

          // Build span attribute
          const spanAttr = Array.isArray(mentionSpan)
            ? ` spanFrom="${mentionSpan[0]}" spanTo="${mentionSpan[1]}"`
            : '';

          // Escape mention text
          const escapedMention = mentionText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

          content += `      <rs xml:id="${quoteId}-mention-${i}-${j}"${refAttr}${spanAttr}>${escapedMention}</rs>\n`;
        }
      }
    }
  }

  // Build complete quote element
  return `    <quote ${attrs} ${whoAttr}${addrAttr ? ' ' + addrAttr : ''}>
${content}    </quote>`;
}

/**
 * Interface for a quotation with parsed position information
 */
interface PositionedQuotation {
  row: QuotationRow;
  startByte: number;
  endByte: number;
  subQuotations: string[][];
  mentions: {
    texts: string[];
    spans: number[][];
    entities: (string | string[])[];
  }[];
}

/**
 * Escape XML special characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Detect if a line looks like a chapter heading
 */
function isChapterHeading(line: string): boolean {
  return /^CHAPTER\s+[IVXLCDM]+/i.test(line) || /^[A-Z\s]{5,}$/.test(line);
}

/**
 * Check if a line is just quotation marks or whitespace
 */
function isJustQuotes(line: string): boolean {
  return /^[""\s]*$/.test(line);
}

/**
 * Clean narrative text by removing orphaned quotation marks at start/end
 */
function cleanNarrativeLine(line: string): string {
  let cleaned = line.trim();
  // Remove leading/trailing quotation marks
  if (cleaned.startsWith('"') || cleaned.startsWith('"')) {
    cleaned = cleaned.substring(1).trim();
  }
  if (cleaned.endsWith('"') || cleaned.endsWith('"')) {
    cleaned = cleaned.substring(0, cleaned.length - 1).trim();
  }
  return cleaned;
}

/**
 * Generate TEI body content with full novel text and inline quotations
 *
 * Reads the complete novel text and inserts quotations at their correct positions
 * using byte spans. Narrative text is wrapped in <p> tags, chapter headings in <head> tags.
 *
 * @param novelText - Full novel text content
 * @param quotations - Array of positioned quotations with metadata
 * @param characterIndex - Character lookup map
 * @returns TEI XML body content
 */
function generateTEIBodyWithNarrative(
  novelText: string,
  quotations: PositionedQuotation[],
  characterIndex: Map<string, CharacterData>
): string {
  // Sort quotations by byte position
  const sortedQuotations = [...quotations].sort((a, b) => a.startByte - b.startByte);

  let body = '  <body>\n';
  let currentPosition = 0;
  let currentParagraph = '';
  let inChapter = false;

  for (const quote of sortedQuotations) {
    // Add narrative text before this quotation
    if (quote.startByte > currentPosition) {
      const narrativeText = novelText.substring(currentPosition, quote.startByte);
      const lines = narrativeText.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for chapter headings
        if (isChapterHeading(line)) {
          // Flush any pending paragraph
          if (currentParagraph.trim()) {
            body += `    <p>${escapeXML(currentParagraph.trim())}</p>\n`;
            currentParagraph = '';
          }

          // Check if this is a chapter title line or subtitle line
          if (inChapter && line.trim()) {
            body += `    <head type="subtitle">${escapeXML(line.trim())}</head>\n`;
          } else if (line.trim()) {
            // Close previous div if open
            if (inChapter) {
              body += '  </div>\n';
            }
            body += '  <div type="chapter">\n';
            body += `    <head>${escapeXML(line.trim())}</head>\n`;
            inChapter = true;
          }
        } else if (line.trim()) {
          // Skip lines that are just quotation marks
          if (isJustQuotes(line)) {
            continue;
          }

          // Clean the line and accumulate narrative text
          const cleanedLine = cleanNarrativeLine(line);
          if (cleanedLine) {
            if (currentParagraph) {
              currentParagraph += ' ' + cleanedLine;
            } else {
              currentParagraph = cleanedLine;
            }
          }

          // End paragraph on double newline or end of section
          const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
          if (!nextLine.trim() || i === lines.length - 1) {
            if (currentParagraph.trim()) {
              body += `    <p>${escapeXML(currentParagraph.trim())}</p>\n`;
              currentParagraph = '';
            }
          }
        }
      }

      currentPosition = quote.startByte;
    }

    // Add the quotation
    const quoteTEI = convertQuotationToTEI(quote.row, characterIndex);
    body += quoteTEI + '\n';

    currentPosition = quote.endByte;
  }

  // Add any remaining narrative text after the last quotation
  if (currentPosition < novelText.length) {
    const narrativeText = novelText.substring(currentPosition);
    const lines = narrativeText.split('\n');

    for (const line of lines) {
      if (line.trim()) {
        if (isChapterHeading(line)) {
          if (currentParagraph.trim()) {
            body += `    <p>${escapeXML(currentParagraph.trim())}</p>\n`;
            currentParagraph = '';
          }
          if (inChapter) {
            body += '  </div>\n';
          }
          body += '  <div type="chapter">\n';
          body += `    <head>${escapeXML(line.trim())}</head>\n`;
          inChapter = true;
        } else if (!isJustQuotes(line)) {
          // Skip lines that are just quotation marks
          const cleanedLine = cleanNarrativeLine(line);
          if (cleanedLine) {
            if (currentParagraph) {
              currentParagraph += ' ' + cleanedLine;
            } else {
              currentParagraph = cleanedLine;
            }
          }
        }
      } else if (currentParagraph.trim()) {
        body += `    <p>${escapeXML(currentParagraph.trim())}</p>\n`;
        currentParagraph = '';
      }
    }

    if (currentParagraph.trim()) {
      body += `    <p>${escapeXML(currentParagraph.trim())}</p>\n`;
    }
  }

  // Close any open chapter div
  if (inChapter) {
    body += '  </div>\n';
  }

  body += '  </body>';

  return body;
}

/**
 * Generate complete TEI XML document
 *
 * Combines all components into a valid TEI XML document:
 * - XML declaration with model declarations
 * - TEI root element with namespace declarations
 * - teiHeader with file description and participant information
 * - text element with body containing full novel text with inline quotations
 *
 * @param novelId - Identifier for the novel
 * @param teiHeader - Generated TEI header
 * @param bodyContent - Generated TEI body content
 * @returns Complete TEI XML document as string
 */
function generateTEIDocument(
  novelId: string,
  teiHeader: string,
  bodyContent: string
): string {
  // Build complete TEI document
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="http://www.tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<?xml-model href="http://www.tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:novel-dialogism="http://example.org/ns/novel-dialogism">
${teiHeader}
  <text>
${bodyContent}
</TEI>`;
}

/**
 * Convert a single novel from CSV files to TEI XML
 *
 * Processes all data files for a novel:
 * - Reads and parses character_info.csv
 * - Reads and parses quotation_info.csv
 * - Reads novel_text.txt for full content
 * - Builds character index
 * - Generates TEI header
 * - Generates TEI body with full novel text and inline quotations
 * - Combines everything into complete TEI document
 * - Writes output to file
 *
 * @param novelId - Novel identifier (directory name)
 * @param sourcePath - Path to novel source directory
 * @param outputPath - Path where TEI XML should be written
 * @returns Object with success status and statistics
 */
async function convertNovel(
  novelId: string,
  sourcePath: string,
  outputPath: string
): Promise<{ success: boolean; quotations: number; characters: number; error?: string }> {
  try {
    // File paths
    const characterInfoPath = join(sourcePath, 'character_info.csv');
    const quotationInfoPath = join(sourcePath, 'quotation_info.csv');
    const novelTextPath = join(sourcePath, 'novel_text.txt');

    // Parse character information
    const charactersContent = await readFile(characterInfoPath, 'utf-8');
    const characters = parseCharactersCSV(charactersContent);

    // Build character index
    const characterIndex = buildCharacterIndex(characters);

    // Parse quotation information
    const quotationsContent = await readFile(quotationInfoPath, 'utf-8');
    const quotations = parseQuotationsCSV(quotationsContent);

    // Read full novel text
    const novelText = await readFile(novelTextPath, 'utf-8');

    // Parse quotations with their positions
    const positionedQuotations: PositionedQuotation[] = [];
    for (const quote of quotations) {
      const byteSpans = parseJSONField(quote.quoteByteSpans);
      const subQuotations = parseJSONField(quote.subQuotationList);
      const mentionTexts = parseJSONField(quote.mentionTextsList);
      const mentionSpans = parseJSONField(quote.mentionSpansList);
      const mentionEntities = parseJSONField(quote.mentionEntitiesList);

      if (Array.isArray(byteSpans) && byteSpans.length > 0) {
        // Use the full span range from first start to last end
        const firstSpan = byteSpans[0];
        const lastSpan = byteSpans[byteSpans.length - 1];

        if (Array.isArray(firstSpan) && firstSpan.length >= 2 &&
            Array.isArray(lastSpan) && lastSpan.length >= 2) {
          positionedQuotations.push({
            row: quote,
            startByte: firstSpan[0],
            endByte: lastSpan[1],
            subQuotations: subQuotations || [],
            mentions: {
              texts: mentionTexts || [],
              spans: mentionSpans || [],
              entities: mentionEntities || []
            }
          });
        }
      }
    }

    // Generate TEI header
    const teiHeader = generateTEIHeader(novelId, characterIndex);

    // Generate TEI body with full novel text and inline quotations
    const bodyContent = generateTEIBodyWithNarrative(novelText, positionedQuotations, characterIndex);

    // Generate complete TEI document
    const teiDocument = generateTEIDocument(novelId, teiHeader, bodyContent);

    // Write output file
    await writeFile(outputPath, teiDocument, 'utf-8');

    return {
      success: true,
      quotations: quotations.length,
      characters: characters.length
    };
  } catch (error) {
    return {
      success: false,
      quotations: 0,
      characters: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
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

  // Process each novel
  let successCount = 0;
  let failCount = 0;

  console.log('\nConversion Process:');
  console.log('==================\n');

  for (const novel of novels) {
    const novelPath = join(SOURCE_DIR, novel);
    const outputPath = join(OUTPUT_DIR, `${novel}.tei.xml`);
    const index = novels.indexOf(novel) + 1;

    console.log(`[${index}/${novels.length}] Processing: ${novel}`);

    // Check if novel has required files
    const characterInfoPath = join(novelPath, 'character_info.csv');
    const quotationInfoPath = join(novelPath, 'quotation_info.csv');
    const novelTextPath = join(novelPath, 'novel_text.txt');

    let hasRequiredFiles = true;

    try {
      await access(characterInfoPath, constants.F_OK);
    } catch {
      console.log(`  ⚠ Skipping: character_info.csv not found`);
      hasRequiredFiles = false;
    }

    try {
      await access(quotationInfoPath, constants.F_OK);
    } catch {
      console.log(`  ⚠ Skipping: quotation_info.csv not found`);
      hasRequiredFiles = false;
    }

    try {
      await access(novelTextPath, constants.F_OK);
    } catch {
      console.log(`  ⚠ Skipping: novel_text.txt not found`);
      hasRequiredFiles = false;
    }

    if (!hasRequiredFiles) {
      failCount++;
      continue;
    }

    console.log(`  ✓ Found required files`);

    // Convert the novel
    const result = await convertNovel(novel, novelPath, outputPath);

    if (result.success) {
      console.log(`  ✓ Generated TEI document`);
      console.log(`    - Quotations: ${result.quotations}`);
      console.log(`    - Characters: ${result.characters}`);
      console.log(`    → ${outputPath}`);
      successCount++;
    } else {
      console.log(`  ✗ Conversion failed: ${result.error}`);
      failCount++;
    }

    console.log('');
  }

  // Summary
  console.log('================================');
  console.log('Conversion Summary:');
  console.log(`  Total novels: ${novels.length}`);
  console.log(`  Successfully converted: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log('\n✓ Conversion complete!\n');
}

main().catch(error => {
  console.error('\n✗ Error during conversion:', error);
  process.exit(1);
});

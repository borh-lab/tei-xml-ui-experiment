# TEI Corpus Reference

This document provides detailed information about all TEI corpora integrated into the dialogue editor, including size statistics, speech tag patterns, and encoding characteristics.

## Quick Overview

| Corpus | Documents | Avg Size | Speech Tags | Encoding Type | Era/Genre |
|--------|-----------|----------|-------------|---------------|-----------|
| Wright American Fiction | 2,876 | 511KB | 22,641 | Dramatic Text | 1851-1875 American novels |
| Victorian Women Writers | 199 | 352KB | 9,442 | Dramatic Text | Victorian literature |
| Indiana Magazine of History | 7,289 | 29KB | 5,754 | Dialogue-Focused | Historical articles |
| Indiana Authors Books | 394 | 500KB | 17,633 | Dramatic Text | Indiana authors |
| Brevier Legislative | 19 | 3.4MB | 5 | Dialogue-Focused* | Legislative proceedings |
| TEI Texts | 14 | 711KB | 0 | Mixed | French novels |
| Novel Dialogism | 28 | 704KB | 37,131 | Specialized | Annotated novels |

**Total**: 10,819 documents across 7 corpora

*Brevier is classified as "dialogue-focused" due to detection logic, but is actually structural markup with minimal speech annotation (see details below).

---

## Corpus Details

### 1. Wright American Fiction

**Source**: [Wright American Fiction](https://github.com/iulibdcs/Wright-American-Fiction.git)

**Description**: American fiction from 1851-1875, comprising 3,000+ novels and short stories.

**Statistics**:
- Documents: 2,876
- Total Size: 1.4GB
- TEI Version: P5
- Average Document Size: 511KB

**Speech Tag Usage**:
| Tag | Count | Notes |
|-----|-------|-------|
| `<q>` | 20,091 | Primary quotation tag |
| `<sp>` | 2,550 | Speech sections |
| `<speaker>` | 2,520 | Speaker identification |
| `<stage>` | 234 | Stage directions |

**Characteristics**:
- Heavy use of dramatic text markup (`<sp>`, `<speaker>`)
- No `<said>` tags (uses `<q>` for quotations instead)
- Consistent speaker attribution throughout
- Well-suited for character network analysis

**Use Cases**:
- Training dialogue detection models
- Character relationship extraction
- 19th century American literature analysis
- Dramatic text markup patterns

---

### 2. Victorian Women Writers Project

**Source**: [Victorian Women Writers Project](https://github.com/iulibdcs/Victorian-Women-Writers-Project.git)

**Description**: Literary works by Victorian-era women authors, including novels, poetry, and non-fiction.

**Statistics**:
- Documents: 199
- Total Size: 70MB
- TEI Version: P5
- Average Document Size: 352KB

**Speech Tag Usage**:
| Tag | Count | Notes |
|-----|-------|-------|
| `<said>` | 5,846 | Primary speech attribution |
| `<q>` | 1,877 | Quotations |
| `<sp>` | 1,623 | Speech sections |
| `<speaker>` | 1,610 | Speaker identification |
| `<stage>` | 870 | Stage directions |
| `<quote>` | 396 | Generic quotations |

**Characteristics**:
- **Best for speech attribution research** - only corpus with significant `<said>` usage
- Mixed encoding style: combines `<said>` with dramatic text tags
- Rich speaker attribution throughout
- Diverse genres within Victorian literature

**Use Cases**:
- **Primary corpus for speech attribution training**
- Women's literature analysis
- Victorian dialogue patterns
- Mixed markup style research

---

### 3. Indiana Magazine of History

**Source**: [Indiana Magazine of History](https://github.com/iulibdcs/Indiana-Magazine-of-History.git)

**Description**: Scholarly articles on Indiana history from the early 20th century.

**Statistics**:
- Documents: 7,289 (largest corpus by document count)
- Total Size: 212MB
- TEI Version: P4
- Average Document Size: 29KB

**Speech Tag Usage**:
| Tag | Count | Notes |
|-----|-------|-------|
| `<quote>` | 5,752 | Primary speech markup |
| `<q>` | 2 | Minimal |
| `<said>` | 0 | None |
| `<sp>` | 0 | None |

**Characteristics**:
- **Largest document count** but smaller average size
- Uses TEI P4 (older standard)
- Quotations embedded in historical narratives
- Minimal speaker attribution (mostly indirect speech)
- Heavy use of entity names: `<placeName>` (267K), `<region>` (108K)

**Use Cases**:
- Named entity recognition training
- Historical text analysis
- Quotation extraction in scholarly prose
- TEI P4 compatibility testing

---

### 4. Indiana Authors and Their Books

**Source**: [Indiana Authors and Their Books](https://github.com/iulibdcs/Indiana-Authors-and-Their-Books.git)

**Description**: Works by notable Indiana authors.

**Statistics**:
- Documents: 394
- Total Size: 197MB
- TEI Version: P4
- Average Document Size: 500KB

**Speech Tag Usage**:
| Tag | Count | Notes |
|-----|-------|-------|
| `<sp>` | 7,345 | Heavy dramatic text usage |
| `<speaker>` | 6,743 | Extensive speaker attribution |
| `<stage>` | 3,535 | Stage directions |
| `<q>` | 3,003 | Quotations |

**Characteristics**:
- **Highest dramatic text tag density** (17,623 speech-related tags)
- Deep hierarchical structure (`<div1>` through `<div7>`)
- Extensive use of stage directions
- Well-suited for playwright/script analysis
- TEI P4 encoding

**Use Cases**:
- **Best corpus for dramatic text analysis**
- Play script markup patterns
- Stage direction extraction
- Character dialogue attribution in drama

---

### 5. Brevier Legislative Reports

**Source**: [Brevier Legislative Reports](https://github.com/iulibdcs/Brevier-Legislative-Reports.git)

**Description**: Verbatim transcripts of the proceedings of the Indiana General Assembly from 1858 to 1887.

**Statistics**:
- Documents: 19 (smallest corpus by count)
- Total Size: 65MB (largest average size)
- TEI Version: P5
- Average Document Size: **3.4MB** per document
- Total Lines: 836,505

**Speech Tag Usage**:
| Tag | Count | Notes |
|-----|-------|-------|
| `<q>` | 4 | Only in document quotations |
| `<quote>` | 1 | Single instance |
| `<said>` | 0 | None |
| `<sp>` | 0 | None |
| `<speaker>` | 0 | None |

**Characteristics**:
- **Massive documents, minimal speech markup** (contradictory!)
- Each file = complete legislative session transcript
- Structural encoding focus: `<p>` (6,121), `<div>` (1,750), `<orgName>` (763)
- Vote records, resolutions, legislative proceedings
- **Misclassified as "dialogue-focused"** due to 4 `<q>` tags triggering detection logic
- Actual encoding style: structural/organizational markup

**Why so small?**
- Not small in content - 836K lines of text!
- Small in document count because each doc = entire session
- Legislative transcripts without speech attribution markup
- Proceedings recorded structurally, not as dialogue

**Use Cases**:
- Historical legislative research
- Structural markup patterns (not dialogue)
- Organization name extraction
- Vote record analysis
- **Not recommended for dialogue/speech research**

---

### 6. TEI Texts (French Novels)

**Source**: [TEI Texts](https://github.com/christofs/tei-texts.git)

**Description**: Collection of French novels in TEI format (Flaubert, Maupassant, etc.).

**Statistics**:
- Documents: 14
- Total Size: 9.9MB
- TEI Version: P5
- Average Document Size: 711KB

**Speech Tag Usage**:
| Tag | Count | Notes |
|-----|-------|-------|
| All speech tags | 0 | No speech markup |

**Characteristics**:
- Minimal markup corpus (no speech annotation)
- Basic TEI structure only
- French language content
- Used for testing/document structure validation
- Gap elements present (20 instances)

**Use Cases**:
- Testing with non-English content
- Minimal markup baseline
- Document structure validation
- French literature analysis

---

### 7. Novel Dialogism Corpus

**Source**: [Novel Dialogism](https://github.com/Priya22/project-dialogism-novel-corpus.git)

**Description**: Novels with rich quotation and character annotations, converted from CSV/Text to TEI.

**Statistics**:
- Documents: 28
- Total Size: 19.7MB
- TEI Version: P5
- Average Document Size: 704KB

**Speech Tag Usage**:
| Tag | Count | Notes |
|-----|-------|-------|
| `<quote>` | 37,131 | Rich annotation with metadata |
| `<s>` | Nested sub-quotations |
| `<anchor>` | Span markers |
| `<said>` | 0 | Uses custom `<quote>` instead |

**Characteristics**:
- **Specialized annotation schema** with custom attributes
- Custom namespace: `novel-dialogism:`
- Rich metadata per quotation:
  - `novel-dialogism:type` (implicit, anaphoric, explicit)
  - `novel-dialogism:referringExpression`
  - `who` (speaker reference)
  - `addr` (addressees)
- Character catalog with aliases, gender, categories
- Byte-span anchored quotations
- **Highest quote count** (37K), but using custom schema

**Use Cases**:
- **Advanced quotation analysis** with attribution metadata
- Speaker identification research
- Reference expression extraction
- Addressee detection
- Custom TEI extension research
- Character relationship modeling

---

## Speech Tag Reference

### Tag Categories

#### Speech Attribution Tags
- **`<said>`**: Direct speech with speaker attribution
  - Attributes: `who` (speaker reference), `direct`, `aloud`
  - Usage: Victorian Women Writers (5,846 instances)
  - Best for: Attribution research

- **`<q>`**: Quotation marks
  - Generic quotation tag
  - Usage: Universal across most corpora (22K+ in Wright)
  - Best for: Simple quotation extraction

#### Dramatic Text Tags
- **`<sp>`**: Speech section in drama
  - Container for speeches in plays
  - Usage: Indiana Authors (7,345), Wright (2,550)
  - Best for: Play script analysis

- **`<speaker>`**: Speaker identifier
  - Names the speaker within `<sp>`
  - Usage: Indiana Authors (6,743), Wright (2,520)
  - Always paired with `<sp>` in our corpora

- **`<stage>`**: Stage directions
  - Non-spoken dramatic elements
  - Usage: Indiana Authors (3,535), VWW (870)

#### Specialized Tags
- **`<quote>`**: Generic quotation
  - Usage: Indiana Magazine (5,752), Novel Dialogism (37K)
  - Novel Dialogism: Custom attributes and rich metadata
  - Indiana Magazine: Simple quotation markup

#### Supporting Tags
- **`<anchor>`**: Position markers (Novel Dialogism)
- **`<s>`**: Sub-quotations (Novel Dialogism)
- **`<p>`**: Paragraph containers
- **`<persName>`**: Character names
- **`<orgName>`**: Organization names

---

## Encoding Type Classification

The system classifies corpora using this logic (from `scripts/corpus-utils.ts`):

```typescript
if (hasSp && hasSpeaker) return 'dramatic-text';
if (hasSaid || hasQ) return 'dialogue-focused';
if (tagNames.size < 10) return 'minimal-markup';
return 'mixed';
```

### Types Explained

**Dramatic Text**:
- Uses `<sp>` + `<speaker>` pattern
- Examples: Indiana Authors, Wright American Fiction, Victorian Women Writers
- Best for: Play script analysis, character dialogue

**Dialogue-Focused**:
- Has `<said>` OR `<q>` tags
- Examples: VWW (has `<said>`), Brevier (has 4 `<q>`), Indiana Magazine
- **Note**: Brevier misclassified - has 5 speech tags in 65MB!

**Mixed**:
- Combines multiple tag patterns
- Example: TEI Texts (structural + some speech)

**Minimal Markup**:
- Few unique tags (< 10)
- Basic structure only

---

## Usage Recommendations

### For Dialogue Detection Training
1. **Victorian Women Writers** - Best `<said>` attribution
2. **Wright American Fiction** - Large scale, dramatic text
3. **Indiana Authors Books** - High dramatic tag density

### For Character Network Analysis
1. **Indiana Authors Books** - Extensive speaker attribution
2. **Victorian Women Writers** - Rich speaker metadata
3. **Wright American Fiction** - Large character sets

### For Speech Attribution Research
1. **Victorian Women Writers** - Only corpus with `<said>` tags
2. **Novel Dialogism** - Custom attribution schema
3. **Indiana Authors Books** - Dramatic attribution patterns

### For Historical/Legislative Analysis
1. **Brevier Legislative** - Primary source transcripts
2. **Indiana Magazine of History** - Scholarly articles

### For Testing/Development
1. **TEI Texts** - Minimal markup, fast iteration
2. **Wright American Fiction** - Large scale testing

---

## Generating Corpus Statistics

To regenerate the statistics in this document:

```bash
# Analyze all corpora
bun run corpus:analyze

# View results
cat tests/corpora/metadata/summary.json | jq .

# Generate splits
bun run corpus:split

# View split distribution
cat tests/corpora/splits.json | jq '.summary'
```

---

## Data Quality Notes

### Known Issues
1. **Brevier Legislative**: Misclassified as dialogue-focused (actually structural)
2. **TEI Texts**: No speech markup (minimal markup corpus)
3. **Indiana Magazine**: Uses TEI P4 (older standard)
4. **Novel Dialogism**: Custom schema not standard TEI

### Split Distribution
All corpora use 70/15/15 train/val/test split with seeded randomness (seed=42) for reproducibility.

---

## Related Documentation

- [Corpus Browsing Feature](./corpus-browsing.md) - How to browse corpora in the UI
- [Scripts README](../scripts/README.md) - Corpus management tools
- [TEI Documentation](https://tei-c.org/guidelines/) - Official TEI guidelines

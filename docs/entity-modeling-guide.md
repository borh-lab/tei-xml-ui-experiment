# Entity Modeling Guide

This guide explains how to use the entity modeling features in the TEI Dialogue Editor.

## Overview

Entity modeling allows you to:
- Manage characters with detailed metadata
- Define relationships between characters
- Automatically detect named entities (personal names, places, organizations)
- Tag dialogue passages with speaker attribution

## Accessing the Entity Editor

There are two ways to open the Entity Editor:
1. Click the **Entities** button in the toolbar
2. Use the keyboard shortcut **⌘E** (Mac) or **Ctrl+E** (Windows/Linux)

## Adding Characters

1. Open Entity Editor (⌘E)
2. Make sure the **Characters** tab is selected
3. Click the **Add** button
4. Fill in character details:
   - **ID**: Unique identifier (e.g., "darcy", "elizabeth")
   - **Name**: Display name (e.g., "Mr. Darcy", "Elizabeth Bennet")
   - **Sex**: M, F, or Other (optional)
   - **Age**: Numeric age (optional)
   - **Occupation**: Profession or role (optional)
5. Click **Save**

The character will be added to the TEI document's `<standOff><listPerson>` section.

## Defining Relationships

1. Open Entity Editor → **Relationships** tab
2. Select **From** character (the subject of the relationship)
3. Select **To** character (the object of the relationship)
4. Choose relationship type:
   - **Family**: Parent, child, sibling, etc.
   - **Romantic**: Spouse, partner, courtship
   - **Social**: Friend, acquaintance
   - **Professional**: Colleague, employer, employee
   - **Antagonistic**: Rival, enemy
5. Optionally add subtype (e.g., "courtship", "sibling", "spouse")
6. Click **Add Relationship**

Relationships are stored in the TEI document's `<standOff><listRelation>` section.

## Using NER Auto-Detection

The Named Entity Recognition (NER) system automatically detects:
- **Personal Names**: Character names with titles (Mr., Mrs., Miss, Dr., etc.)
- **Places**: Locations preceded by prepositions (in, at, from, to, near)
- **Organizations**: (Coming soon)

### Workflow

1. Open Entity Editor → **NER Tags** tab
2. The system automatically scans your document
3. Review suggestions with confidence scores:
   - **95%+**: Title + name pattern (e.g., "Mr. Darcy")
   - **80%+**: Preposition + place pattern (e.g., "in London")
   - **70%+**: Standalone capitalized names
4. Apply entities:
   - Click **Apply** on individual suggestions
   - Click **Apply High Confidence** to bulk-apply all 90%+ entities
5. Entities are added to the TEI document's `<standOff><listAnnotation>` section

## Tagging Dialogue

### Manual Tagging

1. Select text in the rendered view
2. Press **1-9** to tag as speaker1-9
3. Or use the command palette (⌘K) and select the tag type
4. Changes immediately update the TEI source

### Viewing Tagged Dialogue

- Tagged dialogue passages show a **Speaker** badge with the character ID
- Hover over tagged passages to see character information in a tooltip
- The TEI source shows `<said who="#speakerId">` tags

## Keyboard Shortcuts

- **⌘E** / **Ctrl+E**: Open Entity Editor
- **1-9**: Tag selected text as speaker1-9
- **⌘K** / **Ctrl+K**: Open command palette

## TEI XML Structure

The entity modeling features create TEI P5 compliant markup:

### Characters

```xml
<standOff>
  <listPerson>
    <person xml:id="darcy">
      <persName>Mr. Darcy</persName>
      <sex value="M"/>
      <age value="28"/>
      <occupation>Gentleman</occupation>
    </person>
  </listPerson>
</standOff>
```

### Relationships

```xml
<standOff>
  <listRelation>
    <relation name="romantic" active="#darcy" passive="#elizabeth" subtype="courtship"/>
  </listRelation>
</standOff>
```

### NER Annotations

```xml
<standOff>
  <listAnnotation>
    <annotation xml:id="ann-1">
      <persName ref="#darcy">Mr. Darcy</persName>
    </annotation>
  </listAnnotation>
</standOff>
```

### Dialogue Tags

```xml
<p>
  Before text
  <said who="#darcy">Hello</said>
  After text
</p>
```

## Best Practices

1. **Character IDs**: Use short, unique identifiers (e.g., "darcy" not "mr_fitzwilliam_darcy")
2. **Character Names**: Use the full display name including titles
3. **Relationships**: Be specific with subtypes to distinguish between similar relationships
4. **NER Review**: Always review NER suggestions before applying - confidence scores indicate certainty
5. **Dialogue Tagging**: Tag dialogue at the paragraph level for best results

## Troubleshooting

### Characters not appearing
- Make sure you've clicked **Save** after adding a character
- Check that the character ID is unique
- Try refreshing the document

### NER not detecting entities
- Make sure your document uses proper capitalization for names
- Check that names use title prefixes (Mr., Mrs., etc.) for best results
- Try the manual character creation workflow

### Relationships not saving
- Verify that both characters exist in the Characters tab
- Check that you've selected different characters for From and To
- Make sure you've clicked **Add Relationship** button

## Next Steps

- Explore the [TEI P5 Guidelines](https://tei-c.org/guidelines/p5/) for more on entity markup
- See [FEATURES.md](./FEATURES.md) for detailed feature documentation
- Review the sample documents for entity modeling examples

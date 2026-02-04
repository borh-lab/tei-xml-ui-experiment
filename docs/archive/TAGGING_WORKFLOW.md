# TagToolbar Tagging Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  User selects   │
                    │  text in view   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  TagToolbar     │
                    │  appears with   │
                    │  tag buttons    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  User clicks    │
                    │  tag button     │
                    │  (e.g., <said>) │
                    └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    handleApplyTag FUNCTION                          │
│  (components/editor/EditorLayout.tsx, lines 297-361)                │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │ Get Selection    │           │ Validate Text    │
    │ window.getSelec- │           │ Check not empty  │
    │ tion()           │           │                  │
    └──────────────────┘           └──────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Get Document    │
                    │ paragraphs     │
                    │ document.parsed│
                    │ .TEI.text.body.p│
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Find Paragraph  │
                    │ containing      │
                    │ selected text   │
                    └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    HELPER FUNCTIONS                                 │
│  (lib/utils/teiTagging.ts)                                          │
└─────────────────────────────────────────────────────────────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │ getParagraphText │           │applyTagToPara-   │
    │ Extract text     │           │graph             │
    │ from paragraph   │           │ Wrap text with   │
    │ (handles various │           │ TEI tag element  │
    │ formats)        │           │                  │
    └──────────────────┘           └──────────────────┘
              │                               │
              │                               │
              │         ┌─────────────────────┘
              │         │
              ▼         ▼
        ┌─────────────────────────┐
        │  Create TEI Element     │
        │  {                     │
        │    "#said": "text",    │
        │    "@_rend": "plain"   │
        │  }                     │
        └─────────────────────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ Update Paragraph  │
          │ with tagged text  │
          └───────────────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ Serialize Document│
          │ newDoc.serialize()│
          └───────────────────┘
                    │
                    ▼
          ┌───────────────────┐
          │ Update Context    │
          │ updateDocument()  │
          └───────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          UI UPDATE                                  │
└─────────────────────────────────────────────────────────────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │  Rendered View   │           │  TEI Source View │
    │  Shows tagged    │           │  Shows XML with  │
    │  content        │           │  TEI elements    │
    └──────────────────┘           └──────────────────┘
```

## Data Transformation Example

### Input

```javascript
paragraph = 'One dollar and eighty-seven cents.';
selectedText = 'dollar and eighty-seven';
tag = 'said';
```

### Process

```javascript
// 1. Split text
before = 'One ';
middle = 'dollar and eighty-seven';
after = ' cents.';

// 2. Create TEI element
taggedElement = {
  '#said': 'dollar and eighty-seven',
  '@_rend': 'plain',
};

// 3. Create mixed content array
result = ['One ', { '#said': 'dollar and eighty-seven', '@_rend': 'plain' }, ' cents.'];
```

### Output (XML)

```xml
<p>One <said rend="plain">dollar and eighty-seven</said> cents.</p>
```

## Tag Options

| Tag Button   | TEI Element  | Default Attributes | Common Use           |
| ------------ | ------------ | ------------------ | -------------------- |
| `<said>`     | `<said>`     | `rend="plain"`     | Dialogue attribution |
| `<q>`        | `<q>`        | `rend="plain"`     | Quotes within text   |
| `<persName>` | `<persName>` | `rend="plain"`     | Character names      |

## Error Handling Flow

```
┌─────────────────┐
│ handleApplyTag  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐  ┌─────────┐
│ No  │  │ Text    │
│ Doc?│  │ Empty?  │
└──┬──┘  └────┬────┘
   │         │
   ▼         ▼
┌─────┐  ┌─────┐
│Return│  │Warn │
│      │  │Return│
└─────┘  └─────┘
    │         │
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ Text    │
    │ Found?  │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐  ┌─────────┐
│Warn │  │ Apply   │
│Return│  │ Tag     │
└─────┘  └────┬────┘
              │
              ▼
         ┌────────┐
         │ Update │
         │ Doc    │
         └────┬───┘
              │
              ▼
         ┌────────┐
         │ Clear  │
         │ Select │
         └────────┘
```

# AI Auto Mode - Application Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SWITCHES TO AUTO MODE                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI DETECTS DIALOGUE PASSAGES                     │
│  - Scans document for potential dialogue                            │
│  - Assigns confidence scores (0.0 - 1.0)                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FILTER BY CONFIDENCE LEVEL                       │
├─────────────────────────────────────┬───────────────────────────────┤
│   HIGH CONFIDENCE (≥80%)            │   MEDIUM/LOW CONFIDENCE       │
│   - Will be auto-applied            │   - Shown for review          │
│   - Green badge indicator           │   - Orange badge indicator     │
└──────────────────┬──────────────────┴───────────────┬───────────────┘
                   │                                  │
                   ▼                                  │
┌─────────────────────────────────────────────────────────────────────┐
│              AUTO-APPLICATION PROGRESS (HIGH CONFIDENCE)            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🔄 Auto-applying high-confidence suggestions...            │   │
│  │  ████████░░░░░░░░░░░  3 / 5                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  - Sequential application (300ms delay between each)               │
│  - Real-time progress counter                                     │
│  - Visual progress bar                                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     APPLICATION COMPLETE                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ✓ Auto-applied 3 suggestions with high confidence (≥80%)   │   │
│  │                                      [Undo]                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  - Success message with count                                      │
│  - Undo button available for 5 seconds                            │
│  - Toast auto-dismisses after 5 seconds                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    USER DECISION POINT                              │
├─────────────────────────────────────┬───────────────────────────────┤
│         DO NOTHING                  │           CLICK UNDO           │
│  - Auto-applied suggestions stay    │  - Suggestions restored       │
│  - Continue working                 │  - Can manually review        │
│  - Dismiss toast (5 sec)            │  - Re-apply individually      │
└─────────────────────────────────────┴───────────────────────────────┘
```

## State Flow Diagram

```
EditorLayout State
│
├── aiMode: 'auto'
│   └── Triggers auto-application effect
│
├── suggestions: DialogueSpan[]
│   ├── High confidence (≥0.8) → Auto-applied → Moved to autoAppliedSuggestions
│   └── Medium/low confidence (<0.8) → Shown for manual review
│
├── isAutoApplying: true (during application)
│   └── Shows progress indicator
│
├── autoApplyProgress: { current: 3, total: 5 }
│   └── Updates during application
│
├── autoAppliedSuggestions: DialogueSpan[]
│   └── Stores applied suggestions for undo
│
└── showUndoToast: true (after application)
    └── Displays undo button for 5 seconds
```

## Component Interaction

```
┌────────────────────────────────────────────────────────────────┐
│                        EditorLayout                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  State: aiMode='auto'                                    │ │
│  │  State: suggestions (detected by AI)                     │ │
│  │  State: isAutoApplying (bool)                            │ │
│  │  State: autoApplyProgress (current, total)               │ │
│  │  State: autoAppliedSuggestions (for undo)                │ │
│  │  State: showUndoToast (bool)                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          │                                      │
│                          ├──► InlineSuggestions                │
│                          │    - Shows all suggestions          │
│                          │    - Displays badges                │
│                          │       * "Will be auto-applied"       │
│                          │       * "Requires review"           │
│                          │                                      │
│                          ├──► Auto-Application Progress        │
│                          │    - Blue alert                     │
│                          │    - Spinner icon                   │
│                          │    - Progress bar                   │
│                          │    - Counter (3/5)                 │
│                          │                                      │
│                          └──► Undo Toast                       │
│                               - Green alert                    │
│                               - Success icon                   │
│                               - Undo button                    │
│                               - Auto-dismiss (5s)              │
└────────────────────────────────────────────────────────────────┘
```

## Timing Diagram

```
Time    | Event
--------|--------------------------------------------------------
0s      | User switches to Auto mode
        |
0.5s    | AI detection completes
        | - 10 suggestions detected
        | - 7 high confidence (≥80%)
        | - 3 medium/low confidence (<80%)
        |
1.0s    | Auto-application starts
        | - Progress indicator appears
        | - Counter: 0 / 7
        |
1.3s    | Suggestion 1 applied
        | - Progress: 1 / 7
        |
1.6s    | Suggestion 2 applied
        | - Progress: 2 / 7
        |
...     | (continues with 300ms intervals)
        |
3.1s    | Suggestion 7 applied
        | - Progress: 7 / 7
        | - Application complete
        |
3.2s    | Success toast appears
        | - Shows: "Auto-applied 7 suggestions"
        | - Undo button visible
        |
8.2s    | Toast auto-dismisses (if no user action)
        | - Undo button disappears
        |
∞       | Auto-applied suggestions remain in document
        | - Unless user clicked Undo
```

## Confidence Level Examples

```
Suggestion A: "Hello, world!"
├── Confidence: 95% (0.95)
├── Decision: ✅ AUTO-APPLY
├── Badge: "Will be auto-applied" (Green)
└── Reason: Clear dialogue markers

Suggestion B: "I'm not sure."
├── Confidence: 82% (0.82)
├── Decision: ✅ AUTO-APPLY
├── Badge: "Will be auto-applied" (Green)
└── Reason: High confidence, just above threshold

Suggestion C: "Maybe?"
├── Confidence: 78% (0.78)
├── Decision: ⚠️  SHOW FOR REVIEW
├── Badge: "Requires review" (Orange)
└── Reason: Just below threshold, needs human verification

Suggestion D: "..."
├── Confidence: 45% (0.45)
├── Decision: ⚠️  SHOW FOR REVIEW
├── Badge: "Requires review" (Orange)
└── Reason: Low confidence, ambiguous text
```

## Error Handling

```
Scenario: Application Error During Auto-Apply
│
├── Error occurs while applying suggestion 3 of 7
│
├── Actions:
│   ├── Stop auto-application
│   ├── Log error to console
│   ├── Show error message to user
│   ├── Keep applied suggestions (1-2)
│   └── Return remaining suggestions to list (3-7)
│
└── User can:
    ├── Review error
    ├── Manually apply remaining suggestions
    └── Undo already-applied suggestions
```

## Performance Metrics

```
Metric                      | Value          | Notes
----------------------------|----------------|--------------------------------
Auto-apply threshold        | 80%            | Configurable in future
Delay between applications  | 300ms          | Prevents UI blocking
Undo toast duration         | 5 seconds      | Auto-dismiss timeout
Max batch size              | No limit       | But large batches may be slow
Average application time    | ~300ms/item    | Includes delay + processing
Memory usage               | Minimal        | Only stores DialogueSpan objects
UI blocking                | None           | Async with delays
```

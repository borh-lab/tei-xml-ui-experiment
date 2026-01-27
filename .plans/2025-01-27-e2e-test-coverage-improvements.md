# E2E Test Coverage Improvements Design

**Date**: 2025-01-27
**Status**: Approved
**Author**: Claude Code

## Overview

Improve Playwright e2e test coverage for the TEI Dialogue Editor across four key areas:
1. Document Upload/Import functionality
2. Export & File Handling validation
3. Error Scenarios & Edge Cases
4. Mobile/Responsive Design

## Current State

**Existing Coverage** (~520 lines in single file):
- ✅ Welcome screen and sample gallery
- ✅ Manual annotation workflow
- ✅ AI-assisted features
- ✅ Keyboard shortcuts
- ✅ Bulk operations
- ✅ Quick search
- ✅ Character network visualization
- ✅ Pattern learning
- ✅ Basic error handling
- ✅ Documentation screenshots
- ✅ Basic accessibility tests
- ✅ Basic performance tests
- ✅ Data persistence
- ✅ Basic responsive design

**Coverage Gaps**:
- ❌ No document upload/import testing
- ❌ No actual file download validation
- ❌ Limited error scenario coverage
- ❌ Minimal mobile/responsive testing
- ❌ All tests in single monolithic file

## Proposed Architecture

### File Organization

```
tests/e2e/
├── fixtures/
│   ├── test-documents.ts      # Sample TEI documents for testing
│   ├── test-constants.ts      # URLs, selectors, timeouts
│   └── test-helpers.ts        # Custom helper functions
├── pages/
│   ├── editor-page.ts         # Page object for editor
│   ├── welcome-page.ts        # Page object for welcome screen
│   └── visualizations-page.ts # Page object for visualizations
├── document-upload.spec.ts    # Document import/upload tests
├── export-validation.spec.ts  # Export & file handling tests
├── error-scenarios.spec.ts    # Edge cases & error recovery
├── mobile-responsive.spec.ts  # Mobile/responsive tests
├── accessibility.spec.ts      # Comprehensive a11y tests
└── tei-dialogue-editor.spec.ts # Existing tests (refactored)
```

### Helper Utilities

**test-helpers.ts**:
- `uploadTestDocument(page, doc)` - Handles file uploads with validation
- `verifyTEIExport(page, expectedContent)` - Downloads and validates TEI XML
- `waitForEditorReady(page)` - Robust ready state detection
- `mockConsoleErrors(page)` - Captures and asserts on console errors
- `generateTestDocument(options)` - Creates TEI documents with specific test scenarios
- `loadSample(page, sampleName)` - Standardized sample loading
- `annotatePassage(page, index, speaker)` - Standardized annotation
- `exportDocument(page)` - Triggers and waits for export download

## Detailed Test Scenarios

### 1. Document Upload/Import Coverage

**1.1 Basic Upload**:
- ✅ Upload valid TEI document
- ✅ Reject non-XML files (.txt, .json, .jpg)
- ✅ Validate TEI structure before processing
- ✅ Show loading indicator during upload
- ✅ Display success message

**1.2 TEI Format Variants**:
- ✅ Handle TEI with namespace declarations
- ✅ Handle TEI without namespace (backward compatibility)
- ✅ Handle TEI with custom header (fileTitle, author)
- ✅ Handle different TEI versions (TEI P4, P5)

**1.3 Edge Cases**:
- ✅ Handle empty document (no passages)
- ✅ Handle document with only speakers (no dialogue)
- ✅ Handle very large documents (>100KB, >500 passages)
- ✅ Handle documents with special characters (Unicode, emojis)
- ✅ Handle documents with nested XML structures

**1.4 Validation**:
- ✅ Validate XML well-formedness
- ✅ Detect and report malformed XML
- ✅ Offer repair suggestions
- ✅ Handle invalid TEI schema
- ✅ Validate required TEI elements

### 2. Export & File Handling Coverage

**2.1 Basic Export Validation**:
- ✅ Download actual file (not just success message)
- ✅ Verify file extension (.tei, .xml, .txt)
- ✅ Validate TEI XML structure
- ✅ Verify XML declaration
- ✅ Verify TEI root element

**2.2 Annotation Preservation**:
- ✅ Export includes speaker annotations (@who attributes)
- ✅ Export all passage annotations
- ✅ Verify <sp> element count matches annotations
- ✅ Preserve speaker definitions in <castList>
- ✅ Include proper speaker IDs

**2.3 Export Format Variants**:
- ✅ Export with TEI header metadata (title, author)
- ✅ Export plain text option
- ✅ Export different TEI versions
- ✅ Export with/without XML formatting
- ✅ Export with inline vs block annotations

**2.4 Incremental Exports**:
- ✅ Preserve annotations across multiple exports
- ✅ Handle new annotations added between exports
- ✅ Handle modified annotations
- ✅ Export with no annotations (minimal TEI)
- ✅ Export partial annotations (some passages tagged)

**2.5 Error Handling**:
- ✅ Handle export failure gracefully
- ✅ Show error message, not crash
- ✅ Provide retry option
- ✅ Handle browser download restrictions
- ✅ Handle insufficient permissions

### 3. Error Scenarios & Edge Cases Coverage

**3.1 Network & API Failures**:
- ✅ Handle AI API timeout
- ✅ Work offline after initial load
- ✅ Recover from network interruption
- ✅ Handle API rate limiting
- ✅ Handle 500 server errors
- ✅ Handle network timeout during document load

**3.2 Browser Storage Issues**:
- ✅ Handle IndexedDB quota exceeded
- ✅ Handle localStorage access denied
- ✅ Handle sessionStorage unavailable
- ✅ Recover from corrupted IndexedDB
- ✅ Reset to safe state on storage error

**3.3 Concurrent Operations**:
- ✅ Handle rapid mode switching
- ✅ Handle bulk operations during AI analysis
- ✅ Handle multiple simultaneous requests
- ✅ Handle state updates during render
- ✅ Handle race conditions in data loading

**3.4 Data Corruption**:
- ✅ Detect and reset corrupted IndexedDB data
- ✅ Recover from invalid URL state
- ✅ Handle malformed cached data
- ✅ Reset to safe default state
- ✅ Show user-friendly error messages

**3.5 Browser-Specific Issues**:
- ✅ Work with strict CSP headers
- ✅ Work with cookies disabled
- ✅ Work with third-party cookies blocked
- ✅ Work in private/incognito mode
- ✅ Handle browser extension conflicts

### 4. Mobile & Responsive Design Coverage

**4.1 Mobile Viewports**:
- ✅ iPhone SE (375x667)
- ✅ iPhone 12 Pro (390x844)
- ✅ Android (360x640)
- ✅ iPad (768x1024)
- ✅ iPad Pro (1024x1366)

**4.2 Touch Interactions**:
- ✅ Tap to select passages
- ✅ Swipe for navigation
- ✅ Touch-friendly control sizes (min 44x44)
- ✅ Handle pinch to zoom (if enabled)
- ✅ Long-press context menus
- ✅ Double-tap to zoom

**4.3 Orientation Changes**:
- ✅ Portrait to landscape transition
- ✅ Landscape to portrait transition
- ✅ Preserve state across rotation
- ✅ Adjust layout for orientation
- ✅ Debounce resize handlers

**4.4 Responsive Breakpoints**:
- ✅ xs (320px) - small phones
- ✅ sm (640px) - large phones
- ✅ md (768px) - tablets
- ✅ lg (1024px) - desktop
- ✅ xl (1280px) - large desktop
- ✅ 2xl (1536px) - extra large desktop

**4.5 Mobile-Specific UI**:
- ✅ Show hamburger menu on mobile
- ✅ Hide sidebar by default on mobile
- ✅ Show keyboard shortcuts only on desktop
- ✅ Collapsible panels for mobile
- ✅ Touch-optimized button placement
- ✅ Bottom navigation bar (if implemented)

**4.6 Mobile Performance**:
- ✅ Load quickly on mobile (<5s)
- ✅ Smooth scroll performance
- ✅ Efficient touch event handling
- ✅ Optimized asset loading
- ✅ Lazy loading for large documents

## Implementation Strategy

### Phase 1: Infrastructure Setup
1. Create directory structure (fixtures/, pages/)
2. Extract helper utilities (test-helpers.ts)
3. Create page objects (EditorPage, WelcomePage)
4. Add test documents and constants

### Phase 2: Document Upload Tests
1. Implement document-upload.spec.ts
2. Add test document fixtures
3. Test basic upload scenarios
4. Test TEI format variants
5. Test edge cases and validation

### Phase 3: Export Validation Tests
1. Implement export-validation.spec.ts
2. Add download verification helpers
3. Test annotation preservation
4. Test export format variants
5. Test error handling

### Phase 4: Error Scenario Tests
1. Implement error-scenarios.spec.ts
2. Add network mocking helpers
3. Test API failures
4. Test storage issues
5. Test concurrent operations
6. Test data corruption

### Phase 5: Mobile/Responsive Tests
1. Implement mobile-responsive.spec.ts
2. Test mobile viewports
3. Test touch interactions
4. Test orientation changes
5. Test responsive breakpoints
6. Test mobile-specific UI
7. Test mobile performance

### Phase 6: Refactor Existing Tests
1. Split tei-dialogue-editor.spec.ts
2. Extract to accessibility.spec.ts
3. Use page objects and helpers
4. Update package.json scripts
5. Update documentation

## Success Criteria

- ✅ All new tests passing in Chromium, Firefox, WebKit
- ✅ Test execution time under 5 minutes
- ✅ Zero flaky tests (100% reliability)
- ✅ Code coverage report shows improved coverage
- ✅ CI pipeline runs all tests successfully
- ✅ Documentation updated with new test structure
- ✅ Screenshots still captured correctly

## Dependencies

- Playwright 1.58+ (already installed)
- @playwright/test (already installed)
- XML parser for validation (fast-xml-parser already installed)
- No additional dependencies required

## Risks & Mitigations

**Risk**: Test execution time increases significantly
**Mitigation**: Use parallel execution, optimize waits, use fixtures wisely

**Risk**: Flaky tests due to timing issues
**Mitigation**: Use waitForLoadState, avoid arbitrary timeouts, use page.waitForSelector

**Risk**: Mobile emulation differences from real devices
**Mitigation**: Test on real devices in CI if possible, document emulation limitations

**Risk**: Test file organization becomes complex
**Mitigation**: Keep it simple, avoid over-abstraction, use page objects judiciously

## Future Enhancements

- Visual regression testing (Playwright screenshots)
- API mocking for AI features (reduce test flakiness)
- Performance regression testing
- Cross-browser compatibility matrix
- Real device cloud testing (BrowserStack, Sauce Labs)
- Accessibility testing with axe-core
- Internationalization testing
- Load testing for document processing

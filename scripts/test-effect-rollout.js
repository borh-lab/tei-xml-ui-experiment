#!/usr/bin/env node
/**
 * Effect Migration Rollout Script
 *
 * Enables Effect feature flags and tests the application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function enableEffectFeatures() {
  log('\n=== Enabling Effect Feature Flags ===\n', colors.cyan);

  const featureFlags = [
    'feature-useEffectAI',
    'feature-useEffectAnalytics',
    'feature-useEffectEditor',
    'feature-useEffectVisualization',
    'feature-useEffectCorpus',
    'feature-useEffectMisc',
  ];

  // Create a test HTML file that enables all Effect features
  const testHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Effect Migration Test - All Features Enabled</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .feature-flag {
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
    }
    .success {
      background: #f0fdf4;
      border: 1px solid #22c55e;
      color: #15803d;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .test-section {
      margin: 24px 0;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
    }
    code {
      background: #1e293b;
      color: #e2e8f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>🎯 Effect Migration Rollout Test</h1>

  <div class="success">
    <strong>✅ All Effect Feature Flags Enabled!</strong>
    <p>Redirecting to application in 2 seconds...</p>
  </div>

  <div class="test-section">
    <h2>Enabled Feature Flags:</h2>
    ${featureFlags.map(flag => `
      <div class="feature-flag">
        <strong>${flag}</strong> = <code>true</code>
      </div>
    `).join('')}
  </div>

  <div class="test-section">
    <h2>Testing Checklist:</h2>
    <ul>
      <li>☐ Load a sample document</li>
      <li>☐ Add <said> tags with speaker attribution</li>
      <li>☐ Add characters and relationships</li>
      <li>☐ View character network visualization</li>
      <li>☐ Run document analytics</li>
      <li>☐ Browse corpus samples</li>
      <li>☐ Test undo/redo functionality</li>
      <li>☐ Export document to TEI XML</li>
    </ul>
  </div>

  <div class="test-section">
    <h2>To Disable Features:</h2>
    <p>Open browser console and run:</p>
    <code>${featureFlags.map(f => `localStorage.removeItem('${f}')`).join('\n')}</code>
    <p>Then reload the page.</p>
  </div>

  <script>
    // Enable all Effect feature flags
    const featureFlags = ${JSON.stringify(featureFlags)};
    featureFlags.forEach(flag => {
      localStorage.setItem(flag, 'true');
    });

    console.log('✅ All Effect feature flags enabled:', featureFlags);
    console.log('📊 Current localStorage:', { ...localStorage });

    // Redirect to main app after 2 seconds
    setTimeout(() => {
      console.log('🚀 Redirecting to application...');
      window.location.href = '/';
    }, 2000);
  </script>
</body>
</html>
`;

  const htmlPath = path.join(__dirname, '..', 'test-effect-rollout.html');
  fs.writeFileSync(htmlPath, testHTML);

  log(`✅ Created test file: ${htmlPath}`, colors.green);
  log(`   Open this file in your browser to test with all Effect features enabled`, colors.yellow);
  log(`   File URL: file://${htmlPath}`, colors.blue);

  return featureFlags;
}

function runTests() {
  log('\n=== Running Test Suite ===\n', colors.cyan);

  try {
    // Run Effect service tests
    log('Running Effect service tests...', colors.blue);
    execSync('npm test -- lib/effect/__tests__/', {
      stdio: 'inherit',
      timeout: 60000,
    });

    log('\n✅ Effect service tests passed!', colors.green);

    // Run React bridge tests
    log('Running React bridge tests...', colors.blue);
    execSync('npm test -- lib/effect/react/__tests__/', {
      stdio: 'inherit',
      timeout: 60000,
    });

    log('\n✅ React bridge tests passed!', colors.green);

    // Run validation tests
    log('Running validation tests...', colors.blue);
    execSync('npm test -- --testNamePattern="validation"', {
      stdio: 'inherit',
      timeout: 60000,
    });

    log('\n✅ Validation tests passed!', colors.green);

    return true;
  } catch (error) {
    log('\n❌ Tests failed!', colors.red);
    log(error.message, colors.red);
    return false;
  }
}

function checkBuild() {
  log('\n=== Checking Build Status ===\n', colors.cyan);

  try {
    const result = execSync('npm run build', {
      encoding: 'utf-8',
      timeout: 180000,
    });

    if (result.includes('✓ Compiled successfully')) {
      log('✅ Build successful!', colors.green);
      return true;
    } else {
      log('⚠️  Build had warnings', colors.yellow);
      return true;
    }
  } catch (error) {
    log('❌ Build failed!', colors.red);
    log(error.message, colors.red);
    return false;
  }
}

function checkNewValidationFeatures() {
  log('\n=== Checking New Validation Features ===\n', colors.cyan);

  const validationFiles = [
    'lib/validation/ValidationService.ts',
    'lib/schema/SchemaLoader.ts',
    'lib/schema/SchemaResolver.ts',
    'lib/schema/SchemaSelection.ts',
    'tests/integration/corpus-validation.test.ts',
    'tests/unit/schema-validation.test.ts',
  ];

  let allPresent = true;
  validationFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      log(`✅ ${file}`, colors.green);
    } else {
      log(`❌ ${file} - NOT FOUND`, colors.red);
      allPresent = false;
    }
  });

  if (allPresent) {
    log('\n✅ All validation features present!', colors.green);
    log('\nNew validation capabilities:', colors.blue);
    log('  • RelaxNG schema validation with salve-annos', colors.reset);
    log('  • Progressive schema fallback', colors.reset);
    log('  • Detailed error reporting with fix suggestions', colors.reset);
    log('  • Corpus-wide validation', colors.reset);
  }

  return allPresent;
}

function main() {
  log('\n╔══════════════════════════════════════════════╗', colors.cyan);
  log('║   Effect Migration Rollout & Testing Tool   ║', colors.cyan);
  log('╚══════════════════════════════════════════════╝', colors.cyan);

  // Step 1: Check new validation features
  const validationOk = checkNewValidationFeatures();

  // Step 2: Check build
  const buildOk = checkBuild();

  // Step 3: Run tests
  const testsOk = runTests();

  // Step 4: Enable Effect features
  const flags = enableEffectFeatures();

  // Summary
  log('\n=== Rollout Summary ===\n', colors.cyan);

  if (validationOk && buildOk && testsOk) {
    log('✅ All checks passed! Ready for rollout.', colors.green);
    log('\nNext steps:', colors.blue);
    log('1. Open test-effect-rollout.html in your browser', colors.reset);
    log('2. Test the application with all Effect features enabled', colors.reset);
    log('3. Verify each feature flag works correctly', colors.reset);
    log('4. Report any issues found', colors.reset);

    log('\nEnabled feature flags:', colors.blue);
    flags.forEach(flag => log(`  • ${flag}`, colors.reset));

    log('\nTo disable flags, run in browser console:', colors.yellow);
    log(`  ${flags.map(f => `localStorage.removeItem('${f}')`).join('; ')}`, colors.reset);
  } else {
    log('⚠️  Some checks failed. Please fix before rolling out.', colors.yellow);
  }

  log('\n', colors.reset);
}

main();

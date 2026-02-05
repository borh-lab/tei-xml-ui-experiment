// Test script to enable all Effect feature flags
const fs = require('fs');
const path = require('path');

// Create a test HTML file that enables all feature flags
const testHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Effect Migration Test</title>
  <script>
    // Enable all Effect feature flags before app loads
    localStorage.setItem('feature-useEffectAI', 'true');
    localStorage.setItem('feature-useEffectAnalytics', 'true');
    localStorage.setItem('feature-useEffectEditor', 'true');
    localStorage.setItem('feature-useEffectVisualization', 'true');
    localStorage.setItem('feature-useEffectCorpus', 'true');
    localStorage.setItem('feature-useEffectMisc', 'true');
    
    console.log('✅ All Effect feature flags enabled');
    console.log('Feature flags set:', {
      useEffectAI: localStorage.getItem('feature-useEffectAI'),
      useEffectAnalytics: localStorage.getItem('feature-useEffectAnalytics'),
      useEffectEditor: localStorage.getItem('feature-useEffectEditor'),
      useEffectVisualization: localStorage.getItem('feature-useEffectVisualization'),
      useEffectCorpus: localStorage.getItem('feature-useEffectCorpus'),
      useEffectMisc: localStorage.getItem('feature-useEffectMisc'),
    });
    
    // Redirect to main app
    window.location.href = '/';
  </script>
</head>
<body>
  <h1>Enabling Effect feature flags...</h1>
  <p>Redirecting to app...</p>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'test-effect.html'), testHTML);
console.log('✅ Created test-effect.html');
console.log('Open this file in your browser to test with all Effect features enabled');

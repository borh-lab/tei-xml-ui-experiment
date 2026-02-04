import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // External dependencies:
    "TEI/**",
    "annotation-ml/.venv/**",
    "corpora/**",
    // Git worktrees:
    ".worktrees/**",
    "worktrees/**",
    // Python:
    "**/__pycache__/**",
    "**/*.pyc",
    "**/*.pyo",
    "**/*.pyd",
    ".pytest_cache/**",
    "htmlcov/**",
    // Test fixtures:
    "tests/corpora/**",
    // Node modules in subdirectories:
    "**/node_modules/**",
    ".venv/**",
  ]),
]);

export default eslintConfig;

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '**/components/**/__tests__/**/*.[jt]s?(x)',
    '**/lib/**/__tests__/**/*.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/',
    '<rootDir>/.worktrees/',
    '<rootDir>/tests/effect/services/EntityRepository.test.ts', // Server-only, uses Node.js FileSystem
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-hotkeys-hook|@ax-llm|@radix-ui|@ax-llm/|@effect|@effect/platform)/)',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);

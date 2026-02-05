// @ts-nocheck
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

describe('Project Directory Structure', () => {
  describe('Component Directories', () => {
    const componentDirs = [
      'components/editor',
      'components/visualization',
      'components/character',
      'components/shared',
    ];

    test.each(componentDirs)('%s should exist', (dir) => {
      const dirPath = join(projectRoot, dir);
      expect(existsSync(dirPath)).toBe(true);
      expect(statSync(dirPath).isDirectory()).toBe(true);
    });
  });

  describe('Library Directories', () => {
    const libDirs = [
      'lib/tei',
      'lib/ai',
      'lib/validation',
      'lib/utils',
    ];

    test.each(libDirs)('%s should exist', (dir) => {
      const dirPath = join(projectRoot, dir);
      expect(existsSync(dirPath)).toBe(true);
      expect(statSync(dirPath).isDirectory()).toBe(true);
    });
  });

  describe('Test Directories', () => {
    const testDirs = [
      'tests/unit',
      'tests/integration',
    ];

    test.each(testDirs)('%s should exist', (dir) => {
      const dirPath = join(projectRoot, dir);
      expect(existsSync(dirPath)).toBe(true);
      expect(statSync(dirPath).isDirectory()).toBe(true);
    });
  });

  describe('Public Resource Directories', () => {
    const publicDirs = [
      'public/schemas',
      'public/xslt',
    ];

    test.each(publicDirs)('%s should exist', (dir) => {
      const dirPath = join(projectRoot, dir);
      expect(existsSync(dirPath)).toBe(true);
      expect(statSync(dirPath).isDirectory()).toBe(true);
    });
  });

  describe('Library Index Files', () => {
    const indexFiles = [
      'lib/tei/index.ts',
      'lib/ai/index.ts',
      'lib/validation/index.ts',
    ];

    test.each(indexFiles)('%s should exist', (filePath) => {
      const fullPath = join(projectRoot, filePath);
      expect(existsSync(fullPath)).toBe(true);
      expect(statSync(fullPath).isFile()).toBe(true);
    });
  });
});

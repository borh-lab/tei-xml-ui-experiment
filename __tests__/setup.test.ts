import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectDir = '/home/bor/Projects/tei-xml';

describe('Next.js Project Setup', () => {
  describe('Package.json Configuration', () => {
    it('should have package.json with Next.js and required dependencies', () => {
      const packageJsonPath = join(projectDir, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Check Next.js and core dependencies
      expect(packageJson.dependencies).toHaveProperty('next');
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.dependencies).toHaveProperty('react-dom');

      // Check required TEI parsing dependencies
      expect(packageJson.dependencies).toHaveProperty('fast-xml-parser');
      expect(packageJson.dependencies).toHaveProperty('xmldom');
      expect(packageJson.dependencies).toHaveProperty('zustand');

      // Check dev dependencies
      expect(packageJson.devDependencies).toHaveProperty('typescript');
      expect(packageJson.devDependencies).toHaveProperty('@types/node');
      expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
      expect(packageJson.devDependencies).toHaveProperty('eslint');
      expect(packageJson.devDependencies).toHaveProperty('eslint-config-next');
    });

    it('should have scripts for dev, build, and start', () => {
      const packageJson = JSON.parse(
        readFileSync(join(projectDir, 'package.json'), 'utf-8')
      );

      expect(packageJson.scripts).toHaveProperty('dev');
      expect(packageJson.scripts.dev).toContain('next dev');

      expect(packageJson.scripts).toHaveProperty('build');
      expect(packageJson.scripts.build).toContain('next build');

      expect(packageJson.scripts).toHaveProperty('start');
      expect(packageJson.scripts.start).toContain('next start');
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have tsconfig.json with correct configuration', () => {
      const tsconfigPath = join(projectDir, 'tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      expect(tsconfig.compilerOptions).toHaveProperty('paths');
      expect(tsconfig.compilerOptions.paths).toHaveProperty('@/*');
      expect(tsconfig.compilerOptions.paths['@/*']).toContain('./*');
    });
  });

  describe('TailwindCSS Configuration', () => {
    it('should have postcss.config.js or postcss.config.mjs', () => {
      const postcssConfigPath = join(projectDir, 'postcss.config.js');
      const postcssConfigMjsPath = join(projectDir, 'postcss.config.mjs');
      expect(
        existsSync(postcssConfigPath) || existsSync(postcssConfigMjsPath)
      ).toBe(true);
    });
  });

  describe('Next.js App Structure', () => {
    it('should have app directory structure', () => {
      const appDir = join(projectDir, 'app');
      expect(existsSync(appDir)).toBe(true);
    });

    it('should have layout.tsx in app directory', () => {
      const layoutPath = join(projectDir, 'app', 'layout.tsx');
      expect(existsSync(layoutPath)).toBe(true);
    });

    it('should have page.tsx in app directory', () => {
      const pagePath = join(projectDir, 'app', 'page.tsx');
      expect(existsSync(pagePath)).toBe(true);
    });

    it('should have globals.css with Tailwind import', () => {
      const globalsCssPath = join(projectDir, 'app', 'globals.css');
      expect(existsSync(globalsCssPath)).toBe(true);

      const globalsCss = readFileSync(globalsCssPath, 'utf-8');
      // Next.js 16 uses @import "tailwindcss" instead of @tailwind directives
      expect(globalsCss).toContain('tailwindcss');
    });
  });

  describe('ESLint Configuration', () => {
    it('should have eslint.config.mjs (Next.js 16 format)', () => {
      const eslintConfigPath = join(projectDir, 'eslint.config.mjs');
      expect(existsSync(eslintConfigPath)).toBe(true);

      const eslintConfig = readFileSync(eslintConfigPath, 'utf-8');
      expect(eslintConfig).toContain('eslint-config-next');
    });
  });

  describe('Node Modules', () => {
    it('should have node_modules directory', () => {
      const nodeModulesPath = join(projectDir, 'node_modules');
      expect(existsSync(nodeModulesPath)).toBe(true);
    });

    it('should have next module installed', () => {
      const nextModulePath = join(projectDir, 'node_modules', 'next');
      expect(existsSync(nextModulePath)).toBe(true);
    });

    it('should have fast-xml-parser module installed', () => {
      const fxpModulePath = join(projectDir, 'node_modules', 'fast-xml-parser');
      expect(existsSync(fxpModulePath)).toBe(true);
    });
  });
});

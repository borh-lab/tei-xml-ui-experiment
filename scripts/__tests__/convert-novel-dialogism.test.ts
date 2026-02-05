// @ts-nocheck
import { describe, it, expect, beforeEach } from '@jest/globals';
import { parseQuotationsCSV, parseCharactersCSV, buildCharacterIndex, generateTEIHeader } from '../convert-novel-dialogism';

describe('NovelDialogism Converter', () => {
  describe('CSV Parsing', () => {
    it('should parse quotations CSV', () => {
      const lines = [
        'quoteID,quoteText,speaker,quoteType',
        'q1,"Hello world","char1","explicit"'
      ];
      const quotations = parseQuotationsCSV(lines);
      expect(quotations).toHaveLength(1);
      expect(quotations[0].quoteID).toBe('q1');
      expect(quotations[0].speaker).toBe('char1');
    });

    it('should handle multiple quotations', () => {
      const lines = [
        'quoteID,quoteText,speaker,quoteType',
        'q1,"Text 1","char1","explicit"',
        'q2,"Text 2","char2","implicit"'
      ];
      const quotations = parseQuotationsCSV(lines);
      expect(quotations).toHaveLength(2);
    });

    it('should parse characters CSV', () => {
      const lines = [
        'Character ID,Main Name,Aliases,Gender,Category',
        '0,"John Doe","Johnny|JD",M,major'
      ];
      const characters = parseCharactersCSV(lines);
      expect(characters).toHaveLength(1);
      expect(characters[0]['Character ID']).toBe('0');
      expect(characters[0].Aliases).toBe('Johnny|JD');
    });

    it('should handle characters without aliases', () => {
      const lines = [
        'Character ID,Main Name,Aliases,Gender,Category',
        '1,"Jane Doe",,F,minor'
      ];
      const characters = parseCharactersCSV(lines);
      expect(characters).toHaveLength(1);
      expect(characters[0].Aliases).toBe('');
    });
  });

  describe('Character Index', () => {
    it('should build character index with aliases', () => {
      const characters = [
        {
          'Character ID': '0',
          'Main Name': 'John Doe',
          Aliases: "{'Johnny', 'JD'}",
          Gender: 'M',
          Category: 'major'
        }
      ];

      const index = buildCharacterIndex(characters);

      expect(index.get('0')?.mainName).toBe('John Doe');
      expect(index.get('Johnny')?.mainName).toBe('John Doe');
      expect(index.get('JD')?.mainName).toBe('John Doe');
    });

    it('should handle characters without aliases', () => {
      const characters = [
        {
          'Character ID': '1',
          'Main Name': 'Jane Doe',
          Aliases: '',
          Gender: 'F',
          Category: 'minor'
        }
      ];

      const index = buildCharacterIndex(characters);

      expect(index.get('1')?.mainName).toBe('Jane Doe');
      expect(index.get('1')?.aliases).toEqual([]);
    });

    it('should deduplicate characters by ID', () => {
      const characters = [
        {
          'Character ID': '1',
          'Main Name': 'John',
          Aliases: '',
          Gender: 'M',
          Category: 'major'
        },
        {
          'Character ID': '1',
          'Main Name': 'John',
          Aliases: '',
          Gender: 'M',
          Category: 'major'
        }
      ];

      const index = buildCharacterIndex(characters);
      const unique = Array.from(index.values()).filter((c, idx, arr) => arr.findIndex(x => x.id === c.id) === idx);

      expect(unique).toHaveLength(1);
    });
  });

  describe('TEI Generation', () => {
    it('should generate TEI header with characters', () => {
      const characterIndex = new Map([
        ['0', {
          id: '0',
          mainName: 'John Doe',
          aliases: ['Johnny'],
          gender: 'M',
          category: 'major'
        }]
      ]);

      const header = generateTEIHeader('test-novel', characterIndex);

      expect(header).toContain('<person xml:id="0"');
      expect(header).toContain('novel-dialogism:category="major"');
      expect(header).toContain('sex="M"');
      expect(header).toContain('<persName>John Doe</persName>');
      expect(header).toContain('<alias>Johnny</alias>');
    });

    it('should include required TEI sections', () => {
      const characterIndex = new Map();
      const header = generateTEIHeader('test', characterIndex);

      expect(header).toContain('<teiHeader>');
      expect(header).toContain('<fileDesc>');
      expect(header).toContain('<particDesc>');
      expect(header).toContain('<encodingDesc>');
    });

    it('should handle novel ID with underscores', () => {
      const characterIndex = new Map();
      const header = generateTEIHeader('my_test_novel', characterIndex);

      expect(header).toContain('my test novel');
    });
  });
});

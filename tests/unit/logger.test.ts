// @ts-nocheck
// tests/unit/logger.test.ts

import { logger, setLogLevel, LogLevel } from '@/lib/utils/logger';

describe('Logger Utility', () => {
  // Mock console methods to capture output
  let consoleSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    // Reset log level to info for each test
    setLogLevel('info');
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('Logging Levels', () => {
    test('should log info messages', () => {
      logger.info('Test info message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO ]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test info message'));
    });

    test('should log warning messages', () => {
      logger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN ]'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Test warning message'));
    });

    test('should log error messages', () => {
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
    });

    test('should log debug messages', () => {
      setLogLevel('debug');
      logger.debug('Test debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Test debug message'));
    });
  });

  describe('Log Level Filtering', () => {
    test('should show all logs when level is debug', () => {
      setLogLevel('debug');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should hide debug logs when level is info', () => {
      setLogLevel('info');

      logger.debug('Debug message');
      logger.info('Info message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('should hide debug and info logs when level is warn', () => {
      setLogLevel('warn');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('should only show errors when level is error', () => {
      setLogLevel('error');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should show nothing when level is silent', () => {
      setLogLevel('silent');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Structured Data Logging', () => {
    test('should log with metadata object', () => {
      logger.info('Test message', { userId: '123', action: 'login' });

      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toContain('[INFO ]');
      expect(callArgs[0]).toContain('Test message');
      expect(callArgs[1]).toEqual({
        userId: '123',
        action: 'login',
      });
    });

    test('should log error with error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      const callArgs = consoleErrorSpy.mock.calls[0];
      expect(callArgs[0]).toContain('[ERROR]');
      expect(callArgs[0]).toContain('Error occurred');
      expect(callArgs[1]).toBe(error.message);
      expect(callArgs[2]).toBe(error.stack);
    });

    test('should log with multiple data fields', () => {
      logger.info('Processing dialogue', {
        passageCount: 10,
        confidence: 0.85,
        speakers: ['jane', 'rochester'],
      });

      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toContain('[INFO ]');
      expect(callArgs[0]).toContain('Processing dialogue');
      expect(callArgs[1]).toEqual({
        passageCount: 10,
        confidence: 0.85,
        speakers: ['jane', 'rochester'],
      });
    });
  });

  describe('Contextual Logging', () => {
    test('should create child logger with context', () => {
      const childLogger = logger.withContext({ module: 'AIProvider', provider: 'openai' });

      childLogger.info('Processing text');

      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toContain('[INFO ]');
      expect(callArgs[0]).toContain('Processing text');
      expect(callArgs[1]).toEqual({
        module: 'AIProvider',
        provider: 'openai',
      });
    });

    test('should merge context from parent and child', () => {
      const parentLogger = logger.withContext({ module: 'AIProvider' });
      const childLogger = parentLogger.withContext({ action: 'detectDialogue' });

      childLogger.info('Starting detection');

      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toContain('[INFO ]');
      expect(callArgs[0]).toContain('Starting detection');
      expect(callArgs[1]).toEqual({
        module: 'AIProvider',
        action: 'detectDialogue',
      });
    });

    test('should child logger should inherit parent log level', () => {
      setLogLevel('warn');
      const childLogger = logger.withContext({ module: 'Test' });

      childLogger.info('Info message');
      childLogger.warn('Warning message');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Timestamp Formatting', () => {
    test('should include timestamp in log messages', () => {
      logger.info('Test message');

      const callArgs = consoleSpy.mock.calls[0];
      const message = callArgs[0];

      // Should contain timestamp in ISO format or similar
      expect(message).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should format log entries consistently', () => {
      logger.info('Info message');
      logger.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      // Both should have similar format
      const infoCall = consoleSpy.mock.calls[0][0];
      const warnCall = consoleWarnSpy.mock.calls[0][0];

      expect(infoCall).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] \[INFO \]/);
      expect(warnCall).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] \[WARN \]/);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty message gracefully', () => {
      expect(() => {
        logger.info('');
      }).not.toThrow();
    });

    test('should handle undefined data gracefully', () => {
      expect(() => {
        logger.info('Test', undefined as any);
      }).not.toThrow();
    });

    test('should handle circular references in data', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => {
        logger.info('Circular reference', circular);
      }).not.toThrow();
    });

    test('should handle very long messages', () => {
      const longMessage = 'x'.repeat(10000);

      expect(() => {
        logger.info(longMessage);
      }).not.toThrow();
    });
  });

  describe('Log Level Management', () => {
    test('should return current log level', () => {
      setLogLevel('info');
      const level = logger.getLevel();
      expect(level).toBe('info');
    });

    test('should update log level dynamically', () => {
      setLogLevel('debug');
      logger.debug('Should appear');
      expect(consoleDebugSpy).toHaveBeenCalled();

      consoleDebugSpy.mockClear();
      setLogLevel('error');
      logger.debug('Should not appear');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    test('should handle invalid log levels gracefully', () => {
      expect(() => {
        setLogLevel('invalid' as LogLevel);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should not perform expensive operations for filtered logs', () => {
      setLogLevel('error');

      let expensiveCalled = false;
      const expensiveOperation = () => {
        expensiveCalled = true;
        return 'expensive result';
      };

      // Note: Template literals are evaluated before function call
      // So we need to pass as data parameter to test lazy evaluation
      logger.debug('Result', () => expensiveOperation());

      // The debug message is filtered by log level, so data shouldn't be processed
      expect(expensiveCalled).toBe(false);
    });
  });
});

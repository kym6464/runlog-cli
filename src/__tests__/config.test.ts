import * as path from 'path';
import { getConfig } from '../config';

describe('Config', () => {
  const testHome = '/test/home';
  const defaultClaudeDir = path.join(testHome, '.claude', 'projects');

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment
    process.env.HOME = testHome;
    delete process.env.CLAUDE_DIR;
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.HOME;
    delete process.env.CLAUDE_DIR;
  });

  describe('getConfig', () => {
    it('should use default claudeDir when no environment variable is set', () => {
      const config = getConfig();

      expect(config.claudeDir).toBe(defaultClaudeDir);
    });

    it('should use CLAUDE_DIR environment variable when set', () => {
      process.env.CLAUDE_DIR = '/custom/claude/dir';

      const config = getConfig();

      expect(config.claudeDir).toBe('/custom/claude/dir');
    });

    it('should handle empty HOME environment variable', () => {
      delete process.env.HOME;
      
      const config = getConfig();

      expect(config.claudeDir).toBe(path.join('', '.claude', 'projects'));
    });
  });
});
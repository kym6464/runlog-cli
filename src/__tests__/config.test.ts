import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { getConfig } from '../config';

// Mock modules
jest.mock('fs');
jest.mock('crypto');

describe('Config', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockUUID = 'test-uuid-12345';
  const testHome = '/test/home';
  const defaultClaudeDir = path.join(testHome, '.claude', 'projects');
  const clientIdPath = path.join(defaultClaudeDir, 'client_id.txt');

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment
    process.env.HOME = testHome;
    delete process.env.CLAUDE_DIR;
    delete process.env.RUNLOG_API_ENDPOINT;
    
    // Mock randomUUID
    (randomUUID as jest.Mock).mockReturnValue(mockUUID);
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.HOME;
    delete process.env.CLAUDE_DIR;
    delete process.env.RUNLOG_API_ENDPOINT;
  });

  describe('getConfig', () => {
    it('should use default values when no environment variables are set', () => {
      // Mock that client ID file doesn't exist yet
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const config = getConfig();

      expect(config.apiEndpoint).toBe('https://api.runlog.io');
      expect(config.claudeDir).toBe(defaultClaudeDir);
      expect(config.clientId).toBe(mockUUID);
    });

    it('should use environment variables when set', () => {
      process.env.RUNLOG_API_ENDPOINT = 'http://localhost:3000';
      process.env.CLAUDE_DIR = '/custom/claude/dir';
      
      const customClientIdPath = path.join('/custom/claude/dir', 'client_id.txt');
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const config = getConfig();

      expect(config.apiEndpoint).toBe('http://localhost:3000');
      expect(config.claudeDir).toBe('/custom/claude/dir');
      expect(mockFs.existsSync).toHaveBeenCalledWith(customClientIdPath);
    });
  });

  describe('client ID generation and persistence', () => {
    it('should generate and save new client ID when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const config = getConfig();

      // Verify directory creation
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(defaultClaudeDir, { recursive: true });
      
      // Verify file write
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(clientIdPath, mockUUID, 'utf8');
      
      // Verify returned client ID
      expect(config.clientId).toBe(mockUUID);
    });

    it('should read existing client ID when file exists', () => {
      const existingClientId = 'existing-client-id-789';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(existingClientId + '\n');

      const config = getConfig();

      // Verify file read
      expect(mockFs.readFileSync).toHaveBeenCalledWith(clientIdPath, 'utf8');
      
      // Verify no write occurred
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      
      // Verify returned client ID (should be trimmed)
      expect(config.clientId).toBe(existingClientId);
    });

    it('should return same client ID on multiple calls', () => {
      // First call - file doesn't exist
      mockFs.existsSync.mockReturnValueOnce(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => {});

      const config1 = getConfig();
      expect(config1.clientId).toBe(mockUUID);

      // Second call - file now exists
      mockFs.existsSync.mockReturnValueOnce(true);
      mockFs.readFileSync.mockReturnValue(mockUUID);

      const config2 = getConfig();
      expect(config2.clientId).toBe(mockUUID);
    });

    it('should handle spaces and newlines in existing client ID', () => {
      const clientIdWithSpaces = '  spaced-client-id-123  \n\n';
      const expectedClientId = 'spaced-client-id-123';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(clientIdWithSpaces);

      const config = getConfig();

      expect(config.clientId).toBe(expectedClientId);
    });

    it('should handle file system errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // This should throw the error up to the caller
      expect(() => getConfig()).toThrow('Permission denied');
    });
  });
});
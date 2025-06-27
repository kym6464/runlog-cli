import { jest } from '@jest/globals';

// Mock all dependencies before importing
jest.mock('chalk', () => ({
  default: {
    bold: {
      blue: jest.fn(str => str),
    },
    gray: jest.fn(str => str),
    green: jest.fn(str => str),
    yellow: jest.fn(str => str),
    cyan: jest.fn(str => str),
    red: jest.fn(str => str),
    white: jest.fn(str => str),
  }
}));

jest.mock('ora', () => ({
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }))
}));

jest.mock('../parser');
jest.mock('../api');
jest.mock('../config');
jest.mock('../interactive-selector');

describe('CLI Commands', () => {
  let mockConsoleLog: any;
  let mockConsoleError: any;
  let mockProcessExit: any;
  let mockProcessArgv: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });

    // Store original argv
    mockProcessArgv = process.argv;
  });

  afterEach(() => {
    // Restore mocks
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
    process.argv = mockProcessArgv;
  });

  describe('--help command', () => {
    it('should display help information when --help is passed', async () => {
      process.argv = ['node', 'index.js', '--help'];
      
      // Import after setting argv
      await import('../index');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that help text was displayed
      expect(mockConsoleLog).toHaveBeenCalled();
      const helpOutput = mockConsoleLog.mock.calls.flat().join('\n');
      
      expect(helpOutput).toContain('runlog - Claude Code Conversation Uploader');
      expect(helpOutput).toContain('Usage: runlog [command] [options]');
      expect(helpOutput).toContain('Commands:');
      expect(helpOutput).toContain('runlog              Upload a conversation');
      expect(helpOutput).toContain('runlog del <uuid>   Delete a conversation');
      expect(helpOutput).toContain('runlog --help       Show this help message');
      expect(helpOutput).toContain('Examples:');
      expect(helpOutput).toContain('Environment Variables:');
      expect(helpOutput).toContain('RUNLOG_API_ENDPOINT');
      expect(helpOutput).toContain('CLAUDE_DIR');
    });

    it('should display help information when -h is passed', async () => {
      process.argv = ['node', 'index.js', '-h'];
      
      // Clear module cache to reimport
      jest.resetModules();
      await import('../index');
      
      await new Promise(resolve => setTimeout(resolve, 0));

      const helpOutput = mockConsoleLog.mock.calls.flat().join('\n');
      expect(helpOutput).toContain('runlog - Claude Code Conversation Uploader');
    });
  });

  describe('del command', () => {
    let mockApiClient: any;
    let mockGetConfig: jest.Mock;

    beforeEach(() => {
      // Set up mocks for delete command
      const { getConfig } = require('../config');
      mockGetConfig = getConfig as jest.Mock;
      mockGetConfig.mockReturnValue({
        apiEndpoint: 'http://localhost:3000',
        claudeDir: '/test/.claude/projects',
        clientId: 'test-client-id'
      });

      const { ApiClient } = require('../api');
      mockApiClient = {
        deleteConversation: jest.fn()
      };
      (ApiClient as jest.Mock).mockImplementation(() => mockApiClient);
    });

    it('should delete conversation with valid UUID', async () => {
      process.argv = ['node', 'index.js', 'del', 'test-uuid-123'];
      mockApiClient.deleteConversation.mockResolvedValue(undefined);

      jest.resetModules();
      
      try {
        await import('../index');
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error: any) {
        // Process.exit was called
        expect(error.message).not.toContain('Process exited with code 1');
      }

      expect(mockApiClient.deleteConversation).toHaveBeenCalledWith('test-uuid-123');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Conversation has been deleted'));
    });

    it('should handle delete alias', async () => {
      process.argv = ['node', 'index.js', 'delete', 'test-uuid-123'];
      mockApiClient.deleteConversation.mockResolvedValue(undefined);

      jest.resetModules();
      
      try {
        await import('../index');
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error: any) {
        expect(error.message).not.toContain('Process exited with code 1');
      }

      expect(mockApiClient.deleteConversation).toHaveBeenCalledWith('test-uuid-123');
    });

    it('should show error when UUID is missing', async () => {
      process.argv = ['node', 'index.js', 'del'];

      jest.resetModules();
      
      try {
        await import('../index');
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Missing conversation UUID'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Usage: runlog del <uuid>'));
    });

    it('should handle deletion errors', async () => {
      process.argv = ['node', 'index.js', 'del', 'test-uuid-123'];
      mockApiClient.deleteConversation.mockRejectedValue(new Error('Unauthorized'));

      jest.resetModules();
      
      try {
        await import('../index');
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Unauthorized'));
    });
  });

  describe('unknown command', () => {
    it('should show error and help for unknown commands', async () => {
      process.argv = ['node', 'index.js', 'unknown-command'];

      jest.resetModules();
      
      try {
        await import('../index');
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 1');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Unknown command "unknown-command"'));
      
      // Should also show help
      const output = mockConsoleLog.mock.calls.flat().join('\n');
      expect(output).toContain('Usage: runlog [command] [options]');
    });
  });

  describe('default upload command', () => {
    let mockParser: any;
    let mockApiClient: any;
    let mockSelector: any;

    beforeEach(() => {
      // Set up mocks for upload command
      const { getConfig } = require('../config');
      (getConfig as jest.Mock).mockReturnValue({
        apiEndpoint: 'http://localhost:3000',
        claudeDir: '/test/.claude/projects',
        clientId: 'test-client-id'
      });

      const { ConversationParser } = require('../parser');
      mockParser = {
        getAllConversations: jest.fn(),
        getConversationContent: jest.fn()
      };
      (ConversationParser as jest.Mock).mockImplementation(() => mockParser);

      const { ApiClient } = require('../api');
      mockApiClient = {
        uploadConversation: jest.fn(),
        getShareUrl: jest.fn()
      };
      (ApiClient as jest.Mock).mockImplementation(() => mockApiClient);

      const { InteractiveSelector } = require('../interactive-selector');
      mockSelector = {
        select: jest.fn()
      };
      (InteractiveSelector as jest.Mock).mockImplementation(() => mockSelector);

      // Mock readline
      jest.spyOn(process.stdin, 'removeAllListeners').mockImplementation(() => process.stdin);
      jest.spyOn(process.stdin, 'pause').mockImplementation(() => process.stdin);
      jest.spyOn(process.stdin, 'resume').mockImplementation(() => process.stdin);
      jest.spyOn(process.stdin, 'setRawMode').mockImplementation(() => process.stdin);
    });

    it('should handle no conversations found', async () => {
      process.argv = ['node', 'index.js'];
      mockParser.getAllConversations.mockResolvedValue([]);

      jest.resetModules();
      
      try {
        await import('../index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 0');
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No conversations found'));
    });

    it('should handle conversation selection cancellation', async () => {
      process.argv = ['node', 'index.js'];
      mockParser.getAllConversations.mockResolvedValue([
        { id: '1', summary: 'Test conversation', messageCount: 10 }
      ]);
      mockSelector.select.mockResolvedValue(null);

      jest.resetModules();
      
      try {
        await import('../index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        expect(error.message).toContain('Process exited with code 0');
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Cancelled'));
    });
  });
});
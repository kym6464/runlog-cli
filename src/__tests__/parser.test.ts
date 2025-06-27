import { ConversationParser } from '../parser';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('ConversationParser', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  let parser: ConversationParser;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = new ConversationParser('/mock/claude/dir');
  });

  describe('parseConversation', () => {
    it('should parse a valid JSONL conversation', async () => {
      const mockContent = `
{"sessionId":"test-123","type":"user","message":{"content":"Hello"},"timestamp":"2025-06-24T10:00:00Z"}
{"type":"summary","content":"Summary"}
{"sessionId":"test-123","type":"assistant","message":{"content":"Hi there"},"timestamp":"2025-06-24T10:00:05Z"}
{"sessionId":"test-123","type":"tool","timestamp":"2025-06-24T10:00:10Z"}
      `.trim();

      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await parser.parseConversation('/mock/project/test.jsonl');

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe('test-123');
      expect(result?.messageCount).toBe(3); // Excludes summary
      expect(result?.projectName).toBe('project');
      expect(result?.lastMessageTime).toEqual(new Date('2025-06-24T10:00:10Z'));
    });

    it('should handle empty files', async () => {
      mockFs.readFile.mockResolvedValue('');
      
      const result = await parser.parseConversation('/mock/project/empty.jsonl');
      expect(result).toBeNull();
    });

    it('should handle invalid JSON lines gracefully', async () => {
      const mockContent = `
{"sessionId":"test-123","type":"user","timestamp":"2025-06-24T10:00:00Z"}
invalid json line
{"sessionId":"test-123","type":"assistant","timestamp":"2025-06-24T10:00:05Z"}
      `.trim();

      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await parser.parseConversation('/mock/project/test.jsonl');
      
      expect(result).toBeDefined();
      expect(result?.messageCount).toBe(2); // Only valid lines
    });

    it('should parse Unix timestamps', async () => {
      const mockContent = `
{"sessionId":"test-123","type":"user","timestamp":1719225600}
{"sessionId":"test-123","type":"assistant","timestamp":1719225605}
      `.trim();

      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await parser.parseConversation('/mock/project/test.jsonl');
      
      expect(result).toBeDefined();
      expect(result?.lastMessageTime).toEqual(new Date(1719225605 * 1000));
    });
  });

  describe('getAllConversations', () => {
    it('should find JSONL files only for current working directory', async () => {
      // Mock process.cwd to return a specific path
      jest.spyOn(process, 'cwd').mockReturnValue('/Users/test/project1');
      
      mockFs.readdir.mockImplementation(async (dir) => {
        if (dir === '/mock/claude/dir') {
          return ['-Users-test-project1', '-Users-test-project2'] as any;
        }
        if (dir === '/mock/claude/dir/-Users-test-project1') {
          return ['conv1.jsonl', 'conv2.jsonl', 'other.txt'] as any;
        }
        if (dir === '/mock/claude/dir/-Users-test-project2') {
          return ['conv3.jsonl'] as any;
        }
        return [] as any;
      });

      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.readFile.mockResolvedValue('{"sessionId":"test","type":"user","timestamp":"2025-06-24T10:00:00Z"}');

      const result = await parser.getAllConversations();

      expect(result).toHaveLength(2); // Only from project1
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should sort conversations by last message time', async () => {
      // Mock process.cwd to return a specific path
      jest.spyOn(process, 'cwd').mockReturnValue('/test/project1');
      
      mockFs.readdir.mockImplementation(async (dir) => {
        if (dir === '/mock/claude/dir') {
          return ['-test-project1'] as any;
        }
        if (dir === '/mock/claude/dir/-test-project1') {
          return ['conv1.jsonl', 'conv2.jsonl'] as any;
        }
        return [] as any;
      });

      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      
      mockFs.readFile.mockImplementation(async (filePath) => {
        const pathStr = String(filePath);
        if (pathStr.includes('conv1')) {
          return '{"sessionId":"1","type":"user","timestamp":"2025-06-24T10:00:00Z"}';
        }
        return '{"sessionId":"2","type":"user","timestamp":"2025-06-24T11:00:00Z"}';
      });

      const result = await parser.getAllConversations();

      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe('2'); // More recent first
      expect(result[1].sessionId).toBe('1');
    });

    it('should handle missing Claude directory', async () => {
      mockFs.readdir.mockRejectedValue({ code: 'ENOENT' });

      await expect(parser.getAllConversations()).rejects.toThrow('Claude directory not found');
    });
  });
});
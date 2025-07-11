// Mock dependencies
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    close: jest.fn(),
  })),
  emitKeypressEvents: jest.fn(),
}));
jest.mock('../parser');
jest.mock('chalk');

import { InteractiveSelector } from '../interactive-selector';
import { ConversationParser } from '../parser';
import { ConversationMetadata, MessagePreview } from '../types';
import { EventEmitter } from 'events';

describe('InteractiveSelector', () => {
  let mockParser: jest.Mocked<ConversationParser>;
  let selector: InteractiveSelector;
  let mockStdin: any;
  let mockConversations: ConversationMetadata[];
  let consoleLogSpy: jest.SpyInstance;
  let consoleClearSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mock conversations
    mockConversations = [
      {
        filePath: '/path/to/conv1.jsonl',
        projectName: 'project1',
        sessionId: 'session1',
        messageCount: 100,
        firstMessageTime: new Date('2024-01-01'),
        lastMessageTime: new Date('2024-01-02'),
        activeTime: 3600000, // 1 hour
      },
      {
        filePath: '/path/to/conv2.jsonl',
        projectName: 'project2',
        sessionId: 'session2',
        messageCount: 200,
        firstMessageTime: new Date('2024-01-03'),
        lastMessageTime: new Date('2024-01-04'),
        activeTime: 7200000, // 2 hours
        matchCount: 5,
      },
    ];

    // Setup mock parser
    mockParser = new ConversationParser() as jest.Mocked<ConversationParser>;
    mockParser.getMessageCount = jest.fn().mockResolvedValue(100);
    mockParser.getMessages = jest.fn().mockResolvedValue([
      {
        type: 'user',
        timestamp: new Date('2024-01-01T10:00:00'),
        content: 'Hello',
        role: 'user',
      },
      {
        type: 'assistant',
        timestamp: new Date('2024-01-01T10:00:30'),
        content: 'Hi there!',
        role: 'assistant',
      },
    ] as MessagePreview[]);
    mockParser.searchConversations = jest.fn().mockImplementation(async (searchTerm: string) => {
      if (!searchTerm) return mockConversations;
      return mockConversations.filter(conv => 
        conv.projectName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Setup mock stdin
    mockStdin = new EventEmitter();
    mockStdin.setRawMode = jest.fn();
    mockStdin.isTTY = true;
    mockStdin.removeAllListeners = jest.fn();

    // Mock process.stdin
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
    });

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleClearSpy = jest.spyOn(console, 'clear').mockImplementation();

    // Mock stdout dimensions
    Object.defineProperty(process.stdout, 'rows', {
      value: 24,
      writable: true,
    });
    Object.defineProperty(process.stdout, 'columns', {
      value: 80,
      writable: true,
    });

    // Create selector instance
    selector = new InteractiveSelector({
      conversations: mockConversations,
      parser: mockParser,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Navigation', () => {
    it('should navigate down in list mode', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Press down arrow
      mockStdin.emit('keypress', '', { name: 'down' });

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      const result = await selectPromise;
      expect(result).toBeNull();
    });

    it('should navigate up in list mode', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Navigate down then up
      mockStdin.emit('keypress', '', { name: 'down' });
      mockStdin.emit('keypress', '', { name: 'up' });

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      const result = await selectPromise;
      expect(result).toBeNull();
    });

    it('should enter preview mode with right arrow', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Press right arrow
      mockStdin.emit('keypress', '', { name: 'right' });

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      expect(mockParser.getMessageCount).toHaveBeenCalledWith(mockConversations[0].filePath);
      expect(mockParser.getMessages).toHaveBeenCalledWith(mockConversations[0].filePath, 0, 50);

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });

    it('should return from preview mode with left arrow', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Enter preview mode
      mockStdin.emit('keypress', '', { name: 'right' });
      await new Promise(resolve => setImmediate(resolve));

      // Return to list mode
      mockStdin.emit('keypress', '', { name: 'left' });

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });
  });

  describe('Search functionality', () => {
    it('should enter search mode with / key', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Press / to enter search mode
      mockStdin.emit('keypress', '/', { name: 'slash' });

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });

    it('should search and filter conversations', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Enter search mode
      mockStdin.emit('keypress', '/', { name: 'slash' });

      // Type search term
      mockStdin.emit('keypress', 'p', { name: 'p' });
      mockStdin.emit('keypress', 'r', { name: 'r' });
      mockStdin.emit('keypress', 'o', { name: 'o' });
      mockStdin.emit('keypress', 'j', { name: 'j' });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockParser.searchConversations).toHaveBeenCalledWith('proj', process.cwd());

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });

    it('should handle backspace in search mode', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Enter search mode and type
      mockStdin.emit('keypress', '/', { name: 'slash' });
      mockStdin.emit('keypress', 'a', { name: 'a' });
      mockStdin.emit('keypress', 'b', { name: 'b' });
      mockStdin.emit('keypress', 'c', { name: 'c' });

      // Backspace
      mockStdin.emit('keypress', '', { name: 'backspace' });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockParser.searchConversations).toHaveBeenCalledWith('ab', process.cwd());

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });

    it('should maintain search state when entering and exiting preview', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Enter search mode and search
      mockStdin.emit('keypress', '/', { name: 'slash' });
      mockStdin.emit('keypress', 't', { name: 't' });
      mockStdin.emit('keypress', 'e', { name: 'e' });
      mockStdin.emit('keypress', 's', { name: 's' });
      mockStdin.emit('keypress', 't', { name: 't' });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Enter preview mode from search
      mockStdin.emit('keypress', '', { name: 'right' });
      await new Promise(resolve => setImmediate(resolve));

      // Return to search mode
      mockStdin.emit('keypress', '', { name: 'left' });

      // The search should still be active
      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });

    it('should allow navigation while in search mode', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Enter search mode
      mockStdin.emit('keypress', '/', { name: 'slash' });

      // Navigate while in search mode
      mockStdin.emit('keypress', '', { name: 'down' });
      mockStdin.emit('keypress', '', { name: 'up' });

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });
  });

  describe('Selection', () => {
    it('should select conversation with enter key', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Press enter to select
      mockStdin.emit('keypress', '', { name: 'return' });

      const result = await selectPromise;
      expect(result).toEqual(mockConversations[0]);
    });

    it('should select conversation from search results', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Enter search mode
      mockStdin.emit('keypress', '/', { name: 'slash' });

      // Search for project2
      mockStdin.emit('keypress', 'p', { name: 'p' });
      mockStdin.emit('keypress', 'r', { name: 'r' });
      mockStdin.emit('keypress', 'o', { name: 'o' });
      mockStdin.emit('keypress', 'j', { name: 'j' });
      mockStdin.emit('keypress', 'e', { name: 'e' });
      mockStdin.emit('keypress', 'c', { name: 'c' });
      mockStdin.emit('keypress', 't', { name: 't' });
      mockStdin.emit('keypress', '2', { name: '2' });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Select with enter
      mockStdin.emit('keypress', '', { name: 'return' });

      const result = await selectPromise;
      expect(result?.projectName).toBe('project2');
    });
  });

  describe('Exit behavior', () => {
    it('should always exit on escape key', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Press escape
      mockStdin.emit('keypress', '', { name: 'escape' });

      const result = await selectPromise;
      expect(result).toBeNull();
    });

    it('should exit on ctrl+c', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Press ctrl+c
      mockStdin.emit('keypress', '', { ctrl: true, name: 'c' });

      const result = await selectPromise;
      expect(result).toBeNull();
    });
  });

  describe('Preview scrolling', () => {
    it('should scroll messages in preview mode', async () => {
      const selectPromise = selector.select();

      // Wait for initial render
      await new Promise(resolve => setImmediate(resolve));

      // Enter preview mode
      mockStdin.emit('keypress', '', { name: 'right' });
      await new Promise(resolve => setImmediate(resolve));

      // Scroll up (newer messages)
      mockStdin.emit('keypress', '', { name: 'up' });

      // Scroll down (older messages)
      mockStdin.emit('keypress', '', { name: 'down' });

      // Press escape to exit
      mockStdin.emit('keypress', '', { name: 'escape' });

      await selectPromise;
    });
  });
});
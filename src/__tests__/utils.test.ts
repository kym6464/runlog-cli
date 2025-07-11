import { formatDate, formatProjectName, formatConversationLine } from '../utils';

// Mock date-fns to have consistent output
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    const d = new Date(date);
    if (formatStr === 'HH:mm') return '14:30';
    if (formatStr === 'EEEE HH:mm') return 'Monday 14:30';
    if (formatStr === 'MMM d, yyyy HH:mm') return 'Jun 24, 2025 14:30';
    if (formatStr === 'MMM d, yyyy') return 'Jun 10, 2025';
    return d.toISOString();
  }),
  formatDistanceToNow: jest.fn(() => '2 hours ago')
}));

describe('utils', () => {
  describe('formatDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-24T16:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Unknown" for null date', () => {
      expect(formatDate(null)).toBe('Unknown');
    });

    it('should format recent dates as relative time', () => {
      const twoHoursAgo = new Date('2025-06-24T14:00:00Z');
      expect(formatDate(twoHoursAgo)).toBe('2 hours ago');
    });

    it('should format yesterday\'s date', () => {
      const yesterday = new Date('2025-06-23T14:30:00Z');
      expect(formatDate(yesterday)).toBe('1 day ago');
    });

    it('should format dates within a week', () => {
      const threeDaysAgo = new Date('2025-06-21T14:30:00Z');
      expect(formatDate(threeDaysAgo)).toBe('3 days ago');
    });

    it('should format older dates with full date', () => {
      const twoWeeksAgo = new Date('2025-06-10T14:30:00Z');
      expect(formatDate(twoWeeksAgo)).toBe('Jun 10, 2025');
    });
  });

  describe('formatProjectName', () => {
    it('should return short names unchanged', () => {
      expect(formatProjectName('my-project')).toBe('my-project');
    });

    it('should truncate long names', () => {
      const longName = 'this-is-a-very-long-project-name-that-should-be-truncated';
      const result = formatProjectName(longName);
      expect(result).toHaveLength(40);
      expect(result).toMatch(/\.\.\.$/);
    });
  });

  describe('formatConversationLine', () => {
    it('should format conversation line with all details', () => {
      // Use a date that's about 4 days ago from current date
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const result = formatConversationLine('my-project', fourDaysAgo, 42);
      
      // Check that it contains the expected parts (without checking exact chalk formatting)
      expect(result).toContain('4 days ago');
      expect(result).toContain('42 messages');
    });

    it('should handle null date', () => {
      const result = formatConversationLine('my-project', null, 10);
      
      expect(result).toContain('Unknown');
      expect(result).toContain('10 messages');
    });
  });
});
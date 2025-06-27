import * as fs from 'fs/promises';
import * as path from 'path';
import { ConversationMetadata, Message, MessagePreview } from './types.js';

export class ConversationParser {
  private readonly claudeDir: string;

  constructor(claudeDir: string = path.join(process.env.HOME || '', '.claude', 'projects')) {
    this.claudeDir = claudeDir;
  }

  async getAllConversations(currentWorkingDir?: string): Promise<ConversationMetadata[]> {
    const conversations: ConversationMetadata[] = [];
    const cwd = currentWorkingDir || process.cwd();

    // Convert current working directory to Claude project format
    // e.g., /Users/x/Documents/code/projects/runlog -> -Users-x-Documents-code-projects-runlog
    const cwdSegments = cwd.split(path.sep).filter(s => s);
    const claudeProjectName = '-' + cwdSegments.join('-');

    try {
      const projects = await fs.readdir(this.claudeDir);

      for (const project of projects) {
        // Only process the project that matches current working directory
        if (project !== claudeProjectName) {
          continue;
        }

        const projectPath = path.join(this.claudeDir, project);
        const stat = await fs.stat(projectPath);

        if (stat.isDirectory()) {
          const files = await fs.readdir(projectPath);
          const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

          for (const file of jsonlFiles) {
            const filePath = path.join(projectPath, file);
            const metadata = await this.parseConversation(filePath);
            if (metadata) {
              conversations.push(metadata);
            }
          }
        }
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`Claude directory not found: ${this.claudeDir}`);
      }
      throw error;
    }

    // Sort by last message time, most recent first
    return conversations.sort((a, b) => {
      const timeA = a.lastMessageTime?.getTime() || 0;
      const timeB = b.lastMessageTime?.getTime() || 0;
      return timeB - timeA;
    });
  }

  async parseConversation(filePath: string): Promise<ConversationMetadata | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return null;
      }

      const messages: Message[] = [];
      let sessionId: string | null = null;

      for (const line of lines) {
        try {
          const data = JSON.parse(line);

          // Skip summary and meta messages
          if (data.type === 'summary' || data.isMeta === true) {
            continue;
          }

          if (data.sessionId && !sessionId) {
            sessionId = data.sessionId;
          }

          messages.push(data);
        } catch (err) {
          // Skip invalid JSON lines
          continue;
        }
      }

      if (messages.length === 0 || !sessionId) {
        return null;
      }

      // Extract project name from path
      const projectPath = path.dirname(filePath);
      const projectName = path.basename(projectPath)
        .replace(/^-Users-[^-]+-/, '') // Remove user prefix
        .replace(/-/g, '/'); // Convert dashes back to slashes

      // Get timestamps
      const timestamps = messages
        .map(msg => this.parseTimestamp(msg.timestamp))
        .filter(ts => ts !== null) as Date[];

      const firstMessageTime = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;
      const lastMessageTime = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null;

      // Calculate active conversation time
      const activeTime = this.calculateActiveTime(messages);

      // Generate conversation summary
      const summary = this.generateConversationSummary(messages);

      return {
        filePath,
        projectName,
        sessionId,
        messageCount: messages.length,
        firstMessageTime,
        lastMessageTime,
        activeTime,
        summary
      };
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
  }

  private parseTimestamp(timestamp: string | number): Date | null {
    if (!timestamp) return null;

    try {
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      } else {
        // Unix timestamp (seconds or milliseconds)
        const ts = timestamp > 1e10 ? timestamp : timestamp * 1000;
        return new Date(ts);
      }
    } catch {
      return null;
    }
  }

  async getConversationContent(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async getMessageCount(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      let count = 0;

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type !== 'summary' && data.isMeta !== true) {
            count++;
          }
        } catch {
          continue;
        }
      }

      return count;
    } catch {
      return 0;
    }
  }

  async getMessages(filePath: string, offset: number = 0, count: number = 10): Promise<MessagePreview[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      const allMessages: MessagePreview[] = [];

      // First pass: collect all valid messages
      for (let i = 0; i < lines.length; i++) {
        try {
          const data = JSON.parse(lines[i]);

          // Skip summary and meta messages
          if (data.type === 'summary' || data.isMeta === true) {
            continue;
          }

          // Extract content based on message type
          let content = '';
          let role = data.type;

          if (data.type === 'user' || data.type === 'assistant') {
            if (data.message?.content) {
              if (typeof data.message.content === 'string') {
                content = data.message.content;
              } else if (Array.isArray(data.message.content)) {
                // Handle array content (e.g., with images)
                content = data.message.content
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item.type === 'text' && item.text) return item.text;
                    if (item.type === 'image') return '[Image]';
                    return '';
                  })
                  .filter(Boolean)
                  .join(' ');
              }
            }
            role = data.message?.role || data.type;
          } else if (data.type === 'thinking') {
            content = data.message?.content || data.thinkingBlock?.content || '';
          }

          if (content) {
            // Truncate long messages for preview
            if (content.length > 200) {
              content = content.substring(0, 197) + '...';
            }

            allMessages.push({
              type: data.type,
              timestamp: this.parseTimestamp(data.timestamp) || new Date(),
              content: content.trim(),
              role
            });
          }
        } catch (err) {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Return requested slice
      return allMessages.slice(offset, offset + count);
    } catch (error) {
      console.error(`Error getting last messages from ${filePath}:`, error);
      return [];
    }
  }

  async searchConversations(searchTerm: string, currentWorkingDir?: string): Promise<ConversationMetadata[]> {
    const allConversations = await this.getAllConversations(currentWorkingDir);
    if (!searchTerm.trim()) {
      return allConversations.map(conv => ({ ...conv, matchCount: undefined }));
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const conversationsWithMatches: ConversationMetadata[] = [];

    for (const conversation of allConversations) {
      try {
        const content = await fs.readFile(conversation.filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        let matchCount = 0;

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            // Skip summary and meta messages
            if (data.type === 'summary' || data.isMeta === true) {
              continue;
            }

            // Check message content
            let messageContent = '';
            if (data.type === 'user' || data.type === 'assistant') {
              const content = data.message?.content;
              if (typeof content === 'string') {
                messageContent = content;
              } else if (Array.isArray(content)) {
                messageContent = content
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item.type === 'text' && item.text) return item.text;
                    return '';
                  })
                  .filter(Boolean)
                  .join(' ');
              }
            } else if (data.type === 'thinking') {
              messageContent = data.message?.content || data.thinkingBlock?.content || '';
            }

            if (messageContent.toLowerCase().includes(lowerSearchTerm)) {
              matchCount++;
            }
          } catch {
            continue;
          }
        }

        if (matchCount > 0) {
          conversationsWithMatches.push({
            ...conversation,
            matchCount
          });
        }
      } catch (error) {
        console.error(`Error searching ${conversation.filePath}:`, error);
      }
    }

    // Sort by match count (highest first), then by time
    return conversationsWithMatches.sort((a, b) => {
      const matchDiff = (b.matchCount || 0) - (a.matchCount || 0);
      if (matchDiff !== 0) return matchDiff;

      const timeA = a.lastMessageTime?.getTime() || 0;
      const timeB = b.lastMessageTime?.getTime() || 0;
      return timeB - timeA;
    });
  }

  private generateConversationSummary(messages: Message[]): string {
    if (messages.length === 0) return '';

    // Get first user message for summary
    const firstUserMsg = messages.find(m => m.type === 'user');

    if (firstUserMsg?.message?.content) {
      const userContent = this.extractTextContent(firstUserMsg.message.content);
      if (userContent) {
        // Take first 60 chars and capitalize
        let summary = userContent.substring(0, 60).trim();
        // Capitalize first letter
        summary = summary.charAt(0).toUpperCase() + summary.slice(1);
        if (userContent.length > 60) {
          summary += '...';
        }
        return summary;
      }
    }

    return 'Empty conversation';
  }

  private extractTextContent(content: string | any[]): string {
    if (typeof content === 'string') {
      return content.replace(/\s+/g, ' ').trim();
    } else if (Array.isArray(content)) {
      return content
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item.type === 'text' && item.text) return item.text;
          if (item.type === 'image') return '[Image]';
          return '';
        })
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return '';
  }

  private calculateActiveTime(messages: Message[]): number {
    if (messages.length < 2) return 0;

    // Sort by timestamp
    const sorted = [...messages].sort((a, b) => {
      const timeA = this.parseTimestamp(a.timestamp)?.getTime() || 0;
      const timeB = this.parseTimestamp(b.timestamp)?.getTime() || 0;
      return timeA - timeB;
    });

    // First, collect AI→User intervals to determine threshold
    const aiToUserIntervals: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1];
      const curr = sorted[i];

      if (prev.type === 'assistant' && curr.type === 'user') {
        const prevTime = this.parseTimestamp(prev.timestamp);
        const currTime = this.parseTimestamp(curr.timestamp);

        if (prevTime && currTime) {
          aiToUserIntervals.push(currTime.getTime() - prevTime.getTime());
        }
      }
    }

    // Calculate threshold (95th percentile of AI→User intervals)
    // Using 95th percentile to be more inclusive of user writing time
    let threshold = 10 * 60 * 1000; // 10 minutes default
    if (aiToUserIntervals.length > 0) {
      const sortedIntervals = [...aiToUserIntervals].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedIntervals.length * 0.95);
      threshold = sortedIntervals[p95Index] || sortedIntervals[sortedIntervals.length - 1];

      // Also apply a minimum threshold of 10 minutes to catch normal writing time
      threshold = Math.max(threshold, 10 * 60 * 1000);
    }

    // Now calculate total active time
    let totalTime = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1];
      const curr = sorted[i];
      const prevTime = this.parseTimestamp(prev.timestamp);
      const currTime = this.parseTimestamp(curr.timestamp);

      if (prevTime && currTime) {
        const interval = currTime.getTime() - prevTime.getTime();

        if (curr.type === 'assistant') {
          // Always include intervals ending with AI (AI working)
          totalTime += interval;
        } else if (curr.type === 'user' && interval < threshold) {
          // Include AI→User intervals only if under threshold (user actively engaged)
          totalTime += interval;
        }
      }
    }

    return totalTime;
  }
}
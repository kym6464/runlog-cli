import chalk from 'chalk';
import Table from 'cli-table3';
import { ConversationMetadata, MessagePreview } from './types.js';
import { formatConversationLine, formatDate, formatDuration } from './utils.js';
import { ConversationParser } from './parser.js';
import * as readline from 'readline';

interface SelectorOptions {
  conversations: ConversationMetadata[];
  parser: ConversationParser;
}

type SortMode = 'time' | 'messages' | 'active';

export class InteractiveSelector {
  private conversations: ConversationMetadata[];
  private parser: ConversationParser;
  private selectedIndex: number = 0;
  private isPreviewMode: boolean = false;
  private isSearchMode: boolean = false;
  private searchTerm: string = '';
  private allConversations: ConversationMetadata[] = []; // Original list before search
  private previewMessages: MessagePreview[] = [];
  private allPreviewMessages: MessagePreview[] = []; // Cache all messages
  private previewOffset: number = 0; // Current message offset from start
  private sortMode: SortMode = 'time';
  private sortDescending: boolean = true;
  private get messagesPerPage(): number {
    // Calculate available lines: total height - header lines - footer lines
    const terminalHeight = process.stdout.rows || 24;
    const headerLines = 8; // Title, instructions, conversation info, separator
    const footerLines = 3; // Separator and status line
    return Math.max(5, terminalHeight - headerLines - footerLines);
  }
  private totalMessages: number = 0; // Total messages in conversation
  private loadedUpTo: number = 0; // Index up to which we've loaded
  private loadedFrom: number = 0; // Index from which we've loaded
  private rl: readline.Interface;
  private searchDebounceTimer: NodeJS.Timeout | null = null;
  private isSearching: boolean = false;
  private wasInSearchMode: boolean = false; // Track if we were in search mode before preview

  constructor(options: SelectorOptions) {
    this.conversations = options.conversations;
    this.allConversations = [...options.conversations]; // Store original list
    this.parser = options.parser;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    // Apply initial sort
    this.sortConversations();
  }

  async select(): Promise<ConversationMetadata | null> {
    return new Promise((resolve) => {
      // Enable raw mode to capture individual keystrokes
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }

      readline.emitKeypressEvents(process.stdin);

      this.render();

      process.stdin.on('keypress', async (str, key) => {
        if (key.name === 'escape') {
          // Always exit the program on escape
          this.cleanup();
          resolve(null);
          return;
        }

        if (key.ctrl && key.name === 'c') {
          this.cleanup();
          resolve(null);
          return;
        }

        if (this.isSearchMode) {
          if (key.name === 'up') {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.render();
          } else if (key.name === 'down') {
            this.selectedIndex = Math.min(this.conversations.length - 1, this.selectedIndex + 1);
            this.render();
          } else if (key.name === 'right') {
            if (this.conversations.length > 0) {
              // Enter preview mode from search mode
              this.wasInSearchMode = true;
              this.isSearchMode = false; // Must turn off search mode to allow preview key handlers to work
              const selected = this.conversations[this.selectedIndex];

              // Get all messages (cache them)
              this.allPreviewMessages = await this.parser.getMessages(selected.filePath, 0, 10000);
              this.totalMessages = this.allPreviewMessages.length;

              // Set offset to show newest messages at bottom
              this.previewOffset = Math.max(0, this.totalMessages - this.messagesPerPage);

              this.isPreviewMode = true;
              this.render();
            }
          } else if (key.name === 'return') {
            if (this.conversations.length > 0) {
              this.cleanup();
              resolve(this.conversations[this.selectedIndex]);
            }
          } else if (key.name === 'backspace') {
            this.searchTerm = this.searchTerm.slice(0, -1);
            this.triggerSearch();
            this.render();
          } else if (str && str.length === 1) {
            this.searchTerm += str;
            this.triggerSearch();
            this.render();
          }
        } else if (this.isPreviewMode) {
          if (key.name === 'left') {
            this.isPreviewMode = false;
            this.previewMessages = [];
            this.allPreviewMessages = [];
            this.previewOffset = 0;
            this.loadedUpTo = 0;
            this.loadedFrom = 0;
            this.totalMessages = 0;
            // Restore search mode if we came from search
            if (this.wasInSearchMode) {
              this.isSearchMode = true;
              this.wasInSearchMode = false; // Reset the flag
            }
            this.render();
          } else if (key.name === 'up') {
            // Scroll up to see older messages (decrease offset)
            if (this.previewOffset > 0) {
              this.previewOffset--;
              // Check if we need to load older messages
              if (this.previewOffset < 5 && this.loadedFrom > 0) {
                await this.loadOlderMessages();
              }
              this.render();
            }
          } else if (key.name === 'down') {
            // Scroll down to see newer messages (increase offset)
            if (this.previewOffset + this.messagesPerPage < this.allPreviewMessages.length) {
              this.previewOffset++;
              this.render();
            }
          } else if (key.name === 'return') {
            this.cleanup();
            resolve(this.conversations[this.selectedIndex]);
          }
        } else {
          // List mode
          if (str === '/') {
            // Enter search mode
            this.isSearchMode = true;
            this.searchTerm = '';
            this.render();
          } else if (str === 's') {
            // Cycle sort mode
            this.cycleSortMode();
            this.sortConversations();
            this.render();
          } else if (str === 'o') {
            // Toggle sort order
            this.sortDescending = !this.sortDescending;
            this.sortConversations();
            this.render();
          } else if (key.name === 'up') {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.render();
          } else if (key.name === 'down') {
            this.selectedIndex = Math.min(this.conversations.length - 1, this.selectedIndex + 1);
            this.render();
          } else if (key.name === 'right') {
            if (this.conversations.length > 0) {
              // Enter preview mode - load last messages
              const selected = this.conversations[this.selectedIndex];

              // Get all messages (cache them)
              this.allPreviewMessages = await this.parser.getMessages(selected.filePath, 0, 10000);
              this.totalMessages = this.allPreviewMessages.length;

              // Set offset to show newest messages at bottom
              this.previewOffset = Math.max(0, this.totalMessages - this.messagesPerPage);

              this.isPreviewMode = true;
              this.render();
            }
          } else if (key.name === 'return') {
            if (this.conversations.length > 0) {
              this.cleanup();
              resolve(this.conversations[this.selectedIndex]);
            }
          }
        }
      });
    });
  }

  private render() {
    // Clear screen and move cursor to top
    console.clear();
    console.log(chalk.bold.blue('\n🔧 runlog - Claude Code Conversation Exporter\n'));
    console.log(chalk.gray(`Current directory: ${process.cwd()}\n`));

    if (this.isPreviewMode) {
      this.renderPreview();
    } else {
      this.renderList();
    }
  }

  private renderList() {
    if (this.isSearchMode) {
      const searchLine = chalk.cyan('Search:') + ' ' + chalk.white(this.searchTerm) + chalk.gray('|');
      console.log(searchLine + (this.isSearching ? chalk.yellow(' Searching...') : ''));
      console.log(chalk.gray('(↑↓ navigate, → preview, ↵ export)\n'));
    } else {
      console.log(chalk.cyan('Select a conversation to export:'));
      console.log(chalk.gray('(↑↓ navigate, → preview, ↵ export, / search, s sort, o order, esc exit)'));

      // Show current sort mode
      const sortInfo = this.getSortModeDisplay();
      console.log(chalk.gray(`Sort: ${sortInfo} ${this.sortDescending ? '↓' : '↑'}\n`));
    }

    if (this.conversations.length === 0 && !this.isSearching) {
      console.log(chalk.yellow('No conversations found' + (this.searchTerm ? ` matching "${this.searchTerm}"` : '')));
    } else if (!this.isSearching) {
      // Create table
      const table = new Table({
        head: [
          chalk.gray(''),
          chalk.gray('ID'),
          chalk.gray('Time'),
          chalk.gray('Messages'),
          chalk.gray('Active'),
          chalk.gray('Summary')
        ],
        style: {
          head: [],
          border: ['gray']
        },
        colWidths: [3, 8, 20, 10, 10, 60],
        wordWrap: true
      });

      this.conversations.forEach((conv, index) => {
        const isSelected = index === this.selectedIndex;
        const shortId = conv.sessionId ? conv.sessionId.replace(/-/g, '').substring(0, 6) : '';

        const row = [
          isSelected ? chalk.cyan('❯') : ' ',
          isSelected ? chalk.bold.blue(shortId) : chalk.blue(shortId),
          isSelected ? chalk.bold(formatDate(conv.lastMessageTime)) : formatDate(conv.lastMessageTime),
          isSelected ? chalk.bold.yellow(`${conv.messageCount}`) : chalk.yellow(`${conv.messageCount}`),
          isSelected ? chalk.bold.magenta(formatDuration(conv.activeTime || 0)) : chalk.magenta(formatDuration(conv.activeTime || 0)),
          isSelected ? chalk.bold(conv.summary || '') : chalk.dim(conv.summary || '')
        ];

        if (conv.matchCount !== undefined) {
          row[3] += isSelected ? chalk.bold.green(` (${conv.matchCount})`) : chalk.green(` (${conv.matchCount})`);
        }

        table.push(row);
      });

      console.log(table.toString());
    }
  }

  private renderPreview() {
    const selected = this.conversations[this.selectedIndex];
    const terminalWidth = process.stdout.columns || 80;
    const separatorWidth = Math.min(terminalWidth - 2, 100);

    console.log(chalk.cyan('Message Preview'));
    console.log(chalk.gray('(↑ older, ↓ newer, ← back, ↵ export, esc exit)\n'));

    console.log(chalk.bold(formatConversationLine(
      selected.projectName,
      selected.lastMessageTime,
      selected.messageCount,
      selected.matchCount,
      selected.activeTime,
      selected.summary,
      selected.sessionId
    )));
    console.log(chalk.gray('─'.repeat(separatorWidth)) + '\n');

    if (this.allPreviewMessages.length === 0) {
      console.log(chalk.gray('No messages to preview'));
    } else {
      // Display visible messages
      const start = this.previewOffset;
      const end = Math.min(start + this.messagesPerPage, this.allPreviewMessages.length);
      let linesUsed = 0;

      for (let i = start; i < end && linesUsed < this.messagesPerPage; i++) {
        const msg = this.allPreviewMessages[i];
        if (!msg) continue;

        if (i > start) {
          console.log(''); // Empty line between messages
          linesUsed++;
        }

        // Format role/type
        let roleDisplay = '';
        if (msg.type === 'user') {
          roleDisplay = chalk.blue('User');
        } else if (msg.type === 'assistant') {
          roleDisplay = chalk.green('Assistant');
        } else if (msg.type === 'thinking') {
          roleDisplay = chalk.yellow('Thinking');
        } else {
          roleDisplay = chalk.gray(msg.type);
        }

        // Header line
        console.log(`${roleDisplay} ${chalk.gray(formatDate(msg.timestamp))}`);
        linesUsed++;

        // Message content - wrap to terminal width
        const wrapped = this.wrapText(msg.content, terminalWidth - 4);
        const lines = wrapped.split('\n');
        for (const line of lines) {
          if (linesUsed >= this.messagesPerPage) break;
          console.log(chalk.white(line));
          linesUsed++;
        }
      }

      // Fill remaining space
      while (linesUsed < this.messagesPerPage) {
        console.log('');
        linesUsed++;
      }
    }

    console.log(chalk.gray('─'.repeat(separatorWidth)));

    // Status line
    const displayStart = this.previewOffset + 1;
    const displayEnd = Math.min(this.previewOffset + this.messagesPerPage, this.allPreviewMessages.length);
    const statusParts = [];

    if (this.previewOffset > 0) {
      statusParts.push('↑ older');
    }

    statusParts.push(`Messages ${displayStart}-${displayEnd} of ${this.totalMessages}`);

    if (this.previewOffset + this.messagesPerPage < this.allPreviewMessages.length) {
      statusParts.push('newer ↓');
    }

    console.log(chalk.gray(statusParts.join(' │ ')));
  }

  private wrapText(text: string, maxWidth: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  private async loadMoreMessages() {
    const selected = this.conversations[this.selectedIndex];
    const batchSize = 50;
    const newLoadedUpTo = Math.min(this.loadedUpTo + batchSize, this.totalMessages);

    if (newLoadedUpTo > this.loadedUpTo) {
      // Load additional messages
      const newMessages = await this.parser.getMessages(selected.filePath, this.loadedUpTo, batchSize);
      this.previewMessages = [...this.previewMessages, ...newMessages];
      this.loadedUpTo = newLoadedUpTo;
    }
  }

  private async loadOlderMessages() {
    const selected = this.conversations[this.selectedIndex];
    const batchSize = 50;

    if (this.loadedFrom > 0) {
      // For now, we load all messages at once, so this won't be called
      // In a future optimization, we could implement incremental loading
      // by caching all messages and slicing as needed
    }
  }

  private triggerSearch() {
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new timer for 500ms
    this.searchDebounceTimer = setTimeout(async () => {
      await this.performSearch();
    }, 500);
  }

  private async performSearch() {
    this.isSearching = true;
    this.render(); // Show searching indicator

    try {
      if (this.searchTerm.trim()) {
        this.conversations = await this.parser.searchConversations(this.searchTerm, process.cwd());
      } else {
        this.conversations = [...this.allConversations];
      }
      // Apply current sort after search
      this.sortConversations();
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      this.isSearching = false;
      this.render();
    }
  }

  private cleanup() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    process.stdin.removeAllListeners('keypress');
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    this.rl.close();
    console.clear();
  }

  private cycleSortMode() {
    switch (this.sortMode) {
      case 'time':
        this.sortMode = 'messages';
        break;
      case 'messages':
        this.sortMode = 'active';
        break;
      case 'active':
        this.sortMode = 'time';
        break;
    }
  }

  private getSortModeDisplay(): string {
    switch (this.sortMode) {
      case 'time':
        return 'Last Message Time';
      case 'messages':
        return 'Message Count';
      case 'active':
        return 'Active Time';
    }
  }

  private sortConversations() {
    this.conversations.sort((a, b) => {
      let compareValue = 0;

      switch (this.sortMode) {
        case 'time':
          const timeA = a.lastMessageTime?.getTime() || 0;
          const timeB = b.lastMessageTime?.getTime() || 0;
          compareValue = timeB - timeA;
          break;
        case 'messages':
          compareValue = b.messageCount - a.messageCount;
          break;
        case 'active':
          const activeA = a.activeTime || 0;
          const activeB = b.activeTime || 0;
          compareValue = activeB - activeA;
          break;
      }

      // Apply sort order
      return this.sortDescending ? compareValue : -compareValue;
    });

    // Reset selection to top after sorting
    this.selectedIndex = 0;
  }
}
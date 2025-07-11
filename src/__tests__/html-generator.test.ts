import { generateHtml, parseJsonlMessages } from '../html-generator.js';
import { ConversationMetadata, Message } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

describe('HTML Generator', () => {
  const mockConversation: ConversationMetadata = {
    filePath: '/path/to/conversation.jsonl',
    projectName: 'test-project',
    sessionId: 'test-session-123',
    messageCount: 3,
    lastMessageTime: new Date('2025-07-11T10:30:00Z'),
    firstMessageTime: new Date('2025-07-11T10:00:00Z'),
    activeTime: 1800000, // 30 minutes
    summary: 'Test conversation about HTML generation'
  };

  const mockMessages: Message[] = [
    {
      type: 'user',
      timestamp: '2025-07-11T10:00:00Z',
      message: {
        role: 'user',
        content: 'Hello, can you help me with **HTML generation**?'
      }
    },
    {
      type: 'assistant',
      timestamp: '2025-07-11T10:01:00Z',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Sure! Here\'s a simple HTML example:\n\n```html\n<div class="example">Hello World</div>\n```\n\nThis creates a basic div element.'
          }
        ]
      }
    },
    {
      type: 'thinking',
      timestamp: '2025-07-11T10:02:00Z',
      message: {
        content: 'The user is asking about HTML generation. I should provide a helpful example.'
      }
    }
  ];

  describe('generateHtml', () => {
    it('should generate valid HTML with conversation metadata', () => {
      const html = generateHtml(mockConversation, mockMessages);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('test-project');
      expect(html).toContain('3 messages');
      expect(html).toContain('30m');
    });

    it('should render user messages correctly', () => {
      const html = generateHtml(mockConversation, mockMessages);
      
      expect(html).toContain('class="message user"');
      expect(html).toContain('class="role-badge user">user</span>');
      expect(html).toContain('Hello, can you help me with <strong>HTML generation</strong>?');
    });

    it('should render assistant messages correctly', () => {
      const html = generateHtml(mockConversation, mockMessages);
      
      expect(html).toContain('class="message assistant"');
      expect(html).toContain('class="role-badge assistant">assistant</span>');
      expect(html).toContain('Sure! Here&#39;s a simple HTML example:');
    });

    it('should render thinking messages correctly', () => {
      const html = generateHtml(mockConversation, mockMessages);
      
      expect(html).toContain('class="message thinking"');
      expect(html).toContain('class="role-badge thinking">thinking</span>');
      expect(html).toContain('The user is asking about HTML generation');
    });

    it('should handle code blocks with syntax highlighting', () => {
      const html = generateHtml(mockConversation, mockMessages);
      
      expect(html).toContain('<pre><code class="language-html">');
      expect(html).toContain('&lt;div class=&quot;example&quot;&gt;Hello World&lt;/div&gt;');
    });

    it('should include highlight.js for syntax highlighting', () => {
      const html = generateHtml(mockConversation, mockMessages);
      
      expect(html).toContain('highlight.js');
      expect(html).toContain('hljs.highlightAll()');
    });

    it('should render tool messages as interactive summaries', () => {
      const toolUseMessage: Message = {
        type: 'assistant',
        timestamp: '2025-07-11T10:03:00Z',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'test-tool-id',
              name: 'TestTool',
              input: {
                command: 'test command',
                description: 'Test description'
              }
            }
          ]
        }
      };

      const toolResultMessage: Message = {
        type: 'user',
        timestamp: '2025-07-11T10:04:00Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'test-tool-id',
              is_error: false,
              content: 'Tool execution completed successfully'
            }
          ]
        }
      };

      const messagesWithTools = [toolUseMessage, toolResultMessage];
      const html = generateHtml(mockConversation, messagesWithTools);
      
      // Should contain tool summary elements
      expect(html).toContain('tool-summary');
      expect(html).toContain('tool-header');
      expect(html).toContain('tool-content');
      expect(html).toContain('🔧 TestTool');
      expect(html).toContain('📊 Tool Result');
      expect(html).toContain('✅ Success');
      expect(html).toContain('toggleToolContent');
      
      // Should contain tool parameters and results
      expect(html).toContain('test command');
      expect(html).toContain('Tool execution completed successfully');
    });

    it('should escape HTML characters properly', () => {
      const messageWithHtml: Message = {
        type: 'user',
        timestamp: '2025-07-11T10:00:00Z',
        message: {
          role: 'user',
          content: 'This has <script>alert("xss")</script> content'
        }
      };

      const html = generateHtml(mockConversation, [messageWithHtml]);
      
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe('parseJsonlMessages', () => {
    const mockJsonl = `
{"type": "user", "timestamp": "2025-07-11T10:00:00Z", "message": {"role": "user", "content": "Hello"}}
{"type": "assistant", "timestamp": "2025-07-11T10:01:00Z", "message": {"role": "assistant", "content": "Hi there!"}}
{"type": "summary", "isMeta": true, "content": "This should be filtered out"}
{"type": "thinking", "timestamp": "2025-07-11T10:02:00Z", "message": {"content": "User said hello"}}
    `.trim();

    it('should parse valid JSONL content', () => {
      const messages = parseJsonlMessages(mockJsonl);
      
      expect(messages).toHaveLength(3); // Summary should be filtered out
      expect(messages[0].type).toBe('user');
      expect(messages[1].type).toBe('assistant');
      expect(messages[2].type).toBe('thinking');
    });

    it('should filter out summary and meta messages', () => {
      const messages = parseJsonlMessages(mockJsonl);
      
      expect(messages.find(m => m.type === 'summary')).toBeUndefined();
      expect(messages.find(m => (m as any).isMeta === true)).toBeUndefined();
    });

    it('should handle invalid JSON lines gracefully', () => {
      const invalidJsonl = `
{"type": "user", "message": {"content": "valid", "role": "user"}}
invalid json line
{"type": "assistant", "message": {"content": "also valid", "role": "assistant"}}
      `.trim();

      const messages = parseJsonlMessages(invalidJsonl);
      
      expect(messages).toHaveLength(2);
      expect(messages[0].type).toBe('user');
      expect(messages[1].type).toBe('assistant');
    });

    it('should handle empty content', () => {
      const messages = parseJsonlMessages('');
      expect(messages).toHaveLength(0);
    });

    it('should filter out internal command messages and include tool messages', () => {
      // Read actual problematic conversation file
      const testFilePath = path.join(__dirname, 'test-conversation.jsonl');
      const problematicJsonl = fs.readFileSync(testFilePath, 'utf-8');

      const messages = parseJsonlMessages(problematicJsonl);
      
      // Should have 5 messages: user question + assistant response + tool use + tool result + final assistant response
      expect(messages).toHaveLength(5);
      expect(messages[0]?.message?.content).toBe('what does `node --check` do?');
      expect((messages[1]?.message?.content as any)?.[0]?.text).toContain('`node --check` performs syntax checking');
      
      // Check for tool messages
      const toolUseMessage = messages[2];
      expect(toolUseMessage.type).toBe('assistant');
      expect(Array.isArray(toolUseMessage.message?.content)).toBe(true);
      expect((toolUseMessage.message?.content as any)?.[0]?.type).toBe('tool_use');
      expect((toolUseMessage.message?.content as any)?.[0]?.name).toBe('Bash');
      
      const toolResultMessage = messages[3];
      expect(toolResultMessage.type).toBe('user');
      expect(Array.isArray(toolResultMessage.message?.content)).toBe(true);
      expect((toolResultMessage.message?.content as any)?.[0]?.type).toBe('tool_result');
      expect((toolResultMessage.message?.content as any)?.[0]?.is_error).toBe(false);
      
      expect((messages[4]?.message?.content as any)?.[0]?.text).toContain('useful for validating JavaScript syntax');
      
      // Should not contain any internal commands
      messages.forEach(msg => {
        if (!msg.message?.content) return;
        
        const content = typeof msg.message.content === 'string' 
          ? msg.message.content 
          : Array.isArray(msg.message.content) 
            ? msg.message.content.map((c: any) => c.text || '').join('') 
            : '';
        expect(content).not.toContain('<command-name>');
        expect(content).not.toContain('<local-command-stdout>');
        expect(content).not.toContain('/exit');
      });
    });
  });
});
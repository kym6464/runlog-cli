import { ConversationMetadata, Message } from './types.js';

/**
 * Generates an HTML file from conversation metadata and messages
 */
export function generateHtml(conversation: ConversationMetadata, messages: Message[]): string {
  const htmlMessages = messages
    .filter(msg => msg.type !== 'summary' && !(msg as any).isMeta)
    .map(msg => renderMessage(msg))
    .filter(Boolean)
    .join('\n');

  const dateStr = conversation.lastMessageTime 
    ? conversation.lastMessageTime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown date';

  const activeTimeStr = conversation.activeTime 
    ? formatActiveTime(conversation.activeTime)
    : 'Unknown';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code Conversation - ${escapeHtml(conversation.projectName)}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }

        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 1rem;
        }

        .header .meta {
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
            font-size: 0.9rem;
            opacity: 0.8;
        }

        .header .meta span {
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }

        .messages {
            padding: 2rem;
            max-width: 100%;
        }

        .message {
            margin-bottom: 1.5rem;
            max-width: 100%;
            overflow-wrap: break-word;
        }

        .message-content {
            padding: 1rem 1.25rem;
            border-radius: 12px;
            position: relative;
            max-width: 85%;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .message.user {
            text-align: right;
        }

        .message.user .message-content {
            background: #007bff;
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 4px;
        }

        .message.assistant .message-content {
            background: #f1f3f5;
            border: 1px solid #e9ecef;
            border-bottom-left-radius: 4px;
        }

        .message.thinking .message-content {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #fdcb6e;
            margin-left: 1rem;
            max-width: 80%;
        }

        .message-meta {
            font-size: 0.75rem;
            color: #6c757d;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .message.user .message-meta {
            justify-content: flex-end;
        }

        .role-badge {
            background: #6c757d;
            color: white;
            padding: 0.15rem 0.5rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .role-badge.user {
            background: #007bff;
        }

        .role-badge.assistant {
            background: #28a745;
        }

        .role-badge.thinking {
            background: #ffc107;
            color: #212529;
        }

        .message-text {
            white-space: pre-wrap;
            word-break: break-word;
        }

        .message-text pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            overflow-x: auto;
            margin: 0.5rem 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
        }

        .message.user .message-text pre {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
            color: white;
        }

        .message-text code {
            background: #f8f9fa;
            padding: 0.15rem 0.3rem;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.9em;
        }

        .message.user .message-text code {
            background: rgba(255,255,255,0.2);
        }

        .image-placeholder {
            background: #e9ecef;
            border: 2px dashed #adb5bd;
            border-radius: 8px;
            padding: 2rem;
            text-align: center;
            color: #6c757d;
            margin: 0.5rem 0;
            font-style: italic;
        }

        .timestamp {
            color: #868e96;
            font-size: 0.7rem;
        }

        .footer {
            padding: 2rem;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
            background: #f8f9fa;
        }

        .export-info {
            font-size: 0.8rem;
            opacity: 0.7;
        }

        /* Tool call summary styles */
        .tool-summary {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin: 0.75rem 0;
            font-size: 0.9rem;
            max-width: 90%;
        }

        .tool-header {
            padding: 0.75rem 1rem;
            background: #e9ecef;
            border-radius: 7px 7px 0 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: background-color 0.2s ease;
        }

        .tool-header:hover {
            background: #dee2e6;
        }

        .tool-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .tool-name {
            font-weight: 600;
            color: #495057;
        }

        .tool-status {
            padding: 0.15rem 0.4rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .tool-status.success {
            background: #d4edda;
            color: #155724;
        }

        .tool-status.error {
            background: #f8d7da;
            color: #721c24;
        }

        .tool-status.running {
            background: #d1ecf1;
            color: #0c5460;
        }

        .tool-duration {
            font-size: 0.7rem;
            color: #6c757d;
            margin-left: auto;
        }

        .tool-expand-icon {
            transition: transform 0.2s ease;
            font-size: 0.8rem;
            color: #6c757d;
        }

        .tool-header.expanded .tool-expand-icon {
            transform: rotate(180deg);
        }

        .tool-content {
            padding: 0.75rem 1rem;
            border-top: 1px solid #e9ecef;
            display: none;
            background: white;
            border-radius: 0 0 7px 7px;
        }

        .tool-content.expanded {
            display: block;
        }

        .tool-params {
            margin-bottom: 0.75rem;
        }

        .tool-params h4 {
            font-size: 0.8rem;
            color: #495057;
            margin-bottom: 0.25rem;
            font-weight: 600;
        }

        .tool-params pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 0.5rem;
            font-size: 0.8rem;
            max-height: 200px;
            overflow-y: auto;
        }

        .tool-result {
            margin-bottom: 0.75rem;
        }

        .tool-result h4 {
            font-size: 0.8rem;
            color: #495057;
            margin-bottom: 0.25rem;
            font-weight: 600;
        }

        .tool-result pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 0.5rem;
            font-size: 0.8rem;
            max-height: 300px;
            overflow-y: auto;
        }

        .tool-error {
            color: #721c24;
            background: #f8d7da;
            border-color: #f5c6cb;
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            
            .header {
                padding: 1.5rem 1rem;
            }
            
            .header h1 {
                font-size: 1.5rem;
            }
            
            .header .meta {
                gap: 1rem;
                font-size: 0.8rem;
            }
            
            .messages {
                padding: 1rem;
            }
            
            .message-content {
                max-width: 95%;
                padding: 0.75rem 1rem;
            }
            
            .message.thinking .message-content {
                max-width: 90%;
                margin-left: 0.5rem;
            }
        }

        /* Print styles */
        @media print {
            body {
                background: white;
            }
            
            .container {
                box-shadow: none;
                max-width: none;
            }
            
            .header {
                background: #f8f9fa !important;
                color: #333 !important;
                border-bottom: 2px solid #dee2e6;
            }
            
            .message.user .message-content {
                background: #f8f9fa !important;
                color: #333 !important;
                border: 1px solid #dee2e6;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Claude Code Conversation</h1>
            <div class="subtitle">${escapeHtml(conversation.projectName)}</div>
            <div class="meta">
                <span>📅 ${dateStr}</span>
                <span>💬 ${conversation.messageCount} messages</span>
                <span>⏱️ ${activeTimeStr}</span>
            </div>
        </div>
        
        <div class="messages">
            ${htmlMessages}
        </div>
        
        <div class="footer">
            <div class="export-info">
                Exported from Claude Code • ${new Date().toLocaleDateString()}
            </div>
        </div>
    </div>

    <script>
        // Initialize syntax highlighting
        document.addEventListener('DOMContentLoaded', function() {
            hljs.highlightAll();
            
            // Add copy buttons to code blocks
            document.querySelectorAll('pre code').forEach(function(block) {
                const button = document.createElement('button');
                button.innerHTML = '📋';
                button.style.position = 'absolute';
                button.style.top = '0.5rem';
                button.style.right = '0.5rem';
                button.style.background = 'rgba(0,0,0,0.1)';
                button.style.border = 'none';
                button.style.borderRadius = '4px';
                button.style.padding = '0.25rem 0.5rem';
                button.style.cursor = 'pointer';
                button.style.fontSize = '0.75rem';
                button.title = 'Copy to clipboard';
                
                button.addEventListener('click', function() {
                    navigator.clipboard.writeText(block.textContent).then(function() {
                        button.innerHTML = '✅';
                        setTimeout(function() {
                            button.innerHTML = '📋';
                        }, 2000);
                    });
                });
                
                block.parentElement.style.position = 'relative';
                block.parentElement.appendChild(button);
            });
        });

        // Tool summary toggle functionality
        window.toggleToolContent = function(header) {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.tool-expand-icon');
            
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                header.classList.remove('expanded');
                icon.textContent = '▼';
            } else {
                content.classList.add('expanded');
                header.classList.add('expanded');
                icon.textContent = '▲';
            }
        };
    </script>
</body>
</html>`;
}

/**
 * Renders a single message to HTML
 */
function renderMessage(message: Message): string {
  const timestamp = parseTimestamp(message.timestamp);
  const timeStr = timestamp ? timestamp.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : '';

  // Handle tool messages first (they can be either user or assistant type)
  if (isToolMessage(message)) {
    return renderToolMessage(message, timeStr);
  }

  // Handle different message types
  if (message.type === 'user' || message.type === 'assistant') {
    const role = message.message?.role || message.type;
    const content = message.message?.content;
    
    if (!content) return '';

    const textContent = extractTextContent(content);
    const processedContent = processMessageContent(textContent);
    
    return `
      <div class="message ${role}">
        <div class="message-meta">
          <span class="role-badge ${role}">${role}</span>
          <span class="timestamp">${timeStr}</span>
        </div>
        <div class="message-content">
          <div class="message-text">${processedContent}</div>
        </div>
      </div>`;
      
  } else if (message.type === 'thinking') {
    const content = (message as any).message?.content || (message as any).thinkingBlock?.content || '';
    const processedContent = processMessageContent(content);
    
    return `
      <div class="message thinking">
        <div class="message-meta">
          <span class="role-badge thinking">thinking</span>
          <span class="timestamp">${timeStr}</span>
        </div>
        <div class="message-content">
          <div class="message-text">${processedContent}</div>
        </div>
      </div>`;
  }

  return '';
}

/**
 * Renders a tool message (tool_use or tool_result) as a summary card
 */
function renderToolMessage(message: Message, timeStr: string): string {
  const content = message.message?.content;
  
  if (!Array.isArray(content)) return '';

  // Handle tool_use messages
  const toolUse = content.find((item: any) => item.type === 'tool_use');
  if (toolUse) {
    const toolName = toolUse.name || 'Unknown Tool';
    const toolId = toolUse.id || '';
    const params = toolUse.input || {};
    
    // Extract key parameters for summary
    const paramSummary = extractToolParamSummary(params);
    
    return `
      <div class="tool-summary">
        <div class="tool-header" onclick="toggleToolContent(this)">
          <div class="tool-info">
            <span class="tool-name">🔧 ${escapeHtml(toolName)}</span>
            ${paramSummary ? `<span class="tool-status running">${escapeHtml(paramSummary)}</span>` : ''}
          </div>
          <div class="tool-expand-icon">▼</div>
        </div>
        <div class="tool-content">
          <div class="tool-params">
            <h4>Parameters:</h4>
            <pre><code>${escapeHtml(JSON.stringify(params, null, 2))}</code></pre>
          </div>
        </div>
      </div>`;
  }

  // Handle tool_result messages
  const toolResult = content.find((item: any) => item.type === 'tool_result');
  if (toolResult) {
    const isError = toolResult.is_error || false;
    const resultContent = toolResult.content || '';
    const toolUseId = toolResult.tool_use_id || '';
    
    // Calculate duration from message metadata if available
    const duration = calculateToolDuration(message);
    const durationStr = duration ? ` • ${duration}ms` : '';
    
    return `
      <div class="tool-summary">
        <div class="tool-header" onclick="toggleToolContent(this)">
          <div class="tool-info">
            <span class="tool-name">📊 Tool Result</span>
            <span class="tool-status ${isError ? 'error' : 'success'}">
              ${isError ? '❌ Error' : '✅ Success'}
            </span>
            ${durationStr ? `<span class="tool-duration">${durationStr}</span>` : ''}
          </div>
          <div class="tool-expand-icon">▼</div>
        </div>
        <div class="tool-content">
          <div class="tool-result">
            <h4>Output:</h4>
            <pre class="${isError ? 'tool-error' : ''}"><code>${escapeHtml(truncateText(resultContent, 1000))}</code></pre>
          </div>
        </div>
      </div>`;
  }

  return '';
}

/**
 * Extracts a brief summary from tool parameters for display
 */
function extractToolParamSummary(params: any): string {
  if (!params || typeof params !== 'object') return '';
  
  // Common parameter names to show in summary
  if (params.command) return `cmd: ${params.command}`.substring(0, 30);
  if (params.description) return params.description.substring(0, 30);
  if (params.file_path) return `file: ${params.file_path.split('/').pop()}`;
  if (params.pattern) return `pattern: ${params.pattern}`.substring(0, 30);
  if (params.url) return `url: ${params.url}`.substring(0, 30);
  
  // Fallback to first parameter value
  const firstKey = Object.keys(params)[0];
  if (firstKey && params[firstKey]) {
    const value = String(params[firstKey]);
    return `${firstKey}: ${value}`.substring(0, 30);
  }
  
  return '';
}

/**
 * Calculates tool execution duration from message metadata
 */
function calculateToolDuration(message: Message): number | null {
  // Try to extract duration from toolUseResult metadata
  const toolResult = (message as any).toolUseResult;
  if (toolResult && typeof toolResult === 'object') {
    // Duration might be in various formats, try to find it
    if (toolResult.duration) return toolResult.duration;
    if (toolResult.executionTime) return toolResult.executionTime;
  }
  
  // Could calculate from timestamps if we had paired messages
  return null;
}

/**
 * Truncates text to specified length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Extracts text content from message content (string or array)
 */
function extractTextContent(content: string | any[]): string {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item.type === 'text' && item.text) return item.text;
        if (item.type === 'image') return '[Image Content Removed]';
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

/**
 * Processes message content to handle code blocks and formatting
 */
function processMessageContent(content: string): string {
  if (!content) return '';

  // Escape HTML first
  let processed = escapeHtml(content);

  // Handle code blocks with language detection
  processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || '';
    const trimmedCode = code.trim();
    return `</div><pre><code class="language-${language}">${trimmedCode}</code></pre><div class="message-text">`;
  });

  // Handle inline code
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Handle bold text
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle italic text
  processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Handle line breaks
  processed = processed.replace(/\n/g, '<br>');

  // Wrap in div to handle code block replacements properly
  processed = `<div class="message-text">${processed}</div>`;
  processed = processed.replace(/<div class="message-text"><\/div><pre>/g, '<pre>');
  processed = processed.replace(/<\/pre><div class="message-text"><\/div>/g, '</pre>');
  processed = processed.replace(/<\/pre><div class="message-text">/g, '</pre><div class="message-text">');

  return processed;
}

/**
 * Escapes HTML characters
 */
function escapeHtml(text: string): string {
  const div = { innerHTML: '' } as any;
  div.textContent = text;
  return div.innerHTML || text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses timestamp from string or number
 */
function parseTimestamp(timestamp: string | number): Date | null {
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

/**
 * Formats active time duration
 */
function formatActiveTime(milliseconds: number): string {
  if (milliseconds === 0) return '0 minutes';
  
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Parses JSONL content and returns an array of Message objects
 */
export function parseJsonlMessages(content: string): Message[] {
  const lines = content.trim().split('\n').filter(line => line.trim());
  const messages: Message[] = [];

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      
      // Skip summary and meta messages
      if (data.type === 'summary' || data.isMeta === true) {
        continue;
      }

      // Skip messages without content
      if (!data.message?.content) {
        continue;
      }

      // Filter out internal command messages
      if (isInternalCommandMessage(data)) {
        continue;
      }

      // Process tool use and tool result messages differently
      if (isToolMessage(data)) {
        // Add tool messages to be rendered as summaries
        messages.push(data);
        continue;
      }

      messages.push(data);
    } catch (err) {
      // Skip invalid JSON lines
      continue;
    }
  }

  return messages;
}

/**
 * Check if a message contains internal command content
 */
function isInternalCommandMessage(data: any): boolean {
  const content = data.message?.content;
  if (typeof content === 'string') {
    return content.includes('<command-name>') || 
           content.includes('<local-command-stdout>') ||
           content.includes('<command-message>') ||
           content.includes('<command-args>');
  }
  return false;
}

/**
 * Check if a message is a tool use or tool result message
 */
function isToolMessage(data: any): boolean {
  const content = data.message?.content;
  
  // Check for tool_use in assistant messages
  if (Array.isArray(content)) {
    return content.some((item: any) => 
      item.type === 'tool_use' || item.type === 'tool_result'
    );
  }
  
  return false;
}
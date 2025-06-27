import axios, { AxiosError } from 'axios';
import { UploadResponse, ApiError } from './types';

export class ApiClient {
  constructor(private apiEndpoint: string, private clientId: string) {}

  async uploadConversation(content: string): Promise<UploadResponse> {
    try {
      // Sanitize images before upload
      const sanitizedContent = this.sanitizeImages(content);
      
      const response = await axios.post<UploadResponse>(
        `${this.apiEndpoint}/conversations`,
        sanitizedContent,
        {
          headers: {
            'Content-Type': 'text/plain',
            'X-Source-UUID': this.clientId
          },
          timeout: 30000 // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        
        if (axiosError.response) {
          const errorData = axiosError.response.data;
          const message = errorData.error || 
                         (errorData.errors && errorData.errors.join(', ')) || 
                         'Unknown server error';
          throw new Error(`Server error (${axiosError.response.status}): ${message}`);
        } else if (axiosError.request) {
          throw new Error('No response from server. Is the server running?');
        }
      }
      
      throw error;
    }
  }

  private sanitizeImages(content: string): string {
    const lines = content.split('\n');
    const sanitizedLines = lines.map(line => {
      if (!line.trim()) return line;
      
      try {
        const data = JSON.parse(line);
        
        // Handle user messages with images
        if (data.type === 'user' && data.message?.content) {
          if (Array.isArray(data.message.content)) {
            // Replace image items with text placeholder
            data.message.content = data.message.content.map((item: any) => {
              if (item.type === 'image') {
                return { type: 'text', text: '[Image uploaded]' };
              }
              // Handle tool_result with images
              if (item.type === 'tool_result' && Array.isArray(item.content)) {
                const hasImage = item.content.some((c: any) => c.type === 'image');
                if (hasImage) {
                  // Extract text parts and add placeholder
                  const textParts = item.content
                    .filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text);
                  
                  const newContent = [];
                  if (textParts.length > 0) {
                    newContent.push({ type: 'text', text: textParts.join('\n') });
                  }
                  newContent.push({ type: 'text', text: '[Tool result: Image received]' });
                  
                  item.content = newContent;
                }
              }
              return item;
            });
          }
        }
        
        // Handle assistant messages with tool results containing images
        if (data.toolUseResult?.output) {
          const output = data.toolUseResult.output;
          if (typeof output === 'string' && output.includes('data:image/')) {
            // Replace base64 image data
            data.toolUseResult.output = output.replace(
              /data:image\/[^;]+;base64,[A-Za-z0-9+\/=]+/g,
              '[Image]'
            );
          }
        }
        
        return JSON.stringify(data);
      } catch {
        // If not valid JSON, return as-is
        return line;
      }
    });
    
    return sanitizedLines.join('\n');
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.apiEndpoint}/conversations/${conversationId}`,
        {
          headers: {
            'X-Source-UUID': this.clientId
          },
          timeout: 10000 // 10 second timeout
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        
        if (axiosError.response) {
          const errorData = axiosError.response.data;
          const message = errorData.error || 'Unknown server error';
          
          if (axiosError.response.status === 403) {
            throw new Error('Unauthorized: You can only delete conversations you uploaded');
          } else if (axiosError.response.status === 404) {
            throw new Error('Conversation not found');
          }
          
          throw new Error(`Server error (${axiosError.response.status}): ${message}`);
        } else if (axiosError.request) {
          throw new Error('No response from server. Is the server running?');
        }
      }
      
      throw error;
    }
  }

  getShareUrl(conversationId: string): string {
    // Production UI is at runlog.io, local dev is at localhost:8080
    if (this.apiEndpoint.includes('api.runlog.io')) {
      return `https://runlog.io/c/${conversationId}`;
    } else if (this.apiEndpoint.includes('localhost')) {
      return `http://localhost:8080/share.html?id=${conversationId}`;
    } else {
      // For other custom endpoints, assume UI is on same host without 'api.' prefix
      const uiHost = this.apiEndpoint.replace('https://api.', 'https://').replace('http://api.', 'http://');
      return `${uiHost}/c/${conversationId}`;
    }
  }
}
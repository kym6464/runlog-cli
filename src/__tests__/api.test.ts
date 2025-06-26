import axios from 'axios';
import { ApiClient } from '../api';

jest.mock('axios');
jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-123'
}));

describe('ApiClient', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>;
  let apiClient: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient('http://localhost:3000');
  });

  describe('uploadConversation', () => {
    it('should upload conversation successfully', async () => {
      const mockResponse = {
        data: {
          id: 'conv-123',
          created_at: '2025-06-24T10:00:00Z',
          message: 'Conversation uploaded successfully'
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await apiClient.uploadConversation('test content');

      expect(result).toEqual(mockResponse.data);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/conversations',
        'test content',
        {
          headers: {
            'Content-Type': 'text/plain',
            'X-Source-UUID': 'test-uuid-123'
          },
          timeout: 30000
        }
      );
    });

    it('should handle server errors with error message', async () => {
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue({
        response: {
          status: 422,
          data: {
            error: 'Invalid JSONL format'
          }
        },
        request: {}
      });

      await expect(apiClient.uploadConversation('bad content'))
        .rejects.toThrow('Server error (422): Invalid JSONL format');
    });

    it('should handle server errors with errors array', async () => {
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue({
        response: {
          status: 422,
          data: {
            errors: ['Field X is missing', 'Invalid timestamp']
          }
        },
        request: {}
      });

      await expect(apiClient.uploadConversation('bad content'))
        .rejects.toThrow('Server error (422): Field X is missing, Invalid timestamp');
    });

    it('should handle no response from server', async () => {
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.post.mockRejectedValue({
        request: {},
        response: undefined
      });

      await expect(apiClient.uploadConversation('content'))
        .rejects.toThrow('No response from server. Is the server running?');
    });

    it('should handle non-axios errors', async () => {
      mockAxios.isAxiosError.mockReturnValue(false);
      const error = new Error('Network error');
      mockAxios.post.mockRejectedValue(error);

      await expect(apiClient.uploadConversation('content'))
        .rejects.toThrow('Network error');
    });
  });

  describe('getShareUrl', () => {
    it('should generate local share URL for localhost', () => {
      const url = apiClient.getShareUrl('conv-123');
      expect(url).toBe('http://localhost:8080/share.html?id=conv-123');
    });

    it('should generate production share URL for api.runlog.io', () => {
      apiClient = new ApiClient('https://api.runlog.io');
      const url = apiClient.getShareUrl('conv-123');
      expect(url).toBe('https://runlog.io/c/conv-123');
    });

    it('should handle custom API endpoints', () => {
      apiClient = new ApiClient('https://api.example.com');
      const url = apiClient.getShareUrl('conv-123');
      expect(url).toBe('https://example.com/c/conv-123');
    });
  });
});
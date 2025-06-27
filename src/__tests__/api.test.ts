import axios from 'axios';
import { ApiClient } from '../api';

jest.mock('axios');

describe('ApiClient', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>;
  let apiClient: ApiClient;
  const testClientId = 'test-client-id-123';

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient('http://localhost:3000', testClientId);
  });

  describe('uploadConversation', () => {
    it('should upload conversation successfully', async () => {
      const mockResponse = {
        data: {
          id: 'conv-123',
          created_at: '2025-06-24T10:00:00Z',
          message: 'Conversation uploaded successfully',
          message_count: 2
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
            'X-Source-UUID': testClientId
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

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      mockAxios.delete.mockResolvedValue({ status: 204 });

      await expect(apiClient.deleteConversation('conv-123')).resolves.not.toThrow();

      expect(mockAxios.delete).toHaveBeenCalledWith(
        'http://localhost:3000/conversations/conv-123',
        {
          headers: {
            'X-Source-UUID': testClientId
          },
          timeout: 10000
        }
      );
    });

    it('should handle unauthorized deletion', async () => {
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: 'Unauthorized: You can only delete conversations you uploaded'
          }
        },
        request: {}
      });

      await expect(apiClient.deleteConversation('conv-123'))
        .rejects.toThrow('Unauthorized: You can only delete conversations you uploaded');
    });

    it('should handle conversation not found', async () => {
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 404,
          data: {
            error: 'Conversation not found'
          }
        },
        request: {}
      });

      await expect(apiClient.deleteConversation('non-existent'))
        .rejects.toThrow('Conversation not found');
    });

    it('should handle other server errors', async () => {
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue({
        response: {
          status: 500,
          data: {
            error: 'Internal server error'
          }
        },
        request: {}
      });

      await expect(apiClient.deleteConversation('conv-123'))
        .rejects.toThrow('Server error (500): Internal server error');
    });

    it('should handle no response from server', async () => {
      mockAxios.isAxiosError.mockReturnValue(true);
      mockAxios.delete.mockRejectedValue({
        request: {},
        response: undefined
      });

      await expect(apiClient.deleteConversation('conv-123'))
        .rejects.toThrow('No response from server. Is the server running?');
    });

    it('should handle non-axios errors', async () => {
      mockAxios.isAxiosError.mockReturnValue(false);
      const error = new Error('Network error');
      mockAxios.delete.mockRejectedValue(error);

      await expect(apiClient.deleteConversation('conv-123'))
        .rejects.toThrow('Network error');
    });
  });

  describe('getShareUrl', () => {
    it('should generate local share URL for localhost', () => {
      const url = apiClient.getShareUrl('conv-123');
      expect(url).toBe('http://localhost:8080/share.html?id=conv-123');
    });

    it('should generate production share URL for api.runlog.io', () => {
      apiClient = new ApiClient('https://api.runlog.io', testClientId);
      const url = apiClient.getShareUrl('conv-123');
      expect(url).toBe('https://runlog.io/c/conv-123');
    });

    it('should handle custom API endpoints', () => {
      apiClient = new ApiClient('https://api.example.com', testClientId);
      const url = apiClient.getShareUrl('conv-123');
      expect(url).toBe('https://example.com/c/conv-123');
    });
  });
});
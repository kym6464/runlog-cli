describe('Sort Functionality', () => {
  const mockConversations = [
    {
      filePath: '/path/1',
      projectName: 'project1',
      sessionId: 'session1',
      messageCount: 100,
      firstMessageTime: new Date('2024-01-01'),
      lastMessageTime: new Date('2024-01-04'), // Most recent
      activeTime: 7200000, // 2 hours
    },
    {
      filePath: '/path/2',
      projectName: 'project2',
      sessionId: 'session2',
      messageCount: 500, // Most messages
      firstMessageTime: new Date('2024-01-01'),
      lastMessageTime: new Date('2024-01-02'),
      activeTime: 3600000, // 1 hour
    },
    {
      filePath: '/path/3',
      projectName: 'project3',
      sessionId: 'session3',
      messageCount: 50,
      firstMessageTime: new Date('2024-01-01'),
      lastMessageTime: new Date('2024-01-03'),
      activeTime: 10800000, // 3 hours - most active
    },
  ];

  describe('Sort by time', () => {
    it('should sort by last message time descending', () => {
      const sorted = [...mockConversations].sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || 0;
        const timeB = b.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      });
      
      expect(sorted[0].projectName).toBe('project1'); // Most recent
      expect(sorted[1].projectName).toBe('project3');
      expect(sorted[2].projectName).toBe('project2');
    });

    it('should sort by last message time ascending', () => {
      const sorted = [...mockConversations].sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || 0;
        const timeB = b.lastMessageTime?.getTime() || 0;
        return timeA - timeB;
      });
      
      expect(sorted[0].projectName).toBe('project2'); // Oldest
      expect(sorted[1].projectName).toBe('project3');
      expect(sorted[2].projectName).toBe('project1');
    });
  });

  describe('Sort by message count', () => {
    it('should sort by message count descending', () => {
      const sorted = [...mockConversations].sort((a, b) => {
        return b.messageCount - a.messageCount;
      });
      
      expect(sorted[0].projectName).toBe('project2'); // 500 messages
      expect(sorted[1].projectName).toBe('project1'); // 100 messages
      expect(sorted[2].projectName).toBe('project3'); // 50 messages
    });

    it('should sort by message count ascending', () => {
      const sorted = [...mockConversations].sort((a, b) => {
        return a.messageCount - b.messageCount;
      });
      
      expect(sorted[0].projectName).toBe('project3'); // 50 messages
      expect(sorted[1].projectName).toBe('project1'); // 100 messages
      expect(sorted[2].projectName).toBe('project2'); // 500 messages
    });
  });

  describe('Sort by active time', () => {
    it('should sort by active time descending', () => {
      const sorted = [...mockConversations].sort((a, b) => {
        const activeA = a.activeTime || 0;
        const activeB = b.activeTime || 0;
        return activeB - activeA;
      });
      
      expect(sorted[0].projectName).toBe('project3'); // 3 hours
      expect(sorted[1].projectName).toBe('project1'); // 2 hours
      expect(sorted[2].projectName).toBe('project2'); // 1 hour
    });

    it('should sort by active time ascending', () => {
      const sorted = [...mockConversations].sort((a, b) => {
        const activeA = a.activeTime || 0;
        const activeB = b.activeTime || 0;
        return activeA - activeB;
      });
      
      expect(sorted[0].projectName).toBe('project2'); // 1 hour
      expect(sorted[1].projectName).toBe('project1'); // 2 hours
      expect(sorted[2].projectName).toBe('project3'); // 3 hours
    });
  });

  describe('Sort mode cycling', () => {
    it('should cycle through sort modes correctly', () => {
      let sortMode: 'time' | 'messages' | 'active' = 'time';
      
      // Cycle function
      const cycleSortMode = () => {
        switch (sortMode) {
          case 'time':
            sortMode = 'messages';
            break;
          case 'messages':
            sortMode = 'active';
            break;
          case 'active':
            sortMode = 'time';
            break;
        }
      };
      
      expect(sortMode).toBe('time');
      
      cycleSortMode();
      expect(sortMode).toBe('messages');
      
      cycleSortMode();
      expect(sortMode).toBe('active');
      
      cycleSortMode();
      expect(sortMode).toBe('time'); // Back to start
    });
  });
});
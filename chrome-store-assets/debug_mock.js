// debug_mock.js
window.chrome = {
  storage: {
    sync: {
      get: (keys, callback) => {
        const mockHistory = {};
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          mockHistory[dateStr] = Math.floor(Math.random() * 25000) + 5000; // 1-8 hours
        }
        
        const data = {
          timerActive: true,
          startTime: Date.now() - (2 * 60 * 60 * 1000 + 15 * 60 * 1000 + 34 * 1000), // 2h 15m 34s
          blacklist: ['youtube.com', 'x.com', 'reddit.com', 'facebook.com', 'linkedin.com'],
          history: mockHistory,
          pinHintDismissed: false
        };
        
        if (typeof keys === 'string') {
          callback({ [keys]: data[keys] });
        } else {
          const result = {};
          keys.forEach(k => result[k] = data[k]);
          callback(result);
        }
      },
      set: (data, callback) => {
        console.log('MOCK: Saving to storage', data);
        if (callback) callback();
      }
    }
  },
  action: {
    getUserSettings: () => Promise.resolve({ isOnToolbar: false })
  },
  runtime: {
    onInstalled: { addListener: () => {} }
  },
  alarms: {
    create: () => {},
    clear: () => {},
    onAlarm: { addListener: () => {} }
  },
  tabs: {
    query: (query, callback) => {
      if (callback) callback([{ id: 1, url: 'https://google.com' }]);
    },
    sendMessage: () => {}
  }
};

console.log('MOCK: Chrome API initialized for development/capture');

// background.js - InfoVita Procrastination Blocker
const DEFAULT_BLACKLIST = [
  "x.com", "youtube.com", "reddit.com", 
  "facebook.com", "instagram.com", "tiktok.com", 
  "netflix.com", "twitch.tv", "infobae.com", 
  "linkedin.com", "pinterest.com", "tumblr.com", "discord.com",
  "9gag.com", "buzzfeed.com", "quora.com", "medium.com",
  "spotify.com", "primevideo.com", "max.com", "disneyplus.com",
  "clarin.com", "lanacion.com.ar", "ole.com.ar"
];

function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Al instalar o iniciar la extensión
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['history', 'blacklist'], (data) => {
    chrome.storage.sync.set({ 
      blacklist: data.blacklist || DEFAULT_BLACKLIST,
      timerActive: false,
      startTime: null,
      history: data.history || {}
    });
  });

  // Inyectar en pestañas abiertas
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
    for (let tab of tabs) {
      if (tab.url.startsWith("http")) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        }).catch(() => {});

        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["content.css"]
        }).catch(() => {});
      }
    }
  });
});

// Heartbeat para guardar progreso cada minuto
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "heartbeat") {
    chrome.storage.sync.get(['timerActive', 'startTime', 'history'], (data) => {
      if (data.timerActive && data.startTime) {
        const now = Date.now();
        const today = getDateString();
        const history = data.history || {};
        
        // Calculamos cuánto tiempo pasó desde el último tick (o desde el inicio)
        // Guardamos 'lastTick' para evitar sobrecontar
        chrome.storage.sync.get(['lastTick'], (tickData) => {
          const lastTick = tickData.lastTick || data.startTime;
          const delta = now - lastTick;
          
          if (delta > 0) {
            history[today] = (history[today] || 0) + delta;
            chrome.storage.sync.set({ 
              history: history,
              lastTick: now
            });
          }
        });
      }
    });
  }
});

// Controlar el heartbeat basado en el estado del timer
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' || namespace === 'local') { // Escuchar ambos por si acaso, pero operar en sync
    if (changes.timerActive) {
      if (changes.timerActive.newValue) {
        chrome.storage.sync.set({ lastTick: Date.now() });
        chrome.alarms.create("heartbeat", { periodInMinutes: 1 });
      } else {
        chrome.alarms.clear("heartbeat");
      }
    }

    if (changes.timerActive || changes.startTime) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: "timerUpdated" }).catch(() => {});
        });
      });
    }
  }
});


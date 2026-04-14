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
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Al instalar o iniciar la extensión
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['history', 'blacklist', 'storageFormatVersion'], (data) => {
    const history = data.history || {};
    let migrated = false;

    // Migración de milisegundos a segundos (Versión 2)
    if (data.storageFormatVersion !== 2) {
      for (const date in history) {
        // Si el valor es sospechosamente alto (ej: > 24hs en segundos), convertirlo
        if (history[date] > 86400) { 
          history[date] = Math.round(history[date] / 1000);
          migrated = true;
        }
      }
    }

    chrome.storage.sync.set({ 
      blacklist: data.blacklist || DEFAULT_BLACKLIST,
      timerActive: false,
      startTime: null,
      history: history,
      storageFormatVersion: 2
    });
  });
  
  // ( ... resta de la inyección de pestañas igual ... )
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
    for (let tab of tabs) {
      if (tab.url.startsWith("http")) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }).catch(() => {});
        chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] }).catch(() => {});
      }
    }
  });
});

// Heartbeat para guardar progreso cada minuto
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "heartbeat") {
    chrome.storage.sync.get(['timerActive', 'startTime', 'history', 'lastTick'], (data) => {
      if (data.timerActive && (data.startTime || data.lastTick)) {
        const now = Date.now();
        const lastTick = data.lastTick || data.startTime;
        const history = data.history || {};
        
        accumulateTime(history, lastTick, now, (newHistory) => {
          chrome.storage.sync.set({ 
            history: newHistory,
            lastTick: now
          });
        });
      }
    });
  }
});

function accumulateTime(history, start, end, callback) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = getDateString(startDate);
  const endStr = getDateString(endDate);

  const deltaSeconds = Math.round((end - start) / 1000);
  if (deltaSeconds <= 0) return callback(history);

  if (startStr === endStr) {
    history[startStr] = (history[startStr] || 0) + deltaSeconds;
  } else {
    // Cruce de día (medianoche)
    const midnight = new Date(startDate);
    midnight.setHours(23, 59, 59, 999);
    const msToMidnight = midnight.getTime() - start;
    const secondsToMidnight = Math.round(msToMidnight / 1000);
    history[startStr] = (history[startStr] || 0) + secondsToMidnight;

    const remainingSeconds = deltaSeconds - secondsToMidnight;
    history[endStr] = (history[endStr] || 0) + remainingSeconds;
  }
  callback(history);
}

// Controlar el heartbeat basado en el estado del timer
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' || namespace === 'local') {
    if (changes.timerActive) {
      if (changes.timerActive.newValue) {
        chrome.storage.sync.set({ lastTick: Date.now() });
        chrome.alarms.create("heartbeat", { periodInMinutes: 1 });
      } else {
        chrome.alarms.clear("heartbeat");
        // No limpiamos lastTick aquí, dejamos que stopTimer haga el flush final
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


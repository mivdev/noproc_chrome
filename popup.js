const display = document.getElementById('display');
const statusText = document.getElementById('status-text');
const blacklistInput = document.getElementById('blacklist');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statsChart = document.getElementById('stats-chart');
const toggleBlacklistBtn = document.getElementById('toggleBlacklist');
const blacklistConfig = document.getElementById('blacklist-config');
const idealLine = document.getElementById('ideal-line');
const pinHint = document.getElementById('pin-hint');
const closePinHint = document.getElementById('closePinHint');

let updateInterval;

function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Función para formatear tiempo (ahora recibe segundos)
function formatTime(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeShort(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// Actualizar Interfaz
function updateUI() {
  chrome.storage.sync.get(['timerActive', 'startTime', 'blacklist', 'history', 'pinHintDismissed'], (data) => {
    let elapsedSeconds = 0;
    
    // Comprobar si está fijado en la barra (Chrome 91+)
    if (chrome.action && chrome.action.getUserSettings) {
        chrome.action.getUserSettings().then(settings => {
            if (settings.isOnToolbar || data.pinHintDismissed) {
                pinHint.classList.add('hidden');
            } else {
                pinHint.classList.remove('hidden');
            }
        });
    } else {
        if (data.pinHintDismissed) pinHint.classList.add('hidden');
        else pinHint.classList.remove('hidden');
    }

    if (data.timerActive && data.startTime) {
      const elapsedMs = Date.now() - data.startTime;
      elapsedSeconds = Math.floor(elapsedMs / 1000);
      display.textContent = formatTime(elapsedSeconds);
      statusText.textContent = "ENFOQUE ACTIVO";
      statusText.className = "status-active";
      
      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
    } else {
      display.textContent = "00:00";
      statusText.textContent = "MODO ESPERA";
      statusText.className = "status-inactive";
      
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
    }

    if (data.blacklist && !blacklistInput.value) {
      blacklistInput.value = data.blacklist.join(', ');
    }
    
    renderStats(data.history || {}, elapsedSeconds);
  });
}

function renderStats(history, currentSessionSeconds = 0) {
  const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const today = new Date();
  const last7Days = [];
  const IDEAL_SECONDS = 6 * 3600; // 6 horas
  const todayStr = getDateString(today);
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getDateString(d);
    
    let seconds = history[dateStr] || 0;
    const isToday = dateStr === todayStr;
    if (isToday) {
      seconds += currentSessionSeconds;
    }

    last7Days.push({
      label: days[d.getDay()],
      s: seconds,
      isToday: isToday,
      isProgressing: isToday && currentSessionSeconds > 0
    });
  }

  const maxSeconds = Math.max(...last7Days.map(d => d.s), IDEAL_SECONDS * 1.2); 
  
  // Posicionar línea ideal
  const idealPos = (IDEAL_SECONDS / maxSeconds) * 100;
  idealLine.style.bottom = `${idealPos}%`;

  statsChart.innerHTML = last7Days.map(day => {
    const height = (day.s / maxSeconds) * 100;
    const progressingClass = day.isProgressing ? 'is-progressing' : '';
    const timeTooltip = formatTimeShort(day.s);
    
    return `
      <div class="chart-bar-container">
        <div class="chart-bar-wrapper" title="${timeTooltip}">
          <div class="chart-bar ${progressingClass}" style="height: ${height}%"></div>
        </div>
        <span class="chart-day">${day.label}</span>
      </div>
    `;
  }).join('');
}

function startTimer() {
  const blacklist = blacklistInput.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const startTime = Date.now();

  chrome.storage.sync.set({ 
    timerActive: true, 
    startTime: startTime,
    lastTick: startTime,
    blacklist: blacklist
  });

  updateUI();
}

function stopTimer() {
  chrome.storage.sync.get(['timerActive', 'startTime', 'history', 'lastTick'], (data) => {
    if (data.timerActive && (data.startTime || data.lastTick)) {
      const now = Date.now();
      const lastTick = data.lastTick || data.startTime;
      const history = data.history || {};
      
      // Flush final
      const startDate = new Date(lastTick);
      const endDate = new Date(now);
      const startStr = getDateString(startDate);
      const endStr = getDateString(endDate);
      const deltaSeconds = Math.round((now - lastTick) / 1000);

      if (deltaSeconds > 0) {
        if (startStr === endStr) {
          history[startStr] = (history[startStr] || 0) + deltaSeconds;
        } else {
          const midnight = new Date(startDate);
          midnight.setHours(23, 59, 59, 999);
          const msToMidnight = midnight.getTime() - lastTick;
          const secondsToMidnight = Math.round(msToMidnight / 1000);
          history[startStr] = (history[startStr] || 0) + secondsToMidnight;
          history[endStr] = (history[endStr] || 0) + (deltaSeconds - secondsToMidnight);
        }
      }
      
      chrome.storage.sync.set({ 
        timerActive: false, 
        startTime: null,
        lastTick: null,
        history: history
      });
    } else {
      chrome.storage.sync.set({ timerActive: false, startTime: null, lastTick: null });
    }
    updateUI();
  });
}

startBtn.onclick = startTimer;
stopBtn.onclick = stopTimer;

// Toggle lista negra
toggleBlacklistBtn.onclick = () => {
    blacklistConfig.classList.toggle('hidden');
};

// Cerrar y descartar el tip de fijar extensión
closePinHint.onclick = () => {
    chrome.storage.sync.set({ pinHintDismissed: true });
    updateUI();
};

// Guardar lista negra automáticamente al cambiar
blacklistInput.onblur = () => {
  const blacklist = blacklistInput.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  chrome.storage.sync.set({ blacklist: blacklist });
};

// Cargar estado inicial
chrome.storage.sync.get(['blacklist'], (data) => {
    if (data.blacklist) blacklistInput.value = data.blacklist.join(', ');
});

updateUI();
updateInterval = setInterval(updateUI, 1000);


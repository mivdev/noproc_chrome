const display = document.getElementById('display');
const statusText = document.getElementById('status-text');
const blacklistInput = document.getElementById('blacklist');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statsChart = document.getElementById('stats-chart');
const toggleBlacklistBtn = document.getElementById('toggleBlacklist');
const blacklistConfig = document.getElementById('blacklist-config');
const idealLine = document.getElementById('ideal-line');

let updateInterval;

function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Función para formatear tiempo
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Actualizar Interfaz
function updateUI() {
  chrome.storage.sync.get(['timerActive', 'startTime', 'blacklist', 'history'], (data) => {
    if (data.timerActive && data.startTime) {
      const elapsed = Date.now() - data.startTime;
      display.textContent = formatTime(elapsed);
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
    
    renderStats(data.history || {});
  });
}

function renderStats(history) {
  const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const today = new Date();
  const last7Days = [];
  const IDEAL_MS = 6 * 3600 * 1000; // 6 horas
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getDateString(d);
    last7Days.push({
      label: days[d.getDay()],
      ms: history[dateStr] || 0,
      isToday: i === 0
    });
  }

  const maxMs = Math.max(...last7Days.map(d => d.ms), IDEAL_MS * 1.2); // Escala un 20% sobre la meta o el max
  
  // Posicionar línea ideal
  const idealPos = (IDEAL_MS / maxMs) * 100;
  idealLine.style.bottom = `${idealPos}%`;

  statsChart.innerHTML = last7Days.map(day => {
    const height = (day.ms / maxMs) * 100;
    return `
      <div class="chart-bar-container">
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height: ${height}%"></div>
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
    blacklist: blacklist
  });

  updateUI();
}

function stopTimer() {
  chrome.storage.sync.get(['startTime', 'history'], (data) => {
    if (data.timerActive && data.startTime) {
      const sessionDuration = Date.now() - data.startTime;
      const today = getDateString();
      const history = data.history || {};
      history[today] = (history[today] || 0) + sessionDuration;
      
      chrome.storage.sync.set({ 
        timerActive: false, 
        startTime: null,
        history: history
      });
    } else {
      chrome.storage.sync.set({ timerActive: false, startTime: null });
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


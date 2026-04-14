// Flag permanente: una vez que el contexto muere, nunca más se ejecuta nada
let destroyed = false;
let intervalId = null;
const overlayId = 'noproc-overlay';

function isContextInvalidatedError(error) {
  const message = typeof error === 'string' ? error : error?.message;
  return typeof message === 'string' && message.includes('Extension context invalidated');
}

function runSafely(fn) {
  try {
    fn();
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      cleanup();
      return;
    }
    throw error;
  }
}

function cleanup() {
  if (destroyed) return;
  destroyed = true;

  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  removeOverlay();
}

function isContextValid() {
  if (destroyed) return false;
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
      cleanup();
      return false;
    }
    return true;
  } catch {
    cleanup();
    return false;
  }
}

function checkAndBlock() {
  if (!isContextValid()) {
    cleanup();
    return;
  }
  try {
    chrome.storage.sync.get(['timerActive', 'blacklist', 'startTime'], (data) => {
      // Verificar dentro del callback también (puede invalidarse durante el get asíncrono)
      if (!isContextValid()) return;
      try {
        if (chrome.runtime.lastError) {
          cleanup();
          return;
        }
      } catch {
        cleanup();
        return;
      }

      const hostname = window.location.hostname;
      // Comprobar si algún elemento de la blacklist está contenido en el hostname actual
      const isBlacklisted = data.blacklist?.some(site => hostname.includes(site));

    let overlay = document.getElementById(overlayId);

    if (data.timerActive && isBlacklisted) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.innerHTML = `
          <div class="block-card">
            <div class="logo-iv">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 5L35 30H5L20 5Z" fill="#00C2FF" />
                    <path d="M20 15L28 30H12L20 15Z" fill="#003554" />
                </svg>
            </div>
            <h1>Enfoque <span>Activado</span></h1>
            <p>NoProc ha detectado un sitio de distracción. Mantén el foco en tus objetivos.</p>
            <div class="timer-box">
                <span>TIEMPO ENFOCADO</span>
                <div id="overlay-timer">00:00</div>
            </div>
            <div class="footer-brand">Powered by InfoVita</div>
          </div>
        `;
        if (!document.body) return;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
      }
      
      const elapsed = Date.now() - (data.startTime || Date.now());
      const totalSeconds = Math.floor(elapsed / 1000);
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      
      let displayTime;
      if (hrs > 0) {
        displayTime = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
      
      const timerDiv = document.getElementById('overlay-timer');
      if (timerDiv) timerDiv.textContent = displayTime;
    } else {
      removeOverlay();
    }
  });
  } catch {
    cleanup();
  }
}

window.addEventListener('error', (event) => {
  const candidate = event.error || event.message;
  if (isContextInvalidatedError(candidate)) {
    event.preventDefault();
    cleanup();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (isContextInvalidatedError(event.reason)) {
    event.preventDefault();
    cleanup();
  }
});

function removeOverlay() {
  const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.remove();
    if (document.body) {
      document.body.style.overflow = '';
    }
    }
}

// Check cada segundo para precisión del timer
runSafely(checkAndBlock);
intervalId = setInterval(() => {
  runSafely(checkAndBlock);
}, 1000);

// Escuchar señales de actualización del timer
try {
  chrome.runtime.onMessage.addListener((request) => {
      runSafely(() => {
        if (destroyed) return;
        if (request.action === "timerUpdated") {
            checkAndBlock();
        }
      });
  });
} catch {
  // contexto ya inválido al registrar el listener
}

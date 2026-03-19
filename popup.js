var toggleBtn = document.getElementById('toggleBtn');
var toggleLabel = document.getElementById('toggleLabel');
var statusDot = document.getElementById('statusDot');
var cancelCountEl = document.getElementById('cancelCountEl');
var wsCountEl = document.getElementById('wsCountEl');
var positionsArea = document.getElementById('positionsArea');
var logArea = document.getElementById('logArea');
var enabled = true;

function loadState() {
  chrome.storage.local.get(
    ['tvac_enabled', 'tvac_log', 'tvac_cancelCount', 'tvac_positions', 'tvac_wsMessages'],
    function(data) {
      enabled = data.tvac_enabled !== undefined ? data.tvac_enabled : true;
      updateToggle();

      cancelCountEl.textContent = data.tvac_cancelCount || 0;
      wsCountEl.textContent = data.tvac_wsMessages || 0;

      // Status dot — green if we have log entries (script is running)
      var hasLog = data.tvac_log && data.tvac_log.length > 0;
      if (!enabled) {
        statusDot.textContent = '●';
        statusDot.className = 'stat-value yellow';
      } else if (hasLog) {
        statusDot.textContent = '●';
        statusDot.className = 'stat-value green';
      } else {
        statusDot.textContent = '●';
        statusDot.className = 'stat-value yellow';
      }

      // Positions
      var positions = data.tvac_positions || [];
      if (positions.length > 0) {
        positionsArea.innerHTML = positions
          .map(function(p) { return '<span class="position-chip">' + p + '</span>'; })
          .join('');
      } else {
        positionsArea.innerHTML = '<div class="empty">No positions detected</div>';
      }

      // Log
      var log = data.tvac_log || [];
      if (log.length > 0) {
        logArea.innerHTML = log
          .map(function(entry) {
            var cls = entry.level === 'warn' ? 'warn' : entry.level === 'error' ? 'error' : '';
            return '<div class="log-entry ' + cls + '">' +
              '<span class="time">' + entry.time + '</span> ' + entry.message +
              '</div>';
          })
          .join('');
      } else {
        logArea.innerHTML = '<div class="log-entry" style="color:#6a6a7a">Open Tradovate and refresh the page (Cmd+R)</div>';
      }
    }
  );
}

function updateToggle() {
  if (enabled) {
    toggleBtn.classList.add('on');
    toggleLabel.textContent = 'ON';
  } else {
    toggleBtn.classList.remove('on');
    toggleLabel.textContent = 'OFF';
  }
}

toggleBtn.addEventListener('click', function() {
  enabled = !enabled;
  chrome.storage.local.set({ tvac_enabled: enabled });
  updateToggle();
});

loadState();
setInterval(loadState, 1000);

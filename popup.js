var toggleBtn = document.getElementById('toggleBtn');
var toggleLabel = document.getElementById('toggleLabel');
var statusDot = document.getElementById('statusDot');
var cancelCountEl = document.getElementById('cancelCountEl');
var wsCountEl = document.getElementById('wsCountEl');
var positionsArea = document.getElementById('positionsArea');
var logArea = document.getElementById('logArea');
var panicDot = document.getElementById('panicDot');
var panicLabel = document.getElementById('panicLabel');
var settingsToggle = document.getElementById('settingsToggle');
var settingsPanel = document.getElementById('settingsPanel');
var projectIdInput = document.getElementById('projectIdInput');
var apiKeyInput = document.getElementById('apiKeyInput');
var saveBtn = document.getElementById('saveBtn');
var saveMsg = document.getElementById('saveMsg');
var enabled = true;

function loadState() {
  chrome.storage.local.get(
    ['tvac_enabled', 'tvac_log', 'tvac_cancelCount', 'tvac_positions',
     'tvac_wsMessages', 'tvac_firebase_config', 'tvac_panicConnected'],
    function (data) {
      enabled = data.tvac_enabled !== undefined ? data.tvac_enabled : true;
      updateToggle();

      cancelCountEl.textContent = data.tvac_cancelCount || 0;
      wsCountEl.textContent = data.tvac_wsMessages || 0;

      // Status dot
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
          .map(function (p) { return '<span class="position-chip">' + p + '</span>'; })
          .join('');
      } else {
        positionsArea.innerHTML = '<div class="empty">No positions detected</div>';
      }

      // Log
      var log = data.tvac_log || [];
      if (log.length > 0) {
        logArea.innerHTML = log
          .map(function (entry) {
            var cls = entry.level === 'warn' ? 'warn' : entry.level === 'error' ? 'error' : '';
            return '<div class="log-entry ' + cls + '">' +
              '<span class="time">' + entry.time + '</span> ' + entry.message +
              '</div>';
          })
          .join('');
      } else {
        logArea.innerHTML = '<div class="log-entry" style="color:#6a6a7a">Open Tradovate and refresh the page (Cmd+R)</div>';
      }

      // Panic button status
      var config = data.tvac_firebase_config;
      if (config && config.projectId && config.apiKey) {
        panicDot.className = 'panic-dot on';
        panicLabel.textContent = 'Connected to Firebase';
        // Pre-fill settings inputs
        projectIdInput.value = config.projectId;
        apiKeyInput.value = config.apiKey;
      } else {
        panicDot.className = 'panic-dot off';
        panicLabel.textContent = 'Not configured';
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

// Toggle auto-cancel on/off
toggleBtn.addEventListener('click', function () {
  enabled = !enabled;
  chrome.storage.local.set({ tvac_enabled: enabled });
  updateToggle();
});

// Toggle settings panel
settingsToggle.addEventListener('click', function () {
  settingsPanel.classList.toggle('open');
  settingsToggle.textContent = settingsPanel.classList.contains('open') ? 'Close' : 'Settings';
});

// Save Firebase config
saveBtn.addEventListener('click', function () {
  var projectId = projectIdInput.value.trim();
  var apiKey = apiKeyInput.value.trim();

  if (!projectId || !apiKey) {
    saveMsg.textContent = 'Both fields are required.';
    saveMsg.style.color = '#ef4444';
    saveMsg.style.display = 'block';
    return;
  }

  chrome.storage.local.set({
    tvac_firebase_config: {
      projectId: projectId,
      apiKey: apiKey
    }
  }, function () {
    saveMsg.textContent = 'Saved! Extension will use this on next check.';
    saveMsg.style.color = '#22c55e';
    saveMsg.style.display = 'block';
    setTimeout(function () { saveMsg.style.display = 'none'; }, 3000);
  });
});

loadState();
setInterval(loadState, 1000);

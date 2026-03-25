/*
 * content.js — Tradovate Auto-Cancel v4 (with Remote Panic Button)
 *
 * Everything from v3, plus:
 * - Pushes current instrument/contracts to Firestore every 5 seconds
 * - Polls Firestore for a panic signal every 3 seconds
 * - When panic signal fires, clicks "Exit at Mkt & Cxl"
 */

(function () {
  'use strict';

  var LOG_PREFIX = '[AutoCancel]';
  var enabled = true;
  var lastPosition = null;
  var lastInstrument = null;
  var activityLog = [];
  var cancelCount = 0;
  var initialized = false;
  var cooldownUntil = 0;

  // ---- Firebase / Panic Button ----
  var firebaseConfig = null;
  var lastPanicCheck = 0;
  var lastPositionPush = 0;
  var lastProcessedTimestamp = 0;
  var panicConnected = false;

  // ---- Logging ----
  function log(msg, level) {
    level = level || 'info';
    var time = new Date().toLocaleTimeString();
    console.log(LOG_PREFIX, msg);
    activityLog.unshift({ time: time, message: msg, level: level });
    if (activityLog.length > 30) activityLog.pop();
    try {
      chrome.storage.local.set({
        tvac_log: activityLog.slice(0, 20),
        tvac_cancelCount: cancelCount,
        tvac_enabled: enabled,
        tvac_panicConnected: panicConnected
      });
    } catch (e) {}
  }

  // Load enabled state and firebase config
  try {
    chrome.storage.local.get(['tvac_enabled', 'tvac_firebase_config'], function (r) {
      if (r && r.tvac_enabled !== undefined) enabled = r.tvac_enabled;
      if (r && r.tvac_firebase_config) {
        firebaseConfig = r.tvac_firebase_config;
        panicConnected = true;
      }
    });
    chrome.storage.onChanged.addListener(function (changes) {
      if (changes.tvac_enabled) {
        enabled = changes.tvac_enabled.newValue;
        log(enabled ? 'Enabled' : 'Disabled');
      }
      if (changes.tvac_firebase_config) {
        firebaseConfig = changes.tvac_firebase_config.newValue;
        panicConnected = !!firebaseConfig;
        if (panicConnected) log('Firebase config updated');
      }
    });
  } catch (e) {}

  // ---- Firestore REST helpers ----
  function firestoreBase() {
    if (!firebaseConfig || !firebaseConfig.projectId || !firebaseConfig.apiKey) return null;
    return 'https://firestore.googleapis.com/v1/projects/' +
      firebaseConfig.projectId +
      '/databases/(default)/documents/';
  }

  function firestoreUrl(path) {
    var base = firestoreBase();
    if (!base) return null;
    return base + path + '?key=' + firebaseConfig.apiKey;
  }

  // ---- Check for remote panic signal ----
  function checkPanicSignal() {
    if (!firebaseConfig) return;
    if (Date.now() - lastPanicCheck < 3000) return;
    lastPanicCheck = Date.now();

    var url = firestoreUrl('signals/panic');
    if (!url) return;

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (doc) {
        if (!doc.fields) return;

        var triggered = doc.fields.triggered && doc.fields.triggered.booleanValue === true;
        var target = doc.fields.instrument && doc.fields.instrument.stringValue;
        var ts = doc.fields.timestamp && (doc.fields.timestamp.integerValue || doc.fields.timestamp.stringValue);
        ts = parseInt(ts) || 0;

        if (!triggered || ts <= lastProcessedTimestamp) return;

        var currentInstr = findInstrument();

        // Only act if signal targets our instrument or "all"
        if (target === 'all' || target === currentInstr) {
          log('REMOTE PANIC — target: ' + target, 'warn');

          var clicked = clickExitButton();
          if (clicked) {
            cancelCount++;
            log('Remote exit executed on ' + (currentInstr || 'unknown'), 'warn');
          } else {
            log('Exit button not found (remote panic)', 'error');
          }

          lastProcessedTimestamp = ts;
          cooldownUntil = Date.now() + 5000;

          // Reset the signal so it doesn't re-trigger
          resetPanicSignal();
        }
      })
      .catch(function () {
        // Silent fail — network hiccup, will retry in 3s
      });
  }

  function resetPanicSignal() {
    var url = firestoreUrl('signals/panic');
    if (!url) return;

    fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          triggered: { booleanValue: false },
          instrument: { stringValue: '' },
          timestamp: { integerValue: '0' }
        }
      })
    }).catch(function () {});
  }

  // ---- Push position data to Firestore ----
  function pushPosition() {
    if (!firebaseConfig) return;
    if (Date.now() - lastPositionPush < 5000) return;
    lastPositionPush = Date.now();

    var instr = findInstrument();
    var pos = findPosition();
    if (!instr) return;

    var url = firestoreUrl('positions/' + instr);
    if (!url) return;

    if (pos !== null && pos !== 0) {
      // Write current position
      fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            instrument: { stringValue: instr },
            contracts: { integerValue: String(Math.abs(pos)) },
            direction: { stringValue: pos > 0 ? 'LONG' : 'SHORT' },
            lastSeen: { integerValue: String(Date.now()) }
          }
        })
      }).catch(function () {});
    } else {
      // Position is flat — remove from Firestore
      fetch(url, { method: 'DELETE' }).catch(function () {});
    }
  }

  // ---- Find position value on the page ----
  function findPosition() {
    var allText = document.body.innerText;
    var lines = allText.split('\n');

    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'POSITION' && i + 1 < lines.length) {
        return parsePosition(lines[i + 1].trim());
      }
    }

    var match = allText.match(/POSITION\s+(-?\d+(?:@[\d.]+)?)/);
    if (match) return parsePosition(match[1]);

    return null;
  }

  function parsePosition(text) {
    if (!text) return null;
    if (text === '0') return 0;
    if (text.indexOf('--') !== -1) return 0;

    var atMatch = text.match(/^(-?\d+)@/);
    if (atMatch) return parseInt(atMatch[1]);

    var num = parseInt(text);
    if (!isNaN(num)) return num;

    return null;
  }

  // ---- Find current instrument ----
  function findInstrument() {
    var allText = document.body.innerText;
    var lines = allText.split('\n');
    var symbolPattern = /^([A-Z0-9]{2,6}[FGHJKMNQUVXZ]\d{1,2})$/;

    for (var i = 0; i < Math.min(lines.length, 40); i++) {
      var line = lines[i].trim();
      if (symbolPattern.test(line)) return line;
    }

    return null;
  }

  // ---- Find and click Exit at Mkt & Cxl ----
  function clickExitButton() {
    var allButtons = document.querySelectorAll('button, a, [role="button"]');

    for (var i = 0; i < allButtons.length; i++) {
      var text = allButtons[i].textContent.trim();
      if (text === 'Exit at Mkt & Cxl') {
        allButtons[i].click();
        return true;
      }
    }

    for (var i = 0; i < allButtons.length; i++) {
      var text = allButtons[i].textContent.trim();
      if (text.indexOf('Exit at Mkt') !== -1 && text.indexOf('Cxl') !== -1) {
        allButtons[i].click();
        return true;
      }
    }

    return false;
  }

  // ---- Main check ----
  function check() {
    if (!enabled) return;

    // Always check panic signal, even during cooldown
    checkPanicSignal();

    // Always push position data
    pushPosition();

    // Skip normal auto-cancel during cooldown
    if (Date.now() < cooldownUntil) return;

    var instrument = findInstrument();
    var position = findPosition();

    // First run — just record state
    if (!initialized) {
      initialized = true;
      lastInstrument = instrument;
      lastPosition = position;

      var posText = position !== null ? String(position) : 'unknown';
      log('Monitoring: ' + (instrument || 'no instrument') + ' | position: ' + posText);

      var positions = [];
      if (instrument && position !== null && position !== 0) {
        positions.push(instrument);
      }
      try {
        chrome.storage.local.set({ tvac_positions: positions, tvac_wsMessages: 1 });
      } catch (e) {}

      return;
    }

    // Update popup with current positions
    var positions = [];
    if (instrument && position !== null && position !== 0) {
      positions.push(instrument);
    }
    try {
      chrome.storage.local.set({ tvac_positions: positions, tvac_wsMessages: 1 });
    } catch (e) {}

    // User switched tabs
    if (instrument !== lastInstrument) {
      log('Switched to ' + (instrument || 'unknown'));
      lastInstrument = instrument;
      lastPosition = position;
      return;
    }

    // Detect position change
    if (position !== lastPosition) {

      // Position OPENED
      if ((lastPosition === null || lastPosition === 0) && position !== null && position !== 0) {
        var dir = position > 0 ? 'LONG' : 'SHORT';
        log(dir + ' ' + Math.abs(position) + ' ' + instrument, 'warn');
      }

      // Position CLOSED
      if (lastPosition !== null && lastPosition !== 0 && (position === 0 || position === null)) {
        log('CLOSED on ' + instrument + ' (was ' + lastPosition + ')', 'warn');

        log('Clicking Exit at Mkt & Cxl...', 'warn');
        var clicked = clickExitButton();

        if (clicked) {
          cancelCount++;
          log('Canceled orders on ' + instrument, 'warn');
        } else {
          log('Exit button not found!', 'error');
        }

        cooldownUntil = Date.now() + 5000;
      }

      lastPosition = position;
    }
  }

  // ---- Start ----
  log('Loaded on ' + window.location.hostname);

  setTimeout(function () {
    log('Starting monitor...');
    setInterval(check, 1000);
  }, 3000);

})();

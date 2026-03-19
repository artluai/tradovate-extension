/*
 * content.js — Tradovate Auto-Cancel v3 (Simplified)
 * 
 * Dead simple approach:
 * 1. Every second, scan the page text for the POSITION value
 * 2. If position goes from non-zero to zero, click cancel
 * 3. That's it.
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
        tvac_enabled: enabled
      });
    } catch (e) {}
  }

  // Load enabled state
  try {
    chrome.storage.local.get(['tvac_enabled'], function(r) {
      if (r && r.tvac_enabled !== undefined) enabled = r.tvac_enabled;
    });
    chrome.storage.onChanged.addListener(function(changes) {
      if (changes.tvac_enabled) {
        enabled = changes.tvac_enabled.newValue;
        log(enabled ? 'Enabled' : 'Disabled');
      }
    });
  } catch (e) {}

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

  // ---- Check for orders in the Orders panel ----
  function hasOrdersForInstrument(symbol) {
    var text = document.body.innerText;
    var pattern1 = new RegExp(symbol + '[\\s\\S]{0,50}(?:Limit|Stop|Market)', 'i');
    var pattern2 = new RegExp('(?:Buy|Sell)[\\s\\S]{0,30}' + symbol, 'i');
    return pattern1.test(text) || pattern2.test(text);
  }

  // ---- Main check ----
  function check() {
    if (!enabled) return;
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
        log('📈 ' + dir + ' ' + Math.abs(position) + ' ' + instrument, 'warn');
      }

      // Position CLOSED
      if (lastPosition !== null && lastPosition !== 0 && (position === 0 || position === null)) {
        log('⚡ CLOSED on ' + instrument + ' (was ' + lastPosition + ')', 'warn');

        log('Clicking Exit at Mkt & Cxl...', 'warn');
        var clicked = clickExitButton();

        if (clicked) {
          cancelCount++;
          log('✅ Canceled orders on ' + instrument, 'warn');
        } else {
          log('⚠️ Exit button not found!', 'error');
        }

        cooldownUntil = Date.now() + 5000;
      }

      lastPosition = position;
    }
  }

  // ---- Start ----
  log('Loaded on ' + window.location.hostname);

  setTimeout(function() {
    log('Starting monitor...');
    setInterval(check, 1000);
  }, 3000);

})();

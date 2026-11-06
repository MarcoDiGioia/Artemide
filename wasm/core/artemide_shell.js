/**
 * @file core/artemide_shell.js
 * @brief Platform-agnostic state manager and transport adapter for Artemide Console Shell.
 *        Compatible with Tizen, webOS, Android WebView, Electron, and browser environments.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArtemideShell = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  function ArtemideShell(options) {
    options = options || {};
    this.host = options.host || '127.0.0.1';
    this.httpPort = options.httpPort || 47999;
    this.fallbackPort = options.fallbackPort || 47989;
    this.pollInterval = options.pollInterval || 1500;
    this.onStateChange = options.onStateChange || null;
    this.onKeySend = options.onKeySend || null; // function(keyCode, isDown)

    this.state = {
      active_app: 'Steam Big Picture',
      game_id: '0',
      active_game_pid: 0,
      base_provider: 'Steam',
      cursor_mode: 'CONTROLLER',
      audio_ducked: false,
      windows: []
    };

    this.timer_ = null;
    this.isPolling_ = false;
    this.activePort_ = this.httpPort;
  }

  ArtemideShell.prototype.setHost = function(host, port) {
    this.host = host || this.host;
    if (port) this.httpPort = port;
    this.activePort_ = this.httpPort;
  };

  ArtemideShell.prototype.start = function() {
    if (this.isPolling_) return;
    this.isPolling_ = true;
    var self = this;
    this.fetchState();
    this.timer_ = setInterval(function() {
      self.fetchState();
    }, this.pollInterval);
  };

  ArtemideShell.prototype.stop = function() {
    this.isPolling_ = false;
    if (this.timer_) {
      clearInterval(this.timer_);
      this.timer_ = null;
    }
  };

  ArtemideShell.prototype.fetchState = function() {
    var self = this;
    var url = 'http://' + this.host + ':' + this.activePort_ + '/shell/state';
    fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        self.applyState(data);
      })
      .catch(function(err) {
        // Fallback to secondary port if primary fails
        if (self.activePort_ === self.httpPort && self.fallbackPort && self.fallbackPort !== self.httpPort) {
          self.activePort_ = self.fallbackPort;
          var fallbackUrl = 'http://' + self.host + ':' + self.activePort_ + '/shell/state';
          fetch(fallbackUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) { self.applyState(data); })
            .catch(function() {});
        }
      });
  };

  ArtemideShell.prototype.sendCommand = function(action, targetId, value) {
    var self = this;
    var url = 'http://' + this.host + ':' + this.activePort_ + '/shell/cmd?action=' +
      encodeURIComponent(action || '') +
      '&target_id=' + encodeURIComponent(targetId || '') +
      '&value=' + encodeURIComponent(value || '');

    return fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        self.applyState(data);
        return data;
      })
      .catch(function(err) {
        console.warn('[ArtemideShell] sendCommand error:', err);
      });
  };

  ArtemideShell.prototype.applyState = function(newState) {
    if (!newState) return;
    this.state = newState;
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
  };

  ArtemideShell.prototype.returnHome = function() {
    return this.sendCommand('RETURN_HOME', '', '');
  };

  ArtemideShell.prototype.focusWindow = function(windowId) {
    return this.sendCommand('SWITCH_WINDOW', windowId, '');
  };

  ArtemideShell.prototype.terminateApp = function(targetId) {
    return this.sendCommand('FORCE_KILL', targetId, '');
  };

  ArtemideShell.prototype.setCursorMode = function(mode) {
    return this.sendCommand('SET_CURSOR_MODE', mode, '');
  };

  ArtemideShell.prototype.setAudioDucking = function(enabled) {
    return this.sendCommand('SET_AUDIO_DUCKING', '', enabled ? 'true' : 'false');
  };

  ArtemideShell.prototype.sendKey = function(keyCode, isDown) {
    if (typeof this.onKeySend === 'function') {
      this.onKeySend(keyCode, isDown);
    }
  };

  return ArtemideShell;
}));

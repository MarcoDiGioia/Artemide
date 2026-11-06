/**
 * @file core/artemide_drawer.js
 * @brief Platform-agnostic Slide-Out Drawer and Task Switcher for Artemide Console Shell.
 *        Compatible with Tizen, webOS, Android WebView, and standard browsers.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArtemideDrawer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  function ArtemideDrawer(options) {
    options = options || {};
    this.shell = options.shell || null;
    this.keyboard = options.keyboard || null;
    this.container = null;
    this.hoverZone = null;
    this.isOpen = false;
  }

  ArtemideDrawer.prototype.mount = function(parentEl) {
    if (this.container) return;
    parentEl = parentEl || document.body;

    // 1. Left-edge hover trigger zone
    var hz = document.createElement('div');
    hz.id = 'artemide-hover-zone';
    var self = this;
    hz.addEventListener('mouseenter', function() {
      self.open();
    });
    parentEl.appendChild(hz);
    this.hoverZone = hz;

    // 2. Main drawer container
    var drawer = document.createElement('div');
    drawer.id = 'artemide-drawer';
    drawer.className = 'artemide-drawer-closed';
    drawer.innerHTML =
      '<div class="artemide-drawer-header">' +
        '<div class="artemide-brand">' +
          '<span class="artemide-logo">🎮</span>' +
          '<div class="artemide-titles">' +
            '<span class="artemide-title">CONSOLE SHELL</span>' +
            '<span class="artemide-subtitle" id="artemide-active-app">Steam Big Picture</span>' +
          '</div>' +
        '</div>' +
        '<button class="artemide-close-btn" id="artemide-btn-close">✕</button>' +
      '</div>' +
      '<div class="artemide-drawer-actions">' +
        '<button class="artemide-action-btn" id="artemide-btn-home">' +
          '<span class="icon">🏠</span><span>Home</span>' +
        '</button>' +
        '<button class="artemide-action-btn" id="artemide-btn-mouse">' +
          '<span class="icon">🖱️</span><span id="artemide-mouse-label">Mouse</span>' +
        '</button>' +
        '<button class="artemide-action-btn" id="artemide-btn-ducking">' +
          '<span class="icon">🔊</span><span id="artemide-ducking-label">Audio</span>' +
        '</button>' +
        '<button class="artemide-action-btn" id="artemide-btn-kbd">' +
          '<span class="icon">⌨️</span><span>Tastiera</span>' +
        '</button>' +
      '</div>' +
      '<div class="artemide-section-title">FINESTRE ATTIVE (TASK SWITCHER)</div>' +
      '<div class="artemide-window-list" id="artemide-window-list">' +
        '<div class="artemide-window-empty">Nessuna finestra rilevata</div>' +
      '</div>';

    drawer.addEventListener('mouseleave', function() {
      self.close();
    });

    parentEl.appendChild(drawer);
    this.container = drawer;

    // Attach button listeners
    drawer.querySelector('#artemide-btn-close').addEventListener('click', function(e) {
      e.stopPropagation();
      self.close();
    });

    drawer.querySelector('#artemide-btn-home').addEventListener('click', function(e) {
      e.stopPropagation();
      if (self.shell) self.shell.returnHome();
    });

    drawer.querySelector('#artemide-btn-mouse').addEventListener('click', function(e) {
      e.stopPropagation();
      if (!self.shell) return;
      var curMode = (self.shell.state && self.shell.state.cursor_mode) || 'CONTROLLER';
      var newMode = curMode === 'POINTER' ? 'CONTROLLER' : 'POINTER';
      self.shell.setCursorMode(newMode);
    });

    drawer.querySelector('#artemide-btn-ducking').addEventListener('click', function(e) {
      e.stopPropagation();
      if (!self.shell) return;
      var curDucking = (self.shell.state && self.shell.state.audio_ducked) || false;
      self.shell.setAudioDucking(!curDucking);
    });

    drawer.querySelector('#artemide-btn-kbd').addEventListener('click', function(e) {
      e.stopPropagation();
      if (self.keyboard) self.keyboard.toggle();
    });
  };

  ArtemideDrawer.prototype.open = function() {
    if (!this.container) this.mount();
    this.container.classList.remove('artemide-drawer-closed');
    this.container.classList.add('artemide-drawer-open');
    this.isOpen = true;
    if (this.shell) this.shell.fetchState();
  };

  ArtemideDrawer.prototype.close = function() {
    if (!this.container) return;
    this.container.classList.remove('artemide-drawer-open');
    this.container.classList.add('artemide-drawer-closed');
    this.isOpen = false;
  };

  ArtemideDrawer.prototype.toggle = function() {
    if (this.isOpen) this.close();
    else this.open();
  };

  ArtemideDrawer.prototype.updateDOM = function(state) {
    if (!this.container || !state) return;

    var activeAppEl = this.container.querySelector('#artemide-active-app');
    if (activeAppEl) {
      activeAppEl.textContent = state.active_app || state.base_provider || 'Console';
    }

    var mouseLabel = this.container.querySelector('#artemide-mouse-label');
    if (mouseLabel) {
      mouseLabel.textContent = state.cursor_mode === 'POINTER' ? 'Mouse (Attivo)' : 'Gamepad';
    }

    var duckingLabel = this.container.querySelector('#artemide-ducking-label');
    if (duckingLabel) {
      duckingLabel.textContent = state.audio_ducked ? 'Audio (Basso)' : 'Audio (Normale)';
    }

    var listEl = this.container.querySelector('#artemide-window-list');
    if (!listEl) return;

    var windows = state.windows || [];
    if (windows.length === 0) {
      listEl.innerHTML = '<div class="artemide-window-empty">Nessuna finestra attiva</div>';
      return;
    }

    listEl.innerHTML = '';
    var self = this;
    for (var i = 0; i < windows.length; ++i) {
      var win = windows[i];
      var item = document.createElement('div');
      item.className = 'artemide-window-item' + (win.focused ? ' focused' : '');

      var titleSpan = document.createElement('span');
      titleSpan.className = 'artemide-window-title';
      titleSpan.textContent = win.title || win.exe || ('PID ' + win.pid);

      var roleBadge = document.createElement('span');
      roleBadge.className = 'artemide-role-badge ' + (win.role || 'game').toLowerCase();
      roleBadge.textContent = win.role || 'APP';

      var killBtn = document.createElement('button');
      killBtn.className = 'artemide-kill-btn';
      killBtn.textContent = '✕';
      killBtn.title = 'Chiudi processo';

      (function(w) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          if (self.shell) self.shell.focusWindow(w.id || String(w.pid));
        });

        killBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (self.shell) self.shell.terminateApp(w.id || String(w.pid));
        });
      })(win);

      item.appendChild(titleSpan);
      item.appendChild(roleBadge);
      item.appendChild(killBtn);
      listEl.appendChild(item);
    }
  };

  return ArtemideDrawer;
}));

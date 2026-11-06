/**
 * @file core/artemide_input.js
 * @brief Platform-agnostic input gestures & controller combo detector for Artemide Console Shell.
 *        Compatible with Tizen, webOS, Android WebView, and standard browsers.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArtemideInput = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  function ArtemideInput(options) {
    options = options || {};
    this.onToggleDrawer = options.onToggleDrawer || null;
    this.onOpenDrawer = options.onOpenDrawer || null;
    this.onCloseDrawer = options.onCloseDrawer || null;
    this.hoverWidth = options.hoverWidth || 24; // px
    this.holdDurationMs = options.holdDurationMs || 800; // ms for Back+Start

    this.comboStartTime_ = 0;
    this.comboTriggered_ = false;
    this.gamepadPollTimer_ = null;
    this.enabled_ = false;
  }

  ArtemideInput.prototype.start = function() {
    if (this.enabled_) return;
    this.enabled_ = true;
    var self = this;

    // 1. Mouse left-edge hover detection
    this.mouseMoveHandler_ = function(e) {
      if (!self.enabled_) return;
      if (e.clientX <= self.hoverWidth) {
        if (typeof self.onOpenDrawer === 'function') {
          self.onOpenDrawer();
        }
      }
    };
    window.addEventListener('mousemove', this.mouseMoveHandler_);

    // 2. Keyboard shortcuts (ESC / F10 / TV back)
    this.keyHandler_ = function(e) {
      if (!self.enabled_) return;
      if (e.key === 'Escape' || e.keyCode === 27 || e.keyCode === 10009 /* Tizen Back */) {
        if (typeof self.onCloseDrawer === 'function') {
          self.onCloseDrawer();
        }
      }
    };
    window.addEventListener('keydown', this.keyHandler_);

    // 3. Gamepad polling loop for Back + Start 800ms hold
    this.pollGamepads_();
  };

  ArtemideInput.prototype.stop = function() {
    this.enabled_ = false;
    if (this.mouseMoveHandler_) {
      window.removeEventListener('mousemove', this.mouseMoveHandler_);
      this.mouseMoveHandler_ = null;
    }
    if (this.keyHandler_) {
      window.removeEventListener('keydown', this.keyHandler_);
      this.keyHandler_ = null;
    }
    if (this.gamepadPollTimer_) {
      cancelAnimationFrame(this.gamepadPollTimer_);
      this.gamepadPollTimer_ = null;
    }
  };

  ArtemideInput.prototype.pollGamepads_ = function() {
    if (!this.enabled_) return;
    var self = this;

    var gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    var comboPressed = false;

    for (var i = 0; i < gamepads.length; ++i) {
      var gp = gamepads[i];
      if (!gp || !gp.buttons) continue;

      // Standard gamepad mapping: button[8] = Back/Select, button[9] = Start
      var backPressed = gp.buttons[8] && (gp.buttons[8].pressed || gp.buttons[8].value > 0.5);
      var startPressed = gp.buttons[9] && (gp.buttons[9].pressed || gp.buttons[9].value > 0.5);

      if (backPressed && startPressed) {
        comboPressed = true;
        break;
      }
    }

    var now = Date.now();
    if (comboPressed) {
      if (!this.comboStartTime_) {
        this.comboStartTime_ = now;
      } else if (now - this.comboStartTime_ >= this.holdDurationMs) {
        if (!this.comboTriggered_) {
          this.comboTriggered_ = true;
          if (typeof self.onToggleDrawer === 'function') {
            self.onToggleDrawer();
          }
        }
      }
    } else {
      this.comboStartTime_ = 0;
      this.comboTriggered_ = false;
    }

    this.gamepadPollTimer_ = requestAnimationFrame(function() {
      self.pollGamepads_();
    });
  };

  return ArtemideInput;
}));

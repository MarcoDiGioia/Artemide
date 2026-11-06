/**
 * @file core/artemide_keyboard.js
 * @brief Platform-agnostic Virtual On-Screen Keyboard (OSK) for Artemide Console Shell.
 *        Emits standard Windows virtual key codes (VK_*) for native Moonlight input injection.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArtemideKeyboard = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  var KEY_ROWS = [
    [
      { label: 'ESC', code: 0x1B }, { label: '1', code: 0x31 }, { label: '2', code: 0x32 },
      { label: '3', code: 0x33 }, { label: '4', code: 0x34 }, { label: '5', code: 0x35 },
      { label: '6', code: 0x36 }, { label: '7', code: 0x37 }, { label: '8', code: 0x38 },
      { label: '9', code: 0x39 }, { label: '0', code: 0x30 }, { label: 'BKSP', code: 0x08, wide: true }
    ],
    [
      { label: 'TAB', code: 0x09, wide: true }, { label: 'Q', code: 0x51 }, { label: 'W', code: 0x57 },
      { label: 'E', code: 0x45 }, { label: 'R', code: 0x52 }, { label: 'T', code: 0x54 },
      { label: 'Y', code: 0x59 }, { label: 'U', code: 0x55 }, { label: 'I', code: 0x49 },
      { label: 'O', code: 0x4F }, { label: 'P', code: 0x50 }, { label: 'ENTER', code: 0x0D, wide: true }
    ],
    [
      { label: 'CAPS', action: 'caps', wide: true }, { label: 'A', code: 0x41 }, { label: 'S', code: 0x53 },
      { label: 'D', code: 0x44 }, { label: 'F', code: 0x46 }, { label: 'G', code: 0x47 },
      { label: 'H', code: 0x48 }, { label: 'J', code: 0x4A }, { label: 'K', code: 0x4B },
      { label: 'L', code: 0x4C }, { label: ';', code: 0xBA }, { label: '\'', code: 0xDE }
    ],
    [
      { label: 'SHIFT', action: 'shift', wide: true }, { label: 'Z', code: 0x5A }, { label: 'X', code: 0x58 },
      { label: 'C', code: 0x43 }, { label: 'V', code: 0x56 }, { label: 'B', code: 0x42 },
      { label: 'N', code: 0x4E }, { label: 'M', code: 0x4D }, { label: ',', code: 0xBC },
      { label: '.', code: 0xBE }, { label: '/', code: 0xBF }, { label: '▲', code: 0x26 }
    ],
    [
      { label: 'CLOSE', action: 'close', wide: true },
      { label: 'SPACE', code: 0x20, extraWide: true },
      { label: '◄', code: 0x25 }, { label: '▼', code: 0x28 }, { label: '►', code: 0x27 }
    ]
  ];

  function ArtemideKeyboard(options) {
    options = options || {};
    this.container = options.container || null;
    this.onKeySend = options.onKeySend || null; // function(keyCode, isDown)
    this.visible = false;
    this.capsLock = false;
    this.shiftActive = false;
  }

  ArtemideKeyboard.prototype.mount = function(parentEl) {
    if (this.container) return;
    parentEl = parentEl || document.body;

    var overlay = document.createElement('div');
    overlay.id = 'artemide-keyboard-overlay';
    overlay.className = 'artemide-keyboard-hidden';

    var header = document.createElement('div');
    header.className = 'artemide-keyboard-header';
    header.innerHTML = '<span>Tastiera a Schermo</span><button class="artemide-keyboard-close">✕</button>';
    overlay.appendChild(header);

    var rowsContainer = document.createElement('div');
    rowsContainer.className = 'artemide-keyboard-rows';

    var self = this;
    for (var r = 0; r < KEY_ROWS.length; ++r) {
      var rowEl = document.createElement('div');
      rowEl.className = 'artemide-keyboard-row';
      var row = KEY_ROWS[r];
      for (var k = 0; k < row.length; ++k) {
        var key = row[k];
        var btn = document.createElement('button');
        btn.className = 'artemide-key' + (key.wide ? ' wide' : '') + (key.extraWide ? ' extra-wide' : '');
        btn.textContent = key.label;
        btn.dataset.code = key.code || '';
        btn.dataset.action = key.action || '';
        (function(keyDef) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            self.handleKeyPress(keyDef);
          });
        })(key);
        rowEl.appendChild(btn);
      }
      rowsContainer.appendChild(rowEl);
    }
    overlay.appendChild(rowsContainer);

    header.querySelector('.artemide-keyboard-close').addEventListener('click', function(e) {
      e.stopPropagation();
      self.hide();
    });

    parentEl.appendChild(overlay);
    this.container = overlay;
  };

  ArtemideKeyboard.prototype.handleKeyPress = function(keyDef) {
    if (keyDef.action === 'close') {
      this.hide();
      return;
    }
    if (keyDef.action === 'caps') {
      this.capsLock = !this.capsLock;
      return;
    }
    if (keyDef.action === 'shift') {
      this.shiftActive = !this.shiftActive;
      return;
    }

    if (keyDef.code && typeof this.onKeySend === 'function') {
      // Send KeyDown followed immediately by KeyUp
      this.onKeySend(keyDef.code, true);
      var self = this;
      setTimeout(function() {
        self.onKeySend(keyDef.code, false);
      }, 50);
    }
  };

  ArtemideKeyboard.prototype.show = function() {
    if (!this.container) this.mount();
    this.container.classList.remove('artemide-keyboard-hidden');
    this.container.classList.add('artemide-keyboard-visible');
    this.visible = true;
  };

  ArtemideKeyboard.prototype.hide = function() {
    if (!this.container) return;
    this.container.classList.remove('artemide-keyboard-visible');
    this.container.classList.add('artemide-keyboard-hidden');
    this.visible = false;
  };

  ArtemideKeyboard.prototype.toggle = function() {
    if (this.visible) this.hide();
    else this.show();
  };

  return ArtemideKeyboard;
}));

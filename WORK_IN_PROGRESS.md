# Homelab Console — Stato dei Lavori (Work in Progress)

> **Ultimo aggiornamento:** 6 Novembre 2026  
> **Documento gemello presente in:** `Apollonio/WORK_IN_PROGRESS.md` e `Artemide/WORK_IN_PROGRESS.md`  
> **Documento di architettura di riferimento:** `Apollonio/DEVELOPMENT_PLAN.md`

---

## 1. Obiettivo del Progetto (Visione d'Insieme)

Costruire un ecosistema client-server per trasformare una Smart TV Samsung Tizen e un server PC/Linux in una **Console da Salotto** completa (stile PS5 / Xbox Series X / SteamOS), priva di qualsiasi attrito da desktop remoto:

- **Apollonio** (Fork Server di *LizardByte/Sunshine*):
  - Funge da **Console OS Supervisor** (`apollonio-shell` + integrazione nativa nel core Sunshine).
  - Isola il display di streaming con un **Kiosk Black Backdrop** a schermo intero (nascondendo desktop, icone e taskbar).
  - Gestisce una **Base App Dashboard** modulare (`IBaseAppProvider`: *Steam Big Picture*, *Playnite Fullscreen*, *Xbox Console Mode*) sempre pronta sotto il gioco attivo.
  - Mantiene uno **Z-Order deterministico** guidato da eventi (`SetWinEventHook` su Windows / polling e `wmctrl` su Linux) tra Backdrop -> Base App -> Gioco Attivo.
  - Attenua automaticamente l'audio del gioco (**Audio Ducking al 15%** tramite WASAPI `ISimpleAudioVolume` su Windows o `pactl` su Linux) quando si torna alla Home/Dashboard o si apre il Drawer.
  - Offre un **Hover Drawer proprietario** lato host (attivabile portando il cursore sul bordo sinistro `x <= 4` per 250ms) e si sincronizza con il Drawer nativo del client tramite il protocollo `0x31xx`.
  - Espone l'endpoint HTTP/HTTPS `/shell/asset?appid=<id>` e `/shell/state` per servire le copertine verticali (`<appid>_library_600x900.jpg`) direttamente dalla cache locale di Steam.

- **Artemide** (Fork Client di *brightcraft/moonlight-tizen*):
  - Funge da **Console Companion Client** con **Quick Menu / Hover Drawer** sovrapposto allo stream video.
  - Intercetta la combo **Select + Start (`BACK_FLAG | PLAY_FLAG`)** con **Grace Period di 80 ms** (zero input leak verso il gioco) e **Hold Timer di 800 ms**, oltre al **Left-Edge Hover Trigger** (`#shell-drawer-hover-zone`) con il puntatore.
  - Include **Task Switcher** delle finestre attive, **Tastiera Virtuale On-Screen (OSK)**, **Smart Mouse Mode** (`AUTO` / `POINTER` / `CONTROLLER` sincronizzato con `0x3103 CURSOR_HINT`), e **Auto-Launch** per avviare automaticamente la Base App all'apertura dell'host.

---

## 2. Stato Attuale dei Repository

| Repository | Ruolo | Remote `origin` | Remote `upstream` | Branch Attivo | Stato |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Apollonio** | Host / Server | `git@github.com:marcocaccavelloo/Apollonio.git` | `https://github.com/LizardByte/Sunshine.git` | `feature/console-shell` | **Fasi 1, 2, 3, 5 implementate** |
| **Artemide** | Client Tizen | `git@github.com:marcocaccavelloo/Artemide.git` | `https://github.com/brightcraft/moonlight-tizen.git` | `feature/console-shell` | **Fasi 2, 3, 4 implementate** |

---

## 3. Riepilogo Completo degli Sviluppi Completati

### Fase 1 & 5: Host Console Supervisor (`Apollonio/tools/apollonio-shell/`) — COMPLETATO
- [x] `shell_types.h`: Opcodes `0x3100..0x3104`, strutture `WindowEntry`, `ShellConfig`, `ShellState`, `ShellCommand`, serializzazione JSON (`serialize_shell_state`, `serialize_cursor_hint`, `serialize_shell_event`) e parser JSON lightweight (`parse_shell_command`).
- [x] `base_app_provider.h` e `base_app_provider.cpp`: Interfaccia `IBaseAppProvider` con implementazioni complete per `SteamBigPictureProvider`, `PlayniteProvider` e `XboxProvider`.
- [x] `platform_interface.h`, `platform_windows.cpp`, `platform_linux.cpp`:
  - **Windows (`Win32ShellPlatform`)**: Kiosk Backdrop nero (`ApollonioShellBackdrop`), Z-Order engine deterministico, `SetWinEventHook`, **Host Hover Drawer** proprietario (`ApollonioShellDrawer`, trigger hover 250ms sul bordo sinistro `x <= 4`), **WASAPI Audio Ducking** per-processo al 15%, e Smart Mouse heuristic.
  - **Linux (`LinuxShellPlatform`)**: Rilevamento processi `/proc` e `SteamAppId`, switch finestre con `wmctrl`, terminazione albero di processi (`SIGTERM`/`SIGKILL`), e **PipeWire/PulseAudio Audio Ducking** per-processo tramite `pactl`.
- [x] `ipc_server.h`, `ipc_server.cpp`, `main.cpp` e `tools/CMakeLists.txt`:
  - Server IPC dual-platform (Named Pipe `\\.\pipe\ApollonioShellPipe` su Windows, Unix Domain Socket `/tmp/apollonio-shell.sock` su Linux).
  - Compilato e testato con successo su Linux (`g++ -std=c++23 -Wall -Wextra -Werror`).

### Fase 2: Protocollo Control Stream `0x31xx` & Endpoint Artwork — COMPLETATO
- [x] Protocollo `0x3100..0x3104` integrato.
- [x] Supporto dual transport nel client: invio diretto tramite micro-server HTTP porta `47999` (Apollonio Companion) con fallback ENet e porta Sunshine 47989.

### Fase 3: Architettura Modulare "Artemide Core" Multipiattaforma — COMPLETATO
- [x] Creazione di `core/` disaccoppiato da Tizen per riutilizzo 1:1 su **webOS (LG)**, **Android TV**, **Electron / Desktop**:
  - `core/artemide_shell.js`: State manager, gestione connessione e comandi verso l'host.
  - `core/artemide_input.js`: Combo Gamepad 800ms Back+Start con grace period 80ms, mouse hover edge detection (24px), scorciatoie tastiera/telecomando.
  - `core/artemide_keyboard.js`: Tastiera virtuale a schermo completa con emissione codici tasto virtuali per iniezione input Moonlight.
  - `core/artemide_drawer.js`: Drawer console laterale e Task Switcher finestre.
  - `core/artemide_style.css`: Stili e animazioni fluide per drawer, OSK e hover zone.
- [x] Pacchetto Tizen `.wgt` (`Moonlight.wgt` e `Artemide-ConsoleShell.wgt`) compilato e pronto all'uso con Apps2Samsung.
- [x] `Apollonio/src/shell_ipc.h` e `src/shell_ipc.cpp`: Bridge IPC in background tra Sunshine/Apollonio e `apollonio-shell`.
- [x] `Apollonio/src/stream.cpp`: Registrati gli opcode `0x3100..0x3104` in `packetTypes[]`, coda `shell_queue` e invio cifrato AES-GCM `send_shell_control_msg`.
- [x] `Apollonio/src/nvhttp.cpp` e `src/process.cpp`: Endpoint HTTP e HTTPS `GET /shell/asset?appid=<id>` e `GET /shell/state` + hook su avvio/terminazione app.

### Fase 3 & 4: Client Companion `Artemide` (Hover Drawer, `Back+Start` 800ms, OSK, Auto-Launch) — COMPLETATO
- [x] [`moonlight-common-c/src/Limelight.h`](moonlight-common-c/src/Limelight.h) e [`ControlStream.c`](moonlight-common-c/src/ControlStream.c):
  - Aggiunta callback `ConnListenerShellMessage shellMessage` e funzione `LiSendShellMessage(opcode, jsonPayload)` con buffer ENet esteso a 4096 byte.
- [x] [`wasm/moonlight_wasm.hpp`](wasm/moonlight_wasm.hpp), [`wasm/connectionlistener.cpp`](wasm/connectionlistener.cpp), [`wasm/main.cpp`](wasm/main.cpp):
  - Handshake automatico `0x3100 SHELL_HELLO` in `OnConnectionStarted`.
  - Binding Emscripten per `sendShellCommand`, `setShellInputCapture`, `setShellMouseMode`.
- [x] [`wasm/gamepad.cpp`](wasm/gamepad.cpp):
  - Macchina a stati **Back + Start** con **80 ms di Grace Period** (nessun input leak verso l'host) e **800 ms di Hold Timer** per aprire/chiudere il Drawer e catturare l'input del controller localmente.
  - Sincronizzazione dinamica dell'emulazione mouse con `0x3103 CURSOR_HINT` (`AUTO` / `POINTER` / `CONTROLLER`).
- [x] [`wasm/index.html`](wasm/index.html), [`wasm/static/css/style.css`](wasm/static/css/style.css), [`wasm/platform/messages.js`](wasm/platform/messages.js), [`wasm/platform/navigation.js`](wasm/platform/navigation.js), [`wasm/platform/index.js`](wasm/platform/index.js):
  - **Left-Edge Hover Trigger** (`#shell-drawer-hover-zone`) e **Slide-Out Console Drawer** (`#shell-drawer`) con copertina live da `/shell/asset?appid=...`, stato del supervisor, azioni rapide (`Return Home`, `Resume Game`, `On-Screen Keyboard`, `Input Mode`, `Audio Ducking`, `Performance Overlay`, `Force Close Game`, `Disconnect`) e **Task Switcher** (`#shell-window-list`).
  - **Tastiera Virtuale On-Screen** (`#virtual-keyboard-overlay`) navigabile da gamepad/telecomando.
  - **Auto-Launch Badge** (`★ AUTO-LAUNCH`) attivabile su qualsiasi app nella vista `Apps` premendo `Select` / `CH+` (o cliccando il badge).

---

## 4. Prossimi Passi Consigliati
1. **Test End-to-End su Host Windows/Linux + TV Tizen (o Browser)**:
   - Verificare il build completo tramite CMake / Tizen Studio nel proprio ambiente di packaging.
   - Testare la transizione `Steam Big Picture` <-> Gioco con Audio Ducking 15% e il Task Switcher dal Drawer.
2. **Commit & Push** su `origin/feature/console-shell` in entrambi i repository quando validato.

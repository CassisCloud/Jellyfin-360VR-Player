(function () {
    if (window.__JFVRLoaded) {
        return;
    }

    window.__JFVRLoaded = true;

    const STORAGE_KEYS = {
        lastMode: 'jfvr:last-mode',
        uiDistance: 'jfvr:ui-distance',
        uiScale: 'jfvr:ui-scale'
    };

    const VERSION = '0.1.1';

    const VIEW_MODES = [
        {
            id: '360-mono',
            label: '360 Mono',
            shortLabel: '360',
            description: 'Classic monoscopic 360 sphere playback.',
            projection: '360',
            stereo: 'mono',
            variant: 'mono'
        },
        {
            id: '360-sbs-full',
            label: '360 SBS Full',
            shortLabel: '360 SBS',
            description: '360 stereoscopic side-by-side full-resolution layout.',
            projection: '360',
            stereo: 'sbs',
            variant: 'full'
        },
        {
            id: '360-sbs-half',
            label: '360 SBS Half',
            shortLabel: '360 SBS',
            description: '360 stereoscopic half side-by-side layout.',
            projection: '360',
            stereo: 'sbs',
            variant: 'half'
        },
        {
            id: '360-ou-full',
            label: '360 OU Full',
            shortLabel: '360 OU',
            description: '360 stereoscopic over-under full-resolution layout.',
            projection: '360',
            stereo: 'ou',
            variant: 'full'
        },
        {
            id: '360-ou-half',
            label: '360 OU Half',
            shortLabel: '360 OU',
            description: '360 stereoscopic half over-under layout.',
            projection: '360',
            stereo: 'ou',
            variant: 'half'
        },
        {
            id: '180-mono',
            label: '180 Mono',
            shortLabel: '180',
            description: '180 equirectangular monoscopic VR video.',
            projection: '180',
            stereo: 'mono',
            variant: 'mono'
        },
        {
            id: '180-sbs-full',
            label: '180 SBS Full',
            shortLabel: '180 SBS',
            description: '180 equirectangular stereoscopic side-by-side full layout.',
            projection: '180',
            stereo: 'sbs',
            variant: 'full'
        },
        {
            id: '180-sbs-half',
            label: '180 SBS Half',
            shortLabel: '180 SBS',
            description: '180 equirectangular stereoscopic half side-by-side layout.',
            projection: '180',
            stereo: 'sbs',
            variant: 'half'
        },
        {
            id: '180-ou-full',
            label: '180 OU Full',
            shortLabel: '180 OU',
            description: '180 equirectangular stereoscopic over-under full layout.',
            projection: '180',
            stereo: 'ou',
            variant: 'full'
        },
        {
            id: '180-ou-half',
            label: '180 OU Half',
            shortLabel: '180 OU',
            description: '180 equirectangular stereoscopic half over-under layout.',
            projection: '180',
            stereo: 'ou',
            variant: 'half'
        },
        {
            id: '3d-sbs-full',
            label: '3D Full SBS',
            shortLabel: '3D SBS',
            description: 'Stereo theater screen for full side-by-side 3D video.',
            projection: 'screen',
            stereo: 'sbs',
            variant: 'full'
        },
        {
            id: '3d-sbs-half',
            label: '3D Half SBS',
            shortLabel: '3D SBS',
            description: 'Stereo theater screen for half side-by-side 3D video.',
            projection: 'screen',
            stereo: 'sbs',
            variant: 'half'
        }
    ];

    const MODES_BY_ID = VIEW_MODES.reduce((acc, mode) => {
        acc[mode.id] = mode;
        return acc;
    }, {});

    let activeInlinePlayer = null;

    // The inline Three.js overlay is the only supported runtime path.
    const INLINE_PLAYER_STYLE = `
  #jfvr-inline-overlay { position: fixed; inset: 0; z-index: 99999; background: #000; overflow: hidden; color-scheme: dark; }
  #jfvr-inline-overlay canvas { display: block; width: 100vw; height: 100vh; }
  #jfvr-canvas-container { width: 100%; height: 100%; }
  #jfvr-inline-toolbar {
    position: absolute;
    top: 18px;
    right: 18px;
    z-index: 999999;
    display: flex;
    gap: 10px;
    pointer-events: auto;
  }
  .jfvr-inline-chip {
    border: 1px solid rgba(103, 132, 162, 0.28);
    border-radius: 999px;
    background: rgba(4, 11, 18, 0.78);
    color: #eef7ff;
    padding: 10px 14px;
    font: 700 12px/1 "Segoe UI", Arial, sans-serif;
    letter-spacing: 0.04em;
    cursor: pointer;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  }
  .jfvr-inline-chip:hover,
  .jfvr-inline-chip:focus-visible {
    background: rgba(15, 23, 42, 0.95);
    border-color: rgba(56, 189, 248, 0.4);
    transform: translateY(-1px);
    outline: none;
  }
  #jfvr-inline-version { color: #7dd3fc; }
  #jfvr-inline-recenter { color: #cbd5e1; }
  #jfvr-preview-panel {
    position: absolute;
    left: 18px;
    bottom: 18px;
    z-index: 999998;
    width: min(360px, calc(100vw - 36px));
    display: grid;
    gap: 8px;
    padding: 12px;
    border-radius: 18px;
    border: 1px solid rgba(103, 132, 162, 0.22);
    background: rgba(4, 11, 18, 0.78);
    color: #eef7ff;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  #jfvr-preview-video {
    width: 100%;
    aspect-ratio: 16 / 9;
    display: block;
    border-radius: 12px;
    background: #000;
    object-fit: contain;
  }
  #jfvr-preview-status {
    color: #94a3b8;
    font: 600 12px/1.4 "Segoe UI", Arial, sans-serif;
  }
  .hidden { display: none !important; }
  @media (max-width: 720px) {
    #jfvr-inline-toolbar {
      top: 12px;
      right: 12px;
      gap: 8px;
    }
    .jfvr-inline-chip {
      padding: 9px 12px;
      font-size: 11px;
    }
    #jfvr-preview-panel {
      left: 12px;
      right: 12px;
      bottom: 12px;
      width: auto;
    }
  }
`;

    const INLINE_PLAYER_HTML = `
  <div id="jfvr-canvas-container"></div>
  <div id="jfvr-inline-toolbar">
    <button type="button" id="jfvr-inline-recenter" class="jfvr-inline-chip">Recenter</button>
    <button type="button" id="jfvr-inline-version" class="jfvr-inline-chip">v${VERSION}</button>
  </div>
  <div id="jfvr-preview-panel" class="hidden">
    <video id="jfvr-preview-video" muted playsinline></video>
    <div id="jfvr-preview-status">Preparing preview...</div>
  </div>
`;

    function injectParentStyles() {
        if (document.getElementById('jfvr-style')) return;

        const style = document.createElement('style');
        style.id = 'jfvr-style';
        style.textContent = `
      #jfvr-mode-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(2, 6, 12, 0.56);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      #jfvr-mode-menu {
        width: min(96vw, 980px);
        max-height: min(86vh, 860px);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        overflow: hidden;
        border-radius: 26px;
        border: 1px solid rgba(103, 132, 162, 0.28);
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(4, 11, 18, 0.98), rgba(2, 8, 14, 0.98));
        color: #eef7ff;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.56);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      #jfvr-mode-menu * {
        box-sizing: border-box;
      }

      .jfvr-menu-head {
        display: grid;
        gap: 10px;
        padding: 18px 20px 16px;
        border-bottom: 1px solid rgba(103, 132, 162, 0.16);
      }

      .jfvr-menu-head-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .jfvr-menu-title {
        font: 700 18px/1.2 "Segoe UI", Arial, sans-serif;
        margin: 0;
      }

      .jfvr-menu-subtitle {
        color: rgba(211, 227, 242, 0.76);
        font: 500 13px/1.5 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-menu-recommend {
        align-self: start;
        border-radius: 999px;
        padding: 8px 12px;
        border: 1px solid rgba(56, 189, 248, 0.26);
        background: rgba(12, 30, 46, 0.78);
        color: #cdefff;
        font: 700 11px/1.1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .jfvr-menu-body {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        padding: 14px;
        overflow: auto;
        align-items: start;
      }

      .jfvr-menu-section {
        display: grid;
        gap: 8px;
        align-content: start;
        padding: 12px;
        border: 1px solid rgba(103, 132, 162, 0.12);
        border-radius: 18px;
        background: rgba(8, 16, 25, 0.56);
      }

      .jfvr-menu-label {
        padding: 0 2px 4px;
        color: #7dd3fc;
        font: 700 12px/1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .jfvr-mode-option {
        display: grid;
        gap: 4px;
        padding: 12px 12px 11px;
        border: 1px solid rgba(103, 132, 162, 0.16);
        border-radius: 14px;
        background: rgba(6, 14, 22, 0.78);
        color: inherit;
        cursor: pointer;
        text-align: left;
        transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
      }

      .jfvr-mode-option + .jfvr-mode-option {
        margin-top: 0;
      }

      .jfvr-mode-option:hover,
      .jfvr-mode-option:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(56, 189, 248, 0.38);
        background: rgba(13, 28, 43, 0.92);
        outline: none;
      }

      .jfvr-mode-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .jfvr-mode-name {
        font: 700 14px/1.2 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-mode-tag {
        border-radius: 999px;
        padding: 4px 8px;
        font: 700 10px/1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #04111b;
        background: linear-gradient(135deg, #7dd3fc, #38bdf8);
      }

      .jfvr-mode-desc {
        color: rgba(211, 227, 242, 0.76);
        font: 500 12px/1.4 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-mode-meta {
        color: rgba(148, 163, 184, 0.92);
        font: 600 11px/1.35 "Segoe UI", Arial, sans-serif;
      }

      @media (max-width: 960px) {
        .jfvr-menu-body {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        #jfvr-mode-backdrop {
          padding: 12px;
          align-items: stretch;
        }

        #jfvr-mode-menu {
          width: 100%;
          max-height: 100%;
        }

        .jfvr-menu-head-top {
          flex-direction: column;
          align-items: flex-start;
        }

        .jfvr-menu-recommend {
          white-space: normal;
        }

        .jfvr-menu-body {
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          padding: 10px;
        }

        .jfvr-menu-section {
          padding: 10px;
        }
      }

      #jfvr-version-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(2, 6, 12, 0.56);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      #jfvr-version-menu {
        width: min(96vw, 340px);
        border-radius: 22px;
        border: 1px solid rgba(103, 132, 162, 0.28);
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(4, 11, 18, 0.98), rgba(2, 8, 14, 0.98));
        color: #eef7ff;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.56);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        overflow: hidden;
      }

      #jfvr-version-menu * {
        box-sizing: border-box;
      }

      .jfvr-version-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid rgba(103, 132, 162, 0.16);
      }

      .jfvr-version-title {
        font: 700 16px/1.2 "Segoe UI", Arial, sans-serif;
        color: #eef7ff;
      }

      .jfvr-version-close {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(103, 132, 162, 0.22);
        border-radius: 50%;
        background: rgba(8, 16, 25, 0.56);
        color: #94a3b8;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.18s ease, border-color 0.18s ease;
      }

      .jfvr-version-close:hover,
      .jfvr-version-close:focus-visible {
        background: rgba(15, 23, 42, 0.95);
        border-color: rgba(56, 189, 248, 0.4);
        outline: none;
      }

      .jfvr-version-body {
        display: grid;
        gap: 12px;
        padding: 24px 18px 28px;
        text-align: center;
      }

      .jfvr-version-version {
        font: 700 24px/1.2 "Segoe UI", Arial, sans-serif;
        color: #7dd3fc;
      }

      .jfvr-version-name {
        font: 500 15px/1.4 "Segoe UI", Arial, sans-serif;
        color: #eef7ff;
        margin-top: 4px;
      }

      .jfvr-version-link {
        display: inline-block;
        margin-top: 8px;
        padding: 10px 20px;
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 999px;
        background: rgba(12, 30, 46, 0.78);
        color: #7dd3fc;
        font: 600 13px/1.2 "Segoe UI", Arial, sans-serif;
        text-decoration: none;
        transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
      }

      .jfvr-version-link:hover,
      .jfvr-version-link:focus-visible {
        background: rgba(15, 23, 42, 0.95);
        border-color: rgba(56, 189, 248, 0.6);
        transform: translateY(-1px);
        outline: none;
      }
    `;
        document.head.appendChild(style);
    }

    function removeVersionModal() {
        const existing = document.getElementById('jfvr-version-menu');
        if (existing) existing.remove();
        const backdrop = document.getElementById('jfvr-version-backdrop');
        if (backdrop) backdrop.remove();
    }

    function openVersionModal() {
        injectParentStyles();
        removeVersionModal();

        const backdrop = document.createElement('div');
        backdrop.id = 'jfvr-version-backdrop';

        const modal = document.createElement('div');
        modal.id = 'jfvr-version-menu';
        modal.innerHTML = '<div class="jfvr-version-head"><span class="jfvr-version-title">About</span><button class="jfvr-version-close" id="jfvr-version-close-btn">&#10005;</button></div><div class="jfvr-version-body"><div class="jfvr-version-version">v' + VERSION + '</div><div class="jfvr-version-name">Jellyfin VR Player</div><a class="jfvr-version-link" href="https://github.com/CassisCloud/Jellyfin-360VR-Player" target="_blank" rel="noopener noreferrer">View on GitHub</a></div>';

        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) {
                removeVersionModal();
            }
        });

        modal.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        const closeBtn = document.getElementById('jfvr-version-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                removeVersionModal();
            });
        }
    }

    function getCurrentJellyfinVideo() {
        return document.querySelector('video');
    }

    function createModeMenuButton(mode) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'jfvr-mode-option';
        button.dataset.modeId = mode.id;

        const modeTag = mode.projection === 'screen'
            ? '3D ' + mode.stereo.toUpperCase()
            : (mode.stereo === 'mono' ? mode.projection + ' Mono' : mode.projection + ' ' + mode.stereo.toUpperCase());
        const variantLabel = mode.variant === 'mono' ? 'Mono' : mode.variant === 'full' ? 'Full layout' : 'Half layout';

        button.innerHTML = `
      <div class="jfvr-mode-topline">
        <div class="jfvr-mode-name">${escapeHtml(mode.label)}</div>
        <div class="jfvr-mode-tag">${escapeHtml(modeTag)}</div>
      </div>
      <div class="jfvr-mode-desc">${escapeHtml(mode.description)}</div>
      <div class="jfvr-mode-meta">${escapeHtml(variantLabel)} • Quest / WebXR ready</div>
    `;

        return button;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function removeModeMenu() {
        const existing = document.getElementById('jfvr-mode-menu');
        if (existing) existing.remove();
        const backdrop = document.getElementById('jfvr-mode-backdrop');
        if (backdrop) backdrop.remove();
    }

    function openModeMenu(anchorButton) {
        injectParentStyles();

        const existing = document.getElementById('jfvr-mode-menu');
        if (existing) {
            removeModeMenu();
            return;
        }

        const backdrop = document.createElement('div');
        backdrop.id = 'jfvr-mode-backdrop';

        const menu = document.createElement('div');
        menu.id = 'jfvr-mode-menu';
        const lastMode = localStorage.getItem(STORAGE_KEYS.lastMode) || '180-sbs-half';

        const groupDefinitions = [
            { projection: '180', title: '180 VR Modes' },
            { projection: '360', title: '360 VR Modes' },
            { projection: 'screen', title: '3D Screen Modes' }
        ];

        const groups = groupDefinitions.map(({ projection, title }) => {
            const options = VIEW_MODES.filter((mode) => mode.projection === projection);
            const section = document.createElement('div');
            section.className = 'jfvr-menu-section';
            section.innerHTML = `<div class="jfvr-menu-label">${title}</div>`;
            options.forEach((mode) => {
                const optionButton = createModeMenuButton(mode);
                if (mode.id === lastMode) {
                    optionButton.querySelector('.jfvr-mode-meta').textContent += ' • Last used';
                }
                optionButton.addEventListener('click', () => {
                    removeModeMenu();
                    openPlayer(mode.id);
                });
                section.appendChild(optionButton);
            });
            return section;
        });

        const recommended = MODES_BY_ID[lastMode] || MODES_BY_ID['180-sbs-half'];
        menu.innerHTML = `
      <div class="jfvr-menu-head">
        <div class="jfvr-menu-head-top">
          <div>
            <div class="jfvr-menu-title">Choose a VR projection</div>
            <div class="jfvr-menu-subtitle">Pick the layout that matches the file. 180 and 360 stay immersive, while 3D SBS opens as a stereo theater screen.</div>
          </div>
          <div class="jfvr-menu-recommend">Recommended: ${escapeHtml(recommended.label)}</div>
        </div>
      </div>
      <div class="jfvr-menu-body"></div>
    `;
        const body = menu.querySelector('.jfvr-menu-body');
        groups.forEach((section) => body.appendChild(section));

        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) {
                removeModeMenu();
            }
        });

        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        backdrop.appendChild(menu);
        document.body.appendChild(backdrop);
    }

    function createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId) {
        let active = true;
        let renderer, scene, camera, vrButton, arButton;
        let uiGroup;
        let videoTexture, materials = {}, meshes = {};
        let previewVideo;
        let previewPanel;
        let previewStatus;
        let toolbarVersionBtn;
        let toolbarRecenterBtn;
        let immersiveDebugScreen;
        let previewSyncHandlers;
        let surfaceRoot;
        let state = {
            mode: MODES_BY_ID[modeId] || MODES_BY_ID['360-mono'],
            isImmersive: false,
            swapEyes: false,
            uiVisible: true,
            lastInteraction: Date.now(),
            uiDistance: Math.abs(parseFloat(localStorage.getItem('jfvr:ui-distance'))) || 2.3,
            uiScale: parseFloat(localStorage.getItem('jfvr:ui-scale')) || 1.0,
            isAR: false,
            passthroughEnabled: false,
            passthroughBrightness: 1.0,
            screenCurvature: 0.0,
            screenSize: 1.0,
            screenDistance: -12.0,
            showingSettings: false
        };

        function updatePreviewStatus(message) {
            if (previewStatus) {
                previewStatus.textContent = message;
            }
        }

        function syncPreviewPlayback() {
            if (!previewVideo) return;
            const targetTime = Number.isFinite(jellyfinVideo.currentTime) ? jellyfinVideo.currentTime : 0;
            if (Math.abs((previewVideo.currentTime || 0) - targetTime) > 0.35) {
                try {
                    previewVideo.currentTime = targetTime;
                } catch (error) {
                    // ignored
                }
            }
            if (jellyfinVideo.paused) {
                previewVideo.pause();
            } else {
                previewVideo.play().catch(() => {});
            }
        }

        function previewStereoFallbackActive() {
            return window.__JFVR_HARNESS_RUNTIME_MODE__ === 'extension'
                && state.mode
                && state.mode.stereo !== 'mono'
                && renderer
                && renderer.xr
                && renderer.xr.isPresenting;
        }

        function immersiveDebugScreenActive() {
            return window.__JFVR_HARNESS_RUNTIME_MODE__ === 'extension'
                && renderer
                && renderer.xr
                && renderer.xr.isPresenting;
        }

        function updateImmersiveDebugScreen() {
            if (!immersiveDebugScreen) return;
            immersiveDebugScreen.visible = immersiveDebugScreenActive();
        }

        function updatePreviewVisibility() {
            if (!previewPanel) return;
            const immersive = renderer && renderer.xr && renderer.xr.isPresenting;
            const keepVisible = !immersive || previewStereoFallbackActive();
            previewPanel.classList.toggle('hidden', !keepVisible);
            if (previewStereoFallbackActive()) {
                updatePreviewStatus('Extension mode fallback: stereo layer unsupported, showing mono preview while in XR.');
            }
            updateImmersiveDebugScreen();
        }

        function setupPreviewVideo() {
            previewPanel = overlay.querySelector('#jfvr-preview-panel');
            previewVideo = overlay.querySelector('#jfvr-preview-video');
            previewStatus = overlay.querySelector('#jfvr-preview-status');
            if (!previewVideo) return;

            previewVideo.src = jellyfinVideo.currentSrc || jellyfinVideo.src;
            previewVideo.muted = true;
            previewVideo.playsInline = true;
            previewVideo.crossOrigin = 'anonymous';
            previewVideo.addEventListener('loadeddata', () => {
                updatePreviewStatus('Video frame received. You can confirm playback here before entering XR.');
                syncPreviewPlayback();
            });
            previewVideo.addEventListener('error', () => {
                const mediaError = previewVideo.error;
                updatePreviewStatus('Preview video failed to load (code ' + (mediaError ? mediaError.code : 'unknown') + ').');
            });

            previewSyncHandlers = {
                play: syncPreviewPlayback,
                pause: syncPreviewPlayback,
                seeked: syncPreviewPlayback,
                timeupdate: syncPreviewPlayback
            };

            jellyfinVideo.addEventListener('play', previewSyncHandlers.play);
            jellyfinVideo.addEventListener('pause', previewSyncHandlers.pause);
            jellyfinVideo.addEventListener('seeked', previewSyncHandlers.seeked);
            jellyfinVideo.addEventListener('timeupdate', previewSyncHandlers.timeupdate);

            try {
                previewVideo.currentTime = jellyfinVideo.currentTime || 0;
            } catch (error) {
                // ignored
            }
            syncPreviewPlayback();
        }
        let interactables = [];
        let timeCurrentObj, timeDurationObj, titleTextObj;
        let playIconGroup, pauseIconGroup;
        let seekBg, seekBuf, seekFill;
        let bgMesh, settingsGroup;
        let volSliderGroup, ptSliderGroup;
        let volSliderUpdateFill, ptSliderUpdateFill;
        let volSliderVisible = false, ptSliderVisible = false;
        let marqueeOffset = 0, marqueeDir = 0, marqueePauseTimer = 0;

        function injectImportMap() {
            if (document.querySelector('script#jfvr-importmap')) return;
            const im = document.createElement('script');
            im.id = 'jfvr-importmap';
            im.type = 'importmap';
            im.textContent = JSON.stringify({
                imports: {
                    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
                    "troika-three-text": "https://esm.sh/troika-three-text@0.49.0?external=three"
                }
            });
            document.head.appendChild(im);
        }

        function getPreferredWebXROptionalFeatures() {
            if (window.__JFVR_HARNESS_RUNTIME_MODE__ === 'extension') {
                return ['local-floor', 'hand-tracking'];
            }

            return ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'];
        }

        function formatTime(seconds) {
            if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
            const total = Math.floor(seconds);
            const hrs = Math.floor(total / 3600);
            const mins = Math.floor((total % 3600) / 60);
            const secs = total % 60;
            if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            return `${mins}:${String(secs).padStart(2, '0')}`;
        }

        function getViewerYaw(THREE) {
            const targetCamera = renderer && renderer.xr && renderer.xr.isPresenting
                ? renderer.xr.getCamera()
                : camera;
            if (!targetCamera) return 0;
            const quaternion = new THREE.Quaternion();
            targetCamera.getWorldQuaternion(quaternion);
            return new THREE.Euler().setFromQuaternion(quaternion, 'YXZ').y;
        }

        function recenterActiveMode(THREE) {
            if (!scene || !camera) return;

            const yaw = getViewerYaw(THREE);
            const targetCamera = renderer && renderer.xr && renderer.xr.isPresenting
                ? renderer.xr.getCamera()
                : camera;
            const cameraPos = new THREE.Vector3();
            targetCamera.getWorldPosition(cameraPos);

            if (state.mode.projection === 'screen') {
                const distance = Math.abs(state.screenDistance);
                if (state.screenCurvature > 0.05) {
                    const radius = 18 / state.screenCurvature;
                    surfaceRoot.position.set(
                        cameraPos.x - (Math.sin(yaw) * distance),
                        Math.max(0.5, cameraPos.y),
                        cameraPos.z - (Math.cos(yaw) * distance) + radius
                    );
                } else {
                    surfaceRoot.position.set(
                        cameraPos.x - (Math.sin(yaw) * distance),
                        Math.max(0.5, cameraPos.y),
                        cameraPos.z - (Math.cos(yaw) * distance)
                    );
                }
                surfaceRoot.rotation.set(0, yaw, 0);
            } else if (state.mode.projection === '180') {
                surfaceRoot.position.set(0, 0, 0);
                surfaceRoot.rotation.set(0, yaw + Math.PI, 0);
            } else {
                surfaceRoot.position.set(0, 0, 0);
                surfaceRoot.rotation.set(0, yaw + (Math.PI / 2), 0);
            }

            surfaceRoot.scale.setScalar(state.screenSize);
            updatePreviewStatus('View recentered.');
        }

        async function initThree() {
            injectImportMap();
            const THREE = await import('three');
            const { VRButton } = await import('three/addons/webxr/VRButton.js');
            const { ARButton } = await import('three/addons/webxr/ARButton.js');
            const { XRControllerModelFactory } = await import('three/addons/webxr/XRControllerModelFactory.js');
            const { XRHandModelFactory } = await import('three/addons/webxr/XRHandModelFactory.js');
            const { Text } = await import('troika-three-text');

            if (!active) return;

            const container = overlay.querySelector('#jfvr-canvas-container');
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.xr.enabled = true;
            renderer.xr.setReferenceSpaceType('local');
            container.appendChild(renderer.domElement);

            container.addEventListener('mousemove', wake);
            container.addEventListener('touchstart', wake);
            container.addEventListener('mousedown', wake);

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000000);
            camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
            scene.add(camera);

            scene.add(new THREE.AmbientLight(0xffffff, 1.0));
            const dl = new THREE.DirectionalLight(0xffffff, 2.0);
            dl.position.set(0, 10, 0);
            scene.add(dl);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.position = 'absolute';
            buttonsContainer.style.bottom = '20px';
            buttonsContainer.style.left = '50%';
            buttonsContainer.style.transform = 'translateX(-50%)';
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.gap = '20px';
            buttonsContainer.style.zIndex = '999999';
            overlay.appendChild(buttonsContainer);

            const optionalFeatures = getPreferredWebXROptionalFeatures();

            vrButton = VRButton.createButton(renderer, { optionalFeatures: optionalFeatures });
            vrButton.style.position = 'relative';
            vrButton.style.bottom = 'auto';
            vrButton.style.left = 'auto';
            vrButton.style.transform = 'none';
            vrButton.addEventListener('click', () => {
                state.isAR = false;
                state.passthroughEnabled = false;
            });
            buttonsContainer.appendChild(vrButton);

            arButton = ARButton.createButton(renderer, { optionalFeatures: optionalFeatures });
            arButton.style.position = 'relative';
            arButton.style.bottom = 'auto';
            arButton.style.left = 'auto';
            arButton.style.transform = 'none';
            arButton.addEventListener('click', () => {
                state.isAR = true;
                state.passthroughEnabled = true;
            });
            buttonsContainer.appendChild(arButton);

            renderer.xr.addEventListener('sessionstart', () => {
                state.isImmersive = true;
                if (typeof updatePassthroughVisuals === 'function') updatePassthroughVisuals();
                if (ptSliderUpdateFill) ptSliderUpdateFill(state.passthroughBrightness);
                if (uiGroup) uiGroup.position.set(0, -0.4, -state.uiDistance);
                camera.layers.enable(0);
                camera.layers.enable(1);
                camera.layers.enable(2);
                recenterActiveMode(THREE);
                updateStereoVisibility();
                updatePreviewVisibility();
            });
            renderer.xr.addEventListener('sessionend', () => {
                state.isImmersive = false;
                scene.background = new THREE.Color(0x000000);
                if (uiGroup) uiGroup.position.set(0, -0.4, -state.uiDistance);
                updateStereoVisibility();
                updatePreviewVisibility();
            });

            function updateStereoVisibility() {
                const mode = state.mode;
                const useStereo = mode.stereo !== 'mono' && state.isImmersive && !state.uiVisible && !previewStereoFallbackActive();
                if (meshes.preview) meshes.preview.visible = !useStereo;
                if (meshes.left) meshes.left.visible = useStereo;
                if (meshes.right) meshes.right.visible = useStereo;
                updatePreviewVisibility();
            }

            function positionUIAtController(controller) {
                if (!controller || !uiGroup) return;
                const tempMatrix = new THREE.Matrix4();
                tempMatrix.identity().extractRotation(controller.matrixWorld);
                const origin = new THREE.Vector3();
                origin.setFromMatrixPosition(controller.matrixWorld);
                const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);

                const targetPos = origin.clone().add(dir.multiplyScalar(state.uiDistance));
                uiGroup.position.copy(targetPos);

                const xrCam = renderer.xr.getCamera();
                if (xrCam) {
                    const camPos = new THREE.Vector3();
                    xrCam.getWorldPosition(camPos);
                    // Lock Y rotation only
                    uiGroup.lookAt(camPos.x, uiGroup.position.y, camPos.z);
                }
            }

            function wake(controller) {
                state.lastInteraction = Date.now();
                if (!state.uiVisible) {
                    state.uiVisible = true;
                    if (uiGroup) {
                        uiGroup.visible = true;
                        if (controller && controller.matrixWorld) positionUIAtController(controller);
                    }
                    updateStereoVisibility();
                }
            }

            function toggleUI(controller) {
                state.uiVisible = !state.uiVisible;
                if (uiGroup) {
                    uiGroup.visible = state.uiVisible;
                    if (state.uiVisible && controller && controller.matrixWorld) {
                        positionUIAtController(controller);
                    } else if (state.uiVisible) {
                        const xrCam = renderer.xr.getCamera();
                        if (xrCam) {
                            const camPos = new THREE.Vector3();
                            xrCam.getWorldPosition(camPos);
                            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCam.quaternion);
                            dir.y = 0; dir.normalize(); // Horizon level
                            uiGroup.position.copy(camPos).add(dir.multiplyScalar(state.uiDistance));
                            uiGroup.position.y = camPos.y - 0.5;
                            uiGroup.lookAt(camPos.x, uiGroup.position.y, camPos.z);
                        }
                    }
                }
                if (state.uiVisible) {
                    state.lastInteraction = Date.now();
                    settingsGroup.visible = false;
                }
                updateStereoVisibility();
            }

            videoTexture = new THREE.VideoTexture(jellyfinVideo);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.colorSpace = THREE.SRGBColorSpace;

            materials.preview = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });
            materials.left = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });
            materials.right = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });

            immersiveDebugScreen = new THREE.Mesh(
                new THREE.PlaneGeometry(2.8, 1.575),
                new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide, toneMapped: false, transparent: true, opacity: 0.98 })
            );
            immersiveDebugScreen.position.set(0, 0, -2.2);
            immersiveDebugScreen.visible = false;
            camera.add(immersiveDebugScreen);

            surfaceRoot = new THREE.Group();
            scene.add(surfaceRoot);

            const dimSphereGeo = new THREE.SphereGeometry(90, 32, 32);
            const dimSphereMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true, opacity: 0.0 });
            const dimSphere = new THREE.Mesh(dimSphereGeo, dimSphereMat);
            scene.add(dimSphere);

            meshes.preview = new THREE.Mesh(new THREE.BufferGeometry(), materials.preview);
            meshes.left = new THREE.Mesh(new THREE.BufferGeometry(), materials.left);
            meshes.right = new THREE.Mesh(new THREE.BufferGeometry(), materials.right);

            meshes.preview.layers.set(0);
            meshes.left.layers.set(1);
            meshes.right.layers.set(2);

            surfaceRoot.add(meshes.preview);
            surfaceRoot.add(meshes.left);
            surfaceRoot.add(meshes.right);

            function updatePassthroughVisuals() {
                if (state.passthroughEnabled) {
                    scene.background = null;
                    if (typeof dimSphereMat !== 'undefined') dimSphereMat.opacity = 1.0 - state.passthroughBrightness;
                } else {
                    scene.background = new THREE.Color(0x000000);
                    if (typeof dimSphereMat !== 'undefined') dimSphereMat.opacity = 1.0;
                }
            }

            function applyModeFromState() {
                let mode = state.mode;
                let geometry;

                if (mode.projection === 'screen') {
                    if (state.screenCurvature > 0.05) {
                        // Cylinder curve
                        const radius = 18 / state.screenCurvature;
                        const theta = 18 / radius;
                        geometry = new THREE.CylinderGeometry(radius, radius, 10.125, 64, 1, true, -theta / 2 + Math.PI / 2, theta);
                        geometry.scale(-1, 1, 1);
                    } else {
                        geometry = new THREE.PlaneGeometry(18, 10.125);
                    }
                } else if (mode.projection === '180') {
                    geometry = new THREE.SphereGeometry(32, 96, 64, 0, Math.PI, 0, Math.PI);
                } else {
                    geometry = new THREE.SphereGeometry(32, 96, 64);
                }

                meshes.preview.geometry.dispose();
                meshes.preview.geometry = geometry.clone();
                meshes.left.geometry.dispose();
                meshes.left.geometry = geometry.clone();
                meshes.right.geometry.dispose();
                meshes.right.geometry = geometry.clone();

                const side = mode.projection === 'screen' ? THREE.FrontSide : THREE.BackSide;
                materials.preview.side = side; materials.left.side = side; materials.right.side = side;

                function getViewport(m, eye) {
                    if (m.projection === 'screen') {
                        if (m.stereo === 'sbs') return eye === 'right' ? { x: 0.5, y: 0, rx: 0.5, ry: 1 } : { x: 0, y: 0, rx: 0.5, ry: 1 };
                        if (m.stereo === 'ou') return eye === 'right' ? { x: 0, y: 0, rx: 1, ry: 0.5 } : { x: 0, y: 0.5, rx: 1, ry: 0.5 };
                        return { x: 0, y: 0, rx: 1, ry: 1 };
                    }
                    if (m.stereo === 'mono') return { x: 1, y: 0, rx: -1, ry: 1 };
                    if (m.stereo === 'sbs') return eye === 'right' ? { x: 1, y: 0, rx: -0.5, ry: 1 } : { x: 0.5, y: 0, rx: -0.5, ry: 1 };
                    return eye === 'right' ? { x: 1, y: 0, rx: -1, ry: 0.5 } : { x: 1, y: 0.5, rx: -1, ry: 0.5 };
                }

                const leftEye = state.swapEyes ? 'right' : 'left';
                const rightEye = state.swapEyes ? 'left' : 'right';

                function applyViewportToGeometry(geom, vp) {
                    const uv = geom.attributes.uv;
                    for (let i = 0; i < uv.count; i++) {
                        const u = uv.getX(i);
                        const v = uv.getY(i);
                        uv.setXY(i, (u * vp.rx) + vp.x, (v * vp.ry) + vp.y);
                    }
                    uv.needsUpdate = true;
                }

                applyViewportToGeometry(meshes.preview.geometry, getViewport(mode, leftEye));
                applyViewportToGeometry(meshes.left.geometry, getViewport(mode, leftEye));
                applyViewportToGeometry(meshes.right.geometry, getViewport(mode, rightEye));

                if (videoTexture) {
                    videoTexture.wrapS = THREE.ClampToEdgeWrapping;
                    videoTexture.wrapT = THREE.ClampToEdgeWrapping;
                    videoTexture.offset.set(0, 0);
                    videoTexture.repeat.set(1, 1);
                    videoTexture.needsUpdate = true;
                }

                if (titleTextObj) {
                    const t = getVideoTitle();
                    if (t) titleTextObj.text = t;
                }
                recenterActiveMode(THREE);
                updateStereoVisibility();
            }

            function switchMode(newModeId) {
                if (MODES_BY_ID[newModeId]) {
                    state.mode = MODES_BY_ID[newModeId];
                    jellyfinVideo.dataset.currentMode = newModeId;
                    applyModeFromState();
                }
            }

            // Rounded Geometries Utility
            function createRoundedRectGeometry(width, height, radius, segments) {
                const shape = new THREE.Shape();
                const w = width / 2;
                const h = height / 2;
                shape.moveTo(-w, -h + radius);
                shape.lineTo(-w, h - radius);
                shape.quadraticCurveTo(-w, h, -w + radius, h);
                shape.lineTo(w - radius, h);
                shape.quadraticCurveTo(w, h, w, h - radius);
                shape.lineTo(w, -h + radius);
                shape.quadraticCurveTo(w, -h, w - radius, -h);
                shape.lineTo(-w + radius, -h);
                shape.quadraticCurveTo(-w, -h, -w, -h + radius);
                return new THREE.ShapeGeometry(shape, segments || 16);
            }

            // UI Builder
            uiGroup = new THREE.Group();
            uiGroup.position.set(0, -0.4, -state.uiDistance);
            scene.add(uiGroup);

            // Materials
            const frostedMat = new THREE.MeshBasicMaterial({
                color: 0x0f172a,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide
            });

            const btnMatBase = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.9 });
            const iconMatColor = 0xe2e8f0;

            function createTextObj(str, parent, x, y, size, color, align) {
                const t = new Text();
                t.text = str;
                t.fontSize = size;
                t.color = color;
                t.position.set(x, y, 0.01);
                t.anchorX = align || 'center';
                t.anchorY = 'middle';
                parent.add(t);
                return t;
            }

            function createRoundBtn(id, parent, x, y, radius, label, onClick) {
                const geo = new THREE.CircleGeometry(radius, 48);
                const mat = btnMatBase.clone();
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x, y, 0.005);
                mesh.userData = { id, isBtn: true, bg: 0x1e293b, hover: 0x334155, onClick };
                parent.add(mesh);
                interactables.push(mesh);
                let textObj = null;
                if (label) {
                    textObj = createTextObj(label, mesh, 0, 0, radius * 0.9, iconMatColor);
                }
                return { mesh, textObj };
            }

            function createSlider(id, parent, x, y, w, h, initVal, onChange) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                parent.add(group);

                const bgGeo = createRoundedRectGeometry(w, h, h / 2);
                const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
                const bg = new THREE.Mesh(bgGeo, bgMat);

                const fillGeo = createRoundedRectGeometry(w, h, h / 2);
                const fillMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                const fill = new THREE.Mesh(fillGeo, fillMat);
                fill.position.z = 0.001;

                group.add(bg);
                group.add(fill);

                const updateFill = (val) => {
                    const ratio = Math.max(0, Math.min(1, val));
                    if (ratio === 0) {
                        fill.visible = false;
                    } else {
                        fill.visible = true;
                        fill.scale.x = ratio;
                        fill.position.x = (-w / 2) + (w * ratio) / 2;
                    }
                };
                updateFill(initVal);

                const dragHandler = (pt) => {
                    const local = bg.worldToLocal(pt.clone());
                    const raw = (local.x + (w / 2)) / w;
                    const ratio = Math.max(0, Math.min(1, raw));
                    updateFill(ratio);
                    if (onChange) onChange(ratio);
                };

                bg.userData = { id, hover: 0x1e293b, bg: 0x0f172a, onClick: dragHandler, onDrag: dragHandler };
                interactables.push(bg);

                return { group, updateFill };
            }

            // --- Helper: get video title from Jellyfin DOM ---
            function getVideoTitle() {
                const titleEl = document.querySelector('.osdTitle, .videoOsdTitle, h3.osdTitle');
                if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();
                const headerEl = document.querySelector('.itemName, .nowPlayingTitle, [data-type="title"]');
                if (headerEl && headerEl.textContent.trim()) return headerEl.textContent.trim();
                if (document.title && document.title !== 'Jellyfin') return document.title.replace(' | Jellyfin', '').trim();
                return '';
            }

            // --- Helper: create mesh-based icons (no squares) ---
            function createPlayIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const shape = new THREE.Shape();
                shape.moveTo(-0.025 * s, 0.035 * s);
                shape.lineTo(-0.025 * s, -0.035 * s);
                shape.lineTo(0.03 * s, 0);
                shape.closePath();
                const geo = new THREE.ShapeGeometry(shape);
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                group.add(new THREE.Mesh(geo, mat));
                parent.add(group);
                return group;
            }

            function createPauseIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const barW = 0.012 * s, barH = 0.06 * s, gap = 0.016 * s;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const lGeo = new THREE.PlaneGeometry(barW, barH);
                const rGeo = new THREE.PlaneGeometry(barW, barH);
                const lBar = new THREE.Mesh(lGeo, mat);
                lBar.position.x = -gap;
                const rBar = new THREE.Mesh(rGeo, mat);
                rBar.position.x = gap;
                group.add(lBar);
                group.add(rBar);
                parent.add(group);
                return group;
            }

            function createSeekBackIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const t1 = new THREE.Shape();
                t1.moveTo(0.015 * s, 0.025 * s);
                t1.lineTo(0.015 * s, -0.025 * s);
                t1.lineTo(-0.015 * s, 0);
                t1.closePath();
                const m1 = new THREE.Mesh(new THREE.ShapeGeometry(t1), mat);
                m1.position.x = -0.01 * s;
                group.add(m1);
                const t2 = new THREE.Shape();
                t2.moveTo(0.015 * s, 0.025 * s);
                t2.lineTo(0.015 * s, -0.025 * s);
                t2.lineTo(-0.015 * s, 0);
                t2.closePath();
                const m2 = new THREE.Mesh(new THREE.ShapeGeometry(t2), mat);
                m2.position.x = 0.015 * s;
                group.add(m2);
                parent.add(group);
                return group;
            }

            function createSeekFwdIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const t1 = new THREE.Shape();
                t1.moveTo(-0.015 * s, 0.025 * s);
                t1.lineTo(-0.015 * s, -0.025 * s);
                t1.lineTo(0.015 * s, 0);
                t1.closePath();
                const m1 = new THREE.Mesh(new THREE.ShapeGeometry(t1), mat);
                m1.position.x = -0.015 * s;
                group.add(m1);
                const t2 = new THREE.Shape();
                t2.moveTo(-0.015 * s, 0.025 * s);
                t2.lineTo(-0.015 * s, -0.025 * s);
                t2.lineTo(0.015 * s, 0);
                t2.closePath();
                const m2 = new THREE.Mesh(new THREE.ShapeGeometry(t2), mat);
                m2.position.x = 0.01 * s;
                group.add(m2);
                parent.add(group);
                return group;
            }

            function createSpeakerIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const body = new THREE.PlaneGeometry(0.014 * s, 0.022 * s);
                const bm = new THREE.Mesh(body, mat);
                bm.position.x = -0.016 * s;
                group.add(bm);
                const cone = new THREE.Shape();
                cone.moveTo(-0.008 * s, 0.015 * s);
                cone.lineTo(-0.008 * s, -0.015 * s);
                cone.lineTo(0.012 * s, -0.028 * s);
                cone.lineTo(0.012 * s, 0.028 * s);
                cone.closePath();
                group.add(new THREE.Mesh(new THREE.ShapeGeometry(cone), mat));
                parent.add(group);
                return group;
            }

            function createSunIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const circle = new THREE.CircleGeometry(0.012 * s, 24);
                group.add(new THREE.Mesh(circle, mat));
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const ray = new THREE.PlaneGeometry(0.004 * s, 0.012 * s);
                    const rm = new THREE.Mesh(ray, mat);
                    rm.position.set(Math.cos(angle) * 0.022 * s, Math.sin(angle) * 0.022 * s, 0);
                    rm.rotation.z = angle;
                    group.add(rm);
                }
                parent.add(group);
                return group;
            }

            function createGearIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const inner = new THREE.CircleGeometry(0.015 * s, 24);
                group.add(new THREE.Mesh(inner, mat));
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const tooth = new THREE.PlaneGeometry(0.01 * s, 0.008 * s);
                    const tm = new THREE.Mesh(tooth, mat);
                    tm.position.set(Math.cos(angle) * 0.022 * s, Math.sin(angle) * 0.022 * s, 0);
                    tm.rotation.z = angle;
                    group.add(tm);
                }
                const hole = new THREE.CircleGeometry(0.007 * s, 24);
                const holeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
                const hm = new THREE.Mesh(hole, holeMat);
                hm.position.z = 0.001;
                group.add(hm);
                parent.add(group);
                return group;
            }

            function createCloseIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const bar1 = new THREE.PlaneGeometry(0.05 * s, 0.008 * s);
                const m1 = new THREE.Mesh(bar1, mat);
                m1.rotation.z = Math.PI / 4;
                group.add(m1);
                const bar2 = new THREE.PlaneGeometry(0.05 * s, 0.008 * s);
                const m2 = new THREE.Mesh(bar2, mat);
                m2.rotation.z = -Math.PI / 4;
                group.add(m2);
                parent.add(group);
                return group;
            }

            // --- Helper: vertical slider with top/bottom icons ---
            function createVerticalSlider(id, parent, x, y, w, h, initVal, onChange, bottomIcon, topIcon) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.02);
                group.visible = false;
                parent.add(group);

                const panelH = h + 0.12;
                const panelGeo = createRoundedRectGeometry(w + 0.06, panelH, 0.04);
                const panelBg = new THREE.Mesh(panelGeo, frostedMat.clone());
                panelBg.position.set(0, 0, -0.005);
                group.add(panelBg);

                const bgGeo = createRoundedRectGeometry(w, h, w / 2);
                const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
                const bg = new THREE.Mesh(bgGeo, bgMat);
                group.add(bg);

                const fillGeo = createRoundedRectGeometry(w, h, w / 2);
                const fillMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                const fill = new THREE.Mesh(fillGeo, fillMat);
                fill.position.z = 0.001;
                group.add(fill);

                const updateFill = (val) => {
                    const ratio = Math.max(0, Math.min(1, val));
                    if (ratio === 0) {
                        fill.visible = false;
                    } else {
                        fill.visible = true;
                        fill.scale.y = ratio;
                        fill.position.y = (-h / 2) + (h * ratio) / 2;
                    }
                };
                updateFill(initVal);

                if (bottomIcon) bottomIcon(group, 0, -h / 2 - 0.045, 0.7, 0x64748b);
                if (topIcon) topIcon(group, 0, h / 2 + 0.045, 0.7, 0xe2e8f0);

                const dragHandler = (pt) => {
                    const local = bg.worldToLocal(pt.clone());
                    const raw = (local.y + (h / 2)) / h;
                    const ratio = Math.max(0, Math.min(1, raw));
                    updateFill(ratio);
                    if (onChange) onChange(ratio);
                };

                bg.userData = { id, hover: 0x1e293b, bg: 0x0f172a, onClick: dragHandler, onDrag: dragHandler };
                interactables.push(bg);

                return { group, updateFill };
            }

            // --- Main Dock (3 rows: title / controls / seekbar+time) ---
            const dockW = 2.2;
            const dockH = 0.48;
            const dockGeo = createRoundedRectGeometry(dockW, dockH, 0.08);
            bgMesh = new THREE.Mesh(dockGeo, frostedMat);
            bgMesh.position.set(0, 0, 0);
            uiGroup.add(bgMesh);

            // === Row 1 (top): Video Title with marquee ===
            const titleY = 0.16;
            const titleMaxW = 1.9;
            const titleClipGroup = new THREE.Group();
            titleClipGroup.position.set(0, titleY, 0.01);
            uiGroup.add(titleClipGroup);

            const videoTitle = getVideoTitle();
            titleTextObj = new Text();
            titleTextObj.text = videoTitle || 'Loading...';
            titleTextObj.fontSize = 0.038;
            titleTextObj.color = 0xf0f6ff;
            titleTextObj.anchorX = 'center';
            titleTextObj.anchorY = 'middle';
            titleTextObj.maxWidth = 8;
            titleTextObj.position.set(0, 0, 0.01);
            titleClipGroup.add(titleTextObj);

            // === Row 2 (middle): Control buttons ===
            const btnY = 0.02;
            const btnR = 0.055;
            const playR = 0.065;
            const ctrlSpacing = 0.16;
            const sideSpacing = 0.22;

            // Close button (left end)
            const closeBtn3d = createRoundBtn('btn-close', uiGroup, -0.92, btnY, btnR, null, () => close());
            createCloseIcon(closeBtn3d.mesh, 0, 0, 1.0, 0xfca5a5);

            // Seek Back
            const seekBackBtn3d = createRoundBtn('btn-back', uiGroup, -ctrlSpacing, btnY, btnR, null, () => jellyfinVideo.currentTime -= 10);
            createSeekBackIcon(seekBackBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

            // Play / Pause (center)
            const playBtn3d = createRoundBtn('btn-play', uiGroup, 0, btnY, playR, null, () => jellyfinVideo.paused ? jellyfinVideo.play() : jellyfinVideo.pause());
            playIconGroup = createPlayIcon(playBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);
            pauseIconGroup = createPauseIcon(playBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);
            pauseIconGroup.visible = false;

            // Seek Forward
            const seekFwdBtn3d = createRoundBtn('btn-fwd', uiGroup, ctrlSpacing, btnY, btnR, null, () => jellyfinVideo.currentTime += 10);
            createSeekFwdIcon(seekFwdBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

            // Volume button (right of playback controls)
            const volBtnX = ctrlSpacing + sideSpacing;
            const volBtn3d = createRoundBtn('btn-vol', uiGroup, volBtnX, btnY, btnR, null, () => {
                volSliderVisible = !volSliderVisible;
                volSliderGroup.visible = volSliderVisible;
                if (volSliderVisible) { ptSliderVisible = false; ptSliderGroup.visible = false; }
            });
            createSpeakerIcon(volBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

            // Passthrough lighting button
            const ptBtnX = volBtnX + 0.14;
            const ptBtn3d = createRoundBtn('btn-pt', uiGroup, ptBtnX, btnY, btnR, null, () => {
                ptSliderVisible = !ptSliderVisible;
                ptSliderGroup.visible = ptSliderVisible;
                if (ptSliderVisible) { volSliderVisible = false; volSliderGroup.visible = false; }
                if (!state.passthroughEnabled) {
                    state.passthroughEnabled = true;
                    updatePassthroughVisuals();
                }
            });
            createSunIcon(ptBtn3d.mesh, 0, 0, 1.0, 0xfbbf24);

            // Settings button (right end)
            const settingsBtn3d = createRoundBtn('btn-settings', uiGroup, 0.92, btnY, btnR, null, () => {
                state.showingSettings = !state.showingSettings;
                settingsGroup.visible = state.showingSettings;
            });
            createGearIcon(settingsBtn3d.mesh, 0, 0, 1.0, 0x94a3b8);

            // === Vertical Sliders (above buttons) ===
            const vSliderW = 0.05;
            const vSliderH = 0.35;

            // Volume vertical slider
            const volSld = createVerticalSlider('vs-vol', uiGroup, volBtnX, btnY + 0.32, vSliderW, vSliderH,
                jellyfinVideo.volume || 1,
                (v) => {
                    jellyfinVideo.volume = v;
                    jellyfinVideo.muted = (v === 0);
                },
                (p, x, y, s, c) => {
                    const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
                    const body = new THREE.PlaneGeometry(0.01 * s, 0.015 * s);
                    const bm = new THREE.Mesh(body, mat);
                    bm.position.set(x, y, 0.01);
                    p.add(bm);
                },
                (p, x, y, s, c) => {
                    createSpeakerIcon(p, x, y, s, c);
                    const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
                    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.004 * s, 0.016 * s), mat);
                    w1.rotation.z = 0.3;
                    w1.position.set(x + 0.02 * s, y, 0.01);
                    p.add(w1);
                    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.004 * s, 0.022 * s), mat);
                    w2.rotation.z = 0.25;
                    w2.position.set(x + 0.028 * s, y, 0.01);
                    p.add(w2);
                }
            );
            volSliderGroup = volSld.group;
            volSliderUpdateFill = volSld.updateFill;

            // Passthrough lighting vertical slider
            const ptSld = createVerticalSlider('vs-pt', uiGroup, ptBtnX, btnY + 0.32, vSliderW, vSliderH,
                state.passthroughBrightness,
                (v) => { state.passthroughBrightness = v; updatePassthroughVisuals(); },
                (p, x, y, s, c) => {
                    const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
                    const crescent = new THREE.CircleGeometry(0.012 * s, 24);
                    const cm = new THREE.Mesh(crescent, mat);
                    cm.position.set(x, y, 0.01);
                    p.add(cm);
                },
                (p, x, y, s, c) => { createSunIcon(p, x, y, s, c); }
            );
            ptSliderGroup = ptSld.group;
            ptSliderUpdateFill = ptSld.updateFill;

            // === Row 3 (bottom): Seekbar + split time ===
            const seekY = -0.14;
            const seekW = 1.9;
            const seekH = 0.04;
            const seekGroup = new THREE.Group();
            seekGroup.position.set(0, seekY, 0.01);
            uiGroup.add(seekGroup);

            const sBgGeo = createRoundedRectGeometry(seekW, seekH, seekH / 2);
            seekBg = new THREE.Mesh(sBgGeo, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
            seekGroup.add(seekBg);

            const sBufGeo = createRoundedRectGeometry(seekW, seekH, seekH / 2);
            seekBuf = new THREE.Mesh(sBufGeo, new THREE.MeshBasicMaterial({ color: 0x475569 }));
            seekBuf.position.z = 0.001;
            seekGroup.add(seekBuf);

            const sFillGeo = createRoundedRectGeometry(seekW, seekH, seekH / 2);
            seekFill = new THREE.Mesh(sFillGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
            seekFill.position.z = 0.002;
            seekGroup.add(seekFill);

            const handleSeekDrag = (pt) => {
                const local = seekBg.worldToLocal(pt.clone());
                const raw = (local.x + seekW / 2) / seekW;
                const ratio = Math.max(0, Math.min(1, raw));
                if (Number.isFinite(jellyfinVideo.duration)) jellyfinVideo.currentTime = ratio * jellyfinVideo.duration;
            };
            seekBg.userData = { hover: 0x1e293b, bg: 0x0f172a, onClick: handleSeekDrag, onDrag: handleSeekDrag };
            interactables.push(seekBg);

            timeCurrentObj = createTextObj('0:00', uiGroup, -seekW / 2, seekY - 0.04, 0.03, 0x94a3b8, 'left');
            timeDurationObj = createTextObj('0:00', uiGroup, seekW / 2, seekY - 0.04, 0.03, 0x94a3b8, 'right');

            // --- Settings Menu ---
            settingsGroup = new THREE.Group();
            settingsGroup.position.set(0, 0.55, 0);
            settingsGroup.visible = false;
            uiGroup.add(settingsGroup);

            const setGeo = createRoundedRectGeometry(1.6, 0.5, 0.08);
            const setBg = new THREE.Mesh(setGeo, frostedMat);
            settingsGroup.add(setBg);

            const pY = 0.16;
            createTextObj('Layout', settingsGroup, -0.65, pY, 0.035, 0xe2e8f0, 'left');

            createRoundBtn('m-2d', settingsGroup, -0.3, pY, 0.045, '2D', () => switchMode('3d-sbs-half')).textObj.fontSize = 0.025;
            createRoundBtn('m-3d', settingsGroup, -0.15, pY, 0.045, '3D', () => {
                const b = state.mode.stereo === 'mono' ? 'sbs' : 'mono';
                const id = state.mode.projection === 'screen' ? (b === 'mono' ? '3d-sbs-half' : '3d-sbs-full') : state.mode.projection + '-' + b + '-full';
                switchMode(id);
            }).textObj.fontSize = 0.025;

            createRoundBtn('m-180', settingsGroup, 0.1, pY, 0.045, '180', () => switchMode('180-sbs-full')).textObj.fontSize = 0.025;
            createRoundBtn('m-360', settingsGroup, 0.25, pY, 0.045, '360', () => switchMode('360-sbs-full')).textObj.fontSize = 0.025;

            const sY1 = 0.02; const sY2 = -0.06; const sY3 = -0.14;
            createTextObj('Curve', settingsGroup, -0.65, sY1, 0.03, 0x94a3b8, 'left');
            const sCrv = createSlider('s-curve', settingsGroup, -0.2, sY1, 0.5, 0.03, state.screenCurvature, (v) => { state.screenCurvature = v; applyModeFromState(); });

            createTextObj('Dist.', settingsGroup, -0.65, sY2, 0.03, 0x94a3b8, 'left');
            const initDistRatio = (state.screenDistance - (-20)) / (-4 - (-20));
            const sDist = createSlider('s-dist', settingsGroup, -0.2, sY2, 0.5, 0.03, initDistRatio, (v) => { state.screenDistance = -20 + (v * 16); applyModeFromState(); });

            createTextObj('Size', settingsGroup, -0.65, sY3, 0.03, 0x94a3b8, 'left');
            const initSizeRatio = (state.screenSize - 0.5) / (3.0 - 0.5);
            const sSize = createSlider('s-size', settingsGroup, -0.2, sY3, 0.5, 0.03, initSizeRatio, (v) => { state.screenSize = 0.5 + (v * 2.5); applyModeFromState(); });

            createTextObj('UI Dist', settingsGroup, 0.15, sY1, 0.03, 0x94a3b8, 'left');
            const initUIDist = (state.uiDistance - 1) / (4 - 1);
            const sUIDist = createSlider('s-uidist', settingsGroup, 0.55, sY1, 0.4, 0.03, initUIDist, (v) => {
                state.uiDistance = 1 + (v * 3);
                localStorage.setItem('jfvr:ui-distance', state.uiDistance.toString());
            });

            createTextObj('Dimmer', settingsGroup, 0.15, sY2, 0.03, 0x94a3b8, 'left');
            const sDim = createSlider('s-dimmer', settingsGroup, 0.55, sY2, 0.4, 0.03, state.passthroughBrightness, (v) => { state.passthroughBrightness = v; updatePassthroughVisuals(); });

            const toolsY = -0.22;
            createTextObj('Tools', settingsGroup, -0.65, toolsY, 0.03, 0x94a3b8, 'left');
            createRoundBtn('m-center', settingsGroup, -0.05, toolsY, 0.06, 'CTR', () => recenterActiveMode(THREE)).textObj.fontSize = 0.025;
            createRoundBtn('m-about', settingsGroup, 0.16, toolsY, 0.06, 'VER', () => openVersionModal()).textObj.fontSize = 0.025;


            // Raycaster & Interaction
            const raycaster = new THREE.Raycaster();
            const tempMatrix = new THREE.Matrix4();
            let hoveredObj = null;

            function onSelectStart(event) {
                const controller = event.target;
                if (!state.uiVisible) {
                    toggleUI(controller);
                    return;
                }
                tempMatrix.identity().extractRotation(controller.matrixWorld);
                raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                const intersects = raycaster.intersectObjects(interactables, false);
                if (intersects.length > 0) {
                    const obj = intersects[0].object;
                    if (obj.userData.onClick) obj.userData.onClick(intersects[0].point);
                    if (obj.userData.onDrag) controller.userData.dragTarget = obj;
                } else {
                    toggleUI(controller);
                }
            }

            function onSelectEnd(event) {
                const controller = event.target;
                if (controller.userData.dragTarget) {
                    controller.userData.dragTarget = null;
                }
            }

            const controllerModelFactory = new XRControllerModelFactory();
            const handModelFactory = new XRHandModelFactory();

            for (let i = 0; i < 2; i++) {
                const controller = renderer.xr.getController(i);
                scene.add(controller);
                controller.addEventListener('selectstart', (e) => {
                    state.lastInteraction = Date.now();
                    onSelectStart(e);
                });
                controller.addEventListener('selectend', (e) => {
                    onSelectEnd(e);
                });
                controller.addEventListener('squeezestart', (e) => toggleUI(e.target));
                controller.addEventListener('connected', () => {
                    state.lastInteraction = Date.now();
                });

                const grip = renderer.xr.getControllerGrip(i);
                grip.add(controllerModelFactory.createControllerModel(grip));
                scene.add(grip);

                const hand = renderer.xr.getHand(i);
                hand.add(handModelFactory.createHandModel(hand, 'boxes'));
                scene.add(hand);

                const geometryLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]);
                const line = new THREE.Line(geometryLine, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
                controller.add(line);
            }

            function updateHover(controllers) {
                let hit = false;
                if (!state.uiVisible) {
                    for (let i = 0; i < controllers.length; i++) {
                        const cont = controllers[i];
                        if (cont && cont.children[0]) cont.children[0].scale.z = 1;
                    }
                    if (hoveredObj) {
                        if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.bg);
                        hoveredObj = null;
                    }
                    return;
                }

                for (let i = 0; i < controllers.length; i++) {
                    const controller = controllers[i];
                    if (!controller.visible) continue;
                    tempMatrix.identity().extractRotation(controller.matrixWorld);
                    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                    const intersects = raycaster.intersectObjects(interactables, false);
                    if (intersects.length > 0) {
                        const obj = intersects[0].object;
                        if (hoveredObj && hoveredObj !== obj) {
                            if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.bg);
                        }
                        hoveredObj = obj;
                        if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.hover);
                        hit = true;
                        state.lastInteraction = Date.now();

                        const dist = intersects[0].distance;
                        const line = controller.children[0];
                        if (line) line.scale.z = dist / 5;
                    } else {
                        const line = controller.children[0];
                        if (line) line.scale.z = 1;
                    }
                }
                if (!hit && hoveredObj) {
                    if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.bg);
                    hoveredObj = null;
                }
            }

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                if (!renderer.xr.isPresenting) {
                    renderer.setSize(window.innerWidth, window.innerHeight);
                }
            });

            // Init the scene look
            applyModeFromState();

            renderer.setAnimationLoop(() => {
                const dur = jellyfinVideo.duration || 0;
                const cur = jellyfinVideo.currentTime || 0;
                if (timeCurrentObj) timeCurrentObj.text = formatTime(cur);
                if (timeDurationObj) timeDurationObj.text = formatTime(dur);

                const ratio = dur > 0 ? (cur / dur) : 0;
                const sW = 1.9;
                seekFill.scale.x = ratio || 0.001;
                seekFill.position.x = (-sW / 2) + (sW * ratio) / 2;

                if (jellyfinVideo.buffered && jellyfinVideo.buffered.length > 0) {
                    const bufEnd = jellyfinVideo.buffered.end(jellyfinVideo.buffered.length - 1);
                    const bRatio = dur > 0 ? (bufEnd / dur) : 0;
                    seekBuf.scale.x = bRatio || 0.001;
                    seekBuf.position.x = (-sW / 2) + (sW * bRatio) / 2;
                } else {
                    seekBuf.scale.x = 0.001;
                }

                if (playIconGroup && pauseIconGroup) {
                    playIconGroup.visible = jellyfinVideo.paused;
                    pauseIconGroup.visible = !jellyfinVideo.paused;
                }

                // Marquee scroll for long titles
                if (titleTextObj && titleTextObj.textRenderInfo) {
                    const titleW = titleTextObj.textRenderInfo.blockBounds
                        ? (titleTextObj.textRenderInfo.blockBounds[2] - titleTextObj.textRenderInfo.blockBounds[0])
                        : 0;
                    const clipW = 1.9;
                    if (titleW > clipW) {
                        const overflow = titleW - clipW;
                        if (marqueePauseTimer > 0) {
                            marqueePauseTimer -= 0.016;
                        } else {
                            marqueeOffset += (marqueeDir === 0 ? -0.3 : 0.3) * 0.016;
                            if (marqueeOffset < -overflow / 2) {
                                marqueeOffset = -overflow / 2;
                                marqueeDir = 1;
                                marqueePauseTimer = 1.5;
                            } else if (marqueeOffset > 0) {
                                marqueeOffset = 0;
                                marqueeDir = 0;
                                marqueePauseTimer = 2.0;
                            }
                        }
                        titleTextObj.position.x = marqueeOffset;
                    } else {
                        titleTextObj.position.x = 0;
                    }
                }

                updateHover([renderer.xr.getController(0), renderer.xr.getController(1)]);

                for (let i = 0; i < 2; i++) {
                    const controller = renderer.xr.getController(i);
                    if (controller && controller.userData && controller.userData.dragTarget) {
                        const obj = controller.userData.dragTarget;
                        tempMatrix.identity().extractRotation(controller.matrixWorld);
                        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

                        // Intersect against local plane of the UI
                        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(uiGroup.quaternion);
                        let dragPlanePos = obj.getWorldPosition(new THREE.Vector3());
                        if (obj.parent) dragPlanePos = obj.parent.getWorldPosition(new THREE.Vector3());
                        else dragPlanePos = uiGroup.getWorldPosition(new THREE.Vector3());

                        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, dragPlanePos);
                        const intersectPoint = new THREE.Vector3();
                        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
                            if (obj.userData.onDrag) obj.userData.onDrag(intersectPoint);
                        }
                        state.lastInteraction = Date.now();
                    }
                }

                if (state.uiVisible && Date.now() - state.lastInteraction > 5000) {
                    toggleUI();
                }

                renderer.render(scene, camera);
            });
        }

        function close() {
            active = false;
            removeVersionModal();
            if (previewSyncHandlers) {
                jellyfinVideo.removeEventListener('play', previewSyncHandlers.play);
                jellyfinVideo.removeEventListener('pause', previewSyncHandlers.pause);
                jellyfinVideo.removeEventListener('seeked', previewSyncHandlers.seeked);
                jellyfinVideo.removeEventListener('timeupdate', previewSyncHandlers.timeupdate);
            }
            if (toolbarVersionBtn) toolbarVersionBtn.removeEventListener('click', openVersionModal);
            if (toolbarRecenterBtn) toolbarRecenterBtn.removeEventListener('click', onToolbarRecenter);
            if (renderer) {
                renderer.setAnimationLoop(null);
                if (renderer.xr.isPresenting) renderer.xr.getSession().end();
                renderer.dispose();
            }
            overlay.remove();
            styleEl.remove();
            if (activeInlinePlayer && activeInlinePlayer.close === close) {
                activeInlinePlayer = null;
            }
        }

        function onToolbarRecenter() {
            if (renderer && scene && camera) {
                import('three').then((THREE) => {
                    if (!active) return;
                    recenterActiveMode(THREE);
                }).catch(() => {
                    updatePreviewStatus('Recenter failed.');
                });
            }
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape') { event.preventDefault(); close(); }
            if (event.key === ' ') { event.preventDefault(); jellyfinVideo.paused ? jellyfinVideo.play() : jellyfinVideo.pause(); }
            if (event.key.toLowerCase() === 'r') { event.preventDefault(); onToolbarRecenter(); }
            if (event.key.toLowerCase() === 'i') { event.preventDefault(); openVersionModal(); }
        };
        overlay.addEventListener('keydown', onKeyDown);

        toolbarVersionBtn = overlay.querySelector('#jfvr-inline-version');
        toolbarRecenterBtn = overlay.querySelector('#jfvr-inline-recenter');
        if (toolbarVersionBtn) toolbarVersionBtn.addEventListener('click', openVersionModal);
        if (toolbarRecenterBtn) toolbarRecenterBtn.addEventListener('click', onToolbarRecenter);

        setupPreviewVideo();

        initThree().catch(err => {
            console.error("Three.js initialization failed:", err);
            overlay.innerHTML = '<div style="color:white;padding:20px;">Failed to load VR Player. Check console.</div>';
        });

        return { close };
    }

    async function openInlinePlayer(modeId) {
        const jellyfinVideo = getCurrentJellyfinVideo();
        if (!jellyfinVideo || !(jellyfinVideo.currentSrc || jellyfinVideo.src)) {
            window.alert('No video is currently playing in Jellyfin. Start playback first.');
            return;
        }

        if (activeInlinePlayer) {
            activeInlinePlayer.close();
        }

        localStorage.setItem(STORAGE_KEYS.lastMode, modeId);

        try {
            /* three.js loaded dynamically */
        } catch (error) {
            window.alert('Failed to load the VR runtime.');
            return;
        }

        const styleEl = document.createElement('style');
        styleEl.id = 'jfvr-inline-style';
        styleEl.textContent = INLINE_PLAYER_STYLE;
        document.head.appendChild(styleEl);

        const overlay = document.createElement('div');
        overlay.id = 'jfvr-inline-overlay';
        overlay.tabIndex = -1;
        overlay.innerHTML = INLINE_PLAYER_HTML;
        document.body.appendChild(overlay);
        overlay.focus();

        activeInlinePlayer = createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId);
    }

    function openPlayer(modeId) {
        openInlinePlayer(modeId);
    }

    function createVRButton() {
        if (document.getElementById('vr360-toggleplay')) return;

        const fullscreenBtn = document.querySelector('.btnFullscreen');
        if (!fullscreenBtn || !fullscreenBtn.parentNode) return;

        const button = document.createElement('button');
        button.id = 'vr360-toggleplay';
        button.setAttribute('is', 'paper-icon-button-light');
        button.className = 'autoSize paper-icon-button-light';
        button.title = 'VR Player';
        button.setAttribute('aria-label', 'VR Player');

        const label = document.createElement('span');
        label.className = 'largePaperIconButton';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = 'VR';
        label.style.cssText = 'font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; display:inline-flex; align-items:center; justify-content:center;';

        button.appendChild(label);
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openModeMenu(button);
        });

        fullscreenBtn.parentNode.insertBefore(button, fullscreenBtn);
    }

    function removeVRButton() {
        const button = document.getElementById('vr360-toggleplay');
        if (button) button.remove();
        removeModeMenu();
    }

    function checkForVideo() {
        const video = getCurrentJellyfinVideo();
        const hasVideo = video && video.src;
        if (hasVideo) {
            createVRButton();
        } else {
            removeVRButton();
        }
    }

    const observer = new MutationObserver(checkForVideo);

    function init() {
        checkForVideo();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();

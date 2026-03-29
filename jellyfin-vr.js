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

    const VERSION = '0.1.2';

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
            id: 'screen-2d',
            label: '2D Screen',
            shortLabel: '2D',
            description: 'Flat theater screen with no stereoscopic split.',
            projection: 'screen',
            stereo: 'mono',
            variant: 'mono'
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
        },
        {
            id: '3d-ou-full',
            label: '3D Full OU',
            shortLabel: '3D OU',
            description: 'Stereo theater screen for full over-under 3D video.',
            projection: 'screen',
            stereo: 'ou',
            variant: 'full'
        },
        {
            id: '3d-ou-half',
            label: '3D Half OU',
            shortLabel: '3D OU',
            description: 'Stereo theater screen for half over-under 3D video.',
            projection: 'screen',
            stereo: 'ou',
            variant: 'half'
        }
    ];

    const MODES_BY_ID = VIEW_MODES.reduce((acc, mode) => {
        acc[mode.id] = mode;
        return acc;
    }, {});

    const MODE_GROUPS = [
        { projection: '360', title: '360 VR Modes' },
        { projection: '180', title: '180 VR Modes' },
        { projection: 'screen', title: 'Screen Modes' }
    ];

    function getModeShapeLabel(mode) {
        if (mode.stereo === 'mono') return '2D';
        if (mode.stereo === 'sbs') return mode.variant === 'full' ? 'SBS Full' : 'SBS Half';
        return mode.variant === 'full' ? 'OU Full' : 'OU Half';
    }

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
  }
`;

    const INLINE_PLAYER_HTML = `
  <div id="jfvr-canvas-container"></div>
  <div id="jfvr-inline-toolbar">
    <button type="button" id="jfvr-inline-version" class="jfvr-inline-chip">v${VERSION}</button>
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
            ? (mode.stereo === 'mono' ? '2D Screen' : 'Screen ' + mode.stereo.toUpperCase())
            : (mode.stereo === 'mono' ? mode.projection + ' Mono' : mode.projection + ' ' + mode.stereo.toUpperCase());
        const variantLabel = mode.variant === 'mono' ? 'Single view' : mode.variant === 'full' ? 'Full layout' : 'Half layout';

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

    function openModeMenu() {
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

        const groups = MODE_GROUPS.map(({ projection, title }) => {
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
            <div class="jfvr-menu-subtitle">Pick the layout that matches the file. 180 and 360 stay immersive, while screen modes open as a theater view with 2D or stereo splits.</div>
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
        const BASE_UI_SCALE = 0.74;
        const UI_DISTANCE_MIN = 1.3;
        const UI_DISTANCE_MAX = 3.3;
        const UI_DISTANCE_DEFAULT = (UI_DISTANCE_MIN + UI_DISTANCE_MAX) / 2;
        const XR_FRAMEBUFFER_SCALE = 1.25;
        const XR_FOVEATION = 0;
        const SURFACE_TRIGGER_GRAB_DELAY_MS = 180;
        let active = true;
        let renderer, scene, camera, vrButton, arButton;
        let uiGroup;
        let videoTexture, materials = {}, meshes = {};
        let mediaBinding = null;
        let mediaVideoLayer = null;
        let mediaLayerStatus = 'unavailable';
        let mediaLayerReason = 'not-initialized';
        let mediaLayerMode = 'mesh';
        let mediaLayerKey = '';
        let textRendererStatus = 'troika-msdf';
        let projectionLayerStatus = 'unknown';
        let projectionLayerReason = 'not-initialized';
        let xrSessionMode = 'unknown';
        let toolbarVersionBtn;
        let immersiveDebugScreen;
        let surfaceRoot;
        let videoGrabControllers = [];
        let state = {
            mode: MODES_BY_ID[modeId] || MODES_BY_ID['360-mono'],
            isImmersive: false,
            swapEyes: false,
            uiVisible: true,
            uiAnchorType: 'center',
            uiAnchorOrigin: null,
            uiAnchorForward: null,
            lastInteraction: Date.now(),
            uiDistance: Math.min(UI_DISTANCE_MAX, Math.max(UI_DISTANCE_MIN, Math.abs(parseFloat(localStorage.getItem('jfvr:ui-distance'))) || UI_DISTANCE_DEFAULT)),
            uiScale: parseFloat(localStorage.getItem('jfvr:ui-scale')) || 1.0,
            isAR: false,
            passthroughEnabled: false,
            passthroughBrightness: 1.0,
            screenCurvature: 0.0,
            effectiveScreenCurve: 0.0,
            screenSize: 1.0,
            screenDistance: -12.0,
            stereoLock: 'auto',
            lastModeChangeSource: 'initial',
            lastUiOpenSource: 'initial',
            lastUiCloseSource: 'initial',
            showingSettings: false,
            showingLayout: false
        };

        function immersiveDebugScreenActive() {
            return window.__JFVR_HARNESS_RUNTIME_MODE__ === 'extension'
                && renderer
                && renderer.xr
                && renderer.xr.isPresenting;
        }

        function updateHarnessState() {
            window.__JFVR_RUNTIME_STATE__ = {
                modeId: state.mode ? state.mode.id : null,
                isImmersive: state.isImmersive,
                showingSettings: state.showingSettings,
                showingLayout: state.showingLayout,
                uiAnchorType: state.uiAnchorType,
                uiDistance: state.uiDistance,
                stereoLock: state.stereoLock,
                screenCurvature: state.screenCurvature,
                effectiveScreenCurve: state.effectiveScreenCurve,
                screenSize: state.screenSize,
                screenDistance: state.screenDistance,
                lastModeChangeSource: state.lastModeChangeSource,
                lastUiOpenSource: state.lastUiOpenSource,
                lastUiCloseSource: state.lastUiCloseSource,
                mediaLayerStatus,
                mediaLayerReason,
                mediaLayerMode,
                projectionLayerStatus,
                projectionLayerReason,
                xrSessionMode,
                textRendererStatus,
                grabActive: videoGrabControllers.length > 0
            };
        }

        function exposeHarnessActions() {
            window.__JFVR_RUNTIME_ACTIONS__ = {
                toggleLayout: () => {
                    state.showingLayout = !state.showingLayout;
                    state.showingSettings = false;
                    if (layoutGroup) layoutGroup.visible = state.showingLayout;
                    if (settingsGroup) settingsGroup.visible = false;
                    volSliderVisible = false;
                    ptSliderVisible = false;
                    if (volSliderGroup) volSliderGroup.visible = false;
                    if (ptSliderGroup) ptSliderGroup.visible = false;
                    updateHarnessState();
                },
                toggleSettings: () => {
                    state.showingSettings = !state.showingSettings;
                    state.showingLayout = false;
                    if (settingsGroup) settingsGroup.visible = state.showingSettings;
                    if (layoutGroup) layoutGroup.visible = false;
                    if (infoGroup && !state.showingSettings) infoGroup.visible = false;
                    volSliderVisible = false;
                    ptSliderVisible = false;
                    if (volSliderGroup) volSliderGroup.visible = false;
                    if (ptSliderGroup) ptSliderGroup.visible = false;
                    updateInfoPanelStatus();
                    updateHarnessState();
                }
            };
        }

        function exposeHarnessDebug() {
            window.__JFVR_RUNTIME_DEBUG__ = {
                getSnapshot: () => {
                    const THREERef = window.THREE;
                    const toBox = (object) => {
                        if (!object || !THREERef) return null;
                        let current = object;
                        while (current) {
                            if (current.visible === false) return null;
                            current = current.parent;
                        }
                        const box = new THREERef.Box3().setFromObject(object);
                        if (!Number.isFinite(box.min.x)) return null;
                        return {
                            min: { x: box.min.x, y: box.min.y, z: box.min.z },
                            max: { x: box.max.x, y: box.max.y, z: box.max.z },
                            size: {
                                x: box.max.x - box.min.x,
                                y: box.max.y - box.min.y,
                                z: box.max.z - box.min.z
                            }
                        };
                    };

                    const visibleTextCount = textObjects.filter((item) => item.visible !== false).length;
                    const readyTextCount = textObjects.filter((item) => item.textRenderInfo && item.textRenderInfo.blockBounds).length;
                    let surfaceCenter = null;
                    let cameraForwardDot = null;
                    let rayColor = null;
                    if (surfaceRoot && uiGroup && THREERef && camera) {
                        const center = new THREERef.Vector3();
                        surfaceRoot.getWorldPosition(center);
                        surfaceCenter = { x: center.x, y: center.y, z: center.z };
                        const camPos = new THREERef.Vector3();
                        const camForward = new THREERef.Vector3();
                        const viewCamera = renderer && renderer.xr && renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
                        viewCamera.getWorldPosition(camPos);
                        viewCamera.getWorldDirection(camForward);
                        cameraForwardDot = center.clone().sub(camPos).normalize().dot(camForward.normalize());
                    }
                    if (renderer && renderer.xr) {
                        const rightController = renderer.xr.getController(1);
                        if (rightController && rightController.userData && rightController.userData.lineRef) {
                            const color = rightController.userData.lineRef.material.color;
                            rayColor = { r: color.r, g: color.g, b: color.b };
                        }
                    }
                    return {
                        modeId: state.mode ? state.mode.id : null,
                        uiVisible: state.uiVisible,
                        uiAnchorType: state.uiAnchorType,
                        uiAnchorOrigin: state.uiAnchorOrigin ? { x: state.uiAnchorOrigin.x, y: state.uiAnchorOrigin.y, z: state.uiAnchorOrigin.z } : null,
                        uiAnchorForward: state.uiAnchorForward ? { x: state.uiAnchorForward.x, y: state.uiAnchorForward.y, z: state.uiAnchorForward.z } : null,
                        uiPosition: uiGroup ? { x: uiGroup.position.x, y: uiGroup.position.y, z: uiGroup.position.z } : null,
                        uiScale: uiGroup ? { x: uiGroup.scale.x, y: uiGroup.scale.y, z: uiGroup.scale.z } : null,
                        showingSettings: state.showingSettings,
                        showingLayout: state.showingLayout,
                        activePanel: infoGroup && infoGroup.visible ? 'info' : (state.showingSettings ? 'settings' : (state.showingLayout ? 'layout' : 'none')),
                        stereoLock: state.stereoLock,
                        lastModeChangeSource: state.lastModeChangeSource,
                        lastUiOpenSource: state.lastUiOpenSource,
                        lastUiCloseSource: state.lastUiCloseSource,
                        mediaLayerStatus,
                        mediaLayerReason,
                        mediaLayerMode,
                        projectionLayerStatus,
                        projectionLayerReason,
                        xrSessionMode,
                        textRendererStatus,
                        rendererPixelRatio: renderer ? renderer.getPixelRatio() : null,
                        xrFramebufferScale: XR_FRAMEBUFFER_SCALE,
                        xrFoveation: XR_FOVEATION,
                        grabActive: videoGrabControllers.length > 0,
                        settingsBounds: toBox(settingsBackgroundMesh),
                        infoBounds: toBox(infoBackgroundMesh),
                        infoButtonBounds: toBox(infoButtonMesh),
                        settingsUiDistTrackBounds: toBox(settingsUiDistTrack),
                        settingsDimmerTrackBounds: toBox(settingsDimmerTrack),
                        layoutBounds: toBox(layoutBackgroundMesh),
                        layoutCardBounds: layoutCardMeshes.map((mesh) => ({ id: mesh.userData.id, bounds: toBox(mesh) })),
                        volumeSliderBounds: toBox(volSliderGroup),
                        passthroughSliderBounds: toBox(ptSliderGroup),
                        surfaceBounds: toBox(surfaceRoot),
                        surfaceVisible: surfaceRoot ? surfaceRoot.visible !== false : false,
                        surfaceCenter,
                        cameraForwardDot,
                        curveDepth: state.effectiveScreenCurve,
                        rayColor,
                        effectiveStereo: meshes.left ? meshes.left.visible === true : false,
                        visibleTextCount,
                        readyTextCount
                    };
                }
            };
        }

        function updateImmersiveDebugScreen() {
            if (!immersiveDebugScreen) return;
            immersiveDebugScreen.visible = immersiveDebugScreenActive();
        }
        let interactables = [];
        let textObjects = [];
        let layoutCardMeshes = [];
        let layoutBackgroundMesh = null;
        let settingsBackgroundMesh = null;
        let timeCurrentObj, timeDurationObj, titleTextObj;
        let playIconGroup, pauseIconGroup, stereoToggleLabel;
        let seekBg, seekBuf, seekFill;
        let bgMesh, settingsGroup, layoutGroup, infoGroup;
        let infoButtonMesh = null;
        let infoBackgroundMesh = null;
        let settingsUiDistTrack = null;
        let settingsDimmerTrack = null;
        let infoStatusLines = [];
        let updateInfoPanelStatus = () => {};
        let volSliderGroup, ptSliderGroup;
        let ptSliderUpdateFill;
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

        function getScreenCurveParams() {
            const normalized = Math.max(0, Math.min(1, state.screenCurvature));
            if (normalized < 0.02) {
                state.effectiveScreenCurve = 0;
                return { curved: false, radius: 0, theta: 0, depth: 0 };
            }
            const theta = 0.18 + (normalized * 2.94);
            const radius = 18 / theta;
            const depth = radius * (1 - Math.cos(theta / 2));
            state.effectiveScreenCurve = theta;
            return { curved: true, radius, theta, depth };
        }

        function getCompositionLayerLayout(mode) {
            if (!mode || state.stereoLock === 'force-2d' || mode.stereo === 'mono') {
                return 'mono';
            }
            if (mode.stereo === 'sbs') return 'stereo-left-right';
            if (mode.stereo === 'ou') return 'stereo-top-bottom';
            return 'mono';
        }

        function applyUiAnchorFromViewer(THREE, anchorType, controller) {
            if (!uiGroup) return;
            const targetCamera = renderer && renderer.xr && renderer.xr.isPresenting
                ? renderer.xr.getCamera()
                : camera;
            if (!targetCamera) return;

            const origin = new THREE.Vector3();
            const forward = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();

            if (anchorType === 'video' && controller && controller.matrixWorld) {
                origin.setFromMatrixPosition(controller.matrixWorld);
                quaternion.setFromRotationMatrix(new THREE.Matrix4().extractRotation(controller.matrixWorld));
                forward.set(0, 0, -1).applyQuaternion(quaternion).normalize();
            } else if (anchorType === 'controller' && controller && controller.matrixWorld) {
                origin.setFromMatrixPosition(controller.matrixWorld);
                quaternion.setFromRotationMatrix(new THREE.Matrix4().extractRotation(controller.matrixWorld));
                forward.set(0, 0, -1).applyQuaternion(quaternion).normalize();
            } else {
                targetCamera.getWorldPosition(origin);
                targetCamera.getWorldQuaternion(quaternion);
                forward.set(0, 0, -1).applyQuaternion(quaternion);
                forward.y = 0;
                if (forward.lengthSq() < 0.0001) {
                    forward.set(0, 0, -1);
                } else {
                    forward.normalize();
                }
            }

            const verticalOffset = anchorType === 'video' ? -0.22 : -0.12;
            state.uiAnchorOrigin = origin.clone();
            state.uiAnchorForward = forward.clone();
            state.uiAnchorType = anchorType;
            uiGroup.position.copy(origin).add(forward.multiplyScalar(state.uiDistance));
            uiGroup.position.y += verticalOffset;
            const lookTarget = new window.THREE.Vector3();
            targetCamera.getWorldPosition(lookTarget);
            uiGroup.lookAt(lookTarget);
            updateHarnessState();
        }

        function applyStoredUiAnchor() {
            if (!uiGroup || !state.uiAnchorOrigin || !state.uiAnchorForward) return;
            const origin = state.uiAnchorOrigin.clone();
            const forward = state.uiAnchorForward.clone();
            const verticalOffset = state.uiAnchorType === 'video' ? -0.22 : -0.12;
            uiGroup.position.copy(origin).add(forward.multiplyScalar(state.uiDistance));
            uiGroup.position.y += verticalOffset;
            const targetCamera = renderer && renderer.xr && renderer.xr.isPresenting
                ? renderer.xr.getCamera()
                : camera;
            const lookTarget = new window.THREE.Vector3();
            targetCamera.getWorldPosition(lookTarget);
            uiGroup.lookAt(lookTarget);
            updateHarnessState();
        }

        function createCurvedScreenGeometry(THREE, width, height, curveParams) {
            if (!curveParams.curved) {
                return new THREE.PlaneGeometry(width, height);
            }
            const geometry = new THREE.CylinderGeometry(
                curveParams.radius,
                curveParams.radius,
                height,
                96,
                1,
                true,
                Math.PI - (curveParams.theta / 2),
                curveParams.theta
            );
            geometry.scale(-1, 1, 1);
            geometry.translate(0, 0, curveParams.radius);
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
            return geometry;
        }

        function getSurfaceTransformForLayer(THREE) {
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            surfaceRoot.getWorldPosition(position);
            surfaceRoot.getWorldQuaternion(quaternion);
            return {
                position: { x: position.x, y: position.y, z: position.z },
                orientation: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
            };
        }

        function clearCompositionVideoLayer(session) {
            const xrSession = session || (renderer && renderer.xr && typeof renderer.xr.getSession === 'function' ? renderer.xr.getSession() : null);
            try {
                if (xrSession && typeof xrSession.updateRenderState === 'function' && xrSession.renderState && xrSession.renderState.baseLayer) {
                    xrSession.updateRenderState({ layers: [xrSession.renderState.baseLayer] });
                }
            } catch (_error) {
                // Best-effort cleanup only.
            }
            mediaVideoLayer = null;
            mediaBinding = null;
            mediaLayerMode = 'mesh';
            mediaLayerKey = '';
        }

        function updateProjectionLayerStatus() {
            const session = renderer && renderer.xr && typeof renderer.xr.getSession === 'function' ? renderer.xr.getSession() : null;
            if (!session || !state.isImmersive) {
                projectionLayerStatus = 'inactive';
                projectionLayerReason = 'no-session';
                return;
            }

            const hasLayersArray = Boolean(session.renderState && Array.isArray(session.renderState.layers));
            const hasBaseLayer = Boolean(session.renderState && session.renderState.baseLayer);
            const hasBinding = renderer && renderer.xr && typeof renderer.xr.getBinding === 'function' && Boolean(renderer.xr.getBinding());

            if (hasLayersArray) {
                projectionLayerStatus = 'layers';
                projectionLayerReason = hasBinding ? 'xr-binding-active' : 'layers-array';
            } else if (hasBaseLayer) {
                projectionLayerStatus = 'base-layer';
                projectionLayerReason = 'renderstate-baselayer';
            } else {
                projectionLayerStatus = 'unknown';
                projectionLayerReason = 'no-renderstate-layer';
            }
        }

        function syncCompositionVideoLayer(THREE) {
            const session = renderer && renderer.xr && typeof renderer.xr.getSession === 'function' ? renderer.xr.getSession() : null;
            if (!session || !state.isImmersive) {
                clearCompositionVideoLayer(session);
                mediaLayerStatus = 'inactive';
                mediaLayerReason = 'no-session';
                updateProjectionLayerStatus();
                updateHarnessState();
                return;
            }

            if (state.isAR || typeof window.XRMediaBinding !== 'function' || typeof session.updateRenderState !== 'function' || typeof renderer.xr.getReferenceSpace !== 'function') {
                clearCompositionVideoLayer(session);
                mediaLayerStatus = 'unavailable';
                mediaLayerReason = state.isAR ? 'ar-session' : 'unsupported';
                updateProjectionLayerStatus();
                updateHarnessState();
                return;
            }

            const referenceSpace = renderer.xr.getReferenceSpace();
            if (!referenceSpace) {
                clearCompositionVideoLayer(session);
                mediaLayerStatus = 'inactive';
                mediaLayerReason = 'missing-reference-space';
                updateProjectionLayerStatus();
                updateHarnessState();
                return;
            }

            const transform = getSurfaceTransformForLayer(THREE);
            const layout = getCompositionLayerLayout(state.mode);
            const curveParams = getScreenCurveParams();
            const bindingProbe = new window.XRMediaBinding(session);
            let layerFactory = null;
            let layerKey = '';
            let layerMode = 'mesh';
            let layerOptions = null;

            if (state.mode.projection === 'screen') {
                const width = 18 * state.screenSize;
                const height = 10.125 * state.screenSize;
                if (curveParams.curved && typeof bindingProbe.createCylinderLayer === 'function') {
                    layerFactory = 'createCylinderLayer';
                    layerMode = 'cylinder-layer';
                    layerOptions = {
                        space: referenceSpace,
                        radius: curveParams.radius * state.screenSize,
                        centralAngle: curveParams.theta,
                        aspectRatio: width / height,
                        layout,
                        transform: new XRRigidTransform(transform.position, transform.orientation)
                    };
                } else if (typeof bindingProbe.createQuadLayer === 'function') {
                    layerFactory = 'createQuadLayer';
                    layerMode = 'quad-layer';
                    layerOptions = {
                        space: referenceSpace,
                        width,
                        height,
                        layout,
                        transform: new XRRigidTransform(transform.position, transform.orientation)
                    };
                } else {
                    clearCompositionVideoLayer(session);
                    mediaLayerStatus = 'unavailable';
                    mediaLayerReason = 'quad-layer-unsupported';
                    updateProjectionLayerStatus();
                    updateHarnessState();
                    return;
                }
            } else if (typeof bindingProbe.createEquirectLayer === 'function') {
                layerFactory = 'createEquirectLayer';
                layerMode = 'equirect-layer';
                layerOptions = {
                    space: referenceSpace,
                    radius: 32 * state.screenSize,
                    centralHorizontalAngle: state.mode.projection === '180' ? Math.PI : Math.PI * 2,
                    upperVerticalAngle: Math.PI / 2,
                    lowerVerticalAngle: -Math.PI / 2,
                    layout,
                    transform: new XRRigidTransform(transform.position, transform.orientation)
                };
            } else {
                clearCompositionVideoLayer(session);
                mediaLayerStatus = 'unavailable';
                mediaLayerReason = 'no-supported-layer-type';
                updateProjectionLayerStatus();
                updateHarnessState();
                return;
            }

            layerKey = JSON.stringify({
                projection: state.mode.projection,
                stereo: state.mode.stereo,
                variant: state.mode.variant,
                stereoLock: state.stereoLock,
                curved: curveParams.curved,
                theta: curveParams.theta,
                scale: state.screenSize,
                distance: state.screenDistance,
                transform
            });

            if (mediaLayerKey === layerKey && mediaVideoLayer) {
                mediaLayerStatus = 'active';
                mediaLayerReason = 'ok';
                mediaLayerMode = layerMode;
                updateProjectionLayerStatus();
                updateHarnessState();
                return;
            }

            try {
                clearCompositionVideoLayer(session);
                mediaBinding = new window.XRMediaBinding(session);
                if (typeof mediaBinding[layerFactory] !== 'function') {
                    throw new Error(layerFactory + ' not supported');
                }
                mediaVideoLayer = mediaBinding[layerFactory](jellyfinVideo, layerOptions);
                const baseLayer = session.renderState && session.renderState.baseLayer ? session.renderState.baseLayer : null;
                session.updateRenderState({ layers: [mediaVideoLayer].concat(baseLayer ? [baseLayer] : []) });
                mediaLayerStatus = 'active';
                mediaLayerReason = 'ok';
                mediaLayerMode = layerMode;
                mediaLayerKey = layerKey;
            } catch (error) {
                clearCompositionVideoLayer(session);
                mediaLayerStatus = 'fallback';
                mediaLayerReason = error && error.message ? error.message : 'layer-create-failed';
            }
            updateProjectionLayerStatus();
            updateHarnessState();
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
                const curveParams = getScreenCurveParams();
                if (curveParams.curved) {
                    surfaceRoot.position.set(
                        cameraPos.x - (Math.sin(yaw) * distance),
                        Math.max(0.5, cameraPos.y),
                        cameraPos.z - (Math.cos(yaw) * distance)
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
            updateHarnessState();
        }

        async function initThree() {
            injectImportMap();
            const THREE = await import('three');
            const { VRButton } = await import('three/addons/webxr/VRButton.js');
            const { ARButton } = await import('three/addons/webxr/ARButton.js');
            const { XRControllerModelFactory } = await import('three/addons/webxr/XRControllerModelFactory.js');
            const { XRHandModelFactory } = await import('three/addons/webxr/XRHandModelFactory.js');
            const { Text } = await import('troika-three-text');
            window.THREE = THREE;

            if (!active) return;

            const container = overlay.querySelector('#jfvr-canvas-container');
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(Math.max(1, Math.min(2.5, window.devicePixelRatio * 1.25)));
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.NoToneMapping;
            renderer.xr.enabled = true;
            renderer.xr.setReferenceSpaceType('local');
            if (renderer.xr && typeof renderer.xr.setFramebufferScaleFactor === 'function') {
                renderer.xr.setFramebufferScaleFactor(XR_FRAMEBUFFER_SCALE);
            }
            if (renderer.xr && typeof renderer.xr.setFoveation === 'function') {
                renderer.xr.setFoveation(XR_FOVEATION);
            }
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
                const blendMode = renderer.xr && typeof renderer.xr.getEnvironmentBlendMode === 'function'
                    ? renderer.xr.getEnvironmentBlendMode()
                    : 'opaque';
                state.isAR = blendMode === 'alpha-blend' || blendMode === 'additive';
                xrSessionMode = state.isAR ? 'immersive-ar' : 'immersive-vr';
                if (typeof updatePassthroughVisuals === 'function') updatePassthroughVisuals();
                if (ptSliderUpdateFill) ptSliderUpdateFill(state.passthroughBrightness);
                camera.layers.enable(0);
                camera.layers.enable(1);
                camera.layers.enable(2);
                recenterActiveMode(THREE);
                applyUiAnchorFromViewer(THREE, 'center');
                syncCompositionVideoLayer(THREE);
                updateStereoVisibility();
                updateImmersiveDebugScreen();
            });
            renderer.xr.addEventListener('sessionend', () => {
                state.isImmersive = false;
                state.isAR = false;
                xrSessionMode = 'none';
                scene.background = new THREE.Color(0x000000);
                clearCompositionVideoLayer();
                applyUiAnchorFromViewer(THREE, 'center');
                updateStereoVisibility();
                updateImmersiveDebugScreen();
            });

            function updateStereoVisibility() {
                const mode = state.mode;
                let useStereo = false;
                if (mode.stereo !== 'mono' && state.isImmersive) {
                    if (state.stereoLock === 'force-2d') {
                        useStereo = false;
                    } else if (state.stereoLock === 'force-3d') {
                        useStereo = true;
                    } else {
                        useStereo = !state.uiVisible;
                    }
                }
                const hideMeshVideo = mediaLayerStatus === 'active' && state.mode.projection === 'screen';
                if (meshes.preview) meshes.preview.visible = !hideMeshVideo && !useStereo;
                if (meshes.left) meshes.left.visible = !hideMeshVideo && useStereo;
                if (meshes.right) meshes.right.visible = !hideMeshVideo && useStereo;
                if (stereoToggleLabel) stereoToggleLabel.setState(mode, state.stereoLock);
                if (state.isImmersive) syncCompositionVideoLayer(THREE);
                updateImmersiveDebugScreen();
                updateHarnessState();
            }

            function positionUIAtController(controller) {
                if (!controller || !uiGroup) return;
                getControllerRay(controller);
                const hitSurface = getVisibleIntersections(getSurfaceMeshes()).length > 0;
                applyUiAnchorFromViewer(THREE, hitSurface ? 'video' : 'controller', controller);
            }

            function openUI(controller, source) {
                state.uiVisible = true;
                state.lastInteraction = Date.now();
                state.lastUiOpenSource = source || 'open';
                state.showingSettings = false;
                state.showingLayout = false;
                if (settingsGroup) settingsGroup.visible = false;
                if (layoutGroup) layoutGroup.visible = false;
                if (infoGroup) infoGroup.visible = false;
                if (uiGroup) {
                    uiGroup.visible = true;
                    if (controller && controller.matrixWorld) {
                        positionUIAtController(controller);
                    } else {
                        applyUiAnchorFromViewer(THREE, 'center');
                    }
                }
                updateStereoVisibility();
                updateHarnessState();
            }

            function closeUI(source) {
                state.uiVisible = false;
                state.lastUiCloseSource = source || 'close';
                state.showingSettings = false;
                state.showingLayout = false;
                if (settingsGroup) settingsGroup.visible = false;
                if (layoutGroup) layoutGroup.visible = false;
                if (infoGroup) infoGroup.visible = false;
                if (uiGroup) {
                    uiGroup.visible = false;
                }
                updateStereoVisibility();
                updateHarnessState();
            }

            function wake(controller) {
                state.lastInteraction = Date.now();
                if (!state.uiVisible) {
                    openUI(controller, 'wake');
                }
            }

            function toggleUI(controller, source) {
                if (state.uiVisible) {
                    closeUI(source || 'toggle');
                } else {
                    openUI(controller, source || 'toggle');
                }
            }

            videoTexture = new THREE.VideoTexture(jellyfinVideo);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.colorSpace = THREE.SRGBColorSpace;
            videoTexture.generateMipmaps = false;
            videoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

            materials.preview = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });
            materials.left = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });
            materials.right = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });
            materials.hitProxy = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false, side: THREE.DoubleSide });

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
            meshes.hitProxy = new THREE.Mesh(new THREE.BufferGeometry(), materials.hitProxy);

            meshes.preview.layers.set(0);
            meshes.left.layers.set(1);
            meshes.right.layers.set(2);
            meshes.hitProxy.layers.set(0);

            surfaceRoot.add(meshes.preview);
            surfaceRoot.add(meshes.left);
            surfaceRoot.add(meshes.right);
            surfaceRoot.add(meshes.hitProxy);

            function updatePassthroughVisuals() {
                if (state.passthroughEnabled) {
                    scene.background = null;
                    if (typeof dimSphereMat !== 'undefined') dimSphereMat.opacity = 1.0 - state.passthroughBrightness;
                } else {
                    scene.background = new THREE.Color(0x000000);
                    if (typeof dimSphereMat !== 'undefined') dimSphereMat.opacity = 1.0;
                }
            }

            function applyModeFromState(options) {
                const opts = options || {};
                let mode = state.mode;
                let geometry;
                const previousPosition = surfaceRoot.position.clone();
                const previousRotation = surfaceRoot.rotation.clone();
                const previousScale = surfaceRoot.scale.clone();

                if (mode.projection === 'screen') {
                    const curveParams = getScreenCurveParams();
                    geometry = createCurvedScreenGeometry(THREE, 18, 10.125, curveParams);
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
                meshes.hitProxy.geometry.dispose();
                meshes.hitProxy.geometry = geometry.clone();

                const side = mode.projection === 'screen' ? THREE.FrontSide : THREE.BackSide;
                materials.preview.side = side; materials.left.side = side; materials.right.side = side;
                materials.hitProxy.side = THREE.DoubleSide;

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
                if (opts.preserveSurfaceTransform) {
                    surfaceRoot.position.copy(previousPosition);
                    surfaceRoot.rotation.copy(previousRotation);
                    surfaceRoot.scale.copy(previousScale);
                } else {
                    recenterActiveMode(THREE);
                }
                if (state.isImmersive) syncCompositionVideoLayer(THREE);
                updateStereoVisibility();
            }

            function switchMode(newModeId) {
                if (MODES_BY_ID[newModeId]) {
                    state.mode = MODES_BY_ID[newModeId];
                    state.lastModeChangeSource = 'layout-panel';
                    state.showingLayout = false;
                    if (layoutGroup) layoutGroup.visible = false;
                    jellyfinVideo.dataset.currentMode = newModeId;
                    applyModeFromState();
                    updateHarnessState();
                }
            }

            function cycleStereoLock() {
                if (!state.mode || state.mode.stereo === 'mono') {
                    state.stereoLock = 'force-2d';
                } else if (state.stereoLock === 'auto') {
                    state.stereoLock = 'force-2d';
                } else if (state.stereoLock === 'force-2d') {
                    state.stereoLock = 'force-3d';
                } else {
                    state.stereoLock = 'auto';
                }
                updateStereoVisibility();
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
            uiGroup.position.set(0, 0, -state.uiDistance);
            uiGroup.scale.setScalar(BASE_UI_SCALE * state.uiScale);
            scene.add(uiGroup);

            function syncFloatingPanels() {
                if (settingsGroup) settingsGroup.visible = state.showingSettings;
                if (layoutGroup) layoutGroup.visible = state.showingLayout;
            }

            function refreshUiDistance() {
                if (!uiGroup) return;
                uiGroup.scale.setScalar(BASE_UI_SCALE * state.uiScale);
                applyStoredUiAnchor();
                syncFloatingPanels();
                updateHarnessState();
            }

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
                t.sdfGlyphSize = 256;
                t.color = color;
                t.position.set(x, y, 0.01);
                t.anchorX = align || 'center';
                t.anchorY = 'middle';
                t.depthOffset = -1;
                t.renderOrder = 20;
                t.frustumCulled = false;
                t.outlineWidth = size * 0.035;
                t.outlineColor = 0x030712;
                parent.add(t);
                textObjects.push(t);
                t.sync(() => {
                    if (t.material) {
                        t.material.depthTest = false;
                        t.material.depthWrite = false;
                        t.material.transparent = true;
                    }
                });
                return t;
            }

            function createInfoLine(parent, x, y, text, color) {
                const line = createTextObj(text, parent, x, y, 0.024, color, 'left');
                line.maxWidth = 0.96;
                line.overflowWrap = 'break-word';
                line.textAlign = 'left';
                line.sync();
                return line;
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

            function makePanelBlocker(mesh, id, color) {
                mesh.userData = {
                    id,
                    bg: color,
                    hover: color,
                    onClick: () => {},
                    onDrag: () => {}
                };
                interactables.push(mesh);
            }

            function createCurveStartIcon(parent, x, y) {
                const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
                const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.024), mat);
                frame.position.set(x, y, 0.01);
                parent.add(frame);
                const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.016), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
                inner.position.set(x, y, 0.011);
                parent.add(inner);
            }

            function createCurveEndIcon(parent, x, y) {
                const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
                const arc = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 20, 1, Math.PI * 0.15, Math.PI * 0.7), mat);
                arc.position.set(x, y, 0.01);
                arc.rotation.z = Math.PI;
                parent.add(arc);
                const base = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.004), mat);
                base.position.set(x, y - 0.016, 0.01);
                parent.add(base);
            }

            function createNearIcon(parent, x, y) {
                const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
                const box = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.018), mat);
                box.position.set(x, y, 0.01);
                parent.add(box);
            }

            function createFarIcon(parent, x, y) {
                const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
                const outer = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.032), mat);
                outer.position.set(x, y, 0.01);
                parent.add(outer);
                const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
                inner.position.set(x, y, 0.011);
                parent.add(inner);
            }

            function createMoonIcon(parent, x, y, scale, color) {
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const moon = new THREE.Mesh(new THREE.CircleGeometry(0.015 * scale, 24), mat);
                moon.position.set(x, y, 0.01);
                parent.add(moon);
                const cut = new THREE.Mesh(new THREE.CircleGeometry(0.012 * scale, 24), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
                cut.position.set(x + 0.006 * scale, y + 0.002 * scale, 0.011);
                parent.add(cut);
            }

            updateInfoPanelStatus = function () {
                if (!infoStatusLines.length || !renderer) return;
                const lines = [
                    `Session: ${xrSessionMode}`,
                    `Projection Layer: ${projectionLayerStatus}`,
                    `Projection Reason: ${projectionLayerReason}`,
                    `Video Layer: ${mediaLayerMode} / ${mediaLayerStatus}`,
                    `Video Reason: ${mediaLayerReason}`,
                    `Text: ${textRendererStatus} sdf256`,
                    `Pixel Ratio / Fov: ${renderer.getPixelRatio().toFixed(2)} / ${XR_FOVEATION.toFixed(2)}`,
                    `XR Scale: ${XR_FRAMEBUFFER_SCALE.toFixed(2)}`,
                    `Video Res: ${jellyfinVideo.videoWidth || 0}x${jellyfinVideo.videoHeight || 0}`
                ];
                for (let i = 0; i < infoStatusLines.length; i++) {
                    infoStatusLines[i].text = lines[i] || '';
                    infoStatusLines[i].sync();
                }
            };

            function createSlider(id, parent, x, y, w, h, initVal, onChange, options) {
                const config = options || {};
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

                let pendingRatio = initVal;

                const dragHandler = (pt) => {
                    const local = bg.worldToLocal(pt.clone());
                    const raw = (local.x + (w / 2)) / w;
                    const ratio = Math.max(0, Math.min(1, raw));
                    pendingRatio = ratio;
                    updateFill(ratio);
                    if (config.deferCommit !== true && onChange) onChange(ratio);
                };

                bg.userData = {
                    id,
                    hover: 0x1e293b,
                    bg: 0x0f172a,
                    onClick: dragHandler,
                    onDrag: dragHandler,
                    onDragEnd: config.deferCommit === true
                        ? () => {
                            if (onChange) onChange(pendingRatio);
                        }
                        : null
                };
                interactables.push(bg);

                return { group, updateFill, track: bg };
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

            function createCenterIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const ring = new THREE.Mesh(new THREE.RingGeometry(0.014 * s, 0.028 * s, 32), ringMat);
                group.add(ring);
                const dot = new THREE.Mesh(new THREE.CircleGeometry(0.006 * s, 20), ringMat);
                dot.position.z = 0.001;
                group.add(dot);
                parent.add(group);
                return group;
            }

            function createLayoutIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const positions = [
                    [-0.016, 0.012], [0.016, 0.012],
                    [-0.016, -0.012], [0.016, -0.012]
                ];
                for (let i = 0; i < positions.length; i++) {
                    const tile = new THREE.Mesh(new THREE.PlaneGeometry(0.018 * s, 0.014 * s), mat);
                    tile.position.set(positions[i][0] * s, positions[i][1] * s, 0.001);
                    group.add(tile);
                }
                parent.add(group);
                return group;
            }

            function createStereoToggleLabel(parent, x, y) {
                const text = createTextObj('Auto', parent, x, y, 0.028, 0xe2e8f0, 'center');
                return {
                    text,
                    setState(mode, stereoLock) {
                        const stereoCapable = mode && mode.stereo !== 'mono';
                        if (!stereoCapable) {
                            text.text = '2D';
                            text.color = 0x64748b;
                        } else if (stereoLock === 'force-2d') {
                            text.text = '2D';
                            text.color = 0x7dd3fc;
                        } else if (stereoLock === 'force-3d') {
                            text.text = '3D';
                            text.color = 0x7dd3fc;
                        } else {
                            text.text = 'Auto';
                            text.color = 0xe2e8f0;
                        }
                        text.sync();
                    }
                };
            }

            function createModeGlyph(parent, mode) {
                const glyph = new THREE.Group();
                const frameMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide });
                const fillMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });

                const makeFrame = (x, y, w, h) => {
                    const outer = new THREE.Mesh(new THREE.PlaneGeometry(w, h), frameMat);
                    outer.position.set(x, y, 0.001);
                    glyph.add(outer);
                    const inner = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, h - 0.01), fillMat);
                    inner.position.set(x, y, 0.002);
                    glyph.add(inner);
                };

                if (mode.stereo === 'mono') {
                    makeFrame(0, 0, 0.12, 0.07);
                } else if (mode.stereo === 'sbs') {
                    makeFrame(-0.035, 0, 0.055, 0.07);
                    makeFrame(0.035, 0, 0.055, 0.07);
                } else {
                    makeFrame(0, 0.02, 0.12, 0.03);
                    makeFrame(0, -0.02, 0.12, 0.03);
                }

                const label = createTextObj(mode.projection === 'screen' ? 'SCR' : mode.projection, glyph, 0, -0.065, 0.019, 0x94a3b8, 'center');
                label.position.z = 0.003;
                parent.add(glyph);
                return glyph;
            }

            function createCardButton(mode, parent, x, y, width, height, onClick) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                parent.add(group);

                const bg = new THREE.Mesh(
                    createRoundedRectGeometry(width, height, 0.045),
                    new THREE.MeshBasicMaterial({ color: 0x152234, transparent: true, opacity: 0.96 })
                );
                bg.userData = { id: mode.id, bg: 0x152234, hover: 0x1f3550, onClick };
                interactables.push(bg);
                layoutCardMeshes.push(bg);
                group.add(bg);

                createModeGlyph(group, mode).position.set((-width / 2) + 0.09, 0.005, 0.003);
                createTextObj(mode.label, group, (-width / 2) + 0.18, 0.022, 0.03, 0xe2e8f0, 'left');
                createTextObj(getModeShapeLabel(mode), group, (-width / 2) + 0.18, -0.024, 0.021, 0x94a3b8, 'left');
                return group;
            }

            // --- Helper: vertical slider with top/bottom icons ---
            function createVerticalSlider(id, parent, x, y, w, h, initVal, onChange, bottomIcon, topIcon) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.02);
                group.visible = false;
                parent.add(group);

                const panelH = h + 0.18;
                const panelGeo = createRoundedRectGeometry(w + 0.06, panelH, 0.04);
                const panelBg = new THREE.Mesh(panelGeo, frostedMat.clone());
                panelBg.position.set(0, 0, -0.005);
                group.add(panelBg);
                makePanelBlocker(panelBg, id + '-panel', 0x0f172a);

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

                if (bottomIcon) bottomIcon(group, 0, -h / 2 - 0.04, 0.6, 0x64748b);
                if (topIcon) topIcon(group, 0, h / 2 + 0.04, 0.6, 0xe2e8f0);

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
            makePanelBlocker(bgMesh, 'dock-bg', 0x0f172a);

            // === Row 1 (top): Video Title with marquee ===
            const titleY = 0.16;
            const titleClipGroup = new THREE.Group();
            titleClipGroup.position.set(0, titleY, 0.01);
            uiGroup.add(titleClipGroup);

            const videoTitle = getVideoTitle();
            titleTextObj = new Text();
            titleTextObj.text = videoTitle || 'Loading...';
            titleTextObj.fontSize = 0.038;
            titleTextObj.sdfGlyphSize = 256;
            titleTextObj.color = 0xf0f6ff;
            titleTextObj.anchorX = 'center';
            titleTextObj.anchorY = 'middle';
            titleTextObj.outlineWidth = 0.0014;
            titleTextObj.outlineColor = 0x030712;
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

            const centerBtn3d = createRoundBtn('btn-center', uiGroup, -0.76, btnY, btnR, null, () => recenterActiveMode(THREE));
            createCenterIcon(centerBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);

            const stereoBtn3d = createRoundBtn('btn-stereo-lock', uiGroup, -0.60, btnY, btnR, null, () => cycleStereoLock());
            stereoToggleLabel = createStereoToggleLabel(stereoBtn3d.mesh, 0, 0);

            const layoutBtn3d = createRoundBtn('btn-layout', uiGroup, 0.76, btnY, btnR, null, () => {
                window.__JFVR_RUNTIME_ACTIONS__.toggleLayout();
            });
            createLayoutIcon(layoutBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

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
                state.showingSettings = false;
                state.showingLayout = false;
                if (settingsGroup) settingsGroup.visible = false;
                if (layoutGroup) layoutGroup.visible = false;
                if (infoGroup) infoGroup.visible = false;
            });
            createSpeakerIcon(volBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

            // Passthrough lighting button
            const ptBtnX = volBtnX + 0.14;
            const ptBtn3d = createRoundBtn('btn-pt', uiGroup, ptBtnX, btnY, btnR, null, () => {
                ptSliderVisible = !ptSliderVisible;
                ptSliderGroup.visible = ptSliderVisible;
                if (ptSliderVisible) { volSliderVisible = false; volSliderGroup.visible = false; }
                state.showingSettings = false;
                state.showingLayout = false;
                if (settingsGroup) settingsGroup.visible = false;
                if (layoutGroup) layoutGroup.visible = false;
                if (infoGroup) infoGroup.visible = false;
                if (!state.passthroughEnabled) {
                    state.passthroughEnabled = true;
                    updatePassthroughVisuals();
                }
            });
            createSunIcon(ptBtn3d.mesh, 0, 0, 1.0, 0xfbbf24);

            // Settings button (right end)
            const settingsBtn3d = createRoundBtn('btn-settings', uiGroup, 0.92, btnY, btnR, null, () => {
                window.__JFVR_RUNTIME_ACTIONS__.toggleSettings();
            });
            createGearIcon(settingsBtn3d.mesh, 0, 0, 1.0, 0x94a3b8);

            // === Vertical Sliders (above buttons) ===
            const vSliderW = 0.05;
            const vSliderH = 0.35;

            // Volume vertical slider
            const volSld = createVerticalSlider('vs-vol', uiGroup, volBtnX, btnY + 0.36, vSliderW, vSliderH,
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
            // Passthrough lighting vertical slider
            const ptSld = createVerticalSlider('vs-pt', uiGroup, ptBtnX, btnY + 0.36, vSliderW, vSliderH,
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

            const SETTINGS_LAYOUT = {
                width: 1.94,
                height: 0.56,
                paddingX: 0.10,
                headerY: 0.20,
                rowY: [0.08, -0.03, -0.14],
                leftLabelX: -0.84,
                leftIconX: -0.54,
                leftSliderX: -0.25,
                leftSliderW: 0.46,
                leftEndIconX: 0.04,
                rightLabelX: 0.08,
                rightIconX: 0.30,
                rightSliderX: 0.55,
                rightSliderW: 0.28,
                rightEndIconX: 0.80
            };

            const setGeo = createRoundedRectGeometry(SETTINGS_LAYOUT.width, SETTINGS_LAYOUT.height, 0.08);
            const setBg = new THREE.Mesh(setGeo, frostedMat);
            settingsBackgroundMesh = setBg;
            settingsGroup.add(setBg);
            makePanelBlocker(setBg, 'settings-bg', 0x0f172a);

            createTextObj('Settings', settingsGroup, -SETTINGS_LAYOUT.width / 2 + SETTINGS_LAYOUT.paddingX, SETTINGS_LAYOUT.headerY, 0.03, 0x7dd3fc, 'left');

            const infoBtn = createRoundBtn('settings-info', settingsGroup, SETTINGS_LAYOUT.width / 2 - SETTINGS_LAYOUT.paddingX + 0.005, SETTINGS_LAYOUT.headerY, 0.024, 'i', () => {
                if (infoGroup) infoGroup.visible = !infoGroup.visible;
                updateInfoPanelStatus();
            });
            infoButtonMesh = infoBtn.mesh;
            if (infoBtn.textObj) infoBtn.textObj.fontSize = 0.03;

            infoGroup = new THREE.Group();
            infoGroup.position.set(0.0, SETTINGS_LAYOUT.height / 2 + 0.34, 0.02);
            infoGroup.visible = false;
            settingsGroup.add(infoGroup);

            const infoBg = new THREE.Mesh(createRoundedRectGeometry(1.30, 0.54, 0.05), frostedMat.clone());
            infoBackgroundMesh = infoBg;
            infoGroup.add(infoBg);
            makePanelBlocker(infoBg, 'settings-info-bg', 0x0f172a);
            createTextObj('Info', infoGroup, -0.58, 0.22, 0.03, 0x7dd3fc, 'left');
            const infoLineY = [0.16, 0.10, 0.04, -0.02, -0.08, -0.14, -0.20, -0.26];
            infoStatusLines = infoLineY.map((y) => createInfoLine(infoGroup, -0.58, y, '', 0xe2e8f0));

            const sY1 = SETTINGS_LAYOUT.rowY[0];
            const sY2 = SETTINGS_LAYOUT.rowY[1];
            const sY3 = SETTINGS_LAYOUT.rowY[2];
            createTextObj('Curve', settingsGroup, SETTINGS_LAYOUT.leftLabelX, sY1, 0.03, 0x94a3b8, 'left');
            createCurveStartIcon(settingsGroup, SETTINGS_LAYOUT.leftIconX, sY1);
            createSlider('s-curve', settingsGroup, SETTINGS_LAYOUT.leftSliderX, sY1, SETTINGS_LAYOUT.leftSliderW, 0.03, state.screenCurvature, (v) => { state.screenCurvature = v; applyModeFromState({ preserveSurfaceTransform: true }); });
            createCurveEndIcon(settingsGroup, SETTINGS_LAYOUT.leftEndIconX, sY1);

            createTextObj('Dist.', settingsGroup, SETTINGS_LAYOUT.leftLabelX, sY2, 0.03, 0x94a3b8, 'left');
            const initDistRatio = (state.screenDistance - (-20)) / (-4 - (-20));
            createNearIcon(settingsGroup, SETTINGS_LAYOUT.leftIconX, sY2);
            createSlider('s-dist', settingsGroup, SETTINGS_LAYOUT.leftSliderX, sY2, SETTINGS_LAYOUT.leftSliderW, 0.03, initDistRatio, (v) => { state.screenDistance = -20 + (v * 16); applyModeFromState(); });
            createFarIcon(settingsGroup, SETTINGS_LAYOUT.leftEndIconX, sY2);

            createTextObj('Size', settingsGroup, SETTINGS_LAYOUT.leftLabelX, sY3, 0.03, 0x94a3b8, 'left');
            const initSizeRatio = (state.screenSize - 0.5) / (3.0 - 0.5);
            createNearIcon(settingsGroup, SETTINGS_LAYOUT.leftIconX, sY3);
            createSlider('s-size', settingsGroup, SETTINGS_LAYOUT.leftSliderX, sY3, SETTINGS_LAYOUT.leftSliderW, 0.03, initSizeRatio, (v) => { state.screenSize = 0.5 + (v * 2.5); applyModeFromState(); });
            createFarIcon(settingsGroup, SETTINGS_LAYOUT.leftEndIconX, sY3);

            createTextObj('UI Dist', settingsGroup, SETTINGS_LAYOUT.rightLabelX, sY1, 0.03, 0x94a3b8, 'left');
            const initUIDist = 0.5;
            createNearIcon(settingsGroup, SETTINGS_LAYOUT.rightIconX, sY1);
            const uiDistSlider = createSlider('s-uidist', settingsGroup, SETTINGS_LAYOUT.rightSliderX, sY1, SETTINGS_LAYOUT.rightSliderW, 0.03, initUIDist, (v) => {
                state.uiDistance = UI_DISTANCE_MIN + (v * (UI_DISTANCE_MAX - UI_DISTANCE_MIN));
                localStorage.setItem('jfvr:ui-distance', state.uiDistance.toString());
                refreshUiDistance();
            }, { deferCommit: true });
            settingsUiDistTrack = uiDistSlider.track;
            createFarIcon(settingsGroup, SETTINGS_LAYOUT.rightEndIconX, sY1);

            createTextObj('Dimmer', settingsGroup, SETTINGS_LAYOUT.rightLabelX, sY2, 0.03, 0x94a3b8, 'left');
            createMoonIcon(settingsGroup, SETTINGS_LAYOUT.rightIconX, sY2, 1.0, 0x64748b);
            const dimmerSlider = createSlider('s-dimmer', settingsGroup, SETTINGS_LAYOUT.rightSliderX, sY2, SETTINGS_LAYOUT.rightSliderW, 0.03, state.passthroughBrightness, (v) => { state.passthroughBrightness = v; updatePassthroughVisuals(); });
            settingsDimmerTrack = dimmerSlider.track;
            createSunIcon(settingsGroup, SETTINGS_LAYOUT.rightEndIconX, sY2, 0.5, 0xe2e8f0);

            layoutGroup = new THREE.Group();
            layoutGroup.position.set(0, 0.86, 0);
            layoutGroup.visible = false;
            uiGroup.add(layoutGroup);

            const layoutBg = new THREE.Mesh(createRoundedRectGeometry(2.28, 1.12, 0.08), frostedMat.clone());
            layoutBackgroundMesh = layoutBg;
            layoutGroup.add(layoutBg);
            makePanelBlocker(layoutBg, 'layout-bg', 0x0f172a);
            createTextObj('Layout', layoutGroup, -1.02, 0.45, 0.045, 0xe2e8f0, 'left');
            createTextObj('Pick the exact layout that matches the file.', layoutGroup, -1.02, 0.38, 0.026, 0x94a3b8, 'left');

            MODE_GROUPS.forEach((groupDef, columnIndex) => {
                const columnX = -0.74 + (columnIndex * 0.74);
                const modes = VIEW_MODES.filter((mode) => mode.projection === groupDef.projection);
                createTextObj(groupDef.projection === 'screen' ? 'Screen' : groupDef.projection, layoutGroup, columnX - 0.22, 0.27, 0.032, 0x7dd3fc, 'left');
                modes.forEach((mode, rowIndex) => {
                    createCardButton(mode, layoutGroup, columnX, 0.16 - (rowIndex * 0.15), 0.66, 0.13, () => switchMode(mode.id));
                });
            });

            if (window.__JFVR_RUNTIME_ACTIONS__) {
                window.__JFVR_RUNTIME_ACTIONS__.setUiDistance = (value) => {
                    state.uiDistance = Math.min(UI_DISTANCE_MAX, Math.max(UI_DISTANCE_MIN, value));
                    localStorage.setItem('jfvr:ui-distance', state.uiDistance.toString());
                    refreshUiDistance();
                };
                window.__JFVR_RUNTIME_ACTIONS__.setCurve = (value) => {
                    state.screenCurvature = value;
                    applyModeFromState({ preserveSurfaceTransform: true });
                };
                window.__JFVR_RUNTIME_ACTIONS__.toggleUi = () => {
                    toggleUI(null, 'harness');
                };
                window.__JFVR_RUNTIME_ACTIONS__.cycleStereoLock = () => {
                    cycleStereoLock();
                };
                window.__JFVR_RUNTIME_ACTIONS__.setStereoLock = (value) => {
                    state.stereoLock = value;
                    updateStereoVisibility();
                };
                window.__JFVR_RUNTIME_ACTIONS__.toggleInfoPanel = () => {
                    if (infoGroup) {
                        infoGroup.visible = !infoGroup.visible;
                        updateInfoPanelStatus();
                    }
                };
                window.__JFVR_RUNTIME_ACTIONS__.openUiAtController = (hand, anchorType) => {
                    const index = hand === 'left' ? 0 : 1;
                    const controller = renderer.xr.getController(index);
                    if (window.__IWER_DEVICE__ && window.__IWER_DEVICE__.controllers && window.__IWER_DEVICE__.controllers[hand]) {
                        controller.position.copy(window.__IWER_DEVICE__.controllers[hand].position);
                        controller.quaternion.copy(window.__IWER_DEVICE__.controllers[hand].quaternion);
                        controller.updateMatrixWorld(true);
                    }
                    state.uiVisible = true;
                    state.showingSettings = false;
                    state.showingLayout = false;
                    if (settingsGroup) settingsGroup.visible = false;
                    if (layoutGroup) layoutGroup.visible = false;
                    if (uiGroup) uiGroup.visible = true;
                    applyUiAnchorFromViewer(THREE, anchorType === 'video' ? 'video' : 'controller', controller);
                    updateStereoVisibility();
                };
            }

            applyUiAnchorFromViewer(THREE, 'center');

            // Raycaster & Interaction
            const raycaster = new THREE.Raycaster();
            const tempMatrix = new THREE.Matrix4();
            let hoveredObj = null;

            function getSurfaceMeshes() {
                return [meshes.hitProxy || meshes.preview].filter(Boolean);
            }

            function getControllerRay(controller) {
                tempMatrix.identity().extractRotation(controller.matrixWorld);
                raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            }

            function isActuallyVisible(object) {
                let current = object;
                while (current) {
                    if (current.visible === false) return false;
                    current = current.parent;
                }
                return true;
            }

            function getVisibleIntersections(objects) {
                return raycaster.intersectObjects(objects, false).filter((hit) => isActuallyVisible(hit.object));
            }

            function getControllerWorldData(controller) {
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                controller.getWorldPosition(position);
                controller.getWorldQuaternion(quaternion);
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
                return { position, quaternion, forward };
            }

            function getHeadPosition() {
                const head = renderer && renderer.xr && renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
                const position = new THREE.Vector3();
                head.getWorldPosition(position);
                return position;
            }

            function tryStartVideoGrab(controller) {
                if (!renderer.xr.isPresenting) return false;

                getControllerRay(controller);
                const intersections = raycaster.intersectObjects(getSurfaceMeshes(), false);
                if (!intersections.length) return false;

                const worldData = getControllerWorldData(controller);
                if (state.mode.projection === 'screen') {
                    controller.userData.videoGrab = {
                        type: 'screen',
                        controllerStart: worldData.position.clone(),
                        surfaceStart: surfaceRoot.position.clone(),
                        rotationStart: surfaceRoot.rotation.clone()
                    };
                } else {
                    const headPosition = getHeadPosition();
                    const startVector = worldData.position.clone().sub(headPosition);
                    controller.userData.videoGrab = {
                        type: 'immersive',
                        startDirection: startVector.clone().normalize(),
                        startDistance: Math.max(startVector.length(), 0.1),
                        startScale: surfaceRoot.scale.clone(),
                        startQuaternion: surfaceRoot.quaternion.clone()
                    };
                }

                if (!videoGrabControllers.includes(controller)) {
                    videoGrabControllers.push(controller);
                }
                state.lastInteraction = Date.now();
                return true;
            }

            function updateVideoGrab(controller) {
                const grab = controller.userData.videoGrab;
                if (!grab) return;

                const worldData = getControllerWorldData(controller);
                if (grab.type === 'screen') {
                    const delta = worldData.position.clone().sub(grab.controllerStart).multiplyScalar(23.4);
                    surfaceRoot.position.copy(grab.surfaceStart).add(delta);
                    surfaceRoot.rotation.copy(grab.rotationStart);
                } else {
                    const headPosition = getHeadPosition();
                    const currentVector = worldData.position.clone().sub(headPosition);
                    if (currentVector.lengthSq() > 0.0001) {
                        const dragRotation = new THREE.Quaternion().setFromUnitVectors(grab.startDirection, currentVector.clone().normalize());
                        surfaceRoot.quaternion.copy(dragRotation.multiply(grab.startQuaternion.clone()));
                    }
                    const distanceDelta = (currentVector.length() - grab.startDistance) * 24.7;
                    const scaleFactor = THREE.MathUtils.clamp((grab.startDistance + distanceDelta) / grab.startDistance, 0.45, 3.25);
                    surfaceRoot.scale.copy(grab.startScale).multiplyScalar(scaleFactor);
                }
                state.lastInteraction = Date.now();
                updateHarnessState();
            }

            function stopVideoGrab(controller) {
                if (!controller.userData.videoGrab) return;
                delete controller.userData.videoGrab;
                videoGrabControllers = videoGrabControllers.filter((item) => item !== controller);
            }

        function clearPendingSurfaceSelect(controller) {
            if (controller && controller.userData && controller.userData.pendingSurfaceSelectTimer) {
                window.clearTimeout(controller.userData.pendingSurfaceSelectTimer);
                controller.userData.pendingSurfaceSelectTimer = null;
            }
            if (controller && controller.userData) {
                controller.userData.pendingSurfaceSelectAction = null;
            }
        }

        function onSelectStart(event) {
            const controller = event.target;
            getControllerRay(controller);
            const surfaceIntersections = getVisibleIntersections(getSurfaceMeshes());
            if (!state.uiVisible) {
                if (surfaceIntersections.length > 0) {
                    clearPendingSurfaceSelect(controller);
                    controller.userData.pendingSurfaceSelectAction = 'open-ui';
                    controller.userData.pendingSurfaceSelectTimer = window.setTimeout(() => {
                        controller.userData.pendingSurfaceSelectTimer = null;
                        controller.userData.pendingSurfaceSelectAction = null;
                        if (!state.uiVisible) {
                            tryStartVideoGrab(controller);
                            updateHarnessState();
                        }
                    }, SURFACE_TRIGGER_GRAB_DELAY_MS);
                } else {
                    openUI(controller, 'trigger');
                    return;
                }
                controller.userData.lineActive = true;
                if (controller.userData.lineRef) {
                    controller.userData.lineRef.material.color.setHex(0x38bdf8);
                    controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
                }
                return;
            }
            const intersects = getVisibleIntersections(interactables);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (obj.userData.onClick) obj.userData.onClick(intersects[0].point);
                if (obj.userData.onDrag) {
                        controller.userData.dragTarget = obj;
                        controller.userData.dragPlaneNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(uiGroup.quaternion);
                        controller.userData.dragPlanePoint = obj.getWorldPosition(new THREE.Vector3());
                }
            } else if (!state.showingLayout && !state.showingSettings && surfaceIntersections.length > 0) {
                clearPendingSurfaceSelect(controller);
                controller.userData.pendingSurfaceSelectAction = 'close-ui';
                controller.userData.pendingSurfaceSelectTimer = window.setTimeout(() => {
                    controller.userData.pendingSurfaceSelectTimer = null;
                    controller.userData.pendingSurfaceSelectAction = null;
                    if (state.uiVisible && !state.showingLayout && !state.showingSettings) {
                        tryStartVideoGrab(controller);
                        updateHarnessState();
                    }
                }, SURFACE_TRIGGER_GRAB_DELAY_MS);
                } else {
                    closeUI('trigger-empty');
                }
                controller.userData.lineActive = true;
                if (controller.userData.lineRef) {
                    controller.userData.lineRef.material.color.setHex(0x38bdf8);
                    controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
                }
            }

            function onSqueezeStart(event) {
                const controller = event.target;
                state.lastInteraction = Date.now();
                if (state.showingLayout || state.showingSettings) {
                    return;
                }
                tryStartVideoGrab(controller);
                controller.userData.lineActive = true;
                if (controller.userData.lineRef) {
                    controller.userData.lineRef.material.color.setHex(0x38bdf8);
                    controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
                }
                updateHarnessState();
            }

        function onSelectEnd(event) {
            const controller = event.target;
            const pendingSurfaceAction = controller.userData.pendingSurfaceSelectAction;
            const pendingSurfaceTap = Boolean(controller.userData.pendingSurfaceSelectTimer) && !controller.userData.videoGrab;
            clearPendingSurfaceSelect(controller);
            stopVideoGrab(controller);
                if (controller.userData.dragTarget) {
                    if (controller.userData.dragTarget.userData.onDragEnd) {
                        controller.userData.dragTarget.userData.onDragEnd();
                    }
                    controller.userData.dragTarget = null;
                    controller.userData.dragPlaneNormal = null;
                    controller.userData.dragPlanePoint = null;
                }
                controller.userData.lineActive = false;
                if (controller.userData.lineRef) {
                    controller.userData.lineRef.material.color.setHex(0xffffff);
                    controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
                }
                if (pendingSurfaceTap && pendingSurfaceAction === 'close-ui') {
                    closeUI('trigger-surface-close');
                } else if (pendingSurfaceTap && pendingSurfaceAction === 'open-ui') {
                    openUI(controller, 'trigger-surface-open');
                }
                updateHarnessState();
            }

            function onSqueezeEnd(event) {
                event.target.userData.lineActive = false;
                if (event.target.userData.lineRef) {
                    event.target.userData.lineRef.material.color.setHex(0xffffff);
                    event.target.userData.lineColor.copy(event.target.userData.lineRef.material.color);
                }
                stopVideoGrab(event.target);
                updateHarnessState();
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
                controller.addEventListener('squeezestart', onSqueezeStart);
                controller.addEventListener('squeezeend', onSqueezeEnd);
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
                controller.userData.lineRef = line;
                controller.userData.lineColor = new THREE.Color(0xffffff);
                controller.userData.lineTargetColor = new THREE.Color(0xffffff);
                controller.userData.lineActive = false;
                controller.add(line);
            }

            if (window.__JFVR_RUNTIME_ACTIONS__) {
                const syncDebugControllerPose = (hand, controller) => {
                    const device = window.__IWER_DEVICE__;
                    if (!device || !device.controllers || !device.controllers[hand] || !controller) return;
                    const source = device.controllers[hand];
                    controller.position.copy(source.position);
                    controller.quaternion.copy(source.quaternion);
                    controller.updateMatrixWorld(true);
                };
                window.__JFVR_RUNTIME_ACTIONS__.selectController = (hand) => {
                    const index = hand === 'left' ? 0 : 1;
                    const controller = renderer.xr.getController(index);
                    syncDebugControllerPose(hand, controller);
                    onSelectStart({ target: controller });
                    onSelectEnd({ target: controller });
                };
                window.__JFVR_RUNTIME_ACTIONS__.beginSelectController = (hand) => {
                    const index = hand === 'left' ? 0 : 1;
                    const controller = renderer.xr.getController(index);
                    syncDebugControllerPose(hand, controller);
                    onSelectStart({ target: controller });
                };
                window.__JFVR_RUNTIME_ACTIONS__.endSelectController = (hand) => {
                    const index = hand === 'left' ? 0 : 1;
                    const controller = renderer.xr.getController(index);
                    syncDebugControllerPose(hand, controller);
                    onSelectEnd({ target: controller });
                };
                window.__JFVR_RUNTIME_ACTIONS__.squeezeController = (hand, activeSqueeze) => {
                    const index = hand === 'left' ? 0 : 1;
                    const controller = renderer.xr.getController(index);
                    syncDebugControllerPose(hand, controller);
                    if (activeSqueeze) {
                        onSqueezeStart({ target: controller });
                    } else {
                        onSqueezeEnd({ target: controller });
                    }
                };
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
                    if (controller.userData.lineRef) {
                        controller.userData.lineTargetColor.setHex(controller.userData.lineActive ? 0x38bdf8 : 0xffffff);
                        controller.userData.lineColor.lerp(controller.userData.lineTargetColor, 0.18);
                        controller.userData.lineRef.material.color.copy(controller.userData.lineColor);
                    }
                    tempMatrix.identity().extractRotation(controller.matrixWorld);
                    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                    const intersects = getVisibleIntersections(interactables);
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

                for (let i = 0; i < videoGrabControllers.length; i++) {
                    updateVideoGrab(videoGrabControllers[i]);
                }

                for (let i = 0; i < 2; i++) {
                    const controller = renderer.xr.getController(i);
                    if (controller && controller.userData && controller.userData.dragTarget) {
                        const obj = controller.userData.dragTarget;
                        tempMatrix.identity().extractRotation(controller.matrixWorld);
                        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

                        const normal = controller.userData.dragPlaneNormal || new THREE.Vector3(0, 0, 1).applyQuaternion(uiGroup.quaternion);
                        const dragPlanePos = controller.userData.dragPlanePoint || obj.getWorldPosition(new THREE.Vector3());
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

                if (infoGroup && infoGroup.visible) {
                    updateInfoPanelStatus();
                }

                renderer.render(scene, camera);
            });
        }

        function close() {
            active = false;
            removeVersionModal();
            videoGrabControllers.forEach((controller) => {
                delete controller.userData.videoGrab;
            });
            videoGrabControllers = [];
            if (toolbarVersionBtn) toolbarVersionBtn.removeEventListener('click', openVersionModal);
            if (renderer) {
                clearCompositionVideoLayer();
                renderer.setAnimationLoop(null);
                if (renderer.xr.isPresenting) renderer.xr.getSession().end();
                renderer.dispose();
            }
            overlay.remove();
            styleEl.remove();
            window.__JFVR_RUNTIME_STATE__ = null;
            window.__JFVR_RUNTIME_ACTIONS__ = null;
            window.__JFVR_RUNTIME_DEBUG__ = null;
            if (activeInlinePlayer && activeInlinePlayer.close === close) {
                activeInlinePlayer = null;
            }
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape') { event.preventDefault(); close(); }
            if (event.key === ' ') { event.preventDefault(); jellyfinVideo.paused ? jellyfinVideo.play() : jellyfinVideo.pause(); }
            if (event.key.toLowerCase() === 'i') { event.preventDefault(); openVersionModal(); }
        };
        overlay.addEventListener('keydown', onKeyDown);

        toolbarVersionBtn = overlay.querySelector('#jfvr-inline-version');
        if (toolbarVersionBtn) toolbarVersionBtn.addEventListener('click', openVersionModal);

        exposeHarnessActions();
        exposeHarnessDebug();
        updateHarnessState();

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
        } catch (_error) {
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

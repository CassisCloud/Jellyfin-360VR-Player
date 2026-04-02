(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  function getCurrentJellyfinVideo() {
    return document.querySelector('video');
  }

  function getVideoTitle() {
    const titleEl = document.querySelector('.osdTitle, .videoOsdTitle, h3.osdTitle');
    if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();
    const headerEl = document.querySelector('.itemName, .nowPlayingTitle, [data-type="title"]');
    if (headerEl && headerEl.textContent.trim()) return headerEl.textContent.trim();
    if (document.title && document.title !== 'Jellyfin') return document.title.replace(' | Jellyfin', '').trim();
    return '';
  }

  const VERSION = '0.1.3';

  const STORAGE_KEYS = {
    lastMode: 'jfvr:last-mode',
    uiDistance: 'jfvr:ui-distance',
    uiScale: 'jfvr:ui-scale',
    screenFacePlayer: 'jfvr:screen-face-player',
    uiFacePlayer: 'jfvr:ui-face-player'
  };

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

  function removeModeMenu() {
    const existing = document.getElementById('jfvr-mode-menu');
    if (existing) existing.remove();
    const backdrop = document.getElementById('jfvr-mode-backdrop');
    if (backdrop) backdrop.remove();
  }

  function openModeMenu(openPlayer) {
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

  function createVRButton(openPlayer) {
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
      openModeMenu(openPlayer);
    });

    fullscreenBtn.parentNode.insertBefore(button, fullscreenBtn);
  }

  function removeVRButton() {
    const button = document.getElementById('vr360-toggleplay');
    if (button) button.remove();
    removeModeMenu();
  }

  let activeInlinePlayer = null;

  function getActiveInlinePlayer() {
    return activeInlinePlayer;
  }

  function setActiveInlinePlayer(player) {
    activeInlinePlayer = player;
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

  const RUNTIME_CONSTANTS = {
    BASE_UI_SCALE: 0.74,
    UI_DISTANCE_MIN: 1.3,
    UI_DISTANCE_MAX: 3.3,
    UI_DISTANCE_DEFAULT: (1.3 + 3.3) / 2,
    XR_FRAMEBUFFER_SCALE: 1.25,
    XR_FOVEATION: 0,
    DISABLE_COMPOSITION_LAYERS_IN_VR: false,
    SURFACE_TRIGGER_GRAB_DELAY_MS: 180,
    SCREEN_BASE_WIDTH: 18,
    SCREEN_BASE_HEIGHT: 10.125,
    SCREEN_MESH_COMPENSATION: 1.15,
    SPATIAL_GRAB_GAIN_MIN: 8,
    SPATIAL_GRAB_GAIN_MAX: 18,
    SPATIAL_GRAB_GAIN_SLOPE: 0.9,
    SPATIAL_GRAB_SMOOTHING_MIN: 0.28,
    SPATIAL_GRAB_SMOOTHING_MAX: 0.42,
    SPATIAL_GRAB_SMOOTHING_SLOPE: 0.03,
    LAYER_SYNC_INTERVAL_MS: 33,
    LAYER_POSITION_THRESHOLD_METERS: 0.003,
    LAYER_ROTATION_THRESHOLD_DEG: 0.35
  };

  function createRuntimeContext(overlay, styleEl, jellyfinVideo, modeId) {
    const RC = RUNTIME_CONSTANTS;
    return {
      overlay,
      styleEl,
      jellyfinVideo,

      active: true,

      renderer: null,
      scene: null,
      camera: null,
      vrButton: null,
      arButton: null,

      uiGroup: null,
      floatingPanels: [],
      mainUiState: null,
      interactables: [],
      textObjects: [],
      layoutCardMeshes: [],
      layoutBackgroundMesh: null,
      settingsBackgroundMesh: null,
      settingsGroup: null,
      layoutGroup: null,
      infoGroup: null,
      infoContentGroup: null,
      infoLeftColumnGroup: null,
      infoRightColumnGroup: null,
      infoButtonMesh: null,
      infoBackgroundMesh: null,
      settingsUiDistTrack: null,
      settingsDimmerTrack: null,
      infoLeftStatusLines: [],
      infoRightStatusLines: [],
      updateInfoPanelStatus: () => {},
      infoPerfToggleMesh: null,
      infoDebugToggleMesh: null,

      debugPanelGroup: null,
      debugPanelState: null,
      debugPanelBackgroundMesh: null,
      debugPanelHandleMesh: null,
      debugPanelCloseMesh: null,
      debugPanelMetricsToggleMesh: null,
      debugPanelFaceToggleMesh: null,
      debugPanelTextLines: [],
      updateDebugPanelStatus: () => {},

      bgMesh: null,
      timeCurrentObj: null,
      timeDurationObj: null,
      titleTextObj: null,
      playIconGroup: null,
      pauseIconGroup: null,
      stereoToggleLabel: null,
      seekBg: null,
      seekBuf: null,
      seekFill: null,
      volSliderGroup: null,
      ptSliderGroup: null,
      ptSliderUpdateFill: null,
      volSliderVisible: false,
      ptSliderVisible: false,
      marqueeOffset: 0,
      marqueeDir: 0,
      marqueePauseTimer: 0,

      toolbarVersionBtn: null,
      immersiveDebugScreen: null,
      surfaceRoot: null,
      videoGrabControllers: [],
      panelGrabControllers: [],

      videoTexture: null,
      materials: {},
      meshes: {},

      mediaBinding: null,
      mediaVideoLayer: null,
      mediaLayerStatus: 'unavailable',
      mediaLayerReason: 'not-initialized',
      mediaLayerMode: 'mesh',
      mediaLayerKey: '',
      textRendererStatus: 'troika-msdf',
      mediaLayerRevision: 0,
      mediaLayerDebugSpec: null,

      projectionLayerStatus: 'unknown',
      projectionLayerReason: 'not-initialized',
      xrSessionMode: 'unknown',
      xrEnvironmentBlendMode: 'unknown',
      xrModeDetection: 'unknown',
      xrPolyfillState: 'not-checked',
      xrLayersPolyfillState: 'not-checked',
      xrBindingState: 'unknown',
      xrRenderStateLayers: 'unknown',
      xrRenderStateBaseLayer: 'unknown',
      xrMediaBindingFactory: 'unknown',
      xrMediaLayerSupport: 'unknown',
      xrSelectedLayerType: 'none',
      xrLayerLastError: 'none',
      xrLayerCommitCount: 0,
      xrLayerSyncCount: 0,
      xrLayerRecreateCount: 0,
      xrLastCommittedLayers: null,
      xrCachedSupportSession: null,
      xrCachedSupport: null,

      state: {
        mode: MODES_BY_ID[modeId] || MODES_BY_ID['360-mono'],
        isImmersive: false,
        swapEyes: false,
        uiVisible: true,
        uiAnchorType: 'center',
        uiAnchorOrigin: null,
        uiAnchorForward: null,
        lastInteraction: Date.now(),
        uiDistance: Math.min(RC.UI_DISTANCE_MAX, Math.max(RC.UI_DISTANCE_MIN, Math.abs(parseFloat(localStorage.getItem(STORAGE_KEYS.uiDistance))) || RC.UI_DISTANCE_DEFAULT)),
        uiScale: parseFloat(localStorage.getItem(STORAGE_KEYS.uiScale)) || 1.0,
        isAR: false,
        passthroughEnabled: false,
        passthroughBrightness: 1.0,
        screenCurvature: 0.0,
        effectiveScreenCurve: 0.0,
        screenSize: 1.0,
        screenDistance: -12,
        stereoLock: 'auto',
        screenFacePlayer: localStorage.getItem(STORAGE_KEYS.screenFacePlayer) !== '0',
        uiFacePlayer: localStorage.getItem(STORAGE_KEYS.uiFacePlayer) !== '0',
        debugPanelFacePlayer: true,
        debugMetricsEnabled: false,
        showingDebugPanel: false,
        lastModeChangeSource: 'initial',
        lastUiOpenSource: 'initial',
        lastUiCloseSource: 'initial',
        showingSettings: false,
        showingLayout: false,
        forceFallback: false
      },

      debugMetrics: {
        fps: 0,
        avgFrameMs: 0,
        minFrameMs: 0,
        maxFrameMs: 0,
        slowFrames: 0,
        rendererCalls: 0,
        rendererTriangles: 0,
        rendererLines: 0,
        rendererPoints: 0,
        rendererTextures: 0,
        rendererPrograms: 0,
        jsHeapMb: null,
        layerCommitCount: 0,
        layerRecreateCount: 0,
        layerSyncCount: 0
      },
      debugMetricsFrameCount: 0,
      debugMetricsAccumMs: 0,
      debugMetricsMinMs: Infinity,
      debugMetricsMaxMs: 0,
      debugMetricsSlowFrameCount: 0,
      debugMetricsLastSampleAt: 0,
      debugPanelLastRefreshAt: 0,
      infoPanelLastRefreshAt: 0,
      lastFrameAt: 0,

      _surfaceTempPosition: null,
      _surfaceTempQuaternion: null,
      _surfaceTempScale: null,
      _surfaceLastLayerPosition: null,
      _surfaceLastLayerQuaternion: null,
      _lastLayerTransformSyncAt: 0,
      _surfaceLastLayerKey: '',
      _dragPlane: null,
      _dragIntersectPoint: null,
      _dragPlaneNormal: null,
      _debugPanelTempLookTarget: null,
      _debugPanelDragOffset: null,
      _viewerPosition: null,
      _viewerForward: null,
      _panelGrabDelta: null,
      _passthroughDimmerFallbackState: false,
      _passthroughDimmerSessionFallbackLocked: false
    };
  }

  function createRoundedRectGeometry(THREE, width, height, radius, _segments) {
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
    return new THREE.ShapeGeometry(shape, 16);
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

  function getScreenCurveParams(ctx, arcLength) {
    const screenArcLength = typeof arcLength === 'number' && arcLength > 0 ? arcLength : RUNTIME_CONSTANTS.SCREEN_BASE_WIDTH;
    const normalized = Math.max(0, Math.min(1, ctx.state.screenCurvature));
    if (normalized < 0.02) {
      ctx.state.effectiveScreenCurve = 0;
      return { curved: false, radius: 0, theta: 0, depth: 0, arcLength: screenArcLength, chordWidth: screenArcLength };
    }
    const theta = 0.18 + (normalized * 2.94);
    const radius = screenArcLength / theta;
    const depth = radius * (1 - Math.cos(theta / 2));
    ctx.state.effectiveScreenCurve = theta;
    return {
      curved: true,
      radius,
      theta,
      depth,
      arcLength: radius * theta,
      chordWidth: 2 * radius * Math.sin(theta / 2)
    };
  }

  function getScreenSurfaceSpec(ctx, scaleOverride) {
    const RC = RUNTIME_CONSTANTS;
    const scale = typeof scaleOverride === 'number' && Number.isFinite(scaleOverride) && scaleOverride > 0
      ? scaleOverride
      : ctx.state.screenSize;
    const localArcLength = RC.SCREEN_BASE_WIDTH;
    const localHeight = RC.SCREEN_BASE_HEIGHT;
    const localCurve = getScreenCurveParams(ctx, localArcLength);
    const localWidth = localCurve.chordWidth;
    const worldWidth = localWidth * scale;
    const worldHeight = localHeight * scale;
    const worldCurve = localCurve.curved
      ? {
        curved: true,
        radius: localCurve.radius * scale,
        theta: localCurve.theta,
        depth: localCurve.depth * scale,
        arcLength: localCurve.arcLength * scale,
        chordWidth: localCurve.chordWidth * scale
      }
      : {
        curved: false,
        radius: 0,
        theta: 0,
        depth: 0,
        arcLength: worldWidth,
        chordWidth: worldWidth
      };
    return {
      scale,
      localArcLength,
      localWidth,
      localHeight,
      worldWidth,
      worldHeight,
      localCurve,
      worldCurve,
      curved: worldCurve.curved,
      aspectRatio: (worldCurve.curved ? worldCurve.arcLength : worldWidth) / worldHeight
    };
  }

  function getRenderStateLayerNames(ctx) {
    const session = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getSession === 'function'
      ? ctx.renderer.xr.getSession()
      : null;
    if (!session || !session.renderState || !Array.isArray(session.renderState.layers)) {
      return [];
    }

    return session.renderState.layers.map((layer) => {
      if (!layer || !layer.constructor || !layer.constructor.name) {
        return 'UnknownLayer';
      }
      return layer.constructor.name;
    });
  }

  function immersiveDebugScreenActive() {
    // Disabled: debug screen at 2.2m/2.8m overlaps with composition layers and causes
    // phantom "small Mesh" display. Re-enable only for isolated IWER harness testing.
    return false;
  }

  function updateImmersiveDebugScreen(ctx) {
    if (!ctx.immersiveDebugScreen) return;
    ctx.immersiveDebugScreen.visible = immersiveDebugScreenActive();
  }

  function updateHarnessState(ctx) {
    window.__JFVR_RUNTIME_STATE__ = {
      modeId: ctx.state.mode ? ctx.state.mode.id : null,
      isImmersive: ctx.state.isImmersive,
      showingSettings: ctx.state.showingSettings,
      showingLayout: ctx.state.showingLayout,
      uiAnchorType: ctx.state.uiAnchorType,
      uiDistance: ctx.state.uiDistance,
      stereoLock: ctx.state.stereoLock,
      screenCurvature: ctx.state.screenCurvature,
      effectiveScreenCurve: ctx.state.effectiveScreenCurve,
      screenSize: ctx.state.screenSize,
      screenDistance: ctx.state.screenDistance,
      screenFacePlayer: ctx.state.screenFacePlayer,
      uiFacePlayer: ctx.state.uiFacePlayer,
      debugPanelFacePlayer: ctx.state.debugPanelFacePlayer,
      debugMetricsEnabled: ctx.state.debugMetricsEnabled,
      showingDebugPanel: ctx.state.showingDebugPanel,
      lastModeChangeSource: ctx.state.lastModeChangeSource,
      lastUiOpenSource: ctx.state.lastUiOpenSource,
      lastUiCloseSource: ctx.state.lastUiCloseSource,
      mediaLayerStatus: ctx.mediaLayerStatus,
      mediaLayerReason: ctx.mediaLayerReason,
      mediaLayerMode: ctx.mediaLayerMode,
      projectionLayerStatus: ctx.projectionLayerStatus,
      projectionLayerReason: ctx.projectionLayerReason,
      xrSessionMode: ctx.xrSessionMode,
      xrEnvironmentBlendMode: ctx.xrEnvironmentBlendMode,
      xrModeDetection: ctx.xrModeDetection,
      xrPolyfillState: ctx.xrPolyfillState,
      xrLayersPolyfillState: ctx.xrLayersPolyfillState,
      xrBindingState: ctx.xrBindingState,
      xrRenderStateLayers: ctx.xrRenderStateLayers,
      xrRenderStateBaseLayer: ctx.xrRenderStateBaseLayer,
      xrMediaBindingFactory: ctx.xrMediaBindingFactory,
      xrMediaLayerSupport: ctx.xrMediaLayerSupport,
      xrSelectedLayerType: ctx.xrSelectedLayerType,
      xrRenderStateLayerNames: getRenderStateLayerNames(ctx),
      xrLayerLastError: ctx.xrLayerLastError,
      xrLayerCommitCount: ctx.xrLayerCommitCount,
      xrLayerRecreateCount: ctx.xrLayerRecreateCount,
      xrLayerSyncCount: ctx.xrLayerSyncCount,
      textRendererStatus: ctx.textRendererStatus,
      grabActive: ctx.videoGrabControllers.length > 0
    };
  }

  function exposeHarnessActions(ctx) {
    window.__JFVR_RUNTIME_ACTIONS__ = {
      toggleLayout: () => {
        ctx.state.showingLayout = !ctx.state.showingLayout;
        ctx.state.showingSettings = false;
        if (ctx.layoutGroup) ctx.layoutGroup.visible = ctx.state.showingLayout;
        if (ctx.settingsGroup) ctx.settingsGroup.visible = false;
        ctx.volSliderVisible = false;
        ctx.ptSliderVisible = false;
        if (ctx.volSliderGroup) ctx.volSliderGroup.visible = false;
        if (ctx.ptSliderGroup) ctx.ptSliderGroup.visible = false;
        updateHarnessState(ctx);
      },
      toggleSettings: () => {
        ctx.state.showingSettings = !ctx.state.showingSettings;
        ctx.state.showingLayout = false;
        if (ctx.settingsGroup) ctx.settingsGroup.visible = ctx.state.showingSettings;
        if (ctx.layoutGroup) ctx.layoutGroup.visible = false;
        if (ctx.infoGroup && !ctx.state.showingSettings) ctx.infoGroup.visible = false;
        ctx.volSliderVisible = false;
        ctx.ptSliderVisible = false;
        if (ctx.volSliderGroup) ctx.volSliderGroup.visible = false;
        if (ctx.ptSliderGroup) ctx.ptSliderGroup.visible = false;
        ctx.updateInfoPanelStatus();
        updateHarnessState(ctx);
      }
    };
  }

  function exposeHarnessDebug(ctx) {
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

        const visibleTextCount = ctx.textObjects.filter((item) => item.visible !== false).length;
        const readyTextCount = ctx.textObjects.filter((item) => item.textRenderInfo && item.textRenderInfo.blockBounds).length;
        let surfaceCenter = null;
        let cameraForwardDot = null;
        let rayColor = null;
        let surfaceSpec = null;
        if (ctx.surfaceRoot && ctx.uiGroup && THREERef && ctx.camera) {
          const center = new THREERef.Vector3();
          ctx.surfaceRoot.getWorldPosition(center);
          surfaceCenter = { x: center.x, y: center.y, z: center.z };
          if (ctx.state.mode && ctx.state.mode.projection === 'screen') {
            const surfaceTransform = getSurfaceWorldTransform$1(ctx, THREERef);
            const actualScreenSpec = getScreenSurfaceSpec(ctx, Math.abs(surfaceTransform.scale.x || ctx.state.screenSize));
            surfaceSpec = {
              width: actualScreenSpec.worldWidth,
              height: actualScreenSpec.worldHeight,
              arcLength: actualScreenSpec.worldCurve.arcLength,
              chordWidth: actualScreenSpec.worldCurve.chordWidth,
              curved: actualScreenSpec.curved,
              radius: actualScreenSpec.curved ? actualScreenSpec.worldCurve.radius : null,
              theta: actualScreenSpec.curved ? actualScreenSpec.worldCurve.theta : 0,
              depth: actualScreenSpec.curved ? actualScreenSpec.worldCurve.depth : 0,
              worldPosition: { x: surfaceTransform.position.x, y: surfaceTransform.position.y, z: surfaceTransform.position.z },
              worldQuaternion: { x: surfaceTransform.quaternion.x, y: surfaceTransform.quaternion.y, z: surfaceTransform.quaternion.z, w: surfaceTransform.quaternion.w },
              worldScale: { x: surfaceTransform.scale.x, y: surfaceTransform.scale.y, z: surfaceTransform.scale.z }
            };
          }
          const camPos = new THREERef.Vector3();
          const camForward = new THREERef.Vector3();
          const viewCamera = ctx.renderer && ctx.renderer.xr && ctx.renderer.xr.isPresenting ? ctx.renderer.xr.getCamera() : ctx.camera;
          viewCamera.getWorldPosition(camPos);
          viewCamera.getWorldDirection(camForward);
          cameraForwardDot = center.clone().sub(camPos).normalize().dot(camForward.normalize());
        }
        if (ctx.renderer && ctx.renderer.xr) {
          const rightController = ctx.renderer.xr.getController(1);
          if (rightController && rightController.userData && rightController.userData.lineRef) {
            const color = rightController.userData.lineRef.material.color;
            rayColor = { r: color.r, g: color.g, b: color.b };
          }
        }

        const stereoCapable = Boolean(ctx.state.isImmersive && ctx.state.mode && ctx.state.mode.stereo !== 'mono');
        let effectiveStereo = false;
        if (stereoCapable && ctx.state.stereoLock !== 'force-2d') {
          if (ctx.mediaLayerStatus === 'active') {
            effectiveStereo = !ctx.mediaLayerDebugSpec || ctx.mediaLayerDebugSpec.forceMonoPresentation !== true;
          } else if (ctx.meshes.left && ctx.meshes.left.visible === true) {
            effectiveStereo = true;
          } else if (ctx.state.stereoLock === 'force-3d') {
            effectiveStereo = true;
          }
        }

        return {
          modeId: ctx.state.mode ? ctx.state.mode.id : null,
          uiVisible: ctx.state.uiVisible,
          uiAnchorType: ctx.state.uiAnchorType,
          uiAnchorOrigin: ctx.state.uiAnchorOrigin ? { x: ctx.state.uiAnchorOrigin.x, y: ctx.state.uiAnchorOrigin.y, z: ctx.state.uiAnchorOrigin.z } : null,
          uiAnchorForward: ctx.state.uiAnchorForward ? { x: ctx.state.uiAnchorForward.x, y: ctx.state.uiAnchorForward.y, z: ctx.state.uiAnchorForward.z } : null,
          uiPosition: ctx.uiGroup ? { x: ctx.uiGroup.position.x, y: ctx.uiGroup.position.y, z: ctx.uiGroup.position.z } : null,
          uiScale: ctx.uiGroup ? { x: ctx.uiGroup.scale.x, y: ctx.uiGroup.scale.y, z: ctx.uiGroup.scale.z } : null,
          showingSettings: ctx.state.showingSettings,
          showingLayout: ctx.state.showingLayout,
          activePanel: ctx.infoGroup && ctx.infoGroup.visible ? 'info' : (ctx.state.showingSettings ? 'settings' : (ctx.state.showingLayout ? 'layout' : 'none')),
          stereoLock: ctx.state.stereoLock,
          lastModeChangeSource: ctx.state.lastModeChangeSource,
          lastUiOpenSource: ctx.state.lastUiOpenSource,
          lastUiCloseSource: ctx.state.lastUiCloseSource,
          mediaLayerStatus: ctx.mediaLayerStatus,
          mediaLayerReason: ctx.mediaLayerReason,
          mediaLayerMode: ctx.mediaLayerMode,
          projectionLayerStatus: ctx.projectionLayerStatus,
          projectionLayerReason: ctx.projectionLayerReason,
          xrSessionMode: ctx.xrSessionMode,
          xrEnvironmentBlendMode: ctx.xrEnvironmentBlendMode,
          xrModeDetection: ctx.xrModeDetection,
          xrPolyfillState: ctx.xrPolyfillState,
          xrLayersPolyfillState: ctx.xrLayersPolyfillState,
          xrBindingState: ctx.xrBindingState,
          xrRenderStateLayers: ctx.xrRenderStateLayers,
          xrRenderStateBaseLayer: ctx.xrRenderStateBaseLayer,
          xrMediaBindingFactory: ctx.xrMediaBindingFactory,
          xrMediaLayerSupport: ctx.xrMediaLayerSupport,
          xrSelectedLayerType: ctx.xrSelectedLayerType,
          xrLayerLastError: ctx.xrLayerLastError,
          textRendererStatus: ctx.textRendererStatus,
          rendererPixelRatio: ctx.renderer ? ctx.renderer.getPixelRatio() : null,
          xrFramebufferScale: RUNTIME_CONSTANTS.XR_FRAMEBUFFER_SCALE,
          xrFoveation: RUNTIME_CONSTANTS.XR_FOVEATION,
          grabActive: ctx.videoGrabControllers.length > 0,
          settingsBounds: toBox(ctx.settingsBackgroundMesh),
          infoBounds: toBox(ctx.infoBackgroundMesh),
          infoContentBounds: toBox(ctx.infoContentGroup),
          infoLeftColumnBounds: toBox(ctx.infoLeftColumnGroup),
          infoRightColumnBounds: toBox(ctx.infoRightColumnGroup),
          infoButtonBounds: toBox(ctx.infoButtonMesh),
          settingsUiDistTrackBounds: toBox(ctx.settingsUiDistTrack),
          settingsDimmerTrackBounds: toBox(ctx.settingsDimmerTrack),
          layoutBounds: toBox(ctx.layoutBackgroundMesh),
          layoutCardBounds: ctx.layoutCardMeshes.map((mesh) => ({ id: mesh.userData.id, bounds: toBox(mesh) })),
          volumeSliderBounds: toBox(ctx.volSliderGroup),
          passthroughSliderBounds: toBox(ctx.ptSliderGroup),
          uiQuaternion: ctx.uiGroup ? {
            x: ctx.uiGroup.quaternion.x,
            y: ctx.uiGroup.quaternion.y,
            z: ctx.uiGroup.quaternion.z,
            w: ctx.uiGroup.quaternion.w
          } : null,
          surfaceBounds: toBox(ctx.surfaceRoot),
          surfaceVisible: ctx.surfaceRoot ? ctx.surfaceRoot.visible !== false : false,
          surfaceCenter,
          surfaceSpec,
          cameraForwardDot,
          curveDepth: ctx.state.effectiveScreenCurve,
          layerSpec: ctx.mediaLayerDebugSpec ? JSON.parse(JSON.stringify(ctx.mediaLayerDebugSpec)) : null,
          debugPanelBounds: toBox(ctx.debugPanelBackgroundMesh),
          debugPanelVisible: Boolean(ctx.debugPanelGroup && ctx.debugPanelGroup.visible),
          debugPanelPosition: ctx.debugPanelGroup ? {
            x: ctx.debugPanelGroup.position.x,
            y: ctx.debugPanelGroup.position.y,
            z: ctx.debugPanelGroup.position.z
          } : null,
          debugPanelQuaternion: ctx.debugPanelGroup ? {
            x: ctx.debugPanelGroup.quaternion.x,
            y: ctx.debugPanelGroup.quaternion.y,
            z: ctx.debugPanelGroup.quaternion.z,
            w: ctx.debugPanelGroup.quaternion.w
          } : null,
          debugMetricsEnabled: ctx.state.debugMetricsEnabled,
          debugMetrics: ctx.state.debugMetricsEnabled ? { ...ctx.debugMetrics } : null,
          xrLayerCommitCount: ctx.xrLayerCommitCount,
          xrLayerRecreateCount: ctx.xrLayerRecreateCount,
          xrLayerSyncCount: ctx.xrLayerSyncCount,
          rayColor,
          effectiveStereo,
          visibleTextCount,
          readyTextCount
        };
      }
    };
  }

  function getSurfaceWorldTransform$1(ctx, THREE) {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    ctx.surfaceRoot.updateMatrixWorld(true);
    ctx.surfaceRoot.matrixWorld.decompose(position, quaternion, scale);
    return { position, quaternion, scale };
  }

  function getCompositionLayerLayout(mode) {
    if (!mode || mode.stereo === 'mono') {
      return 'mono';
    }
    if (mode.stereo === 'sbs') return 'stereo-left-right';
    if (mode.stereo === 'ou') return 'stereo-top-bottom';
    return 'mono';
  }

  function getSessionCompositionLayers(ctx, session) {
    if (!session || !session.renderState || !Array.isArray(session.renderState.layers)) {
      return null;
    }

    const existingLayers = Array.from(session.renderState.layers);
    const rendererBaseLayer = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getBaseLayer === 'function'
      ? ctx.renderer.xr.getBaseLayer()
      : null;

    if (rendererBaseLayer && !existingLayers.includes(rendererBaseLayer)) {
      existingLayers.push(rendererBaseLayer);
    }

    return existingLayers;
  }

  function getProjectionCompositionLayer(ctx, session) {
    const rendererBaseLayer = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getBaseLayer === 'function'
      ? ctx.renderer.xr.getBaseLayer()
      : null;
    if (rendererBaseLayer) {
      return rendererBaseLayer;
    }

    const existingLayers = getSessionCompositionLayers(ctx, session);
    if (!existingLayers) {
      return null;
    }

    for (let i = 0; i < existingLayers.length; i += 1) {
      if (existingLayers[i] !== ctx.mediaVideoLayer) {
        return existingLayers[i];
      }
    }

    return null;
  }

  function areLayerArraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  function applyCompositionLayers(ctx, session, layers) {
    if (!session || typeof session.updateRenderState !== 'function' || !Array.isArray(session.renderState && session.renderState.layers)) {
      return;
    }

    const nextLayers = (layers || []).filter(Boolean);
    if (ctx.xrLastCommittedLayers && areLayerArraysEqual(ctx.xrLastCommittedLayers, nextLayers)) {
      return;
    }

    session.updateRenderState({ layers: nextLayers });
    ctx.xrLastCommittedLayers = nextLayers.slice();
    ctx.xrLayerCommitCount += 1;
  }

  function getMediaBindingSupport(ctx, session) {
    if (ctx.xrCachedSupportSession === session && ctx.xrCachedSupport) {
      return ctx.xrCachedSupport;
    }

    const support = {
      binding: null,
      hasQuadLayer: false,
      hasCylinderLayer: false,
      hasEquirectLayer: false,
      error: null
    };

    try {
      support.binding = new window.XRMediaBinding(session);
      support.hasQuadLayer = typeof support.binding.createQuadLayer === 'function';
      support.hasCylinderLayer = typeof support.binding.createCylinderLayer === 'function';
      support.hasEquirectLayer = typeof support.binding.createEquirectLayer === 'function';
    } catch (error) {
      support.error = error;
    }

    ctx.xrCachedSupportSession = session;
    ctx.xrCachedSupport = support;
    return support;
  }

  function updateMediaLayerDebugSpec(ctx, layerMode, layerOptions, activeState) {
    if (!layerOptions) {
      ctx.mediaLayerDebugSpec = null;
      return;
    }

    const transform = layerOptions.transform || null;
    ctx.mediaLayerDebugSpec = {
      active: activeState !== false,
      mode: layerMode,
      width: typeof layerOptions.width === 'number' ? layerOptions.width : null,
      height: typeof layerOptions.height === 'number' ? layerOptions.height : null,
      radius: typeof layerOptions.radius === 'number' ? layerOptions.radius : null,
      centralAngle: typeof layerOptions.centralAngle === 'number' ? layerOptions.centralAngle : null,
      aspectRatio: typeof layerOptions.aspectRatio === 'number' ? layerOptions.aspectRatio : null,
      forceMonoPresentation: ctx.mediaVideoLayer && typeof ctx.mediaVideoLayer.forceMonoPresentation === 'boolean'
        ? ctx.mediaVideoLayer.forceMonoPresentation
        : null,
      transform: transform ? {
        position: {
          x: transform.position.x,
          y: transform.position.y,
          z: transform.position.z
        },
        orientation: {
          x: transform.orientation.x,
          y: transform.orientation.y,
          z: transform.orientation.z,
          w: transform.orientation.w
        }
      } : null,
      revision: ctx.mediaLayerRevision
    };
  }

  function updateFallbackState(ctx, mediaLayerReason, mediaBindingFactory, mediaLayerSupport) {
    if (!ctx.mediaVideoLayer && ctx.mediaLayerStatus === 'fallback' && ctx.mediaLayerReason === mediaLayerReason) {
      ctx.xrMediaBindingFactory = mediaBindingFactory;
      ctx.xrMediaLayerSupport = mediaLayerSupport;
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return true;
    }
    return false;
  }

  function clearCompositionVideoLayer(ctx, session, skipUpdate) {
    const xrSession = session || (ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getSession === 'function' ? ctx.renderer.xr.getSession() : null);
    if (!skipUpdate) {
      try {
        if (xrSession && typeof xrSession.updateRenderState === 'function' && xrSession.renderState) {
          const projectionLayer = getProjectionCompositionLayer(ctx, xrSession);
          applyCompositionLayers(ctx, xrSession, projectionLayer ? [projectionLayer] : []);
        }
      } catch (_error) {
        // Best-effort cleanup only.
      }
    }
    if (ctx.mediaVideoLayer && typeof ctx.mediaVideoLayer.destroy === 'function') {
      try {
        ctx.mediaVideoLayer.destroy();
      } catch (_destroyError) {
        // Best-effort resource release.
      }
    }
    ctx.mediaVideoLayer = null;
    ctx.mediaBinding = null;
    ctx.mediaLayerMode = 'mesh';
    ctx.mediaLayerKey = '';
    ctx.mediaLayerDebugSpec = null;
  }

  function updateProjectionLayerStatus(ctx) {
    const session = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getSession === 'function' ? ctx.renderer.xr.getSession() : null;
    if (!session || !ctx.state.isImmersive) {
      ctx.projectionLayerStatus = 'inactive';
      ctx.projectionLayerReason = 'no-session';
      ctx.xrBindingState = 'inactive';
      ctx.xrRenderStateLayers = 'inactive';
      ctx.xrRenderStateBaseLayer = 'inactive';
      return;
    }

    const hasLayersArray = Boolean(session.renderState && Array.isArray(session.renderState.layers));
    const hasBaseLayer = Boolean(session.renderState && session.renderState.baseLayer);
    const hasBinding = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getBinding === 'function' && Boolean(ctx.renderer.xr.getBinding());
    ctx.xrBindingState = hasBinding ? 'present' : 'missing';
    ctx.xrRenderStateLayers = hasLayersArray ? 'present' : 'missing';
    ctx.xrRenderStateBaseLayer = hasBaseLayer ? 'present' : 'missing';

    if (hasLayersArray) {
      ctx.projectionLayerStatus = 'layers';
      ctx.projectionLayerReason = hasBinding ? 'xr-binding-active' : 'layers-array';
    } else if (hasBaseLayer) {
      ctx.projectionLayerStatus = 'base-layer';
      ctx.projectionLayerReason = 'renderstate-baselayer';
    } else {
      ctx.projectionLayerStatus = 'unknown';
      ctx.projectionLayerReason = 'no-renderstate-layer';
    }
  }

  function getSurfaceWorldTransform(ctx, THREE) {
    if (!ctx._surfaceTempPosition) ctx._surfaceTempPosition = new THREE.Vector3();
    if (!ctx._surfaceTempQuaternion) ctx._surfaceTempQuaternion = new THREE.Quaternion();
    if (!ctx._surfaceTempScale) ctx._surfaceTempScale = new THREE.Vector3();
    const position = ctx._surfaceTempPosition;
    const quaternion = ctx._surfaceTempQuaternion;
    const scale = ctx._surfaceTempScale;
    ctx.surfaceRoot.updateMatrixWorld(true);
    ctx.surfaceRoot.matrixWorld.decompose(position, quaternion, scale);
    return { position, quaternion, scale };
  }

  function getSurfaceTransformForLayer(ctx, THREE) {
    const transform = getSurfaceWorldTransform(ctx, THREE);
    return {
      position: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
      orientation: { x: transform.quaternion.x, y: transform.quaternion.y, z: transform.quaternion.z, w: transform.quaternion.w },
      scale: { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z }
    };
  }

  function syncCompositionVideoLayer(ctx, THREE) {
    ctx.xrLayerSyncCount += 1;
    const session = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getSession === 'function' ? ctx.renderer.xr.getSession() : null;
    session && typeof session.mode === 'string' ? session.mode : ctx.xrSessionMode;
    const transform = ctx.surfaceRoot ? getSurfaceTransformForLayer(ctx, THREE) : null;
    const layout = getCompositionLayerLayout(ctx.state.mode);
    const screenScale = transform && transform.scale && typeof transform.scale.x === 'number'
      ? Math.abs(transform.scale.x)
      : ctx.state.screenSize;
    const screenSpec = ctx.state.mode && ctx.state.mode.projection === 'screen' ? getScreenSurfaceSpec(ctx, screenScale) : null;
    const referenceSpace = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getReferenceSpace === 'function'
      ? ctx.renderer.xr.getReferenceSpace()
      : null;
    const compositionLayers = getSessionCompositionLayers(ctx, session);
    const projectionLayer = getProjectionCompositionLayer(ctx, session);
    let requestedScreenLayerMode = null;
    let requestedScreenLayerOptions = null;

    if (ctx.state.mode && ctx.state.mode.projection === 'screen' && transform && typeof window.XRRigidTransform === 'function') {
      requestedScreenLayerMode = screenSpec && screenSpec.curved ? 'cylinder-layer' : 'quad-layer';
      requestedScreenLayerOptions = requestedScreenLayerMode === 'cylinder-layer'
        ? {
          space: referenceSpace,
          radius: screenSpec.worldCurve.radius,
          centralAngle: screenSpec.worldCurve.theta,
          aspectRatio: screenSpec.aspectRatio,
          layout,
          transform: new window.XRRigidTransform(transform.position, transform.orientation)
        }
        : {
          space: referenceSpace,
          width: screenSpec.worldWidth,
          height: screenSpec.worldHeight,
          layout,
          transform: new window.XRRigidTransform(transform.position, transform.orientation)
        };
    }

    if (!session || !ctx.state.isImmersive) {
      clearCompositionVideoLayer(ctx, session);
      ctx.xrLastCommittedLayers = null;
      ctx.mediaLayerStatus = 'inactive';
      ctx.mediaLayerReason = 'no-session';
      ctx.xrMediaBindingFactory = 'inactive';
      ctx.xrMediaLayerSupport = 'inactive';
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }

    const wants2DPresentation = Boolean(
      ctx.state.mode.stereo !== 'mono'
      && ctx.state.isImmersive
      && (ctx.state.stereoLock === 'force-2d' || (ctx.state.stereoLock !== 'force-3d' && ctx.state.uiVisible))
    );
    const canForceMonoPresentation = ctx.state.mode.projection === 'screen';
    const forceMonoPresentation = wants2DPresentation && canForceMonoPresentation;
    const needsCropFor2D = wants2DPresentation && !canForceMonoPresentation;
    const needsCurvedScreenFallback = Boolean(ctx.state.mode.projection === 'screen' && screenSpec && screenSpec.curved);
    const needsPassthroughDimmerFallback = Boolean(
      ctx.state.mode.projection === 'screen'
      && ctx._passthroughDimmerSessionFallbackLocked
    );

    if (ctx.state.forceFallback || needsCropFor2D || needsCurvedScreenFallback || needsPassthroughDimmerFallback) {
      const fallbackReason = ctx.state.forceFallback
        ? 'user-toggled'
        : needsPassthroughDimmerFallback
          ? 'passthrough-dimmer-active'
          : needsCurvedScreenFallback
            ? 'curved-screen-fallback'
            : '2d-crop-required';
      if (updateFallbackState(ctx, fallbackReason, typeof window.XRMediaBinding === 'function' ? 'available' : 'missing', 'skipped')) {
        return;
      }
      clearCompositionVideoLayer(ctx, session);
      ctx.mediaLayerStatus = 'fallback';
      ctx.mediaLayerReason = fallbackReason;
      ctx.xrMediaBindingFactory = typeof window.XRMediaBinding === 'function' ? 'available' : 'missing';
      ctx.xrMediaLayerSupport = 'skipped';
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }

    if (typeof window.XRMediaBinding !== 'function' || typeof session.updateRenderState !== 'function' || typeof ctx.renderer.xr.getReferenceSpace !== 'function') {
      clearCompositionVideoLayer(ctx, session);
      updateMediaLayerDebugSpec(ctx, requestedScreenLayerMode, requestedScreenLayerOptions, false);
      ctx.mediaLayerStatus = 'unavailable';
      ctx.mediaLayerReason = 'unsupported';
      ctx.xrMediaBindingFactory = typeof window.XRMediaBinding === 'function' ? 'available' : 'missing';
      ctx.xrMediaLayerSupport = 'unknown';
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }

    if (!projectionLayer || !compositionLayers || compositionLayers.length === 0) {
      clearCompositionVideoLayer(ctx, session);
      updateMediaLayerDebugSpec(ctx, requestedScreenLayerMode, requestedScreenLayerOptions, false);
      ctx.mediaLayerStatus = 'unavailable';
      ctx.mediaLayerReason = 'missing-projection-layer';
      ctx.xrMediaBindingFactory = 'available';
      ctx.xrMediaLayerSupport = 'unknown';
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }

    if (!referenceSpace) {
      clearCompositionVideoLayer(ctx, session);
      updateMediaLayerDebugSpec(ctx, requestedScreenLayerMode, requestedScreenLayerOptions, false);
      ctx.mediaLayerStatus = 'inactive';
      ctx.mediaLayerReason = 'missing-reference-space';
      ctx.xrMediaBindingFactory = 'available';
      ctx.xrMediaLayerSupport = 'unknown';
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }

    const support = getMediaBindingSupport(ctx, session);
    if (support.error) {
      clearCompositionVideoLayer(ctx, session);
      updateMediaLayerDebugSpec(ctx, requestedScreenLayerMode, requestedScreenLayerOptions, false);
      ctx.mediaLayerStatus = 'fallback';
      ctx.mediaLayerReason = 'media-binding-init-failed';
      ctx.xrMediaBindingFactory = 'constructor-failed';
      ctx.xrMediaLayerSupport = 'unknown';
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = support.error && support.error.message ? support.error.message : 'media-binding-init-failed';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }
    ctx.xrMediaBindingFactory = 'ready';
    ctx.xrLayerLastError = 'none';

    const hasQuadLayer = support.hasQuadLayer;
    const hasCylinderLayer = support.hasCylinderLayer;
    const hasEquirectLayer = support.hasEquirectLayer;
    ctx.xrMediaLayerSupport = `quad:${hasQuadLayer ? 'yes' : 'no'},cylinder:${hasCylinderLayer ? 'yes' : 'no'},equirect:${hasEquirectLayer ? 'yes' : 'no'}`;
    let layerFactory = null;
    let layerKey = '';
    let layerMode = 'mesh';
    let layerOptions = null;

    if (ctx.state.mode.projection === 'screen') {
      const width = screenSpec.worldWidth;
      const height = screenSpec.worldHeight;
      const quadLayerOptions = {
        space: referenceSpace,
        width,
        height,
        layout,
        transform: new window.XRRigidTransform(transform.position, transform.orientation)
      };
      const cylinderLayerOptions = {
        space: referenceSpace,
        radius: screenSpec.worldCurve.radius,
        centralAngle: screenSpec.worldCurve.theta,
        aspectRatio: screenSpec.aspectRatio,
        layout,
        transform: new window.XRRigidTransform(transform.position, transform.orientation)
      };
      if (screenSpec.curved && hasCylinderLayer) {
        layerFactory = 'createCylinderLayer';
        layerMode = 'cylinder-layer';
        layerOptions = cylinderLayerOptions;
      } else if (!screenSpec.curved && hasQuadLayer) {
        layerFactory = 'createQuadLayer';
        layerMode = 'quad-layer';
        layerOptions = quadLayerOptions;
      } else if (screenSpec.curved) {
        clearCompositionVideoLayer(ctx, session);
        updateMediaLayerDebugSpec(ctx, 'cylinder-layer', cylinderLayerOptions, false);
        ctx.mediaLayerStatus = 'unavailable';
        ctx.mediaLayerReason = 'cylinder-layer-unsupported';
        ctx.xrSelectedLayerType = 'none';
        ctx.xrLayerLastError = 'none';
        updateProjectionLayerStatus(ctx);
        updateHarnessState(ctx);
        return;
      } else {
        clearCompositionVideoLayer(ctx, session);
        updateMediaLayerDebugSpec(ctx, 'quad-layer', quadLayerOptions, false);
        ctx.mediaLayerStatus = 'unavailable';
        ctx.mediaLayerReason = 'quad-layer-unsupported';
        ctx.xrSelectedLayerType = 'none';
        ctx.xrLayerLastError = 'none';
        updateProjectionLayerStatus(ctx);
        updateHarnessState(ctx);
        return;
      }
    } else if (hasEquirectLayer) {
      layerFactory = 'createEquirectLayer';
      layerMode = 'equirect-layer';
      layerOptions = {
        space: referenceSpace,
        radius: 32 * ctx.state.screenSize,
        centralHorizontalAngle: ctx.state.mode.projection === '180' ? Math.PI : Math.PI * 2,
        upperVerticalAngle: Math.PI / 2,
        lowerVerticalAngle: -Math.PI / 2,
        layout,
        transform: new XRRigidTransform(transform.position, transform.orientation)
      };
    } else {
      clearCompositionVideoLayer(ctx, session);
      ctx.mediaLayerStatus = 'unavailable';
      ctx.mediaLayerReason = 'no-supported-layer-type';
      ctx.xrSelectedLayerType = 'none';
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }
    ctx.xrSelectedLayerType = layerMode;

    layerKey = JSON.stringify({
      projection: ctx.state.mode.projection,
      stereo: ctx.state.mode.stereo,
      variant: ctx.state.mode.variant,
      stereoLock: ctx.state.stereoLock,
      curved: screenSpec ? screenSpec.curved : false,
      theta: screenSpec ? screenSpec.worldCurve.theta : 0,
      scale: screenSpec ? screenSpec.scale : ctx.state.screenSize,
      layout
    });

    const layerConfigChanged = ctx.mediaLayerKey !== layerKey;
    if (layerConfigChanged) {
      ctx.mediaLayerRevision += 1;
      ctx.xrLayerRecreateCount += 1;
    }

    if (ctx.mediaLayerKey === layerKey && ctx.mediaVideoLayer) {
      try {
        ctx.mediaVideoLayer.transform = layerOptions ? layerOptions.transform : new window.XRRigidTransform(transform.position, transform.orientation);
        if (typeof ctx.mediaVideoLayer.forceMonoPresentation === 'boolean') {
          ctx.mediaVideoLayer.forceMonoPresentation = forceMonoPresentation;
        }
      } catch (_e) {
        // Best-effort transform sync only.
      }
      updateMediaLayerDebugSpec(ctx, layerMode, layerOptions);
      ctx.mediaLayerStatus = 'active';
      ctx.mediaLayerReason = 'ok';
      ctx.mediaLayerMode = layerMode;
      ctx.xrLayerLastError = 'none';
      updateProjectionLayerStatus(ctx);
      updateHarnessState(ctx);
      return;
    }

    try {
      const previousMediaLayer = ctx.mediaVideoLayer;
      clearCompositionVideoLayer(ctx, session, true);
      ctx.mediaBinding = support.binding || new window.XRMediaBinding(session);
      if (typeof ctx.mediaBinding[layerFactory] !== 'function') {
        throw new Error(layerFactory + ' not supported');
      }
      ctx.mediaVideoLayer = ctx.mediaBinding[layerFactory](ctx.jellyfinVideo, layerOptions);
      if (typeof ctx.mediaVideoLayer.forceMonoPresentation === 'boolean') {
        ctx.mediaVideoLayer.forceMonoPresentation = forceMonoPresentation;
      }
      const newLayers = [ctx.mediaVideoLayer, projectionLayer].filter((layer, index, list) => layer && list.indexOf(layer) === index && layer !== previousMediaLayer);
      applyCompositionLayers(ctx, session, newLayers);
      updateMediaLayerDebugSpec(ctx, layerMode, layerOptions);
      ctx.mediaLayerStatus = 'active';
      ctx.mediaLayerReason = 'ok';
      ctx.mediaLayerMode = layerMode;
      ctx.mediaLayerKey = layerKey;
      ctx.xrLayerLastError = 'none';
    } catch (error) {
      clearCompositionVideoLayer(ctx, session);
      updateMediaLayerDebugSpec(ctx, layerMode, layerOptions, false);
      ctx.mediaLayerStatus = 'fallback';
      ctx.mediaLayerReason = error && error.message ? error.message : 'layer-create-failed';
      ctx.xrLayerLastError = ctx.mediaLayerReason;
    }
    updateProjectionLayerStatus(ctx);
    updateHarnessState(ctx);
  }

  const WEBXR_POLYFILL_URL = 'https://unpkg.com/webxr-polyfill@2.0.3/build/webxr-polyfill.js';
  const WEBXR_LAYERS_POLYFILL_URL = 'https://unpkg.com/webxr-layers-polyfill@1.1.0/build/webxr-layers-polyfill.js';

  let polyfillInitPromise = null;

  function getPreferredWebXROptionalFeatures() {
    if (window.__JFVR_HARNESS_RUNTIME_MODE__ === 'extension') {
      return ['local-floor', 'hand-tracking'];
    }

    return ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'];
  }

  function loadExternalScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script#${id}`);
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function hasNativeNavigatorXR() {
    return Boolean(navigator.xr && typeof navigator.xr.requestSession === 'function');
  }

  function hasLayerSupport() {
    return typeof window.XRMediaBinding === 'function';
  }

  async function ensureWebXRPolyfills() {
    if (polyfillInitPromise) {
      return polyfillInitPromise;
    }

    polyfillInitPromise = (async () => {
      const result = {
        xr: hasNativeNavigatorXR() ? 'native' : 'missing',
        layers: hasLayerSupport() ? 'native' : 'missing',
        error: null
      };

      try {
        if (!hasNativeNavigatorXR()) {
          await loadExternalScript('jfvr-webxr-polyfill', WEBXR_POLYFILL_URL);
          if (typeof window.WebXRPolyfill === 'function') {
            if (!window.__JFVR_WEBXR_POLYFILL__) {
              window.__JFVR_WEBXR_POLYFILL__ = new window.WebXRPolyfill();
            }
            result.xr = hasNativeNavigatorXR() ? 'polyfilled' : 'missing';
          }
        }

        if (!hasLayerSupport()) {
          await loadExternalScript('jfvr-webxr-layers-polyfill', WEBXR_LAYERS_POLYFILL_URL);
          if (typeof window.WebXRLayersPolyfill === 'function') {
            if (!window.__JFVR_WEBXR_LAYERS_POLYFILL__) {
              window.__JFVR_WEBXR_LAYERS_POLYFILL__ = new window.WebXRLayersPolyfill();
            }
            result.layers = hasLayerSupport() ? 'polyfilled' : 'missing';
          }
        }
      } catch (error) {
        result.error = error;
      }

      if (result.xr === 'missing' && hasNativeNavigatorXR()) {
        result.xr = 'native';
      }
      if (result.layers === 'missing' && hasLayerSupport()) {
        result.layers = 'native';
      }

      return result;
    })();

    return polyfillInitPromise;
  }

  function injectImportMap() {
    if (document.querySelector('script#jfvr-importmap')) return;
    const im = document.createElement('script');
    im.id = 'jfvr-importmap';
    im.type = 'importmap';
    im.textContent = JSON.stringify({
      imports: {
        "three": "https://unpkg.com/three@0.183.2/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.183.2/examples/jsm/",
        "troika-three-text": "https://esm.sh/troika-three-text@0.52.4?external=three"
      }
    });
    document.head.appendChild(im);
  }

  function needsStereoConfigSync(ctx) {
    return Boolean(ctx.state.isImmersive && ctx.state.mode && ctx.state.mode.stereo !== 'mono');
  }

  function getViewerYaw(ctx, THREE) {
    const targetCamera = ctx.renderer && ctx.renderer.xr && ctx.renderer.xr.isPresenting
      ? ctx.renderer.xr.getCamera()
      : ctx.camera;
    if (!targetCamera) return 0;
    const quaternion = new THREE.Quaternion();
    targetCamera.getWorldQuaternion(quaternion);
    return new THREE.Euler().setFromQuaternion(quaternion, 'YXZ').y;
  }

  function getViewerObject(ctx) {
    return ctx.renderer && ctx.renderer.xr && ctx.renderer.xr.isPresenting
      ? ctx.renderer.xr.getCamera()
      : ctx.camera;
  }

  function faceObjectTowardViewer(ctx, THREE, object3D, options) {
    if (!object3D) return;
    const targetCamera = getViewerObject(ctx);
    if (!targetCamera) return;
    if (!ctx._debugPanelTempLookTarget) ctx._debugPanelTempLookTarget = new THREE.Vector3();
    targetCamera.getWorldPosition(ctx._debugPanelTempLookTarget);
    if (!options || options.yawOnly !== false) {
      ctx._debugPanelTempLookTarget.y = object3D.position.y;
    }
    object3D.lookAt(ctx._debugPanelTempLookTarget);
  }

  function registerFloatingPanel(ctx, panelState) {
    ctx.floatingPanels = ctx.floatingPanels.filter((panel) => panel.id !== panelState.id);
    ctx.floatingPanels.push(panelState);
  }

  function getFloatingPanelState(ctx, panelId) {
    return ctx.floatingPanels.find((panel) => panel.id === panelId) || null;
  }

  function updateFloatingPanelFacing(ctx, THREE, panelState) {
    if (!panelState || !panelState.group || !panelState.group.visible) return;
    if (panelState.facePlayerEnabled === false) return;
    faceObjectTowardViewer(ctx, THREE, panelState.group, { yawOnly: true });
  }

  function applyUiAnchorFromViewer(ctx, THREE, anchorType, controller) {
    if (!ctx.uiGroup) return;
    const targetCamera = getViewerObject(ctx);
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
    ctx.state.uiAnchorOrigin = origin.clone();
    ctx.state.uiAnchorForward = forward.clone();
    ctx.state.uiAnchorType = anchorType;
    ctx.uiGroup.position.copy(origin).add(forward.multiplyScalar(ctx.state.uiDistance));
    ctx.uiGroup.position.y += verticalOffset;
    if (ctx.state.uiFacePlayer && ctx.state.mode && ctx.state.mode.projection === 'screen') {
      faceObjectTowardViewer(ctx, THREE, ctx.uiGroup, { yawOnly: true });
    }
    updateHarnessState(ctx);
  }

  function applyDebugPanelAnchorFromViewer(ctx, THREE, controller) {
    if (!ctx.debugPanelGroup) return;
    const targetCamera = getViewerObject(ctx);
    if (!targetCamera) return;
    const panelState = getFloatingPanelState(ctx, 'debug-panel');

    const origin = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();

    if (controller && controller.matrixWorld) {
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

    right.crossVectors(forward, up).normalize();
    const distance = panelState && typeof panelState.distance === 'number'
      ? panelState.distance
      : Math.max(1.4, ctx.state.uiDistance * 0.92);
    ctx.debugPanelGroup.position.copy(origin)
      .add(forward.multiplyScalar(distance))
      .add(right.multiplyScalar(0.72));
    ctx.debugPanelGroup.position.y += 0.12;
    if (!panelState || panelState.facePlayerEnabled !== false) {
      faceObjectTowardViewer(ctx, THREE, ctx.debugPanelGroup, { yawOnly: true });
    }
    updateHarnessState(ctx);
  }

  function applyStoredUiAnchor(ctx) {
    if (!ctx.uiGroup || !ctx.state.uiAnchorOrigin || !ctx.state.uiAnchorForward) return;
    const origin = ctx.state.uiAnchorOrigin.clone();
    const forward = ctx.state.uiAnchorForward.clone();
    const verticalOffset = ctx.state.uiAnchorType === 'video' ? -0.22 : -0.12;
    ctx.uiGroup.position.copy(origin).add(forward.multiplyScalar(ctx.state.uiDistance));
    ctx.uiGroup.position.y += verticalOffset;
    if (ctx.state.uiFacePlayer && ctx.state.mode && ctx.state.mode.projection === 'screen') {
      faceObjectTowardViewer(ctx, window.THREE, ctx.uiGroup, { yawOnly: true });
    }
    updateHarnessState(ctx);
  }

  function recenterActiveMode(ctx, THREE) {
    if (!ctx.scene || !ctx.camera) return;

    const yaw = getViewerYaw(ctx, THREE);
    const targetCamera = ctx.renderer && ctx.renderer.xr && ctx.renderer.xr.isPresenting
      ? ctx.renderer.xr.getCamera()
      : ctx.camera;
    const cameraPos = new THREE.Vector3();
    targetCamera.getWorldPosition(cameraPos);

    if (ctx.state.mode.projection === 'screen') {
      const distance = Math.abs(ctx.state.screenDistance);
      ctx.surfaceRoot.position.set(
        cameraPos.x - (Math.sin(yaw) * distance),
        Math.max(0.5, cameraPos.y),
        cameraPos.z - (Math.cos(yaw) * distance)
      );
      if (ctx.state.screenFacePlayer) {
        faceObjectTowardViewer(ctx, THREE, ctx.surfaceRoot, { yawOnly: true });
      } else {
        ctx.surfaceRoot.rotation.set(0, yaw, 0);
      }
    } else if (ctx.state.mode.projection === '180') {
      ctx.surfaceRoot.position.set(0, 0, 0);
      ctx.surfaceRoot.rotation.set(0, yaw + Math.PI, 0);
    } else {
      ctx.surfaceRoot.position.set(0, 0, 0);
      ctx.surfaceRoot.rotation.set(0, yaw + (Math.PI / 2), 0);
    }

    ctx.surfaceRoot.scale.setScalar(ctx.state.screenSize);
    updateHarnessState(ctx);
  }

  function updateStereoVisibility(ctx, _THREE) {
    const mode = ctx.state.mode;
    let useStereo = false;
    if (mode.stereo !== 'mono' && ctx.state.isImmersive) {
      if (ctx.state.stereoLock === 'force-2d') {
        useStereo = false;
      } else if (ctx.state.stereoLock === 'force-3d') {
        useStereo = true;
      } else {
        useStereo = !ctx.state.uiVisible;
      }
    }
    const hideMeshVideo = ctx.mediaLayerStatus === 'active';
    if (ctx.meshes.preview) ctx.meshes.preview.visible = !hideMeshVideo && !useStereo;
    if (ctx.meshes.left) ctx.meshes.left.visible = !hideMeshVideo && useStereo;
    if (ctx.meshes.right) ctx.meshes.right.visible = !hideMeshVideo && useStereo;
    if (ctx.stereoToggleLabel) ctx.stereoToggleLabel.setState(mode, ctx.state.stereoLock);
    updateImmersiveDebugScreen(ctx);
    updateHarnessState(ctx);
  }

  function openDebugPanel(ctx, THREE, controller, _source) {
    ctx.state.showingDebugPanel = true;
    ctx.state.lastInteraction = Date.now();
    if (ctx.debugPanelGroup) {
      ctx.debugPanelGroup.visible = true;
      if (controller && controller.matrixWorld) {
        applyDebugPanelAnchorFromViewer(ctx, THREE, controller);
      }
    }
    if (ctx.updateDebugPanelStatus) ctx.updateDebugPanelStatus(true);
    if (ctx.updateInfoPanelStatus) ctx.updateInfoPanelStatus(true);
    updateHarnessState(ctx);
  }

  function closeDebugPanel(ctx) {
    ctx.state.showingDebugPanel = false;
    if (ctx.debugPanelGroup) ctx.debugPanelGroup.visible = false;
    if (ctx.updateInfoPanelStatus) ctx.updateInfoPanelStatus(true);
    updateHarnessState(ctx);
  }

  function setFacePlayerEnabled(ctx, THREE, enabled) {
    const next = Boolean(enabled);
    ctx.state.uiFacePlayer = next;
    ctx.state.screenFacePlayer = next;
    if (ctx.mainUiState) ctx.mainUiState.facePlayerEnabled = next;
    localStorage.setItem(STORAGE_KEYS.uiFacePlayer, next ? '1' : '0');
    localStorage.setItem(STORAGE_KEYS.screenFacePlayer, next ? '1' : '0');
    if (ctx.state.mode && ctx.state.mode.projection === 'screen') {
      if (next) {
        faceObjectTowardViewer(ctx, THREE, ctx.surfaceRoot, { yawOnly: true });
        if (ctx.uiGroup) faceObjectTowardViewer(ctx, THREE, ctx.uiGroup, { yawOnly: true });
        if (ctx.debugPanelGroup && ctx.state.debugPanelFacePlayer) {
          faceObjectTowardViewer(ctx, THREE, ctx.debugPanelGroup, { yawOnly: true });
        }
      }
    }
    if (ctx.updateInfoPanelStatus) ctx.updateInfoPanelStatus(true);
    if (ctx.updateDebugPanelStatus) ctx.updateDebugPanelStatus(true);
    updateHarnessState(ctx);
  }

  function toggleDebugPanel(ctx, THREE, controller) {
    if (ctx.state.showingDebugPanel) {
      closeDebugPanel(ctx);
    } else {
      openDebugPanel(ctx, THREE, controller);
    }
  }

  function syncFloatingPanels(ctx) {
    if (ctx.settingsGroup) ctx.settingsGroup.visible = ctx.state.showingSettings;
    if (ctx.layoutGroup) ctx.layoutGroup.visible = ctx.state.showingLayout;
  }

  function refreshUiDistance(ctx, _THREE) {
    if (!ctx.uiGroup) return;
    const RC = { BASE_UI_SCALE: 0.74 };
    ctx.uiGroup.scale.setScalar(RC.BASE_UI_SCALE * ctx.state.uiScale);
    if (ctx.mainUiState) ctx.mainUiState.distance = ctx.state.uiDistance;
    if (ctx.debugPanelState) ctx.debugPanelState.distance = Math.max(1.4, ctx.state.uiDistance * 0.92);
    applyStoredUiAnchor(ctx);
    syncFloatingPanels(ctx);
    updateHarnessState(ctx);
  }

  function positionUIAtController(ctx, THREE, controller) {
    if (!controller || !ctx.uiGroup) return;
    getControllerRay(ctx, controller);
    const hitSurface = getVisibleIntersections(ctx, getSurfaceMeshes(ctx)).length > 0;
    applyUiAnchorFromViewer(ctx, THREE, hitSurface ? 'video' : 'controller', controller);
  }

  function openUI(ctx, THREE, controller, source) {
    ctx.state.uiVisible = true;
    ctx.state.lastInteraction = Date.now();
    ctx.state.lastUiOpenSource = source || 'open';
    ctx.state.showingSettings = false;
    ctx.state.showingLayout = false;
    if (ctx.settingsGroup) ctx.settingsGroup.visible = false;
    if (ctx.layoutGroup) ctx.layoutGroup.visible = false;
    if (ctx.infoGroup) ctx.infoGroup.visible = false;
    if (ctx.uiGroup) {
      ctx.uiGroup.visible = true;
      if (controller && controller.matrixWorld) {
        positionUIAtController(ctx, THREE, controller);
      } else {
        applyUiAnchorFromViewer(ctx, THREE, 'center');
      }
      if (ctx.state.mode && ctx.state.mode.projection === 'screen') {
        // Even with face-player disabled, reopening the UI should orient it once
        // toward the viewer like the legacy behavior.
        faceObjectTowardViewer(ctx, THREE, ctx.uiGroup, { yawOnly: true });
      }
    }
    if (needsStereoConfigSync(ctx)) syncCompositionVideoLayer(ctx, THREE);
    updateStereoVisibility(ctx);
    updateHarnessState(ctx);
  }

  function closeUI(ctx, THREE, source) {
    ctx.state.uiVisible = false;
    ctx.state.lastUiCloseSource = source || 'close';
    ctx.state.showingSettings = false;
    ctx.state.showingLayout = false;
    if (ctx.settingsGroup) ctx.settingsGroup.visible = false;
    if (ctx.layoutGroup) ctx.layoutGroup.visible = false;
    if (ctx.infoGroup) ctx.infoGroup.visible = false;
    if (ctx.uiGroup) {
      ctx.uiGroup.visible = false;
    }
    if (needsStereoConfigSync(ctx)) syncCompositionVideoLayer(ctx, THREE);
    updateStereoVisibility(ctx);
    updateHarnessState(ctx);
  }

  function wake(ctx, THREE, controller) {
    ctx.state.lastInteraction = Date.now();
    if (!ctx.state.uiVisible) {
      openUI(ctx, THREE, controller, 'wake');
    }
  }

  function toggleUI(ctx, THREE, controller, source) {
    if (ctx.state.uiVisible) {
      closeUI(ctx, THREE, source || 'toggle');
    } else {
      openUI(ctx, THREE, controller, source || 'toggle');
    }
  }

  function cycleStereoLock(ctx, THREE) {
    if (!ctx.state.mode || ctx.state.mode.stereo === 'mono') {
      ctx.state.stereoLock = 'force-2d';
    } else if (ctx.state.stereoLock === 'auto') {
      ctx.state.stereoLock = 'force-2d';
    } else if (ctx.state.stereoLock === 'force-2d') {
      ctx.state.stereoLock = 'force-3d';
    } else {
      ctx.state.stereoLock = 'auto';
    }
    if (needsStereoConfigSync(ctx)) syncCompositionVideoLayer(ctx, THREE);
    updateStereoVisibility(ctx);
  }

  // Raycaster helpers shared with interaction module
  function getControllerRay(ctx, controller) {
    ctx._tempMatrix.identity().extractRotation(controller.matrixWorld);
    ctx._raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    ctx._raycaster.ray.direction.set(0, 0, -1).applyMatrix4(ctx._tempMatrix);
  }

  function isActuallyVisible(object) {
    let current = object;
    while (current) {
      if (current.visible === false) return false;
      current = current.parent;
    }
    return true;
  }

  function getVisibleIntersections(ctx, objects) {
    return ctx._raycaster.intersectObjects(objects, false).filter((hit) => isActuallyVisible(hit.object));
  }

  function getSurfaceMeshes(ctx) {
    return [ctx.meshes.hitProxy || ctx.meshes.preview].filter(Boolean);
  }

  function getControllerWorldData(ctx, THREE, controller) {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    controller.getWorldPosition(position);
    controller.getWorldQuaternion(quaternion);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
    return { position, quaternion, forward };
  }

  function getHeadPosition(ctx, THREE) {
    const head = ctx.renderer && ctx.renderer.xr && ctx.renderer.xr.isPresenting ? ctx.renderer.xr.getCamera() : ctx.camera;
    const position = new THREE.Vector3();
    head.getWorldPosition(position);
    return position;
  }

  function createSpatialGrabParams(THREE, distance) {
    const RC = RUNTIME_CONSTANTS;
    return {
      distanceGain: THREE.MathUtils.clamp(
        RC.SPATIAL_GRAB_GAIN_MIN + (distance * RC.SPATIAL_GRAB_GAIN_SLOPE),
        RC.SPATIAL_GRAB_GAIN_MIN,
        RC.SPATIAL_GRAB_GAIN_MAX
      ),
      smoothing: THREE.MathUtils.clamp(
        RC.SPATIAL_GRAB_SMOOTHING_MIN + (distance * RC.SPATIAL_GRAB_SMOOTHING_SLOPE),
        RC.SPATIAL_GRAB_SMOOTHING_MIN,
        RC.SPATIAL_GRAB_SMOOTHING_MAX
      )
    };
  }

  function updateSpatialGrabPosition(currentPosition, startPosition, controllerStart, controllerCurrent, distanceGain, smoothing) {
    const desired = controllerCurrent.clone().sub(controllerStart).multiplyScalar(distanceGain).add(startPosition);
    currentPosition.lerp(desired, smoothing);
  }

  function tryStartVideoGrab(ctx, THREE, controller) {
    if (!ctx.renderer.xr.isPresenting) return false;

    getControllerRay(ctx, controller);
    const intersections = ctx._raycaster.intersectObjects(getSurfaceMeshes(ctx), false);
    if (!intersections.length) return false;

    const worldData = getControllerWorldData(ctx, THREE, controller);
    if (ctx.state.mode.projection === 'screen') {
      const headPosition = getHeadPosition(ctx, THREE);
      const grabDistance = Math.max(ctx.surfaceRoot.position.distanceTo(headPosition), 0.5);
      const spatialGrab = createSpatialGrabParams(THREE, grabDistance);
      controller.userData.videoGrab = {
        type: 'screen',
        controllerStart: worldData.position.clone(),
        surfaceStart: ctx.surfaceRoot.position.clone(),
        targetPosition: ctx.surfaceRoot.position.clone(),
        rotationStart: ctx.surfaceRoot.rotation.clone(),
        distanceGain: spatialGrab.distanceGain,
        smoothing: spatialGrab.smoothing
      };
    } else {
      const headPosition = getHeadPosition(ctx, THREE);
      const startVector = worldData.position.clone().sub(headPosition);
      controller.userData.videoGrab = {
        type: 'immersive',
        startDirection: startVector.clone().normalize(),
        startDistance: Math.max(startVector.length(), 0.1),
        startScale: ctx.surfaceRoot.scale.clone(),
        startQuaternion: ctx.surfaceRoot.quaternion.clone()
      };
    }

    if (!ctx.videoGrabControllers.includes(controller)) {
      ctx.videoGrabControllers.push(controller);
    }
    ctx.state.lastInteraction = Date.now();
    return true;
  }

  function tryStartFloatingPanelGrab(ctx, THREE, controller, panelId) {
    if (!ctx.renderer.xr.isPresenting) return false;
    if (panelId === 'main-ui' && (!ctx.state.mode || ctx.state.mode.projection !== 'screen')) {
      return false;
    }
    const panelState = getFloatingPanelState(ctx, panelId);
    if (!panelState || !panelState.group || panelState.allowFreeGrab === false) return false;

    const worldData = getControllerWorldData(ctx, THREE, controller);
    const headPosition = getHeadPosition(ctx, THREE);
    const grabDistance = Math.max(panelState.group.position.distanceTo(headPosition), 0.5);
    const spatialGrab = createSpatialGrabParams(THREE, grabDistance);
    controller.userData.panelGrab = {
      panelId,
      controllerStart: worldData.position.clone(),
      panelStart: panelState.group.position.clone(),
      targetPosition: panelState.group.position.clone(),
      distanceGain: spatialGrab.distanceGain,
      smoothing: spatialGrab.smoothing
    };

    if (!ctx.panelGrabControllers.includes(controller)) {
      ctx.panelGrabControllers.push(controller);
    }
    ctx.state.lastInteraction = Date.now();
    return true;
  }

  function updateVideoGrab(ctx, THREE, controller) {
    const grab = controller.userData.videoGrab;
    if (!grab) return;

    const worldData = getControllerWorldData(ctx, THREE, controller);
    if (grab.type === 'screen') {
      updateSpatialGrabPosition(
        ctx.surfaceRoot.position,
        grab.surfaceStart,
        grab.controllerStart,
        worldData.position,
        grab.distanceGain,
        grab.smoothing
      );
      ctx.surfaceRoot.rotation.copy(grab.rotationStart);
    } else {
      const headPosition = getHeadPosition(ctx, THREE);
      const currentVector = worldData.position.clone().sub(headPosition);
      if (currentVector.lengthSq() > 0.0001) {
        const dragRotation = new THREE.Quaternion().setFromUnitVectors(grab.startDirection, currentVector.clone().normalize());
        ctx.surfaceRoot.quaternion.copy(dragRotation.multiply(grab.startQuaternion.clone()));
      }
      const distanceDelta = (currentVector.length() - grab.startDistance) * 24.7;
      const scaleFactor = THREE.MathUtils.clamp((grab.startDistance + distanceDelta) / grab.startDistance, 0.45, 3.25);
      ctx.surfaceRoot.scale.copy(grab.startScale).multiplyScalar(scaleFactor);
    }
    ctx.state.lastInteraction = Date.now();
    updateHarnessState(ctx);
  }

  function updateFloatingPanelGrab(ctx, THREE, controller) {
    const grab = controller.userData.panelGrab;
    if (!grab) return;
    const panelState = getFloatingPanelState(ctx, grab.panelId);
    if (!panelState || !panelState.group) return;
    const worldData = getControllerWorldData(ctx, THREE, controller);
    updateSpatialGrabPosition(
      panelState.group.position,
      grab.panelStart,
      grab.controllerStart,
      worldData.position,
      grab.distanceGain,
      grab.smoothing
    );
    ctx.state.lastInteraction = Date.now();
    updateHarnessState(ctx);
  }

  function stopVideoGrab(ctx, controller) {
    if (!controller.userData.videoGrab) return;
    delete controller.userData.videoGrab;
    ctx.videoGrabControllers = ctx.videoGrabControllers.filter((item) => item !== controller);
  }

  function stopFloatingPanelGrab(ctx, controller) {
    if (!controller.userData.panelGrab) return;
    delete controller.userData.panelGrab;
    ctx.panelGrabControllers = ctx.panelGrabControllers.filter((item) => item !== controller);
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

  function setPointerInputState(controller, key, active) {
    if (!controller || !controller.userData) return;
    controller.userData[key] = Boolean(active);
  }

  function setPointerVisuals(controller, THREE, options) {
    if (!controller || !controller.userData || !controller.userData.pointerRef) return;

    const pointer = controller.userData.pointerRef;
    const circle = controller.userData.pointerCircleRef;
    const targetColor = controller.userData.pointerTargetColor || new THREE.Color(0xffffff);
    const currentColor = controller.userData.pointerColor || new THREE.Color(0xffffff);
    const distance = Math.max(options.distance || 1.2, 0.06);

    controller.userData.pointerTargetColor = targetColor;
    controller.userData.pointerColor = currentColor;
    targetColor.setHex(options.color);
    currentColor.lerp(targetColor, 0.24);

    controller.userData.pointerTargetScale = options.scale;
    controller.userData.pointerScale = THREE.MathUtils.lerp(controller.userData.pointerScale || 1, controller.userData.pointerTargetScale, 0.24);
    controller.userData.pointerTargetOpacity = options.opacity;
    controller.userData.pointerOpacity = THREE.MathUtils.lerp(controller.userData.pointerOpacity || 0.22, controller.userData.pointerTargetOpacity, 0.24);

    pointer.visible = controller.visible !== false;
    pointer.position.z = -(distance - 0.0025);
    pointer.scale.setScalar(controller.userData.pointerScale);

    if (circle) {
      circle.material.color.copy(currentColor);
      circle.material.opacity = controller.userData.pointerOpacity;
    }
  }

  function onSelectStart(ctx, THREE, event) {
    const controller = event.target;
    setPointerInputState(controller, 'pointerTriggerActive', true);
    getControllerRay(ctx, controller);
    const surfaceIntersections = getVisibleIntersections(ctx, getSurfaceMeshes(ctx));
    const intersects = getVisibleIntersections(ctx, ctx.interactables);
    const debugPanelVisible = Boolean(ctx.debugPanelGroup && ctx.debugPanelGroup.visible);
    if (!ctx.state.uiVisible) {
      if (surfaceIntersections.length > 0) {
        clearPendingSurfaceSelect(controller);
        controller.userData.pendingSurfaceSelectAction = 'open-ui';
        controller.userData.pendingSurfaceSelectTimer = window.setTimeout(() => {
          controller.userData.pendingSurfaceSelectTimer = null;
          controller.userData.pendingSurfaceSelectAction = null;
          if (!ctx.state.uiVisible) {
            tryStartVideoGrab(ctx, THREE, controller);
            updateHarnessState(ctx);
          }
        }, RUNTIME_CONSTANTS.SURFACE_TRIGGER_GRAB_DELAY_MS);
      } else {
        if (debugPanelVisible && intersects.length > 0) {
          const obj = intersects[0].object;
          if (obj.userData.panelGrabTarget && tryStartFloatingPanelGrab(ctx, THREE, controller, obj.userData.panelId)) {
            controller.userData.lineActive = true;
            if (controller.userData.lineRef) {
              controller.userData.lineRef.material.color.setHex(0x38bdf8);
              controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
            }
            return;
          }
          if (obj.userData.onClick) obj.userData.onClick(intersects[0].point);
          if (obj.userData.onDrag) {
            controller.userData.dragTarget = obj;
            controller.userData.dragPlaneNormal = typeof obj.userData.getDragPlaneNormal === 'function'
              ? obj.userData.getDragPlaneNormal(THREE)
              : new THREE.Vector3(0, 0, 1).applyQuaternion(ctx.uiGroup.quaternion);
            controller.userData.dragPlanePoint = typeof obj.userData.getDragPlanePoint === 'function'
              ? obj.userData.getDragPlanePoint(THREE)
              : obj.getWorldPosition(new THREE.Vector3());
          }
          controller.userData.lineActive = true;
          if (controller.userData.lineRef) {
            controller.userData.lineRef.material.color.setHex(0x38bdf8);
            controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
          }
          return;
        }
        openUI(ctx, THREE, controller, 'trigger');
        return;
      }
      controller.userData.lineActive = true;
      if (controller.userData.lineRef) {
        controller.userData.lineRef.material.color.setHex(0x38bdf8);
        controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
      }
      return;
    }
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData.panelGrabTarget && tryStartFloatingPanelGrab(ctx, THREE, controller, obj.userData.panelId)) {
        controller.userData.lineActive = true;
        if (controller.userData.lineRef) {
          controller.userData.lineRef.material.color.setHex(0x38bdf8);
          controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
        }
        return;
      }
      if (obj.userData.onClick) obj.userData.onClick(intersects[0].point);
      if (obj.userData.onDrag) {
        controller.userData.dragTarget = obj;
        controller.userData.dragPlaneNormal = typeof obj.userData.getDragPlaneNormal === 'function'
          ? obj.userData.getDragPlaneNormal(THREE)
          : new THREE.Vector3(0, 0, 1).applyQuaternion(ctx.uiGroup.quaternion);
        controller.userData.dragPlanePoint = typeof obj.userData.getDragPlanePoint === 'function'
          ? obj.userData.getDragPlanePoint(THREE)
          : obj.getWorldPosition(new THREE.Vector3());
      }
    } else if (!ctx.state.showingLayout && !ctx.state.showingSettings && surfaceIntersections.length > 0) {
      clearPendingSurfaceSelect(controller);
      controller.userData.pendingSurfaceSelectAction = 'close-ui';
      controller.userData.pendingSurfaceSelectTimer = window.setTimeout(() => {
        controller.userData.pendingSurfaceSelectTimer = null;
        controller.userData.pendingSurfaceSelectAction = null;
        if (ctx.state.uiVisible && !ctx.state.showingLayout && !ctx.state.showingSettings) {
          tryStartVideoGrab(ctx, THREE, controller);
          updateHarnessState(ctx);
        }
      }, RUNTIME_CONSTANTS.SURFACE_TRIGGER_GRAB_DELAY_MS);
    } else {
      closeUI(ctx, THREE, 'trigger-empty');
    }
    controller.userData.lineActive = true;
    if (controller.userData.lineRef) {
      controller.userData.lineRef.material.color.setHex(0x38bdf8);
      controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
    }
  }

  function onSqueezeStart(ctx, THREE, event) {
    const controller = event.target;
    setPointerInputState(controller, 'pointerSqueezeActive', true);
    ctx.state.lastInteraction = Date.now();
    if (ctx.state.showingLayout || ctx.state.showingSettings) {
      return;
    }
    getControllerRay(ctx, controller);
    const intersects = getVisibleIntersections(ctx, ctx.interactables);
    if (intersects.length > 0 && intersects[0].object.userData.panelGrabTarget) {
      if (tryStartFloatingPanelGrab(ctx, THREE, controller, intersects[0].object.userData.panelId)) {
        controller.userData.lineActive = true;
        if (controller.userData.lineRef) {
          controller.userData.lineRef.material.color.setHex(0x38bdf8);
          controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
        }
        updateHarnessState(ctx);
        return;
      }
    }
    tryStartVideoGrab(ctx, THREE, controller);
    controller.userData.lineActive = true;
    if (controller.userData.lineRef) {
      controller.userData.lineRef.material.color.setHex(0x38bdf8);
      controller.userData.lineColor.copy(controller.userData.lineRef.material.color);
    }
    updateHarnessState(ctx);
  }

  function onSelectEnd(ctx, THREE, event) {
    const controller = event.target;
    setPointerInputState(controller, 'pointerTriggerActive', false);
    const pendingSurfaceAction = controller.userData.pendingSurfaceSelectAction;
    const pendingSurfaceTap = Boolean(controller.userData.pendingSurfaceSelectTimer) && !controller.userData.videoGrab;
    clearPendingSurfaceSelect(controller);
    stopVideoGrab(ctx, controller);
    stopFloatingPanelGrab(ctx, controller);
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
      closeUI(ctx, THREE, 'trigger-surface-close');
    } else if (pendingSurfaceTap && pendingSurfaceAction === 'open-ui') {
      openUI(ctx, THREE, controller, 'trigger-surface-open');
    }
    updateHarnessState(ctx);
  }

  function onSqueezeEnd(ctx, event) {
    setPointerInputState(event.target, 'pointerSqueezeActive', false);
    event.target.userData.lineActive = false;
    if (event.target.userData.lineRef) {
      event.target.userData.lineRef.material.color.setHex(0xffffff);
      event.target.userData.lineColor.copy(event.target.userData.lineRef.material.color);
    }
    stopVideoGrab(ctx, event.target);
    stopFloatingPanelGrab(ctx, event.target);
    updateHarnessState(ctx);
  }

  function updateHover(ctx, THREE, controllers) {
    let hit = false;
    const hasFloatingUi = ctx.state.uiVisible || (ctx.debugPanelGroup && ctx.debugPanelGroup.visible);
    if (!hasFloatingUi && ctx._hoveredObj) {
      if (ctx._hoveredObj.material.color) ctx._hoveredObj.material.color.setHex(ctx._hoveredObj.userData.bg);
      ctx._hoveredObj = null;
    }

    for (let i = 0; i < controllers.length; i++) {
      const controller = controllers[i];
      if (!controller) continue;
      const line = controller.userData.lineRef || controller.children[0];
      if (!controller.visible) {
        if (controller.userData.pointerRef) controller.userData.pointerRef.visible = false;
        if (line) line.visible = false;
        continue;
      }
      if (line) line.visible = true;

      if (controller.userData.lineRef) {
        controller.userData.lineTargetColor.setHex(controller.userData.lineActive ? 0x38bdf8 : 0xffffff);
        controller.userData.lineColor.lerp(controller.userData.lineTargetColor, 0.18);
        controller.userData.lineRef.material.color.copy(controller.userData.lineColor);
        controller.userData.lineOpacity = THREE.MathUtils.lerp(
          controller.userData.lineOpacity || 0.18,
          controller.userData.lineTargetOpacity || 0.18,
          0.18
        );
        controller.userData.lineRef.material.opacity = controller.userData.lineOpacity;
      }

      ctx._tempMatrix.identity().extractRotation(controller.matrixWorld);
      ctx._raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      ctx._raycaster.ray.direction.set(0, 0, -1).applyMatrix4(ctx._tempMatrix);

      const interactableIntersections = hasFloatingUi ? getVisibleIntersections(ctx, ctx.interactables) : [];
      const surfaceIntersections = getVisibleIntersections(ctx, getSurfaceMeshes(ctx));
      const bestHit = interactableIntersections[0] || surfaceIntersections[0] || null;
      const isHoveringUi = Boolean(interactableIntersections.length > 0);
      const isGrabActive = Boolean(controller.userData.videoGrab || controller.userData.panelGrab || controller.userData.dragTarget);
      const isPressed = Boolean(controller.userData.pointerTriggerActive);
      const isSqueezing = Boolean(controller.userData.pointerSqueezeActive);

      if (isHoveringUi) {
        const obj = interactableIntersections[0].object;
        if (ctx._hoveredObj && ctx._hoveredObj !== obj) {
          if (ctx._hoveredObj.material.color) ctx._hoveredObj.material.color.setHex(ctx._hoveredObj.userData.bg);
        }
        ctx._hoveredObj = obj;
        if (ctx._hoveredObj.material.color) ctx._hoveredObj.material.color.setHex(ctx._hoveredObj.userData.hover);
        hit = true;
        ctx.state.lastInteraction = Date.now();
      } else if (ctx._hoveredObj) {
        if (ctx._hoveredObj.material.color) ctx._hoveredObj.material.color.setHex(ctx._hoveredObj.userData.bg);
        ctx._hoveredObj = null;
      }

      let pointerColor = 0xffffff;
      let pointerScale = 1.0;
      let pointerOpacity = 0.22;

      if (bestHit) {
        pointerScale = isHoveringUi ? 0.92 : 0.96;
        pointerOpacity = isHoveringUi ? 0.3 : 0.24;
        controller.userData.lineTargetOpacity = isHoveringUi ? 0.24 : 0.16;
      } else {
        controller.userData.lineTargetOpacity = 0.12;
      }

      if (isPressed) {
        pointerColor = 0x7dd3fc;
        pointerScale = 0.8;
        pointerOpacity = 0.38;
        controller.userData.lineTargetOpacity = 0.42;
      }

      if (isSqueezing || isGrabActive) {
        pointerColor = 0x38bdf8;
        pointerScale = 0.72;
        pointerOpacity = 0.44;
        controller.userData.lineTargetOpacity = 0.48;
      }

      setPointerVisuals(controller, THREE, {
        color: pointerColor,
        distance: bestHit ? bestHit.distance : 1.2,
        scale: pointerScale,
        opacity: pointerOpacity
      });

      if (bestHit) {
        const dist = bestHit.distance;
        if (line) line.scale.z = dist / 5;
      } else {
        if (line) line.scale.z = 1.2 / 5;
      }
    }

    if (!hit && ctx._hoveredObj && hasFloatingUi) {
      if (ctx._hoveredObj.material.color) ctx._hoveredObj.material.color.setHex(ctx._hoveredObj.userData.bg);
      ctx._hoveredObj = null;
    }
  }

  function createAnimationLoop(ctx, THREE) {
    const layerPositionThresholdSq = Math.pow(RUNTIME_CONSTANTS.LAYER_POSITION_THRESHOLD_METERS, 2);
    const layerRotationThresholdCos = Math.cos((RUNTIME_CONSTANTS.LAYER_ROTATION_THRESHOLD_DEG * Math.PI / 180) / 2);
    if (!ctx._surfaceLastLayerPosition) ctx._surfaceLastLayerPosition = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
    if (!ctx._surfaceLastLayerQuaternion) ctx._surfaceLastLayerQuaternion = new THREE.Quaternion(Number.NaN, Number.NaN, Number.NaN, Number.NaN);
    if (!ctx._dragPlane) ctx._dragPlane = new THREE.Plane();
    if (!ctx._dragIntersectPoint) ctx._dragIntersectPoint = new THREE.Vector3();

    return () => {
      const now = performance.now();
      if (ctx.state.debugMetricsEnabled) {
        if (ctx.lastFrameAt > 0) {
          const frameMs = now - ctx.lastFrameAt;
          ctx.debugMetricsFrameCount += 1;
          ctx.debugMetricsAccumMs += frameMs;
          ctx.debugMetricsMinMs = Math.min(ctx.debugMetricsMinMs, frameMs);
          ctx.debugMetricsMaxMs = Math.max(ctx.debugMetricsMaxMs, frameMs);
          if (frameMs > 25) ctx.debugMetricsSlowFrameCount += 1;
        }
        if (ctx.debugMetricsLastSampleAt === 0) {
          ctx.debugMetricsLastSampleAt = now;
        }
        if (now - ctx.debugMetricsLastSampleAt >= 750 && ctx.debugMetricsFrameCount > 0) {
          const elapsedMs = now - ctx.debugMetricsLastSampleAt;
          const rendererInfo = ctx.renderer ? ctx.renderer.info : null;
          ctx.debugMetrics.fps = (ctx.debugMetricsFrameCount * 1000) / elapsedMs;
          ctx.debugMetrics.avgFrameMs = ctx.debugMetricsAccumMs / ctx.debugMetricsFrameCount;
          ctx.debugMetrics.minFrameMs = Number.isFinite(ctx.debugMetricsMinMs) ? ctx.debugMetricsMinMs : 0;
          ctx.debugMetrics.maxFrameMs = ctx.debugMetricsMaxMs;
          ctx.debugMetrics.slowFrames = ctx.debugMetricsSlowFrameCount;
          ctx.debugMetrics.rendererCalls = rendererInfo ? rendererInfo.render.calls : 0;
          ctx.debugMetrics.rendererTriangles = rendererInfo ? rendererInfo.render.triangles : 0;
          ctx.debugMetrics.rendererLines = rendererInfo ? rendererInfo.render.lines : 0;
          ctx.debugMetrics.rendererPoints = rendererInfo ? rendererInfo.render.points : 0;
          ctx.debugMetrics.rendererTextures = rendererInfo ? rendererInfo.memory.textures : 0;
          ctx.debugMetrics.rendererPrograms = rendererInfo && rendererInfo.programs ? rendererInfo.programs.length : 0;
          ctx.debugMetrics.jsHeapMb = performance.memory && typeof performance.memory.usedJSHeapSize === 'number'
            ? performance.memory.usedJSHeapSize / (1024 * 1024)
            : null;
          ctx.debugMetrics.layerCommitCount = ctx.xrLayerCommitCount;
          ctx.debugMetrics.layerRecreateCount = ctx.xrLayerRecreateCount;
          ctx.debugMetrics.layerSyncCount = ctx.xrLayerSyncCount;
          ctx.debugMetricsFrameCount = 0;
          ctx.debugMetricsAccumMs = 0;
          ctx.debugMetricsMinMs = Infinity;
          ctx.debugMetricsMaxMs = 0;
          ctx.debugMetricsSlowFrameCount = 0;
          ctx.debugMetricsLastSampleAt = now;
        }
      }
      ctx.lastFrameAt = now;

      const dur = ctx.jellyfinVideo.duration || 0;
      const cur = ctx.jellyfinVideo.currentTime || 0;
      if (ctx.timeCurrentObj) ctx.timeCurrentObj.text = formatTime(cur);
      if (ctx.timeDurationObj) ctx.timeDurationObj.text = formatTime(dur);

      const ratio = dur > 0 ? (cur / dur) : 0;
      const sW = 1.9;
      ctx.seekFill.scale.x = ratio || 0.001;
      ctx.seekFill.position.x = (-sW / 2) + (sW * ratio) / 2;

      if (ctx.jellyfinVideo.buffered && ctx.jellyfinVideo.buffered.length > 0) {
        const bufEnd = ctx.jellyfinVideo.buffered.end(ctx.jellyfinVideo.buffered.length - 1);
        const bRatio = dur > 0 ? (bufEnd / dur) : 0;
        ctx.seekBuf.scale.x = bRatio || 0.001;
        ctx.seekBuf.position.x = (-sW / 2) + (sW * bRatio) / 2;
      } else {
        ctx.seekBuf.scale.x = 0.001;
      }

      if (ctx.playIconGroup && ctx.pauseIconGroup) {
        ctx.playIconGroup.visible = ctx.jellyfinVideo.paused;
        ctx.pauseIconGroup.visible = !ctx.jellyfinVideo.paused;
      }

      // Marquee scroll for long titles
      if (ctx.titleTextObj && ctx.titleTextObj.textRenderInfo) {
        const titleW = ctx.titleTextObj.textRenderInfo.blockBounds
          ? (ctx.titleTextObj.textRenderInfo.blockBounds[2] - ctx.titleTextObj.textRenderInfo.blockBounds[0])
          : 0;
        const clipW = 1.9;
        if (titleW > clipW) {
          const overflow = titleW - clipW;
          if (ctx.marqueePauseTimer > 0) {
            ctx.marqueePauseTimer -= 0.016;
          } else {
            ctx.marqueeOffset += (ctx.marqueeDir === 0 ? -0.3 : 0.3) * 0.016;
            if (ctx.marqueeOffset < -overflow / 2) {
              ctx.marqueeOffset = -overflow / 2;
              ctx.marqueeDir = 1;
              ctx.marqueePauseTimer = 1.5;
            } else if (ctx.marqueeOffset > 0) {
              ctx.marqueeOffset = 0;
              ctx.marqueeDir = 0;
              ctx.marqueePauseTimer = 2.0;
            }
          }
          ctx.titleTextObj.position.x = ctx.marqueeOffset;
        } else {
          ctx.titleTextObj.position.x = 0;
        }
      }

      updateHover(ctx, THREE, [ctx.renderer.xr.getController(0), ctx.renderer.xr.getController(1)]);

      for (let i = 0; i < ctx.videoGrabControllers.length; i++) {
        updateVideoGrab(ctx, THREE, ctx.videoGrabControllers[i]);
      }

      for (let i = 0; i < ctx.panelGrabControllers.length; i++) {
        updateFloatingPanelGrab(ctx, THREE, ctx.panelGrabControllers[i]);
      }

      if (ctx.state.mode && ctx.state.mode.projection === 'screen' && ctx.state.screenFacePlayer && ctx.surfaceRoot) {
        faceObjectTowardViewer(ctx, THREE, ctx.surfaceRoot, { yawOnly: true });
      }
      for (let i = 0; i < ctx.floatingPanels.length; i += 1) {
        updateFloatingPanelFacing(ctx, THREE, ctx.floatingPanels[i]);
      }

      if (ctx.mediaVideoLayer && ctx.surfaceRoot) {
        const surfaceTransform = getSurfaceWorldTransform(ctx, THREE);
        try {
          const activeScreenGrab = ctx.videoGrabControllers.some((controller) => controller.userData && controller.userData.videoGrab && controller.userData.videoGrab.type === 'screen');
          const layerPositionChanged = !Number.isFinite(ctx._surfaceLastLayerPosition.x)
            || ctx._surfaceLastLayerPosition.distanceToSquared(surfaceTransform.position) > layerPositionThresholdSq;
          const layerRotationChanged = !Number.isFinite(ctx._surfaceLastLayerQuaternion.x)
            || Math.abs(ctx._surfaceLastLayerQuaternion.dot(surfaceTransform.quaternion)) < layerRotationThresholdCos;
          const enoughTimePassed = activeScreenGrab || (now - ctx._lastLayerTransformSyncAt) >= RUNTIME_CONSTANTS.LAYER_SYNC_INTERVAL_MS;
          if ((layerPositionChanged || layerRotationChanged) && enoughTimePassed) {
            ctx.mediaVideoLayer.transform = new window.XRRigidTransform(
              { x: surfaceTransform.position.x, y: surfaceTransform.position.y, z: surfaceTransform.position.z },
              { x: surfaceTransform.quaternion.x, y: surfaceTransform.quaternion.y, z: surfaceTransform.quaternion.z, w: surfaceTransform.quaternion.w }
            );
            ctx._lastLayerTransformSyncAt = now;
            ctx._surfaceLastLayerPosition.copy(surfaceTransform.position);
            ctx._surfaceLastLayerQuaternion.copy(surfaceTransform.quaternion);
            if (ctx.mediaLayerDebugSpec && ctx.mediaLayerDebugSpec.transform) {
              ctx.mediaLayerDebugSpec.transform.position = {
                x: surfaceTransform.position.x,
                y: surfaceTransform.position.y,
                z: surfaceTransform.position.z
              };
              ctx.mediaLayerDebugSpec.transform.orientation = {
                x: surfaceTransform.quaternion.x,
                y: surfaceTransform.quaternion.y,
                z: surfaceTransform.quaternion.z,
                w: surfaceTransform.quaternion.w
              };
            }
          }
        } catch (_syncErr) {
          // Best-effort per-frame sync.
        }
      }

      for (let i = 0; i < 2; i++) {
        const controller = ctx.renderer.xr.getController(i);
        if (controller && controller.userData && controller.userData.dragTarget) {
          const obj = controller.userData.dragTarget;
          ctx._tempMatrix.identity().extractRotation(controller.matrixWorld);
          ctx._raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
          ctx._raycaster.ray.direction.set(0, 0, -1).applyMatrix4(ctx._tempMatrix);

          const normal = controller.userData.dragPlaneNormal || ctx._dragPlaneNormal || new THREE.Vector3(0, 0, 1).applyQuaternion(ctx.uiGroup.quaternion);
          const dragPlanePos = controller.userData.dragPlanePoint || obj.getWorldPosition(ctx._dragIntersectPoint.set(0, 0, 0));
          const plane = ctx._dragPlane.setFromNormalAndCoplanarPoint(normal, dragPlanePos);
          if (ctx._raycaster.ray.intersectPlane(plane, ctx._dragIntersectPoint)) {
            if (obj.userData.onDrag) obj.userData.onDrag(ctx._dragIntersectPoint.clone());
          }
          ctx.state.lastInteraction = Date.now();
        }
      }

      if (ctx.state.uiVisible && Date.now() - ctx.state.lastInteraction > 5000) {
        toggleUI(ctx, THREE);
      }

      if (ctx.infoGroup && ctx.infoGroup.visible && now - ctx.infoPanelLastRefreshAt >= 500) {
        ctx.infoPanelLastRefreshAt = now;
        ctx.updateInfoPanelStatus();
      }
      if (ctx.debugPanelGroup && ctx.debugPanelGroup.visible && now - ctx.debugPanelLastRefreshAt >= 500) {
        ctx.updateDebugPanelStatus();
      }

      ctx.renderer.render(ctx.scene, ctx.camera);
    };
  }

  function createPlayIcon(THREE, parent, x, y, scale, color) {
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

  function createPauseIcon(THREE, parent, x, y, scale, color) {
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

  function createSeekBackIcon(THREE, parent, x, y, scale, color) {
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

  function createSeekFwdIcon(THREE, parent, x, y, scale, color) {
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

  function createSpeakerIcon(THREE, parent, x, y, scale, color) {
    const group = new THREE.Group();
    group.position.set(x, y, 0.01);
    const s = scale;
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const body = new THREE.PlaneGeometry(0.014 * s, 0.022 * s);
    const bm = new THREE.Mesh(body, mat);
    bm.position.x = -0.016 * s;
    group.add(bm);
    const cone = new THREE.Shape();
    cone.moveTo(-8e-3 * s, 0.015 * s);
    cone.lineTo(-8e-3 * s, -0.015 * s);
    cone.lineTo(0.012 * s, -0.028 * s);
    cone.lineTo(0.012 * s, 0.028 * s);
    cone.closePath();
    group.add(new THREE.Mesh(new THREE.ShapeGeometry(cone), mat));
    parent.add(group);
    return group;
  }

  function createSunIcon(THREE, parent, x, y, scale, color) {
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

  function createGearIcon(THREE, parent, x, y, scale, color) {
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

  function createCloseIcon(THREE, parent, x, y, scale, color) {
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

  function createCenterIcon(THREE, parent, x, y, scale, color) {
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

  function createLayoutIcon(THREE, parent, x, y, scale, color) {
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

  function createCurveStartIcon(THREE, parent, x, y) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.024), mat);
    frame.position.set(x, y, 0.01);
    parent.add(frame);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.016), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
    inner.position.set(x, y, 0.011);
    parent.add(inner);
  }

  function createCurveEndIcon(THREE, parent, x, y) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
    const arc = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 20, 1, Math.PI * 0.15, Math.PI * 0.7), mat);
    arc.position.set(x, y, 0.01);
    arc.rotation.z = Math.PI;
    parent.add(arc);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.004), mat);
    base.position.set(x, y - 0.016, 0.01);
    parent.add(base);
  }

  function createNearIcon(THREE, parent, x, y) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
    const box = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.018), mat);
    box.position.set(x, y, 0.01);
    parent.add(box);
  }

  function createFarIcon(THREE, parent, x, y) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.032), mat);
    outer.position.set(x, y, 0.01);
    parent.add(outer);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
    inner.position.set(x, y, 0.011);
    parent.add(inner);
  }

  function createMoonIcon(THREE, parent, x, y, scale, color) {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.015 * scale, 24), mat);
    moon.position.set(x, y, 0.01);
    parent.add(moon);
    const cut = new THREE.Mesh(new THREE.CircleGeometry(0.012 * scale, 24), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
    cut.position.set(x + 0.006 * scale, y + 0.002 * scale, 0.011);
    parent.add(cut);
  }

  function createBillboardIcon(THREE, parent, x, y, scale, color) {
    const group = new THREE.Group();
    group.position.set(x, y, 0.01);
    const s = scale;
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.048 * s, 0.03 * s), mat);
    group.add(frame);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.036 * s, 0.018 * s), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
    inner.position.z = 0.001;
    group.add(inner);
    const viewer = new THREE.Mesh(new THREE.CircleGeometry(0.008 * s, 20), mat);
    viewer.position.set(0, -0.028 * s, 0.001);
    group.add(viewer);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.004 * s, 0.018 * s), mat);
    line.position.set(0, -0.013 * s, 0.001);
    group.add(line);
    parent.add(group);
    return group;
  }

  function buildUI(ctx, THREE, Text, closeFn, applyModeFromState, updatePassthroughVisuals) {
    const RC = RUNTIME_CONSTANTS;
    const iconMatColor = 0xe2e8f0;

    const frostedMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    const btnMatBase = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.9 });

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
      ctx.textObjects.push(t);
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
      ctx.interactables.push(mesh);
      let textObj = null;
      if (label) {
        textObj = createTextObj(label, mesh, 0, 0, radius * 0.9, iconMatColor);
      }
      return { mesh, textObj };
    }

    function createPillButton(id, parent, x, y, width, height, label, onClick) {
      const mesh = new THREE.Mesh(
        createRoundedRectGeometry(THREE, width, height, height / 2),
        new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.95 })
      );
      mesh.position.set(x, y, 0.01);
      mesh.userData = { id, isBtn: true, bg: 0x1e293b, hover: 0x334155, onClick };
      parent.add(mesh);
      ctx.interactables.push(mesh);
      const textObj = createTextObj(label, parent, x, y, 0.018, iconMatColor, 'center');
      textObj.position.z = 0.02;
      return {
        mesh,
        textObj,
        setLabel(nextLabel, active) {
          textObj.text = nextLabel;
          textObj.color = active ? 0x7dd3fc : 0xe2e8f0;
          textObj.sync();
          if (mesh.material && mesh.material.color) {
            mesh.material.color.setHex(active ? 0x0f3a52 : 0x1e293b);
          }
          mesh.userData.bg = active ? 0x0f3a52 : 0x1e293b;
          mesh.userData.hover = active ? 0x15516f : 0x334155;
        }
      };
    }

    function resetDebugMetricsState() {
      ctx.debugMetricsFrameCount = 0;
      ctx.debugMetricsAccumMs = 0;
      ctx.debugMetricsMinMs = Infinity;
      ctx.debugMetricsMaxMs = 0;
      ctx.debugMetricsSlowFrameCount = 0;
      ctx.debugMetricsLastSampleAt = 0;
    }

    function makePanelBlocker(mesh, id, color) {
      mesh.userData = {
        id,
        bg: color,
        hover: color,
        onClick: () => {},
        onDrag: () => {}
      };
      ctx.interactables.push(mesh);
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
        createRoundedRectGeometry(THREE, width, height, 0.045),
        new THREE.MeshBasicMaterial({ color: 0x152234, transparent: true, opacity: 0.96 })
      );
      bg.userData = { id: mode.id, bg: 0x152234, hover: 0x1f3550, onClick };
      ctx.interactables.push(bg);
      ctx.layoutCardMeshes.push(bg);
      group.add(bg);

      createModeGlyph(group, mode).position.set((-width / 2) + 0.09, 0.005, 0.003);
      createTextObj(mode.label, group, (-width / 2) + 0.18, 0.022, 0.03, 0xe2e8f0, 'left');
      createTextObj(getModeShapeLabel(mode), group, (-width / 2) + 0.18, -0.024, 0.021, 0x94a3b8, 'left');
      return group;
    }

    function createSlider(id, parent, x, y, w, h, initVal, onChange, options) {
      const config = options || {};
      const group = new THREE.Group();
      group.position.set(x, y, 0.01);
      parent.add(group);

      const bgGeo = createRoundedRectGeometry(THREE, w, h, h / 2);
      const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const bg = new THREE.Mesh(bgGeo, bgMat);

      const fillGeo = createRoundedRectGeometry(THREE, w, h, h / 2);
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
      ctx.interactables.push(bg);

      return { group, updateFill, track: bg };
    }

    function createVerticalSlider(id, parent, x, y, w, h, initVal, onChange, bottomIcon, topIcon) {
      const group = new THREE.Group();
      group.position.set(x, y, 0.02);
      group.visible = false;
      parent.add(group);

      const panelH = h + 0.18;
      const panelGeo = createRoundedRectGeometry(THREE, w + 0.06, panelH, 0.04);
      const panelBg = new THREE.Mesh(panelGeo, frostedMat.clone());
      panelBg.position.set(0, 0, -5e-3);
      group.add(panelBg);
      makePanelBlocker(panelBg, id + '-panel', 0x0f172a);

      const bgGeo = createRoundedRectGeometry(THREE, w, h, w / 2);
      const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      group.add(bg);

      const fillGeo = createRoundedRectGeometry(THREE, w, h, w / 2);
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
      ctx.interactables.push(bg);

      return { group, updateFill };
    }

    // --- Main Dock (3 rows: title / controls / seekbar+time) ---
    ctx.uiGroup = new THREE.Group();
    ctx.uiGroup.position.set(0, 0, -ctx.state.uiDistance);
    ctx.uiGroup.scale.setScalar(RC.BASE_UI_SCALE * ctx.state.uiScale);
    ctx.scene.add(ctx.uiGroup);

    const dockW = 2.2;
    const dockH = 0.48;
    const dockGeo = createRoundedRectGeometry(THREE, dockW, dockH, 0.08);
    ctx.bgMesh = new THREE.Mesh(dockGeo, frostedMat);
    ctx.bgMesh.position.set(0, 0, 0);
    ctx.uiGroup.add(ctx.bgMesh);
    makePanelBlocker(ctx.bgMesh, 'dock-bg', 0x0f172a);
    ctx.bgMesh.userData.panelGrabTarget = true;
    ctx.bgMesh.userData.panelId = 'main-ui';
    ctx.mainUiState = {
      id: 'main-ui',
      group: ctx.uiGroup,
      facePlayerEnabled: ctx.state.uiFacePlayer,
      allowFreeGrab: true,
      distance: ctx.state.uiDistance
    };
    registerFloatingPanel(ctx, ctx.mainUiState);

    // === Row 1 (top): Video Title with marquee ===
    const titleY = 0.16;
    const titleClipGroup = new THREE.Group();
    titleClipGroup.position.set(0, titleY, 0.01);
    ctx.uiGroup.add(titleClipGroup);

    const videoTitle = getVideoTitle();
    ctx.titleTextObj = new Text();
    ctx.titleTextObj.text = videoTitle || 'Loading...';
    ctx.titleTextObj.fontSize = 0.038;
    ctx.titleTextObj.sdfGlyphSize = 256;
    ctx.titleTextObj.color = 0xf0f6ff;
    ctx.titleTextObj.anchorX = 'center';
    ctx.titleTextObj.anchorY = 'middle';
    ctx.titleTextObj.outlineWidth = 0.0014;
    ctx.titleTextObj.outlineColor = 0x030712;
    ctx.titleTextObj.maxWidth = 8;
    ctx.titleTextObj.position.set(0, 0, 0.01);
    titleClipGroup.add(ctx.titleTextObj);

    // === Row 2 (middle): Control buttons ===
    const btnY = 0.02;
    const btnR = 0.055;
    const playR = 0.065;
    const ctrlSpacing = 0.16;
    const sideSpacing = 0.22;

    const closeBtn3d = createRoundBtn('btn-close', ctx.uiGroup, -0.92, btnY, btnR, null, () => closeFn());
    createCloseIcon(THREE, closeBtn3d.mesh, 0, 0, 1.0, 0xfca5a5);

    const centerBtn3d = createRoundBtn('btn-center', ctx.uiGroup, -0.76, btnY, btnR, null, () => recenterActiveMode(ctx, THREE));
    createCenterIcon(THREE, centerBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);

    const stereoBtn3d = createRoundBtn('btn-stereo-lock', ctx.uiGroup, -0.6, btnY, btnR, null, () => cycleStereoLock(ctx, THREE));
    ctx.stereoToggleLabel = createStereoToggleLabel(stereoBtn3d.mesh, 0, 0);

    const layoutBtn3d = createRoundBtn('btn-layout', ctx.uiGroup, 0.76, btnY, btnR, null, () => {
      window.__JFVR_RUNTIME_ACTIONS__.toggleLayout();
    });
    createLayoutIcon(THREE, layoutBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

    const seekBackBtn3d = createRoundBtn('btn-back', ctx.uiGroup, -ctrlSpacing, btnY, btnR, null, () => ctx.jellyfinVideo.currentTime -= 10);
    createSeekBackIcon(THREE, seekBackBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

    const playBtn3d = createRoundBtn('btn-play', ctx.uiGroup, 0, btnY, playR, null, () => ctx.jellyfinVideo.paused ? ctx.jellyfinVideo.play() : ctx.jellyfinVideo.pause());
    ctx.playIconGroup = createPlayIcon(THREE, playBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);
    ctx.pauseIconGroup = createPauseIcon(THREE, playBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);
    ctx.pauseIconGroup.visible = false;

    const seekFwdBtn3d = createRoundBtn('btn-fwd', ctx.uiGroup, ctrlSpacing, btnY, btnR, null, () => ctx.jellyfinVideo.currentTime += 10);
    createSeekFwdIcon(THREE, seekFwdBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

    // Volume button
    const volBtnX = ctrlSpacing + sideSpacing;
    const volBtn3d = createRoundBtn('btn-vol', ctx.uiGroup, volBtnX, btnY, btnR, null, () => {
      ctx.volSliderVisible = !ctx.volSliderVisible;
      ctx.volSliderGroup.visible = ctx.volSliderVisible;
      if (ctx.volSliderVisible) { ctx.ptSliderVisible = false; ctx.ptSliderGroup.visible = false; }
      ctx.state.showingSettings = false;
      ctx.state.showingLayout = false;
      if (ctx.settingsGroup) ctx.settingsGroup.visible = false;
      if (ctx.layoutGroup) ctx.layoutGroup.visible = false;
      if (ctx.infoGroup) ctx.infoGroup.visible = false;
    });
    createSpeakerIcon(THREE, volBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

    // Passthrough lighting button
    const ptBtnX = volBtnX + 0.14;
    const ptBtn3d = createRoundBtn('btn-pt', ctx.uiGroup, ptBtnX, btnY, btnR, null, () => {
      ctx.ptSliderVisible = !ctx.ptSliderVisible;
      ctx.ptSliderGroup.visible = ctx.ptSliderVisible;
      if (ctx.ptSliderVisible) { ctx.volSliderVisible = false; ctx.volSliderGroup.visible = false; }
      ctx.state.showingSettings = false;
      ctx.state.showingLayout = false;
      if (ctx.settingsGroup) ctx.settingsGroup.visible = false;
      if (ctx.layoutGroup) ctx.layoutGroup.visible = false;
      if (ctx.infoGroup) ctx.infoGroup.visible = false;
      if (!ctx.state.passthroughEnabled) {
        ctx.state.passthroughEnabled = true;
        updatePassthroughVisuals();
      }
    });
    createSunIcon(THREE, ptBtn3d.mesh, 0, 0, 1.0, 0xfbbf24);

    // Settings button
    const settingsBtn3d = createRoundBtn('btn-settings', ctx.uiGroup, 0.92, btnY, btnR, null, () => {
      window.__JFVR_RUNTIME_ACTIONS__.toggleSettings();
    });
    createGearIcon(THREE, settingsBtn3d.mesh, 0, 0, 1.0, 0x94a3b8);

    // === Vertical Sliders ===
    const vSliderW = 0.05;
    const vSliderH = 0.35;

    const volSld = createVerticalSlider('vs-vol', ctx.uiGroup, volBtnX, btnY + 0.36, vSliderW, vSliderH,
      ctx.jellyfinVideo.volume || 1,
      (v) => {
        ctx.jellyfinVideo.volume = v;
        ctx.jellyfinVideo.muted = (v === 0);
      },
      (p, x, y, s, c) => {
        const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
        const body = new THREE.PlaneGeometry(0.01 * s, 0.015 * s);
        const bm = new THREE.Mesh(body, mat);
        bm.position.set(x, y, 0.01);
        p.add(bm);
      },
      (p, x, y, s, c) => {
        createSpeakerIcon(THREE, p, x, y, s, c);
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
    ctx.volSliderGroup = volSld.group;

    const ptSld = createVerticalSlider('vs-pt', ctx.uiGroup, ptBtnX, btnY + 0.36, vSliderW, vSliderH,
      ctx.state.passthroughBrightness,
      (v) => { ctx.state.passthroughBrightness = v; updatePassthroughVisuals(); },
      (p, x, y, s, c) => {
        const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
        const crescent = new THREE.CircleGeometry(0.012 * s, 24);
        const cm = new THREE.Mesh(crescent, mat);
        cm.position.set(x, y, 0.01);
        p.add(cm);
      },
      (p, x, y, s, c) => { createSunIcon(THREE, p, x, y, s, c); }
    );
    ctx.ptSliderGroup = ptSld.group;
    ctx.ptSliderUpdateFill = ptSld.updateFill;

    // === Row 3 (bottom): Seekbar + split time ===
    const seekY = -0.14;
    const seekW = 1.9;
    const seekH = 0.04;
    const seekGroup = new THREE.Group();
    seekGroup.position.set(0, seekY, 0.01);
    ctx.uiGroup.add(seekGroup);

    const sBgGeo = createRoundedRectGeometry(THREE, seekW, seekH, seekH / 2);
    ctx.seekBg = new THREE.Mesh(sBgGeo, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    seekGroup.add(ctx.seekBg);

    const sBufGeo = createRoundedRectGeometry(THREE, seekW, seekH, seekH / 2);
    ctx.seekBuf = new THREE.Mesh(sBufGeo, new THREE.MeshBasicMaterial({ color: 0x475569 }));
    ctx.seekBuf.position.z = 0.001;
    seekGroup.add(ctx.seekBuf);

    const sFillGeo = createRoundedRectGeometry(THREE, seekW, seekH, seekH / 2);
    ctx.seekFill = new THREE.Mesh(sFillGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    ctx.seekFill.position.z = 0.002;
    seekGroup.add(ctx.seekFill);

    const handleSeekDrag = (pt) => {
      const local = ctx.seekBg.worldToLocal(pt.clone());
      const raw = (local.x + seekW / 2) / seekW;
      const ratio = Math.max(0, Math.min(1, raw));
      if (Number.isFinite(ctx.jellyfinVideo.duration)) ctx.jellyfinVideo.currentTime = ratio * ctx.jellyfinVideo.duration;
    };
    ctx.seekBg.userData = { hover: 0x1e293b, bg: 0x0f172a, onClick: handleSeekDrag, onDrag: handleSeekDrag };
    ctx.interactables.push(ctx.seekBg);

    ctx.timeCurrentObj = createTextObj('0:00', ctx.uiGroup, -seekW / 2, seekY - 0.04, 0.03, 0x94a3b8, 'left');
    ctx.timeDurationObj = createTextObj('0:00', ctx.uiGroup, seekW / 2, seekY - 0.04, 0.03, 0x94a3b8, 'right');

    // --- Settings Menu ---
    ctx.settingsGroup = new THREE.Group();
    ctx.settingsGroup.position.set(0, 0.55, 0);
    ctx.settingsGroup.visible = false;
    ctx.uiGroup.add(ctx.settingsGroup);

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

    const setGeo = createRoundedRectGeometry(THREE, SETTINGS_LAYOUT.width, SETTINGS_LAYOUT.height, 0.08);
    const setBg = new THREE.Mesh(setGeo, frostedMat);
    ctx.settingsBackgroundMesh = setBg;
    ctx.settingsGroup.add(setBg);
    makePanelBlocker(setBg, 'settings-bg', 0x0f172a);
    setBg.userData.panelGrabTarget = true;
    setBg.userData.panelId = 'main-ui';

    createTextObj('Settings', ctx.settingsGroup, -1.94 / 2 + SETTINGS_LAYOUT.paddingX, SETTINGS_LAYOUT.headerY, 0.03, 0x7dd3fc, 'left');

    const faceBtn = createRoundBtn('settings-face-player', ctx.settingsGroup, SETTINGS_LAYOUT.width / 2 - SETTINGS_LAYOUT.paddingX - 0.07, SETTINGS_LAYOUT.headerY, 0.024, null, () => {
      setFacePlayerEnabled(ctx, THREE, !(ctx.state.uiFacePlayer && ctx.state.screenFacePlayer));
    });
    ctx.facePlayerButtonMesh = faceBtn.mesh;
    ctx.facePlayerButtonIcon = createBillboardIcon(THREE, faceBtn.mesh, 0, 0, 0.9, ctx.state.uiFacePlayer && ctx.state.screenFacePlayer ? 0x7dd3fc : 0x64748b);

    const infoBtn = createRoundBtn('settings-info', ctx.settingsGroup, SETTINGS_LAYOUT.width / 2 - SETTINGS_LAYOUT.paddingX + 0.005, SETTINGS_LAYOUT.headerY, 0.024, 'i', () => {
      if (ctx.infoGroup) ctx.infoGroup.visible = !ctx.infoGroup.visible;
      ctx.updateInfoPanelStatus();
    });
    ctx.infoButtonMesh = infoBtn.mesh;
    if (infoBtn.textObj) infoBtn.textObj.fontSize = 0.03;

    ctx.infoGroup = new THREE.Group();
    ctx.infoGroup.position.set(0.0, 0, 0.02);
    ctx.infoGroup.visible = false;
    ctx.settingsGroup.add(ctx.infoGroup);

    const infoLayout = {
      width: 1.58,
      radius: 0.05,
      paddingX: 0.08,
      paddingTop: 0.06,
      paddingBottom: 0.06,
      titleHeight: 0.05,
      rowHeight: 0.034,
      rowGap: 0.022,
      columnGap: 0.06
    };
    const infoLeftTemplateCount = 4;
    const infoRightTemplateCount = 5;
    const infoMaxRows = Math.max(infoLeftTemplateCount, infoRightTemplateCount);
    const infoRowsHeight = (infoMaxRows * infoLayout.rowHeight) + ((infoMaxRows - 1) * infoLayout.rowGap);
    const infoContentHeight = infoLayout.titleHeight + infoLayout.rowGap + infoRowsHeight;
    const infoHeight = infoLayout.paddingTop + infoContentHeight + infoLayout.paddingBottom;
    const infoInnerWidth = infoLayout.width - (infoLayout.paddingX * 2);
    const infoColumnWidth = (infoInnerWidth - infoLayout.columnGap) / 2;

    const infoBg = new THREE.Mesh(createRoundedRectGeometry(THREE, infoLayout.width, infoHeight, infoLayout.radius), frostedMat.clone());
    ctx.infoBackgroundMesh = infoBg;
    ctx.infoGroup.add(infoBg);
    makePanelBlocker(infoBg, 'settings-info-bg', 0x0f172a);
    infoBg.userData.panelGrabTarget = true;
    infoBg.userData.panelId = 'main-ui';
    const infoTopY = (infoHeight / 2) - infoLayout.paddingTop;
    ctx.infoContentGroup = new THREE.Group();
    ctx.infoContentGroup.position.set(0, 0, 0.01);
    ctx.infoGroup.add(ctx.infoContentGroup);
    createTextObj('Info', ctx.infoContentGroup, -infoInnerWidth / 2, infoTopY - (infoLayout.titleHeight / 2), 0.03, 0x7dd3fc, 'left');
    const infoButtonsY = infoTopY - (infoLayout.titleHeight / 2);
    ctx.infoPerfToggle = createPillButton('info-debug-metrics', ctx.infoContentGroup, infoInnerWidth / 2 - 0.34, infoButtonsY, 0.28, 0.05, 'Perf Off', () => {
      ctx.state.debugMetricsEnabled = !ctx.state.debugMetricsEnabled;
      if (!ctx.state.debugMetricsEnabled) {
        resetDebugMetricsState();
      }
      ctx.updateInfoPanelStatus(true);
      ctx.updateDebugPanelStatus(true);
      updateHarnessState(ctx);
    });
    ctx.infoDebugToggle = createPillButton('info-debug-panel', ctx.infoContentGroup, infoInnerWidth / 2 - 0.08, infoButtonsY, 0.22, 0.05, 'Panel', () => {
      toggleDebugPanel(ctx, THREE);
    });

    const rowsTopY = infoTopY - infoLayout.titleHeight - infoLayout.rowGap;
    ctx.infoLeftColumnGroup = new THREE.Group();
    ctx.infoRightColumnGroup = new THREE.Group();
    ctx.infoContentGroup.add(ctx.infoLeftColumnGroup);
    ctx.infoContentGroup.add(ctx.infoRightColumnGroup);
    ctx.infoLeftColumnGroup.position.set(-infoInnerWidth / 2, 0, 0);
    ctx.infoRightColumnGroup.position.set((-infoInnerWidth / 2) + infoColumnWidth + infoLayout.columnGap, 0, 0);

    const createInfoColumnLines = (group, count) => {
      const lines = [];
      for (let i = 0; i < count; i++) {
        const y = rowsTopY - (i * (infoLayout.rowHeight + infoLayout.rowGap)) - (infoLayout.rowHeight / 2);
        const line = createInfoLine(group, 0, y, '', 0xe2e8f0);
        line.maxWidth = infoColumnWidth;
        line.sync();
        lines.push(line);
      }
      return lines;
    };

    ctx.infoLeftStatusLines = createInfoColumnLines(ctx.infoLeftColumnGroup, infoLeftTemplateCount);
    ctx.infoRightStatusLines = createInfoColumnLines(ctx.infoRightColumnGroup, infoRightTemplateCount);
    ctx.infoGroup.position.set(0.0, (SETTINGS_LAYOUT.height / 2) + (infoHeight / 2) + 0.08, 0.02);

      ctx.updateInfoPanelStatus = function () {
        if ((!ctx.infoLeftStatusLines.length && !ctx.infoRightStatusLines.length) || !ctx.renderer) return;
        const leftLines = [
          `Session: ${ctx.xrSessionMode} / XR ${ctx.xrPolyfillState}`,
          `Projection Layer: ${ctx.projectionLayerStatus}`,
          `Projection Reason: ${ctx.projectionLayerReason}`,
          `Video Layer: ${ctx.mediaLayerMode} / ${ctx.mediaLayerStatus}`
        ];
        const rightLines = [
          `Video Reason: ${ctx.mediaLayerReason}`,
          `Layers: ${ctx.xrLayersPolyfillState} / Text ${ctx.textRendererStatus}`,
          `Pixel Ratio / Fov: ${ctx.renderer.getPixelRatio().toFixed(2)} / ${RC.XR_FOVEATION.toFixed(2)}`,
          `XR Scale: ${RC.XR_FRAMEBUFFER_SCALE.toFixed(2)}`,
          `Video Res: ${ctx.jellyfinVideo.videoWidth || 0}x${ctx.jellyfinVideo.videoHeight || 0}`
      ];
      for (let i = 0; i < ctx.infoLeftStatusLines.length; i++) {
        ctx.infoLeftStatusLines[i].text = leftLines[i] || '';
        ctx.infoLeftStatusLines[i].sync();
      }
      for (let i = 0; i < ctx.infoRightStatusLines.length; i++) {
        ctx.infoRightStatusLines[i].text = rightLines[i] || '';
        ctx.infoRightStatusLines[i].sync();
      }
      if (ctx.infoPerfToggle) ctx.infoPerfToggle.setLabel(ctx.state.debugMetricsEnabled ? 'Perf On' : 'Perf Off', ctx.state.debugMetricsEnabled);
      if (ctx.infoDebugToggle) ctx.infoDebugToggle.setLabel(ctx.state.showingDebugPanel ? 'Hide' : 'Panel', ctx.state.showingDebugPanel);
      if (ctx.facePlayerButtonMesh && ctx.facePlayerButtonMesh.material && ctx.facePlayerButtonMesh.material.color) {
        const activeFace = ctx.state.uiFacePlayer && ctx.state.screenFacePlayer;
        ctx.facePlayerButtonMesh.material.color.setHex(activeFace ? 0x0f3a52 : 0x1e293b);
        ctx.facePlayerButtonMesh.userData.bg = activeFace ? 0x0f3a52 : 0x1e293b;
        ctx.facePlayerButtonMesh.userData.hover = activeFace ? 0x15516f : 0x334155;
        if (ctx.facePlayerButtonIcon) {
          ctx.facePlayerButtonIcon.traverse((child) => {
            if (child.material && child.material.color) {
              child.material.color.setHex(activeFace ? 0x7dd3fc : 0x64748b);
            }
          });
        }
      }
    };

    ctx.debugPanelGroup = new THREE.Group();
    ctx.debugPanelGroup.visible = false;
    ctx.scene.add(ctx.debugPanelGroup);

    const debugLayout = {
      width: 1.72,
      radius: 0.06,
      paddingX: 0.08,
      paddingTop: 0.06,
      paddingBottom: 0.06,
      titleHeight: 0.06,
      rowHeight: 0.034,
      rowGap: 0.02,
      columnGap: 0.07,
      rowsPerColumn: 5
    };
    const debugRowsHeight = (debugLayout.rowsPerColumn * debugLayout.rowHeight) + ((debugLayout.rowsPerColumn - 1) * debugLayout.rowGap);
    const debugContentHeight = debugLayout.titleHeight + debugLayout.rowGap + debugRowsHeight;
    const debugPanelHeight = debugLayout.paddingTop + debugContentHeight + debugLayout.paddingBottom;
    const debugInnerWidth = debugLayout.width - (debugLayout.paddingX * 2);
    const debugColumnWidth = (debugInnerWidth - debugLayout.columnGap) / 2;
    const debugTopY = (debugPanelHeight / 2) - debugLayout.paddingTop;
    const debugRowsTopY = debugTopY - debugLayout.titleHeight - debugLayout.rowGap;

    const debugPanelBg = new THREE.Mesh(createRoundedRectGeometry(THREE, debugLayout.width, debugPanelHeight, debugLayout.radius), frostedMat.clone());
    ctx.debugPanelBackgroundMesh = debugPanelBg;
    ctx.debugPanelGroup.add(debugPanelBg);
    makePanelBlocker(debugPanelBg, 'debug-panel-bg', 0x0f172a);
    debugPanelBg.userData.panelGrabTarget = true;
    debugPanelBg.userData.panelId = 'debug-panel';
    ctx.interactables.push(debugPanelBg);

    const debugContentGroup = new THREE.Group();
    debugContentGroup.position.set(0, 0, 0.01);
    ctx.debugPanelGroup.add(debugContentGroup);

    createTextObj('Debug Panel', debugContentGroup, -debugInnerWidth / 2, debugTopY - (debugLayout.titleHeight / 2), 0.03, 0x7dd3fc, 'left');

    ctx.debugPanelHandleMesh = null;

    const debugPerfToggle = createPillButton('debug-panel-perf', debugContentGroup, debugInnerWidth / 2 - 0.39, debugTopY - (debugLayout.titleHeight / 2), 0.24, 0.048, 'Perf Off', () => {
      ctx.state.debugMetricsEnabled = !ctx.state.debugMetricsEnabled;
      if (!ctx.state.debugMetricsEnabled) resetDebugMetricsState();
      ctx.updateInfoPanelStatus(true);
      ctx.updateDebugPanelStatus(true);
      updateHarnessState(ctx);
    });
    ctx.debugPanelMetricsToggleMesh = debugPerfToggle.mesh;

    const debugFaceToggle = createPillButton('debug-panel-face', debugContentGroup, debugInnerWidth / 2 - 0.13, debugTopY - (debugLayout.titleHeight / 2), 0.20, 0.048, 'Face', () => {
      ctx.state.debugPanelFacePlayer = !ctx.state.debugPanelFacePlayer;
      if (ctx.debugPanelState) ctx.debugPanelState.facePlayerEnabled = ctx.state.debugPanelFacePlayer;
      if (ctx.state.debugPanelFacePlayer) applyDebugPanelAnchorFromViewer(ctx, THREE);
      ctx.updateDebugPanelStatus(true);
      updateHarnessState(ctx);
    });
    ctx.debugPanelFaceToggleMesh = debugFaceToggle.mesh;

    const debugClose = createRoundBtn('debug-panel-close', debugContentGroup, debugInnerWidth / 2 - 0.01, debugTopY - (debugLayout.titleHeight / 2), 0.028, null, () => {
      ctx.state.showingDebugPanel = false;
      ctx.debugPanelGroup.visible = false;
      ctx.updateInfoPanelStatus(true);
      updateHarnessState(ctx);
    });
    createCloseIcon(THREE, debugClose.mesh, 0, 0, 0.75, 0xfca5a5);
    ctx.debugPanelCloseMesh = debugClose.mesh;

    const debugLeftColumnGroup = new THREE.Group();
    const debugRightColumnGroup = new THREE.Group();
    debugContentGroup.add(debugLeftColumnGroup);
    debugContentGroup.add(debugRightColumnGroup);
    debugLeftColumnGroup.position.set(-debugInnerWidth / 2, 0, 0);
    debugRightColumnGroup.position.set((-debugInnerWidth / 2) + debugColumnWidth + debugLayout.columnGap, 0, 0);

    const createDebugColumnLines = (group) => {
      const lines = [];
      for (let i = 0; i < debugLayout.rowsPerColumn; i += 1) {
        const y = debugRowsTopY - (i * (debugLayout.rowHeight + debugLayout.rowGap)) - (debugLayout.rowHeight / 2);
        const line = createInfoLine(group, 0, y, '', 0xe2e8f0);
        line.maxWidth = debugColumnWidth;
        line.overflowWrap = 'break-word';
        line.whiteSpace = 'normal';
        line.sync();
        lines.push(line);
      }
      return lines;
    };

    const debugLeftLines = createDebugColumnLines(debugLeftColumnGroup);
    const debugRightLines = createDebugColumnLines(debugRightColumnGroup);
    ctx.debugPanelTextLines = debugLeftLines.concat(debugRightLines);
    ctx.debugPanelState = {
      id: 'debug-panel',
      group: ctx.debugPanelGroup,
      facePlayerEnabled: ctx.state.debugPanelFacePlayer,
      allowFreeGrab: true,
      distance: Math.max(1.4, ctx.state.uiDistance * 0.92)
    };
    registerFloatingPanel(ctx, ctx.debugPanelState);

    ctx.updateDebugPanelStatus = function (force) {
      if (!ctx.debugPanelTextLines.length) return;
      const now = performance.now();
      if (!force && now - ctx.debugPanelLastRefreshAt < 250) return;
      ctx.debugPanelLastRefreshAt = now;
      const layerNames = Array.isArray(ctx.xrLastCommittedLayers)
        ? ctx.xrLastCommittedLayers.map((layer) => (layer && layer.constructor && layer.constructor.name) || 'UnknownLayer').join(', ')
        : 'none';
      const leftLines = [
        `Session: ${ctx.xrSessionMode} / XR ${ctx.xrPolyfillState}`,
        `Projection: ${ctx.projectionLayerStatus}`,
        `Video: ${ctx.mediaLayerMode}/${ctx.mediaLayerStatus}`,
        `Reason: ${ctx.mediaLayerReason}`,
        `Screen: C${ctx.state.screenCurvature.toFixed(2)} S${ctx.state.screenSize.toFixed(2)} D${Math.abs(ctx.state.screenDistance).toFixed(2)}`
      ];
      const rightLines = [
        `Layers: ${layerNames} / ${ctx.xrLayersPolyfillState}`,
        `Face: ${ctx.state.debugPanelFacePlayer ? 'On' : 'Off'} / Global ${ctx.state.uiFacePlayer && ctx.state.screenFacePlayer ? 'On' : 'Off'}`,
        `Ops: C${ctx.xrLayerCommitCount} R${ctx.xrLayerRecreateCount} S${ctx.xrLayerSyncCount}`,
        ctx.state.debugMetricsEnabled
          ? `FPS ${ctx.debugMetrics.fps.toFixed(1)} / ${ctx.debugMetrics.avgFrameMs.toFixed(1)}ms`
          : 'FPS metrics disabled',
        ctx.state.debugMetricsEnabled
          ? `Draw ${ctx.debugMetrics.rendererCalls} Tri ${ctx.debugMetrics.rendererTriangles} Tex ${ctx.debugMetrics.rendererTextures}`
          : `Panel: ${ctx.state.showingDebugPanel ? 'Visible' : 'Hidden'}`
      ];
      for (let i = 0; i < debugLeftLines.length; i += 1) {
        const nextText = leftLines[i] || '';
        if (debugLeftLines[i].text !== nextText) {
          debugLeftLines[i].text = nextText;
          debugLeftLines[i].sync();
        }
      }
      for (let i = 0; i < debugRightLines.length; i += 1) {
        const nextText = rightLines[i] || '';
        if (debugRightLines[i].text !== nextText) {
          debugRightLines[i].text = nextText;
          debugRightLines[i].sync();
        }
      }
      debugPerfToggle.setLabel(ctx.state.debugMetricsEnabled ? 'Perf On' : 'Perf Off', ctx.state.debugMetricsEnabled);
      debugFaceToggle.setLabel(ctx.state.debugPanelFacePlayer ? 'Face On' : 'Face Off', ctx.state.debugPanelFacePlayer);
    };
    applyDebugPanelAnchorFromViewer(ctx, THREE);

    const sY1 = SETTINGS_LAYOUT.rowY[0];
    const sY2 = SETTINGS_LAYOUT.rowY[1];
    const sY3 = SETTINGS_LAYOUT.rowY[2];
    createTextObj('Curve', ctx.settingsGroup, SETTINGS_LAYOUT.leftLabelX, sY1, 0.03, 0x94a3b8, 'left');
    createCurveStartIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.leftIconX, sY1);
    createSlider('s-curve', ctx.settingsGroup, SETTINGS_LAYOUT.leftSliderX, sY1, SETTINGS_LAYOUT.leftSliderW, 0.03, ctx.state.screenCurvature, (v) => { ctx.state.screenCurvature = v; applyModeFromState({ preserveSurfaceTransform: true }); }, { deferCommit: true });
    createCurveEndIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.leftEndIconX, sY1);

    createTextObj('Dist.', ctx.settingsGroup, SETTINGS_LAYOUT.leftLabelX, sY2, 0.03, 0x94a3b8, 'left');
    const initDistRatio = (ctx.state.screenDistance - (-20)) / (-4 - (-20));
    createNearIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.leftIconX, sY2);
    createSlider('s-dist', ctx.settingsGroup, SETTINGS_LAYOUT.leftSliderX, sY2, SETTINGS_LAYOUT.leftSliderW, 0.03, initDistRatio, (v) => {
      ctx.state.screenDistance = -20 + (v * 16);
      if (typeof ctx._applyScreenDistanceFromState === 'function') {
        ctx._applyScreenDistanceFromState();
      } else {
        applyModeFromState();
      }
    });
    createFarIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.leftEndIconX, sY2);

    createTextObj('Size', ctx.settingsGroup, SETTINGS_LAYOUT.leftLabelX, sY3, 0.03, 0x94a3b8, 'left');
    const initSizeRatio = (ctx.state.screenSize - 0.5) / (3.0 - 0.5);
    createNearIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.leftIconX, sY3);
    createSlider('s-size', ctx.settingsGroup, SETTINGS_LAYOUT.leftSliderX, sY3, SETTINGS_LAYOUT.leftSliderW, 0.03, initSizeRatio, (v) => { ctx.state.screenSize = 0.5 + (v * 2.5); applyModeFromState(); }, { deferCommit: true });
    createFarIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.leftEndIconX, sY3);

    createTextObj('UI Dist', ctx.settingsGroup, SETTINGS_LAYOUT.rightLabelX, sY1, 0.03, 0x94a3b8, 'left');
    const initUIDist = 0.5;
    createNearIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.rightIconX, sY1);
    const uiDistSlider = createSlider('s-uidist', ctx.settingsGroup, SETTINGS_LAYOUT.rightSliderX, sY1, SETTINGS_LAYOUT.rightSliderW, 0.03, initUIDist, (v) => {
      ctx.state.uiDistance = RC.UI_DISTANCE_MIN + (v * (RC.UI_DISTANCE_MAX - RC.UI_DISTANCE_MIN));
      localStorage.setItem(STORAGE_KEYS.uiDistance, ctx.state.uiDistance.toString());
      refreshUiDistance(ctx);
    });
    ctx.settingsUiDistTrack = uiDistSlider.track;
    createFarIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.rightEndIconX, sY1);

    createTextObj('Dimmer', ctx.settingsGroup, SETTINGS_LAYOUT.rightLabelX, sY2, 0.03, 0x94a3b8, 'left');
    createMoonIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.rightIconX, sY2, 1.0, 0x64748b);
    const dimmerSlider = createSlider('s-dimmer', ctx.settingsGroup, SETTINGS_LAYOUT.rightSliderX, sY2, SETTINGS_LAYOUT.rightSliderW, 0.03, ctx.state.passthroughBrightness, (v) => { ctx.state.passthroughBrightness = v; updatePassthroughVisuals(); });
    ctx.settingsDimmerTrack = dimmerSlider.track;
    createSunIcon(THREE, ctx.settingsGroup, SETTINGS_LAYOUT.rightEndIconX, sY2, 0.5, 0xe2e8f0);

    createTextObj('Layer', ctx.settingsGroup, SETTINGS_LAYOUT.rightLabelX, sY3, 0.03, 0x94a3b8, 'left');
    const layerToggleBgGeo = createRoundedRectGeometry(THREE, SETTINGS_LAYOUT.rightSliderW, 0.03, 0.015);
    const layerToggleBgMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const layerToggleBg = new THREE.Mesh(layerToggleBgGeo, layerToggleBgMat);
    layerToggleBg.position.set(SETTINGS_LAYOUT.rightSliderX, sY3, 0.01);
    ctx.settingsGroup.add(layerToggleBg);
    const layerToggleText = createTextObj(ctx.state.forceFallback ? 'Mesh' : 'Hardware', ctx.settingsGroup, SETTINGS_LAYOUT.rightSliderX, sY3, 0.022, 0xe2e8f0, 'center');
    layerToggleText.position.z = 0.015;

    function setForceFallback(enabled) {
      ctx.state.forceFallback = Boolean(enabled);
      layerToggleText.text = ctx.state.forceFallback ? 'Mesh' : 'Hardware';
      layerToggleText.sync();
      syncCompositionVideoLayer(ctx, window.THREE);
      updateStereoVisibility(ctx);
    }

    layerToggleBg.userData = {
      id: 'btn-layer-toggle',
      hover: 0x334155,
      bg: 0x1e293b,
      onClick: () => {
        setForceFallback(!ctx.state.forceFallback);
      }
    };
    ctx.interactables.push(layerToggleBg);

    // --- Layout Menu ---
    ctx.layoutGroup = new THREE.Group();
    ctx.layoutGroup.position.set(0, 0.86, 0);
    ctx.layoutGroup.visible = false;
    ctx.uiGroup.add(ctx.layoutGroup);

    const layoutBg = new THREE.Mesh(createRoundedRectGeometry(THREE, 2.28, 1.12, 0.08), frostedMat.clone());
    ctx.layoutBackgroundMesh = layoutBg;
    ctx.layoutGroup.add(layoutBg);
    makePanelBlocker(layoutBg, 'layout-bg', 0x0f172a);
    layoutBg.userData.panelGrabTarget = true;
    layoutBg.userData.panelId = 'main-ui';
    createTextObj('Layout', ctx.layoutGroup, -1.02, 0.45, 0.045, 0xe2e8f0, 'left');
    createTextObj('Pick the exact layout that matches the file.', ctx.layoutGroup, -1.02, 0.38, 0.026, 0x94a3b8, 'left');

    function switchMode(newModeId) {
      if (MODES_BY_ID[newModeId]) {
        ctx.state.mode = MODES_BY_ID[newModeId];
        ctx.state.lastModeChangeSource = 'layout-panel';
        ctx.state.showingLayout = false;
        if (ctx.layoutGroup) ctx.layoutGroup.visible = false;
        ctx.jellyfinVideo.dataset.currentMode = newModeId;
        applyModeFromState();
        updateHarnessState(ctx);
      }
    }

    MODE_GROUPS.forEach((groupDef, columnIndex) => {
      const columnX = -0.74 + (columnIndex * 0.74);
      const modes = VIEW_MODES.filter((mode) => mode.projection === groupDef.projection);
      createTextObj(groupDef.projection === 'screen' ? 'Screen' : groupDef.projection, ctx.layoutGroup, columnX - 0.22, 0.27, 0.032, 0x7dd3fc, 'left');
      modes.forEach((mode, rowIndex) => {
        createCardButton(mode, ctx.layoutGroup, columnX, 0.16 - (rowIndex * 0.15), 0.66, 0.13, () => switchMode(mode.id));
      });
    });

    // Store setForceFallback for harness access
    ctx._setForceFallback = setForceFallback;
  }

  function createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId) {
    const ctx = createRuntimeContext(overlay, styleEl, jellyfinVideo, modeId);
    const RC = RUNTIME_CONSTANTS;

    function createInteractivePointer(THREE) {
      const group = new THREE.Group();
      group.position.set(0, 0, -1.2);

      const circle = new THREE.Mesh(
        new THREE.CircleGeometry(0.0155, 40),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      circle.renderOrder = 30;
      group.add(circle);

      return {
        group,
        circle
      };
    }

    exposeHarnessActions(ctx);
    exposeHarnessDebug(ctx);
    updateHarnessState(ctx);

      async function initThree() {
        injectImportMap();
        const polyfillState = await ensureWebXRPolyfills();
        const THREE = await import('three');
        const { VRButton } = await import('three/addons/webxr/VRButton.js');
        const { ARButton } = await import('three/addons/webxr/ARButton.js');
      const { XRControllerModelFactory } = await import('three/addons/webxr/XRControllerModelFactory.js');
      const { XRHandModelFactory } = await import('three/addons/webxr/XRHandModelFactory.js');
      const { Text } = await import('troika-three-text');
      window.THREE = THREE;

        if (!ctx.active) return;

        ctx.xrPolyfillState = polyfillState && polyfillState.xr ? polyfillState.xr : 'missing';
        ctx.xrLayersPolyfillState = polyfillState && polyfillState.layers ? polyfillState.layers : 'missing';
        if (polyfillState && polyfillState.error && ctx.xrLayersPolyfillState === 'missing') {
          ctx.xrLayerLastError = polyfillState.error.message || String(polyfillState.error);
        }
        updateHarnessState(ctx);

        const container = overlay.querySelector('#jfvr-canvas-container');
      ctx.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      ctx.renderer.setClearColor(0x000000, 0);
      ctx.renderer.setPixelRatio(Math.max(1, Math.min(2.5, window.devicePixelRatio * 1.25)));
      ctx.renderer.setSize(window.innerWidth, window.innerHeight);
      ctx.renderer.outputColorSpace = THREE.SRGBColorSpace;
      ctx.renderer.toneMapping = THREE.NoToneMapping;
      ctx.renderer.xr.enabled = true;
      ctx.renderer.xr.setReferenceSpaceType('local');
      if (ctx.renderer.xr && typeof ctx.renderer.xr.setFramebufferScaleFactor === 'function') {
        ctx.renderer.xr.setFramebufferScaleFactor(RC.XR_FRAMEBUFFER_SCALE);
      }
      if (ctx.renderer.xr && typeof ctx.renderer.xr.setFoveation === 'function') {
        ctx.renderer.xr.setFoveation(RC.XR_FOVEATION);
      }
      container.appendChild(ctx.renderer.domElement);

      container.addEventListener('mousemove', () => wake(ctx, THREE));
      container.addEventListener('touchstart', () => wake(ctx, THREE));
      container.addEventListener('mousedown', () => wake(ctx, THREE));

      ctx.scene = new THREE.Scene();
      ctx.scene.background = new THREE.Color(0x000000);
      ctx.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
      ctx.scene.add(ctx.camera);

      ctx.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      const dl = new THREE.DirectionalLight(0xffffff, 2.0);
      dl.position.set(0, 10, 0);
      ctx.scene.add(dl);

      // Raycaster (stored on ctx for sharing across modules)
      ctx._raycaster = new THREE.Raycaster();
      ctx._tempMatrix = new THREE.Matrix4();
      ctx._hoveredObj = null;

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

      ctx.vrButton = VRButton.createButton(ctx.renderer, { optionalFeatures });
      ctx.vrButton.style.position = 'relative';
      ctx.vrButton.style.bottom = 'auto';
      ctx.vrButton.style.left = 'auto';
      ctx.vrButton.style.transform = 'none';
      ctx.vrButton.addEventListener('click', () => {
        ctx.state.isAR = false;
        ctx.state.passthroughEnabled = false;
      });
      buttonsContainer.appendChild(ctx.vrButton);

      ctx.arButton = ARButton.createButton(ctx.renderer, { optionalFeatures });
      ctx.arButton.style.position = 'relative';
      ctx.arButton.style.bottom = 'auto';
      ctx.arButton.style.left = 'auto';
      ctx.arButton.style.transform = 'none';
      ctx.arButton.addEventListener('click', () => {
        ctx.state.isAR = true;
        ctx.state.passthroughEnabled = true;
      });
      buttonsContainer.appendChild(ctx.arButton);

      // Video texture & materials
      ctx.videoTexture = new THREE.VideoTexture(jellyfinVideo);
      ctx.videoTexture.minFilter = THREE.LinearFilter;
      ctx.videoTexture.magFilter = THREE.LinearFilter;
      ctx.videoTexture.colorSpace = THREE.SRGBColorSpace;
      ctx.videoTexture.generateMipmaps = false;
      ctx.videoTexture.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();

      ctx.materials.preview = new THREE.MeshBasicMaterial({ map: ctx.videoTexture, side: THREE.BackSide, toneMapped: false });
      ctx.materials.left = new THREE.MeshBasicMaterial({ map: ctx.videoTexture, side: THREE.BackSide, toneMapped: false });
      ctx.materials.right = new THREE.MeshBasicMaterial({ map: ctx.videoTexture, side: THREE.BackSide, toneMapped: false });
      ctx.materials.hitProxy = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false, side: THREE.DoubleSide });

      ctx.immersiveDebugScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 1.575),
        new THREE.MeshBasicMaterial({ map: ctx.videoTexture, side: THREE.DoubleSide, toneMapped: false, transparent: true, opacity: 0.98 })
      );
      ctx.immersiveDebugScreen.position.set(0, 0, -2.2);
      ctx.immersiveDebugScreen.visible = false;
      ctx.camera.add(ctx.immersiveDebugScreen);

      ctx.surfaceRoot = new THREE.Group();
      ctx.scene.add(ctx.surfaceRoot);

      const dimSphereGeo = new THREE.SphereGeometry(90, 32, 32);
      const dimSphereMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true, opacity: 0.0 });
      const dimSphere = new THREE.Mesh(dimSphereGeo, dimSphereMat);
      ctx.scene.add(dimSphere);

      ctx.meshes.preview = new THREE.Mesh(new THREE.BufferGeometry(), ctx.materials.preview);
      ctx.meshes.left = new THREE.Mesh(new THREE.BufferGeometry(), ctx.materials.left);
      ctx.meshes.right = new THREE.Mesh(new THREE.BufferGeometry(), ctx.materials.right);
      ctx.meshes.hitProxy = new THREE.Mesh(new THREE.BufferGeometry(), ctx.materials.hitProxy);

      ctx.meshes.preview.layers.set(0);
      ctx.meshes.left.layers.set(1);
      ctx.meshes.right.layers.set(2);
      ctx.meshes.hitProxy.layers.set(0);

      ctx.surfaceRoot.add(ctx.meshes.preview);
      ctx.surfaceRoot.add(ctx.meshes.left);
      ctx.surfaceRoot.add(ctx.meshes.right);
      ctx.surfaceRoot.add(ctx.meshes.hitProxy);

      function updatePassthroughVisuals() {
        const nextDimmerFallback = Boolean(
          ctx.state.mode
          && ctx.state.mode.projection === 'screen'
          && ctx.state.passthroughEnabled
          && ctx.state.passthroughBrightness < 0.999
        );
        if (ctx.state.isImmersive && nextDimmerFallback) {
          ctx._passthroughDimmerSessionFallbackLocked = true;
        }
        const dimmerFallbackChanged = ctx._passthroughDimmerSessionFallbackLocked !== ctx._passthroughDimmerFallbackState;
        ctx._passthroughDimmerFallbackState = ctx._passthroughDimmerSessionFallbackLocked;
        ctx.scene.background = null;
        if (ctx.state.passthroughEnabled) {
          dimSphere.visible = true;
          dimSphereMat.opacity = 1.0 - ctx.state.passthroughBrightness;
        } else {
          dimSphere.visible = false;
          dimSphereMat.opacity = 1.0;
        }
        if (ctx.state.isImmersive && dimmerFallbackChanged) {
          syncCompositionVideoLayer(ctx, THREE);
          updateStereoVisibility(ctx);
        }
      }

      function applyScreenDistanceFromState() {
        if (!ctx.state.mode || ctx.state.mode.projection !== 'screen') return;
        recenterActiveMode(ctx, THREE);
        if (ctx.mediaVideoLayer && typeof window.XRRigidTransform === 'function') {
          try {
            const surfaceTransform = getSurfaceWorldTransform(ctx, THREE);
            ctx.mediaVideoLayer.transform = new window.XRRigidTransform(
              { x: surfaceTransform.position.x, y: surfaceTransform.position.y, z: surfaceTransform.position.z },
              { x: surfaceTransform.quaternion.x, y: surfaceTransform.quaternion.y, z: surfaceTransform.quaternion.z, w: surfaceTransform.quaternion.w }
            );
            ctx._surfaceLastLayerPosition.copy(surfaceTransform.position);
            ctx._surfaceLastLayerQuaternion.copy(surfaceTransform.quaternion);
            ctx._lastLayerTransformSyncAt = performance.now();
          } catch (_error) {
            // Best-effort transform update only.
          }
        }
        updateHarnessState(ctx);
      }
      ctx._applyScreenDistanceFromState = applyScreenDistanceFromState;

      function applyModeFromState(options) {
        const opts = options || {};
        let mode = ctx.state.mode;
        let geometry;
        const previousPosition = ctx.surfaceRoot.position.clone();
        const previousRotation = ctx.surfaceRoot.rotation.clone();
        const previousScale = ctx.surfaceRoot.scale.clone();

        if (mode.projection === 'screen') {
          const screenSpec = getScreenSurfaceSpec(ctx);
          geometry = createCurvedScreenGeometry(THREE, screenSpec.localWidth, screenSpec.localHeight, screenSpec.localCurve);
        } else if (mode.projection === '180') {
          geometry = new THREE.SphereGeometry(32, 96, 64, 0, Math.PI, 0, Math.PI);
        } else {
          geometry = new THREE.SphereGeometry(32, 96, 64);
        }

        ctx.meshes.preview.geometry.dispose();
        ctx.meshes.preview.geometry = geometry.clone();
        ctx.meshes.left.geometry.dispose();
        ctx.meshes.left.geometry = geometry.clone();
        ctx.meshes.right.geometry.dispose();
        ctx.meshes.right.geometry = geometry.clone();
        ctx.meshes.hitProxy.geometry.dispose();
        ctx.meshes.hitProxy.geometry = geometry.clone();

        const side = mode.projection === 'screen' ? THREE.FrontSide : THREE.BackSide;
        ctx.materials.preview.side = side; ctx.materials.left.side = side; ctx.materials.right.side = side;
        ctx.materials.hitProxy.side = THREE.DoubleSide;
        const screenMeshCompensation = mode.projection === 'screen' ? RC.SCREEN_MESH_COMPENSATION : 1;
        ctx.meshes.preview.scale.setScalar(screenMeshCompensation);
        ctx.meshes.left.scale.setScalar(screenMeshCompensation);
        ctx.meshes.right.scale.setScalar(screenMeshCompensation);
        ctx.meshes.hitProxy.scale.setScalar(screenMeshCompensation);

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

        const leftEye = ctx.state.swapEyes ? 'right' : 'left';
        const rightEye = ctx.state.swapEyes ? 'left' : 'right';

        function applyViewportToGeometry(geom, vp) {
          const uv = geom.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            const u = uv.getX(i);
            const v = uv.getY(i);
            uv.setXY(i, (u * vp.rx) + vp.x, (v * vp.ry) + vp.y);
          }
          uv.needsUpdate = true;
        }

        applyViewportToGeometry(ctx.meshes.preview.geometry, getViewport(mode, leftEye));
        applyViewportToGeometry(ctx.meshes.left.geometry, getViewport(mode, leftEye));
        applyViewportToGeometry(ctx.meshes.right.geometry, getViewport(mode, rightEye));

        if (ctx.videoTexture) {
          ctx.videoTexture.wrapS = THREE.ClampToEdgeWrapping;
          ctx.videoTexture.wrapT = THREE.ClampToEdgeWrapping;
          ctx.videoTexture.offset.set(0, 0);
          ctx.videoTexture.repeat.set(1, 1);
          ctx.videoTexture.needsUpdate = true;
        }

        if (ctx.titleTextObj) {
          const t = getVideoTitle();
          if (t) ctx.titleTextObj.text = t;
        }
        if (opts.preserveSurfaceTransform) {
          ctx.surfaceRoot.position.copy(previousPosition);
          ctx.surfaceRoot.rotation.copy(previousRotation);
          if (mode.projection === 'screen') {
            ctx.surfaceRoot.scale.setScalar(ctx.state.screenSize);
          } else {
            ctx.surfaceRoot.scale.copy(previousScale);
          }
        } else {
          recenterActiveMode(ctx, THREE);
        }
        if (ctx.state.isImmersive) syncCompositionVideoLayer(ctx, THREE);
        updateStereoVisibility(ctx);
      }

      // Build 3D UI
      buildUI(ctx, THREE, Text, close, applyModeFromState, updatePassthroughVisuals);

      // XR Session handlers
      ctx.renderer.xr.addEventListener('sessionstart', () => {
        ctx.state.isImmersive = true;
        ctx.xrLayerCommitCount = 0;
        ctx.xrLayerSyncCount = 0;
        ctx.xrLayerRecreateCount = 0;
        ctx._passthroughDimmerFallbackState = false;
        ctx._passthroughDimmerSessionFallbackLocked = false;
        ctx.xrLastCommittedLayers = null;
        ctx.xrCachedSupportSession = null;
        ctx.xrCachedSupport = null;
        const session = ctx.renderer.xr && typeof ctx.renderer.xr.getSession === 'function'
          ? ctx.renderer.xr.getSession()
          : null;
        const sessionMode = session && typeof session.mode === 'string' ? session.mode : 'unknown';
        const blendMode = ctx.renderer.xr && typeof ctx.renderer.xr.getEnvironmentBlendMode === 'function'
          ? ctx.renderer.xr.getEnvironmentBlendMode()
          : 'opaque';
        ctx.xrEnvironmentBlendMode = blendMode || 'unknown';
        if (sessionMode === 'immersive-ar') {
          ctx.state.isAR = true;
          ctx.xrSessionMode = 'immersive-ar';
          ctx.xrModeDetection = 'session-mode';
        } else if (sessionMode === 'immersive-vr') {
          ctx.state.isAR = false;
          ctx.xrSessionMode = 'immersive-vr';
          ctx.xrModeDetection = 'session-mode';
        } else {
          ctx.state.isAR = blendMode === 'alpha-blend' || blendMode === 'additive';
          ctx.xrSessionMode = ctx.state.isAR ? 'immersive-ar' : 'immersive-vr';
          ctx.xrModeDetection = 'blend-fallback';
        }
        updatePassthroughVisuals();
        if (ctx.ptSliderUpdateFill) ctx.ptSliderUpdateFill(ctx.state.passthroughBrightness);
        ctx.camera.layers.enable(0);
        ctx.camera.layers.enable(1);
        ctx.camera.layers.enable(2);
        recenterActiveMode(ctx, THREE);
        applyUiAnchorFromViewer(ctx, THREE, 'center');
        if (ctx.state.showingDebugPanel) applyDebugPanelAnchorFromViewer(ctx, THREE);
        syncCompositionVideoLayer(ctx, THREE);
        updateStereoVisibility(ctx);
        updateImmersiveDebugScreen(ctx);
        if (ctx.updateDebugPanelStatus) ctx.updateDebugPanelStatus(true);
      });
      ctx.renderer.xr.addEventListener('sessionend', () => {
        ctx.state.isImmersive = false;
        ctx.state.isAR = false;
        ctx.xrSessionMode = 'none';
        ctx.xrEnvironmentBlendMode = 'none';
        ctx.xrModeDetection = 'none';
        ctx.xrBindingState = 'inactive';
        ctx.xrRenderStateLayers = 'inactive';
        ctx.xrRenderStateBaseLayer = 'inactive';
        ctx.xrMediaBindingFactory = 'inactive';
        ctx.xrMediaLayerSupport = 'inactive';
        ctx.xrSelectedLayerType = 'none';
        ctx.xrLayerLastError = 'none';
        ctx.xrLastCommittedLayers = null;
        ctx.xrCachedSupportSession = null;
        ctx.xrCachedSupport = null;
        ctx._passthroughDimmerFallbackState = false;
        ctx._passthroughDimmerSessionFallbackLocked = false;
        ctx.scene.background = new THREE.Color(0x000000);
        clearCompositionVideoLayer(ctx);
        applyUiAnchorFromViewer(ctx, THREE, 'center');
        if (ctx.state.showingDebugPanel) applyDebugPanelAnchorFromViewer(ctx, THREE);
        updateStereoVisibility(ctx);
        updateImmersiveDebugScreen(ctx);
        if (ctx.updateDebugPanelStatus) ctx.updateDebugPanelStatus(true);
      });

      // Controller setup
      const controllerModelFactory = new XRControllerModelFactory();
      const handModelFactory = new XRHandModelFactory();

      for (let i = 0; i < 2; i++) {
        const controller = ctx.renderer.xr.getController(i);
        ctx.scene.add(controller);
        controller.addEventListener('selectstart', (e) => {
          ctx.state.lastInteraction = Date.now();
          onSelectStart(ctx, THREE, e);
        });
        controller.addEventListener('selectend', (e) => {
          onSelectEnd(ctx, THREE, e);
        });
        controller.addEventListener('squeezestart', (e) => onSqueezeStart(ctx, THREE, e));
        controller.addEventListener('squeezeend', (e) => onSqueezeEnd(ctx, e));
        controller.addEventListener('connected', () => {
          ctx.state.lastInteraction = Date.now();
        });

        const grip = ctx.renderer.xr.getControllerGrip(i);
        grip.add(controllerModelFactory.createControllerModel(grip));
        ctx.scene.add(grip);

        const hand = ctx.renderer.xr.getHand(i);
        hand.add(handModelFactory.createHandModel(hand, 'mesh'));
        ctx.scene.add(hand);

        const geometryLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]);
        const line = new THREE.Line(geometryLine, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }));
        const pointer = createInteractivePointer(THREE);
        controller.userData.lineRef = line;
        controller.userData.lineColor = new THREE.Color(0xffffff);
        controller.userData.lineTargetColor = new THREE.Color(0xffffff);
        controller.userData.lineOpacity = 0.18;
        controller.userData.lineTargetOpacity = 0.18;
        controller.userData.lineActive = false;
        controller.userData.pointerRef = pointer.group;
        controller.userData.pointerCircleRef = pointer.circle;
        controller.userData.pointerColor = new THREE.Color(0xffffff);
        controller.userData.pointerTargetColor = new THREE.Color(0xffffff);
        controller.userData.pointerScale = 1;
        controller.userData.pointerTargetScale = 1;
        controller.userData.pointerOpacity = 0.22;
        controller.userData.pointerTargetOpacity = 0.22;
        controller.userData.pointerTriggerActive = false;
        controller.userData.pointerSqueezeActive = false;
        controller.add(line);
        controller.add(pointer.group);
      }

      // Extended harness actions (require initThree scope)
      if (window.__JFVR_RUNTIME_ACTIONS__) {
        const syncDebugControllerPose = (hand, controller) => {
          const device = window.__IWER_DEVICE__;
          if (!device || !device.controllers || !device.controllers[hand] || !controller) return;
          const source = device.controllers[hand];
          controller.position.copy(source.position);
          controller.quaternion.copy(source.quaternion);
          controller.updateMatrixWorld(true);
          if (ctx.scene) ctx.scene.updateMatrixWorld(true);
        };
        window.__JFVR_RUNTIME_ACTIONS__.setUiDistance = (value) => {
          ctx.state.uiDistance = Math.min(RC.UI_DISTANCE_MAX, Math.max(RC.UI_DISTANCE_MIN, value));
          localStorage.setItem(STORAGE_KEYS.uiDistance, ctx.state.uiDistance.toString());
          refreshUiDistance(ctx);
        };
        window.__JFVR_RUNTIME_ACTIONS__.setCurve = (value) => {
          ctx.state.screenCurvature = value;
          applyModeFromState({ preserveSurfaceTransform: true });
        };
        window.__JFVR_RUNTIME_ACTIONS__.setScreenDistance = (value) => {
          ctx.state.screenDistance = Math.min(-4, Math.max(-20, value));
          applyScreenDistanceFromState();
        };
        window.__JFVR_RUNTIME_ACTIONS__.setScreenSize = (value) => {
          ctx.state.screenSize = Math.min(3.0, Math.max(0.5, value));
          applyModeFromState({ preserveSurfaceTransform: true });
        };
        window.__JFVR_RUNTIME_ACTIONS__.setForceFallback = (value) => {
          ctx._setForceFallback(value);
        };
        window.__JFVR_RUNTIME_ACTIONS__.setPassthroughEnabled = (value) => {
          ctx.state.passthroughEnabled = Boolean(value);
          updatePassthroughVisuals();
        };
        window.__JFVR_RUNTIME_ACTIONS__.setPassthroughBrightness = (value) => {
          ctx.state.passthroughBrightness = Math.min(1.0, Math.max(0.0, value));
          if (ctx.state.passthroughBrightness < 0.999) {
            ctx.state.passthroughEnabled = true;
          }
          updatePassthroughVisuals();
        };
        window.__JFVR_RUNTIME_ACTIONS__.toggleUi = () => {
          toggleUI(ctx, THREE, null, 'harness');
        };
        window.__JFVR_RUNTIME_ACTIONS__.toggleDebugPanel = () => {
          toggleDebugPanel(ctx, THREE, null);
        };
        window.__JFVR_RUNTIME_ACTIONS__.setDebugMetricsEnabled = (value) => {
          ctx.state.debugMetricsEnabled = Boolean(value);
          if (!ctx.state.debugMetricsEnabled) {
            ctx.debugMetricsFrameCount = 0;
            ctx.debugMetricsAccumMs = 0;
            ctx.debugMetricsMinMs = Infinity;
            ctx.debugMetricsMaxMs = 0;
            ctx.debugMetricsSlowFrameCount = 0;
            ctx.debugMetricsLastSampleAt = 0;
          }
          if (ctx.updateInfoPanelStatus) ctx.updateInfoPanelStatus(true);
          if (ctx.updateDebugPanelStatus) ctx.updateDebugPanelStatus(true);
          updateHarnessState(ctx);
        };
        window.__JFVR_RUNTIME_ACTIONS__.setFacePlayerEnabled = (value) => {
          setFacePlayerEnabled(ctx, THREE, value);
        };
        window.__JFVR_RUNTIME_ACTIONS__.setDebugPanelFacePlayer = (value) => {
          ctx.state.debugPanelFacePlayer = Boolean(value);
          if (ctx.debugPanelState) ctx.debugPanelState.facePlayerEnabled = ctx.state.debugPanelFacePlayer;
          if (ctx.state.debugPanelFacePlayer && ctx.debugPanelGroup && ctx.debugPanelGroup.visible) {
            applyDebugPanelAnchorFromViewer(ctx, THREE);
          }
          if (ctx.updateDebugPanelStatus) ctx.updateDebugPanelStatus(true);
          updateHarnessState(ctx);
        };
        window.__JFVR_RUNTIME_ACTIONS__.cycleStereoLock = () => {
          cycleStereoLock(ctx, THREE);
        };
        window.__JFVR_RUNTIME_ACTIONS__.setStereoLock = (value) => {
          ctx.state.stereoLock = value;
          if (ctx.state.isImmersive && ctx.state.mode && ctx.state.mode.stereo !== 'mono') syncCompositionVideoLayer(ctx, THREE);
          updateStereoVisibility(ctx);
        };
        window.__JFVR_RUNTIME_ACTIONS__.toggleInfoPanel = () => {
          if (ctx.infoGroup) {
            ctx.infoGroup.visible = !ctx.infoGroup.visible;
            ctx.updateInfoPanelStatus(true);
          }
        };
        window.__JFVR_RUNTIME_ACTIONS__.clickEnterAr = () => {
          const button = document.querySelector('#jfvr-inline-overlay #ARButton');
          if (button) button.click();
        };
        window.__JFVR_RUNTIME_ACTIONS__.openUiAtController = (hand, anchorType) => {
          const index = hand === 'left' ? 0 : 1;
          const controller = ctx.renderer.xr.getController(index);
          syncDebugControllerPose(hand, controller);
          ctx.state.uiVisible = true;
          ctx.state.showingSettings = false;
          ctx.state.showingLayout = false;
          if (ctx.settingsGroup) ctx.settingsGroup.visible = false;
          if (ctx.layoutGroup) ctx.layoutGroup.visible = false;
          if (ctx.uiGroup) ctx.uiGroup.visible = true;
          applyUiAnchorFromViewer(ctx, THREE, anchorType === 'video' ? 'video' : 'controller', controller);
          if (ctx.state.mode && ctx.state.mode.projection === 'screen') {
            faceObjectTowardViewer(ctx, THREE, ctx.uiGroup, { yawOnly: true });
          }
          if (ctx.state.isImmersive && ctx.state.mode && ctx.state.mode.stereo !== 'mono') syncCompositionVideoLayer(ctx, THREE);
          updateStereoVisibility(ctx);
        };
        window.__JFVR_RUNTIME_ACTIONS__.openDebugPanelAtController = (hand) => {
          const index = hand === 'left' ? 0 : 1;
          const controller = ctx.renderer.xr.getController(index);
          syncDebugControllerPose(hand, controller);
          const source = window.__IWER_DEVICE__ && window.__IWER_DEVICE__.controllers ? window.__IWER_DEVICE__.controllers[hand] : null;
          if (source && ctx.debugPanelGroup) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(source.quaternion).normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            ctx.debugPanelGroup.position.copy(source.position)
              .add(forward.multiplyScalar(Math.max(1.4, ctx.state.uiDistance * 0.92)))
              .add(right.multiplyScalar(0.72));
            ctx.debugPanelGroup.position.y += 0.12;
          }
          if (!ctx.state.showingDebugPanel) {
            toggleDebugPanel(ctx, THREE, controller);
            if (source && ctx.debugPanelGroup) {
              const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(source.quaternion).normalize();
              const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
              ctx.debugPanelGroup.position.copy(source.position)
                .add(forward.multiplyScalar(Math.max(1.4, ctx.state.uiDistance * 0.92)))
                .add(right.multiplyScalar(0.72));
              ctx.debugPanelGroup.position.y += 0.12;
            }
          } else {
            if (!source) {
              applyDebugPanelAnchorFromViewer(ctx, THREE, controller);
            }
            if (ctx.updateDebugPanelStatus) ctx.updateDebugPanelStatus(true);
            updateHarnessState(ctx);
          }
        };
        window.__JFVR_RUNTIME_ACTIONS__.selectController = (hand) => {
          const index = hand === 'left' ? 0 : 1;
          const controller = ctx.renderer.xr.getController(index);
          syncDebugControllerPose(hand, controller);
          onSelectStart(ctx, THREE, { target: controller });
          onSelectEnd(ctx, THREE, { target: controller });
        };
        window.__JFVR_RUNTIME_ACTIONS__.beginSelectController = (hand) => {
          const index = hand === 'left' ? 0 : 1;
          const controller = ctx.renderer.xr.getController(index);
          syncDebugControllerPose(hand, controller);
          onSelectStart(ctx, THREE, { target: controller });
        };
        window.__JFVR_RUNTIME_ACTIONS__.endSelectController = (hand) => {
          const index = hand === 'left' ? 0 : 1;
          const controller = ctx.renderer.xr.getController(index);
          syncDebugControllerPose(hand, controller);
          onSelectEnd(ctx, THREE, { target: controller });
        };
        window.__JFVR_RUNTIME_ACTIONS__.squeezeController = (hand, activeSqueeze) => {
          const index = hand === 'left' ? 0 : 1;
          const controller = ctx.renderer.xr.getController(index);
          syncDebugControllerPose(hand, controller);
          if (activeSqueeze) {
            onSqueezeStart(ctx, THREE, { target: controller });
          } else {
            onSqueezeEnd(ctx, { target: controller });
          }
        };
      }

      applyUiAnchorFromViewer(ctx, THREE, 'center');
      if (ctx.state.showingDebugPanel) applyDebugPanelAnchorFromViewer(ctx, THREE);

      window.addEventListener('resize', () => {
        ctx.camera.aspect = window.innerWidth / window.innerHeight;
        ctx.camera.updateProjectionMatrix();
        if (!ctx.renderer.xr.isPresenting) {
          ctx.renderer.setSize(window.innerWidth, window.innerHeight);
        }
      });

      applyModeFromState();

      ctx.renderer.setAnimationLoop(createAnimationLoop(ctx, THREE));
    }

    function close() {
      ctx.active = false;
      removeVersionModal();
      ctx.videoGrabControllers.forEach((controller) => {
        delete controller.userData.videoGrab;
        delete controller.userData.panelGrab;
      });
      ctx.videoGrabControllers = [];
      ctx.panelGrabControllers = [];
      if (ctx.toolbarVersionBtn) ctx.toolbarVersionBtn.removeEventListener('click', openVersionModal);
      if (ctx.renderer) {
        clearCompositionVideoLayer(ctx);
        ctx.xrLastCommittedLayers = null;
        ctx.xrCachedSupportSession = null;
        ctx.xrCachedSupport = null;
        ctx.renderer.setAnimationLoop(null);
        if (ctx.videoTexture) ctx.videoTexture.dispose();
        if (ctx.scene) {
          ctx.scene.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
              else child.material.dispose();
            }
          });
        }
        if (ctx.renderer.xr.isPresenting) {
          ctx.renderer.xr.getSession().end();
        }
        const _rendererRef = ctx.renderer;
        setTimeout(() => {
          _rendererRef.dispose();
          if (typeof _rendererRef.forceContextLoss === 'function') {
            _rendererRef.forceContextLoss();
          }
        }, 100);
      }
      overlay.remove();
      styleEl.remove();
      window.__JFVR_RUNTIME_STATE__ = null;
      window.__JFVR_RUNTIME_ACTIONS__ = null;
      window.__JFVR_RUNTIME_DEBUG__ = null;
      setActiveInlinePlayer(null);
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === ' ') { event.preventDefault(); jellyfinVideo.paused ? jellyfinVideo.play() : jellyfinVideo.pause(); }
      if (event.key.toLowerCase() === 'i') { event.preventDefault(); openVersionModal(); }
    };
    overlay.addEventListener('keydown', onKeyDown);

    ctx.toolbarVersionBtn = overlay.querySelector('#jfvr-inline-version');
    if (ctx.toolbarVersionBtn) ctx.toolbarVersionBtn.addEventListener('click', openVersionModal);

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

    const currentPlayer = getActiveInlinePlayer();
    if (currentPlayer) {
      currentPlayer.close();
    }

    localStorage.setItem(STORAGE_KEYS.lastMode, modeId);

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

    setActiveInlinePlayer(createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId));
  }

  function openPlayer(modeId) {
    openInlinePlayer(modeId);
  }

  (function () {
    if (window.__JFVRLoaded) {
      return;
    }

    window.__JFVRLoaded = true;

    function checkForVideo() {
      const video = getCurrentJellyfinVideo();
      const hasVideo = video && video.src;
      if (hasVideo) {
        createVRButton(openPlayer);
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

})();

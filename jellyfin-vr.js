(function () {
  const STORAGE_KEYS = {
    lastMode: 'jfvr:last-mode',
    uiDistance: 'jfvr:ui-distance',
    uiScale: 'jfvr:ui-scale',
    screenDistance: 'jfvr:screen-distance',
    screenScale: 'jfvr:screen-scale',
    screenCurve: 'jfvr:screen-curve'
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

  const INLINE_PLAYER_STYLE = `
  #jfvr-inline-overlay { position: fixed; inset: 0; z-index: 99999; background: #000; overflow: hidden; }
  #jfvr-inline-overlay canvas { display: block; width: 100vw; height: 100vh; }
  #jfvr-debug-btn { position: absolute; bottom: 20px; right: 20px; z-index: 999999; padding: 12px 24px; background: #3b82f6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
`;

  const INLINE_PLAYER_HTML = `
  <div id="jfvr-canvas-container" style="width:100%; height:100%;"></div>
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
    `;
    document.head.appendChild(style);
  }

  function getCurrentJellyfinVideo() {
    return document.querySelector('video');
  }

  function getCurrentPlaybackSnapshot() {
    const video = getCurrentJellyfinVideo();
    const currentSrc = video ? (video.currentSrc || video.src) : '';
    if (!video || !currentSrc) return null;
    return {
      src: currentSrc,
      currentTime: Number(video.currentTime) || 0,
      paused: video.paused,
      volume: Number(video.volume),
      muted: Boolean(video.muted)
    };
  }

  function getHostSessionStore() {
    if (!window.__JFVRHostSessions) {
      window.__JFVRHostSessions = {};
    }
    return window.__JFVRHostSessions;
  }

  function createHostSession(video) {
    if (!video) return null;

    const capture = typeof video.captureStream === 'function'
      ? video.captureStream.bind(video)
      : (typeof video.mozCaptureStream === 'function' ? video.mozCaptureStream.bind(video) : null);

    if (!capture) {
      return null;
    }

    let stream = null;
    try {
      stream = capture();
    } catch (error) {
      stream = null;
    }

    if (!stream) {
      return null;
    }

    const sessionId = `jfvr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session = {
      id: sessionId,
      video,
      stream,
      originalMuted: Boolean(video.muted),
      originalVolume: Number(video.volume),
      usingCapture: true
    };

    video.volume = 0;
    getHostSessionStore()[sessionId] = session;
    return session;
  }

  function cleanupHostSession(sessionId, finalState) {
    if (!sessionId) return;

    const store = getHostSessionStore();
    const session = store[sessionId];
    if (!session) return;

    const video = session.video;
    if (video) {
      if (finalState && typeof finalState.volume === 'number') {
        video.volume = Math.min(1, Math.max(0, finalState.volume));
      } else if (typeof session.originalVolume === 'number') {
        video.volume = session.originalVolume;
      }

      if (finalState && typeof finalState.muted !== 'undefined') {
        video.muted = Boolean(finalState.muted);
      } else {
        video.muted = session.originalMuted;
      }
    }

    delete store[sessionId];
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

  function ensureAFrameLoaded() {
    if (window.AFRAME && window.THREE) {
      return Promise.resolve();
    }

    if (window.__JFVRAFramePromise) {
      return window.__JFVRAFramePromise;
    }

    window.__JFVRAFramePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://aframe.io/releases/1.7.0/aframe.min.js';
      script.onload = () => {
        const troika = document.createElement('script');
        troika.src = 'https://unpkg.com/aframe-troika-text/dist/aframe-troika-text.min.js';
        troika.onload = () => resolve();
        troika.onerror = () => resolve();
        document.head.appendChild(troika);
      };
      script.onerror = () => reject(new Error('Failed to load A-Frame'));
      document.head.appendChild(script);
    });

    return window.__JFVRAFramePromise;
  }

  function createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId) {
    let active = true;
    let renderer, scene, camera, vrButton, arButton;
    let uiGroup;
    let videoTexture, materials = {}, meshes = {};
    let interactables = [];
    let sliderControls = [];
    let modeButtons = [];
    let bufferedSegments = [];
    let seekTrackMesh, seekFillMesh, seekThumbMesh;
    let titleTextObj, detailTextObj, statusTextObj, timeTextObj;
    let modePanelCurrentObj, screenPanelHintObj, screenPanelValueObj;
    let playBtnObj, modeMenuBtnObj, screenBtnObj;
    let modeMenuGroup, screenSettingsGroup;
    const SEEK_WIDTH = 2.12;
    const SEEK_LEFT = -SEEK_WIDTH / 2;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function readStoredNumber(key, fallback, min, max) {
      const stored = Number.parseFloat(localStorage.getItem(key));
      if (!Number.isFinite(stored)) return fallback;
      return clamp(stored, min, max);
    }

    let state = {
       mode: MODES_BY_ID[modeId] || MODES_BY_ID['360-mono'],
       isImmersive: false,
       swapEyes: false,
       uiVisible: true,
       lastInteraction: Date.now(),
       uiDistance: -2,
       uiScale: 1,
       isAR: false,
       passthroughEnabled: false,
       passthroughBrightness: 1.0,
       screenDistance: readStoredNumber(STORAGE_KEYS.screenDistance, 12, 7, 18),
       screenScale: readStoredNumber(STORAGE_KEYS.screenScale, 1, 0.7, 1.8),
       screenCurve: readStoredNumber(STORAGE_KEYS.screenCurve, 0.35, 0, 1),
       activePanel: null,
       statusMessage: 'Ready',
       statusUntil: 0,
       scrubPreviewLabel: '',
       scrubPreviewUntil: 0
    };

    // UI elements references
    function setStatus(message, durationMs = 1800) {
      state.statusMessage = message;
      state.statusUntil = Date.now() + durationMs;
    }

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

    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const total = Math.floor(seconds);
      const hrs = Math.floor(total / 3600);
      const mins = Math.floor((total % 3600) / 60);
      const secs = total % 60;
      if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      return `${mins}:${String(secs).padStart(2, '0')}`;
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
      buttonsContainer.style.bottom = '24px';
      buttonsContainer.style.left = '50%';
      buttonsContainer.style.transform = 'translateX(-50%)';
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.gap = '14px';
      buttonsContainer.style.padding = '12px 16px';
      buttonsContainer.style.borderRadius = '999px';
      buttonsContainer.style.border = '1px solid rgba(148, 163, 184, 0.22)';
      buttonsContainer.style.background = 'rgba(7, 16, 25, 0.68)';
      buttonsContainer.style.backdropFilter = 'blur(18px)';
      buttonsContainer.style.webkitBackdropFilter = 'blur(18px)';
      buttonsContainer.style.boxShadow = '0 18px 48px rgba(0, 0, 0, 0.36)';
      buttonsContainer.style.zIndex = '999999';
      overlay.appendChild(buttonsContainer);

      function styleSessionButton(button) {
         button.style.position = 'relative';
         button.style.bottom = 'auto';
         button.style.left = 'auto';
         button.style.transform = 'none';
         button.style.minWidth = '120px';
         button.style.height = '46px';
         button.style.padding = '0 18px';
         button.style.borderRadius = '999px';
         button.style.border = '1px solid rgba(125, 211, 252, 0.28)';
         button.style.background = 'linear-gradient(180deg, rgba(15, 23, 35, 0.94), rgba(6, 11, 19, 0.94))';
         button.style.color = '#eef7ff';
         button.style.fontSize = '13px';
         button.style.fontWeight = '700';
         button.style.letterSpacing = '0.04em';
      }

      vrButton = VRButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
      styleSessionButton(vrButton);
      vrButton.addEventListener('click', () => {
         state.isAR = false;
         state.passthroughEnabled = false;
      });
      buttonsContainer.appendChild(vrButton);

      arButton = ARButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
      styleSessionButton(arButton);
      arButton.addEventListener('click', () => {
         state.isAR = true;
         state.passthroughEnabled = true;
      });
      buttonsContainer.appendChild(arButton);

      renderer.xr.addEventListener('sessionstart', () => {
         state.isImmersive = true;
         // Update visually when session starts based on parsed AR request
         if (typeof updatePassthroughVisuals === 'function') updatePassthroughVisuals();
         if (uiGroup) uiGroup.position.set(0, -0.4, -1.8);
         camera.layers.enable(0);
         camera.layers.enable(1);
         camera.layers.enable(2);
         updateStereoVisibility();
      });
      renderer.xr.addEventListener('sessionend', () => {
         state.isImmersive = false;
         scene.background = new THREE.Color(0x000000);
         if (uiGroup) uiGroup.position.set(0, -0.4, -2);
         updateStereoVisibility();
      });

      function updateStereoVisibility() {
         const mode = state.mode;
         const useStereo = mode.stereo !== 'mono' && state.isImmersive && !state.uiVisible;
         if (meshes.preview) meshes.preview.visible = !useStereo;
         if (meshes.left) meshes.left.visible = useStereo;
         if (meshes.right) meshes.right.visible = useStereo;
      }

      function positionUIAtController(controller) {
         if (!controller || !uiGroup) return;
         const tempMatrix = new THREE.Matrix4();
         tempMatrix.identity().extractRotation(controller.matrixWorld);
         const origin = new THREE.Vector3();
         origin.setFromMatrixPosition(controller.matrixWorld);
         const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix);
         
         const targetPos = origin.clone().add(dir.multiplyScalar(1.8));
         uiGroup.position.copy(targetPos);
         
         const xrCam = renderer.xr.getCamera();
         if (xrCam) {
            const camPos = new THREE.Vector3();
            xrCam.getWorldPosition(camPos);
            uiGroup.lookAt(camPos);
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
            }
         }
         if (state.uiVisible) {
            state.lastInteraction = Date.now();
         }
         updateStereoVisibility();
      }

      // Video Setup
      videoTexture = new THREE.VideoTexture(jellyfinVideo);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      
      materials.preview = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });
      materials.left = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });
      materials.right = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.BackSide, toneMapped: false });

      const surfaceRoot = new THREE.Group();
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

      function createCurvedScreenGeometry(width, height, curveAmount) {
         const geometry = new THREE.PlaneGeometry(width, height, 72, 24);
         if (curveAmount <= 0.001) {
            return geometry;
         }

         const arc = curveAmount * Math.PI * 0.65;
         const radius = width / Math.max(arc, 0.001);
         const position = geometry.attributes.position;

         for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const angle = (x / width) * arc;
            const curvedX = Math.sin(angle) * radius;
            const curvedZ = radius - (Math.cos(angle) * radius);
            position.setXYZ(i, curvedX, position.getY(i), curvedZ);
         }

         position.needsUpdate = true;
         geometry.computeVertexNormals();
         return geometry;
      }

      function applyMode(modeId) {
         state.mode = MODES_BY_ID[modeId] || MODES_BY_ID['360-mono'];
         const mode = state.mode;

         let geometry;
         if (mode.projection === 'screen') {
            geometry = createCurvedScreenGeometry(18 * state.screenScale, 10.125 * state.screenScale, state.screenCurve);
            surfaceRoot.position.set(0, 1.6, -state.screenDistance);
            surfaceRoot.rotation.set(0, 0, 0);
         } else if (mode.projection === '180') {
            geometry = new THREE.SphereGeometry(32, 96, 64, 0, Math.PI, 0, Math.PI);
            surfaceRoot.position.set(0, 0, 0);
            surfaceRoot.rotation.set(0, Math.PI, 0);
         } else {
            geometry = new THREE.SphereGeometry(32, 96, 64);
            surfaceRoot.position.set(0, 0, 0);
            surfaceRoot.rotation.set(0, Math.PI, 0);
         }

         meshes.preview.geometry.dispose();
         meshes.preview.geometry = geometry.clone();
         meshes.left.geometry.dispose();
         meshes.left.geometry = geometry.clone();
         meshes.right.geometry.dispose();
         meshes.right.geometry = geometry.clone();

         const side = mode.projection === 'screen' ? THREE.FrontSide : THREE.BackSide;
         materials.preview.side = side;
         materials.left.side = side;
         materials.right.side = side;

         function getViewport(viewMode, eye) {
            if (viewMode.projection === 'screen') {
               if (viewMode.stereo === 'sbs') {
                  return eye === 'right' ? { x: 0.5, y: 0, rx: 0.5, ry: 1 } : { x: 0, y: 0, rx: 0.5, ry: 1 };
               }
               return { x: 0, y: 0, rx: 1, ry: 1 };
            }
            if (viewMode.stereo === 'mono') return { x: 1, y: 0, rx: -1, ry: 1 };
            if (viewMode.stereo === 'sbs') return eye === 'right' ? { x: 1, y: 0, rx: -0.5, ry: 1 } : { x: 0.5, y: 0, rx: -0.5, ry: 1 };
            return eye === 'right' ? { x: 1, y: 0, rx: -1, ry: 0.5 } : { x: 1, y: 0.5, rx: -1, ry: 0.5 };
         }

         const leftEye = state.swapEyes ? 'right' : 'left';
         const rightEye = state.swapEyes ? 'left' : 'right';

         function applyViewportToGeometry(geom, viewport) {
            const uv = geom.attributes.uv;
            for (let i = 0; i < uv.count; i++) {
               const u = uv.getX(i);
               const v = uv.getY(i);
               uv.setXY(i, (u * viewport.rx) + viewport.x, (v * viewport.ry) + viewport.y);
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

         localStorage.setItem(STORAGE_KEYS.lastMode, mode.id);
         updateStereoVisibility();
      }
      applyMode(modeId);

      // UI Builder (Glass Dock + Floating Menus)
      uiGroup = new THREE.Group();
      uiGroup.position.set(0, -0.4, -2);
      scene.add(uiGroup);

      function createRoundedRectShape(w, h, r) {
         const radius = Math.min(r, w / 2, h / 2);
         const shape = new THREE.Shape();
         shape.moveTo(-w / 2 + radius, h / 2);
         shape.lineTo(w / 2 - radius, h / 2);
         shape.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - radius);
         shape.lineTo(w / 2, -h / 2 + radius);
         shape.quadraticCurveTo(w / 2, -h / 2, w / 2 - radius, -h / 2);
         shape.lineTo(-w / 2 + radius, -h / 2);
         shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + radius);
         shape.lineTo(-w / 2, h / 2 - radius);
         shape.quadraticCurveTo(-w / 2, h / 2, -w / 2 + radius, h / 2);
         return shape;
      }

      function createPanel(w, h, r, hexColor, opacity) {
         const geometry = new THREE.ShapeGeometry(createRoundedRectShape(w, h, r));
         const material = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity });
         return new THREE.Mesh(geometry, material);
      }

      function createCircle(radius, hexColor, opacity) {
         const geometry = new THREE.CircleGeometry(radius, 36);
         const material = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity });
         return new THREE.Mesh(geometry, material);
      }

      function createTextObj(str, x, y, size, color, anchorX = 'center', parent = uiGroup, maxWidth) {
         const text = new Text();
         text.text = str;
         text.fontSize = size;
         text.color = color;
         text.position.set(x, y, 0.01);
         text.anchorX = anchorX;
         text.anchorY = 'middle';
         if (maxWidth) {
            text.maxWidth = maxWidth;
            text.overflowWrap = 'break-word';
         }
         parent.add(text);
         return text;
      }

      function createGlassPanel(w, h, r, parent = uiGroup, options = {}) {
         const group = new THREE.Group();
         parent.add(group);

         const aura = createPanel(
            w + 0.08,
            h + 0.08,
            Math.min(r + 0.04, (h + 0.08) / 2),
            options.auraColor || 0x38bdf8,
            options.auraOpacity ?? 0.12
         );
         aura.position.z = -0.03;
         group.add(aura);

         const base = createPanel(w, h, r, options.baseColor || 0x08111c, options.baseOpacity ?? 0.84);
         base.position.z = -0.01;
         group.add(base);

         const sheen = createPanel(
            Math.max(w - 0.08, 0.08),
            Math.max(h * 0.46, 0.08),
            Math.min(r * 0.72, (h * 0.46) / 2),
            options.sheenColor || 0xffffff,
            options.sheenOpacity ?? 0.06
         );
         sheen.position.set(0, h * 0.18, 0.002);
         group.add(sheen);

         return { group, aura, base, sheen };
      }

      function setButtonSelected(buttonObj, selected) {
         if (!buttonObj) return;
         const data = buttonObj.hit.userData;
         data.bg = selected ? data.selectedBg : data.defaultBg;
         data.hover = selected ? data.selectedHover : data.defaultHover;
         buttonObj.hit.material.color.setHex(data.bg);
         buttonObj.halo.material.opacity = selected ? 0.22 : 0.1;
         if (buttonObj.label) {
            buttonObj.label.color = selected ? 0xdff6ff : 0x8fa9c1;
         }
      }

      function createCircleButton(config) {
         const group = new THREE.Group();
         group.position.set(config.x, config.y, config.z || 0.04);
         uiGroup.add(group);

         const halo = createCircle(config.radius * 1.24, config.glow || 0x38bdf8, 0.1);
         halo.position.z = -0.012;
         group.add(halo);

         const hit = createCircle(config.radius, config.bg || 0x0c1624, 0.96);
         group.add(hit);

         hit.userData = {
            id: config.id,
            defaultBg: config.bg || 0x0c1624,
            defaultHover: config.hover || 0x173047,
            selectedBg: config.selectedBg || 0x12344f,
            selectedHover: config.selectedHover || 0x1a4a6d,
            bg: config.bg || 0x0c1624,
            hover: config.hover || 0x173047,
            onClick: config.onClick
         };

         interactables.push(hit);

         const icon = createTextObj(config.icon, 0, 0.006, config.iconSize || (config.radius * 0.88), 0xf8fbff, 'center', group);
         const label = config.label
            ? createTextObj(config.label, 0, -config.radius - 0.07, 0.024, 0x8fa9c1, 'center', group)
            : null;

         return { group, hit, icon, label, halo };
      }

      function getModeGlyph(mode) {
         if (mode.projection === '360') return '◎';
         if (mode.projection === '180') return '◖';
         return '▭';
      }

      function getModeBadge(mode) {
         if (mode.stereo === 'mono') return 'Mono';
         const stereoLabel = mode.stereo === 'sbs' ? 'SBS' : 'OU';
         return `${stereoLabel} ${mode.variant === 'half' ? 'Half' : 'Full'}`;
      }

      function setBarSpan(mesh, startRatio, endRatio) {
         if (!mesh) return;
         const safeStart = clamp(startRatio, 0, 1);
         const safeEnd = clamp(endRatio, safeStart, 1);
         const span = safeEnd - safeStart;
         mesh.visible = span > 0.0005;
         mesh.scale.x = mesh.visible ? span : 0.001;
         mesh.position.x = SEEK_LEFT + (SEEK_WIDTH * (safeStart + safeEnd)) / 2;
      }

      function togglePanel(panelName) {
         state.activePanel = state.activePanel === panelName ? null : panelName;
         modeMenuGroup.visible = state.activePanel === 'modes';
         screenSettingsGroup.visible = state.activePanel === 'screen';
         setButtonSelected(modeMenuBtnObj, state.activePanel === 'modes');
         setButtonSelected(screenBtnObj, state.activePanel === 'screen');
         state.lastInteraction = Date.now();
      }

      function createModeCard(mode, x, y, parent) {
         const group = new THREE.Group();
         group.position.set(x, y, 0.02);
         parent.add(group);

         const glow = createPanel(0.74, 0.32, 0.09, 0x38bdf8, 0.08);
         glow.position.z = -0.014;
         group.add(glow);

         const hit = createPanel(0.7, 0.28, 0.08, 0x091320, 0.94);
         group.add(hit);
         hit.userData = {
            id: `mode-${mode.id}`,
            defaultBg: 0x091320,
            defaultHover: 0x123049,
            selectedBg: 0x11304a,
            selectedHover: 0x184867,
            bg: 0x091320,
            hover: 0x123049,
            onClick: () => {
               applyMode(mode.id);
               setStatus(`Mode: ${mode.label}`);
               updateModeCards();
               updateScreenPanelState();
               state.lastInteraction = Date.now();
            }
         };
         interactables.push(hit);

         const icon = createTextObj(getModeGlyph(mode), -0.24, 0.02, 0.094, 0xf8fbff, 'center', group);
         const title = createTextObj(mode.shortLabel || mode.label, -0.08, 0.07, 0.038, 0xf8fbff, 'left', group, 0.42);
         const badge = createTextObj(getModeBadge(mode), -0.08, -0.03, 0.026, 0x7dd3fc, 'left', group, 0.42);
         const desc = createTextObj(
            mode.projection === 'screen' ? 'Curved theater screen' : `${mode.projection} immersive surface`,
            -0.08,
            -0.1,
            0.022,
            0x93adc2,
            'left',
            group,
            0.46
         );

         modeButtons.push({ mode, hit, glow, title, badge, desc });
      }

      function updateModeCards() {
         modeButtons.forEach((entry) => {
            const selected = entry.mode.id === state.mode.id;
            const data = entry.hit.userData;
            data.bg = selected ? data.selectedBg : data.defaultBg;
            data.hover = selected ? data.selectedHover : data.defaultHover;
            entry.hit.material.color.setHex(data.bg);
            entry.glow.material.opacity = selected ? 0.22 : 0.08;
            entry.badge.color = selected ? 0xdff6ff : 0x7dd3fc;
            entry.title.color = selected ? 0xffffff : 0xf4f8ff;
         });

         if (modePanelCurrentObj) {
            modePanelCurrentObj.text = `Current: ${state.mode.label}`;
         }
      }

      function createSlider(config) {
         const group = new THREE.Group();
         group.position.set(config.x || 0, config.y || 0, 0.04);
         config.parent.add(group);

         const label = createTextObj(config.label, -0.58, 0.09, 0.03, 0xe4eef9, 'left', group);
         const valueText = createTextObj('', 0.58, 0.09, 0.03, 0x7dd3fc, 'right', group);
         const track = createPanel(1.16, 0.08, 0.04, 0x132234, 0.9);
         track.position.set(0, -0.01, 0);
         group.add(track);
         const fill = createPanel(1.16, 0.08, 0.04, 0x38bdf8, 0.96);
         fill.position.set(0, -0.01, 0.004);
         group.add(fill);
         const thumb = createCircle(0.05, 0xf8fbff, 0.98);
         thumb.position.set(0, -0.01, 0.012);
         group.add(thumb);

         const slider = {
            width: 1.16,
            track,
            fill,
            thumb,
            valueText,
            min: config.min,
            max: config.max,
            getValue: config.getValue,
            formatValue: config.formatValue,
            applyValue: config.applyValue,
            sync() {
               const ratio = clamp((slider.getValue() - slider.min) / (slider.max - slider.min), 0, 1);
               fill.visible = true;
               fill.scale.x = Math.max(ratio, 0.001);
               fill.position.x = -slider.width / 2 + ((slider.width * Math.max(ratio, 0.001)) / 2);
               thumb.position.x = -slider.width / 2 + (slider.width * ratio);
               valueText.text = slider.formatValue(slider.getValue());
            }
         };

         function applySliderFromPoint(point) {
            const local = track.worldToLocal(point.clone());
            const ratio = clamp((local.x + slider.width / 2) / slider.width, 0, 1);
            const nextValue = slider.min + ((slider.max - slider.min) * ratio);
            slider.applyValue(nextValue);
            slider.sync();
            state.lastInteraction = Date.now();
         }

         track.userData = {
            id: `slider-${config.id}`,
            defaultBg: 0x132234,
            defaultHover: 0x1a3247,
            bg: 0x132234,
            hover: 0x1a3247,
            onClick: applySliderFromPoint,
            onDrag: applySliderFromPoint
         };
         interactables.push(track);
         sliderControls.push(slider);
         slider.sync();
         return slider;
      }

      function updateScreenPanelState() {
         if (!screenPanelHintObj || !screenPanelValueObj) return;
         if (state.mode.projection === 'screen') {
            screenPanelHintObj.text = 'Live on the current 3D screen.';
         } else {
            screenPanelHintObj.text = 'Switch to a 3D screen mode to preview curvature.';
         }
         screenPanelValueObj.text = `${state.screenDistance.toFixed(1)}m  •  ${(state.screenScale * 100).toFixed(0)}%  •  ${(state.screenCurve * 100).toFixed(0)}% curve`;
      }

      function applyScreenValue(key, value, storageKey, label, decimals = 2) {
         state[key] = Number(value.toFixed(decimals));
         localStorage.setItem(storageKey, String(state[key]));
         applyMode(state.mode.id);
         updateModeCards();
         updateScreenPanelState();
         const displayValue = key === 'screenDistance'
            ? `${state[key].toFixed(1)}m`
            : `${(state[key] * 100).toFixed(0)}%`;
         setStatus(`${label}: ${displayValue}`);
      }

      const dockPanel = createGlassPanel(2.9, 1.28, 0.22);
      dockPanel.group.position.set(0, -0.02, -0.015);

      const titleBar = createPanel(2.48, 0.34, 0.15, 0x0c1725, 0.62);
      titleBar.position.set(0, 0.36, 0.01);
      dockPanel.group.add(titleBar);

      const seekBaseShadow = createPanel(SEEK_WIDTH + 0.04, 0.12, 0.06, 0x020617, 0.3);
      seekBaseShadow.position.set(0, 0.08, 0.002);
      dockPanel.group.add(seekBaseShadow);

      seekTrackMesh = createPanel(SEEK_WIDTH, 0.08, 0.04, 0x142435, 0.96);
      seekTrackMesh.position.set(0, 0.08, 0.004);
      seekTrackMesh.userData = {
         id: 'seek-track',
         defaultBg: 0x142435,
         defaultHover: 0x1a334a,
         bg: 0x142435,
         hover: 0x1a334a
      };
      dockPanel.group.add(seekTrackMesh);
      interactables.push(seekTrackMesh);

      bufferedSegments = Array.from({ length: 6 }, () => {
         const segment = createPanel(SEEK_WIDTH, 0.08, 0.04, 0x64748b, 0.52);
         segment.position.set(0, 0.08, 0.008);
         segment.visible = false;
         dockPanel.group.add(segment);
         return segment;
      });

      seekFillMesh = createPanel(SEEK_WIDTH, 0.08, 0.04, 0x38bdf8, 0.96);
      seekFillMesh.position.set(0, 0.08, 0.012);
      dockPanel.group.add(seekFillMesh);

      seekThumbMesh = createCircle(0.055, 0xf8fbff, 1.0);
      seekThumbMesh.position.set(SEEK_LEFT, 0.08, 0.018);
      dockPanel.group.add(seekThumbMesh);

      const scrubToPoint = (point) => {
         if (!Number.isFinite(jellyfinVideo.duration) || jellyfinVideo.duration <= 0) return;
         const local = seekTrackMesh.worldToLocal(point.clone());
         const ratio = clamp((local.x + SEEK_WIDTH / 2) / SEEK_WIDTH, 0, 1);
         const nextTime = ratio * jellyfinVideo.duration;
         jellyfinVideo.currentTime = nextTime;
         state.scrubPreviewLabel = `${formatTime(nextTime)} / ${formatTime(jellyfinVideo.duration)}`;
         state.scrubPreviewUntil = Date.now() + 1500;
         state.lastInteraction = Date.now();
      };

      seekTrackMesh.userData.onClick = scrubToPoint;
      seekTrackMesh.userData.onDrag = scrubToPoint;

      const itemNameEl = document.querySelector('.itemName');
      titleTextObj = createTextObj(itemNameEl ? itemNameEl.textContent.trim() : 'Jellyfin VR Player', -1.08, 0.42, 0.058, 0xffffff, 'left', dockPanel.group, 1.74);
      detailTextObj = createTextObj('Glass UI for VR playback', -1.08, 0.32, 0.03, 0x9eb8ce, 'left', dockPanel.group, 1.74);
      statusTextObj = createTextObj('Ready', 1.08, 0.39, 0.03, 0xdff6ff, 'right', dockPanel.group, 0.86);
      timeTextObj = createTextObj('0:00 / 0:00', 1.08, -0.03, 0.032, 0xd5e7f6, 'right', dockPanel.group);
      createTextObj('Scrub with trigger or drag', -1.08, -0.03, 0.028, 0x89a4bc, 'left', dockPanel.group, 1.3);

      createCircleButton({
         id: 'btn-close',
         x: -1.04,
         y: -0.35,
         radius: 0.105,
         icon: '✕',
         label: 'Close',
         bg: 0x2a0c12,
         hover: 0x41121b,
         selectedBg: 0x3a1018,
         selectedHover: 0x5a1823,
         glow: 0xfb7185,
         onClick: () => close()
      });

      createCircleButton({
         id: 'btn-back',
         x: -0.62,
         y: -0.35,
         radius: 0.1,
         icon: '↺',
         label: '-10s',
         onClick: () => {
            jellyfinVideo.currentTime = Math.max(0, jellyfinVideo.currentTime - 10);
            setStatus('Back 10s');
         }
      });

      playBtnObj = createCircleButton({
         id: 'btn-play',
         x: -0.2,
         y: -0.35,
         radius: 0.126,
         icon: '▶',
         label: 'Play',
         bg: 0x0d3b57,
         hover: 0x155578,
         selectedBg: 0x155578,
         selectedHover: 0x1d6690,
         glow: 0x38bdf8,
         onClick: () => {
            if (jellyfinVideo.paused) {
               jellyfinVideo.play();
               setStatus('Play');
            } else {
               jellyfinVideo.pause();
               setStatus('Pause');
            }
         }
      });

      createCircleButton({
         id: 'btn-forward',
         x: 0.24,
         y: -0.35,
         radius: 0.1,
         icon: '↻',
         label: '+10s',
         onClick: () => {
            jellyfinVideo.currentTime = Math.min(jellyfinVideo.duration || jellyfinVideo.currentTime + 10, jellyfinVideo.currentTime + 10);
            setStatus('Forward 10s');
         }
      });

      modeMenuBtnObj = createCircleButton({
         id: 'btn-modes',
         x: 0.68,
         y: -0.35,
         radius: 0.1,
         icon: '◎',
         label: 'Modes',
         glow: 0x67e8f9,
         onClick: () => togglePanel('modes')
      });

      screenBtnObj = createCircleButton({
         id: 'btn-screen',
         x: 1.06,
         y: -0.35,
         radius: 0.1,
         icon: '▭',
         label: 'Screen',
         glow: 0x67e8f9,
         onClick: () => togglePanel('screen')
      });

      modeMenuGroup = new THREE.Group();
      modeMenuGroup.position.set(0, 0.9, 0.06);
      modeMenuGroup.visible = false;
      uiGroup.add(modeMenuGroup);

      const modePanel = createGlassPanel(2.58, 1.42, 0.18, modeMenuGroup, { auraOpacity: 0.14 });
      modePanel.group.position.set(0, 0, 0);
      createTextObj('Projection Menu', -1.08, 0.6, 0.05, 0xffffff, 'left', modePanel.group);
      createTextObj('Switch instantly between immersive and theater layouts.', -1.08, 0.5, 0.03, 0x97b1c6, 'left', modePanel.group, 1.88);
      modePanelCurrentObj = createTextObj(`Current: ${state.mode.label}`, 1.08, 0.6, 0.03, 0xdff6ff, 'right', modePanel.group, 0.9);

      const modeGrid = new THREE.Group();
      modeGrid.position.set(0, -0.02, 0.02);
      modePanel.group.add(modeGrid);

      VIEW_MODES.forEach((mode, index) => {
         const column = index % 3;
         const row = Math.floor(index / 3);
         createModeCard(mode, -0.76 + (column * 0.78), 0.26 - (row * 0.34), modeGrid);
      });

      screenSettingsGroup = new THREE.Group();
      screenSettingsGroup.position.set(0.82, 0.78, 0.06);
      screenSettingsGroup.visible = false;
      uiGroup.add(screenSettingsGroup);

      const screenPanel = createGlassPanel(1.52, 0.98, 0.18, screenSettingsGroup, { auraOpacity: 0.13 });
      screenPanel.group.position.set(0, 0, 0);
      createTextObj('Screen Geometry', -0.58, 0.36, 0.046, 0xffffff, 'left', screenPanel.group);
      screenPanelHintObj = createTextObj('', -0.58, 0.26, 0.028, 0x94aec5, 'left', screenPanel.group, 1.02);
      screenPanelValueObj = createTextObj('', -0.58, 0.16, 0.026, 0x7dd3fc, 'left', screenPanel.group, 1.08);

      createSlider({
         id: 'screen-distance',
         label: 'Distance',
         parent: screenPanel.group,
         y: 0.02,
         min: 7,
         max: 18,
         getValue: () => state.screenDistance,
         formatValue: (value) => `${value.toFixed(1)}m`,
         applyValue: (value) => applyScreenValue('screenDistance', value, STORAGE_KEYS.screenDistance, 'Distance', 1)
      });

      createSlider({
         id: 'screen-scale',
         label: 'Size',
         parent: screenPanel.group,
         y: -0.22,
         min: 0.7,
         max: 1.8,
         getValue: () => state.screenScale,
         formatValue: (value) => `${(value * 100).toFixed(0)}%`,
         applyValue: (value) => applyScreenValue('screenScale', value, STORAGE_KEYS.screenScale, 'Size', 2)
      });

      createSlider({
         id: 'screen-curve',
         label: 'Curve',
         parent: screenPanel.group,
         y: -0.46,
         min: 0,
         max: 1,
         getValue: () => state.screenCurve,
         formatValue: (value) => `${(value * 100).toFixed(0)}%`,
         applyValue: (value) => applyScreenValue('screenCurve', value, STORAGE_KEYS.screenCurve, 'Curve', 2)
      });

      updateModeCards();
      updateScreenPanelState();
      window.jfvrShowStatus = (msg) => { setStatus(msg, 2500); };

      // Pointer & Raycasting Setup
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

      // Init controllers & hands
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
         
         const grip = renderer.xr.getControllerGrip(i);
         grip.add(controllerModelFactory.createControllerModel(grip));
         scene.add(grip);

         const hand = renderer.xr.getHand(i);
         hand.add(handModelFactory.createHandModel(hand, 'boxes'));
         scene.add(hand);

         // Helper line
         const geometryLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]);
         const line = new THREE.Line(geometryLine, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
         controller.add(line);
      }

      function updateHover(controllers) {
         let hit = false;
         if (!state.uiVisible) {
            for(let i=0; i<controllers.length; i++) {
               const cont = controllers[i];
               if (cont && cont.children[0]) cont.children[0].scale.z = 1;
            }
            if (hoveredObj) {
               hoveredObj.material.color.setHex(hoveredObj.userData.bg);
               hoveredObj = null;
            }
            return;
         }

         for(let i=0; i<controllers.length; i++) {
            const controller = controllers[i];
            if (!controller.visible) continue;
            tempMatrix.identity().extractRotation(controller.matrixWorld);
            raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
            const intersects = raycaster.intersectObjects(interactables, false);
            if (intersects.length > 0) {
               const obj = intersects[0].object;
               if (hoveredObj && hoveredObj !== obj) {
                  hoveredObj.material.color.setHex(hoveredObj.userData.bg);
               }
               hoveredObj = obj;
               hoveredObj.material.color.setHex(hoveredObj.userData.hover);
               hit = true;
               state.lastInteraction = Date.now();
               
               // shorten pointer line
               const dist = intersects[0].distance;
               const line = controller.children[0];
               if (line) line.scale.z = dist / 5;
            } else {
               const line = controller.children[0];
               if (line) line.scale.z = 1;
            }
         }
         if (!hit && hoveredObj) {
            hoveredObj.material.color.setHex(hoveredObj.userData.bg);
            hoveredObj = null;
         }
      }

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      renderer.setAnimationLoop(() => {
         const dur = jellyfinVideo.duration || 0;
         const cur = jellyfinVideo.currentTime || 0;
         const ratio = dur > 0 ? (cur / dur) : 0;
         const now = Date.now();

         timeTextObj.text = `${formatTime(cur)} / ${formatTime(dur)}`;
         detailTextObj.text = dur > 0
            ? `${jellyfinVideo.paused ? 'Paused' : 'Playing'}  •  ${formatTime(Math.max(dur - cur, 0))} left`
            : 'Loading media metadata';
         statusTextObj.text = state.scrubPreviewUntil > now
            ? state.scrubPreviewLabel
            : state.statusUntil > now
              ? state.statusMessage
              : state.activePanel === 'modes'
                ? 'Mode menu open'
                : state.activePanel === 'screen'
                  ? 'Screen tuning open'
                  : state.isImmersive
                    ? 'Immersive controls active'
                    : 'Desktop preview';

         setBarSpan(seekFillMesh, 0, Math.max(ratio, 0.001));
         seekThumbMesh.position.x = SEEK_LEFT + (SEEK_WIDTH * ratio);

         for (let i = 0; i < bufferedSegments.length; i++) {
            const segment = bufferedSegments[i];
            if (i < jellyfinVideo.buffered.length && dur > 0) {
               const start = jellyfinVideo.buffered.start(i) / dur;
               const end = jellyfinVideo.buffered.end(i) / dur;
               setBarSpan(segment, start, end);
            } else {
               segment.visible = false;
            }
         }

         if (playBtnObj && playBtnObj.icon) {
            playBtnObj.icon.text = jellyfinVideo.paused ? '▶' : '❚❚';
            if (playBtnObj.label) {
               playBtnObj.label.text = jellyfinVideo.paused ? 'Play' : 'Pause';
            }
         }

         sliderControls.forEach((slider) => slider.sync());

         updateHover([renderer.xr.getController(0), renderer.xr.getController(1)]);

         for(let i=0; i<2; i++) {
            const controller = renderer.xr.getController(i);
            if (controller && controller.userData && controller.userData.dragTarget) {
               const obj = controller.userData.dragTarget;
               tempMatrix.identity().extractRotation(controller.matrixWorld);
               raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
               raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
               const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1).applyQuaternion(uiGroup.quaternion), 0);
               plane.translate(uiGroup.position);
               const intersectPoint = new THREE.Vector3();
               if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
                  if (obj.userData.onDrag) obj.userData.onDrag(intersectPoint);
               }
               state.lastInteraction = Date.now();
            }
         }

         if (state.uiVisible && now - state.lastInteraction > 4000) {
            toggleUI();
         }

         renderer.render(scene, camera);
      });
    }

    function close() {
      active = false;
      if (renderer) {
        renderer.setAnimationLoop(null);
        if (renderer.xr.isPresenting) renderer.xr.getSession().end();
        renderer.dispose();
      }
      overlay.remove();
      styleEl.remove();
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === ' ') { event.preventDefault(); jellyfinVideo.paused ? jellyfinVideo.play() : jellyfinVideo.pause(); }
    };
    overlay.addEventListener('keydown', onKeyDown);
    
    initThree().catch(err => {
      console.error("Three.js initialization failed:", err);
      // fallback
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
    overlay.innerHTML = INLINE_PLAYER_HTML;
    document.body.appendChild(overlay);

    activeInlinePlayer = createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId);
  }

  function requestPlayerState(playerWindow) {
    return new Promise((resolve) => {
      if (!playerWindow || playerWindow.closed) {
        resolve(null);
        return;
      }

      let settled = false;
      const timeout = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 500);

      const onMessage = (event) => {
        if (event.source !== playerWindow) return;
        const data = event.data || {};
        if (data.type !== 'PLAYER_STATE') return;
        cleanup();
        resolve(data);
      };

      const cleanup = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
      };

      window.addEventListener('message', onMessage);
      playerWindow.postMessage({ type: 'REQUEST_STATE' }, '*');
    });
  }

  function restorePlaybackState(jellyfinVideo, playerState) {
    if (!jellyfinVideo) return;

    if (playerState) {
      if (Number.isFinite(playerState.currentTime)) {
        try {
          jellyfinVideo.currentTime = playerState.currentTime;
        } catch (error) {
          // ignored
        }
      }

      if (typeof playerState.volume === 'number') {
        jellyfinVideo.volume = Math.min(1, Math.max(0, playerState.volume));
      }

      jellyfinVideo.muted = Boolean(playerState.muted);

      if (typeof playerState.playbackRate === 'number' && Number.isFinite(playerState.playbackRate)) {
        jellyfinVideo.playbackRate = playerState.playbackRate;
      }

      if (playerState.paused) {
        jellyfinVideo.pause();
      } else {
        jellyfinVideo.play().catch(() => {});
      }
    } else {
      jellyfinVideo.play().catch(() => {});
    }
  }

  async function closePlayerWindow(playerWindow, jellyfinVideo, overlayState) {
    if (overlayState.closing) return;
    overlayState.closing = true;

    let playerState = overlayState.lastPlayerState || null;
    if (!playerState) {
      try {
        playerState = await requestPlayerState(playerWindow);
      } catch (error) {
        playerState = null;
      }
    }

    restorePlaybackState(jellyfinVideo, playerState);
    cleanupHostSession(overlayState.hostSessionId, playerState);

    window.removeEventListener('message', overlayState.onMessage);
    if (overlayState.closePoll) {
      window.clearInterval(overlayState.closePoll);
    }
    if (playerWindow && !playerWindow.closed) {
      try {
        playerWindow.close();
      } catch (error) {
        // ignored
      }
    }
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

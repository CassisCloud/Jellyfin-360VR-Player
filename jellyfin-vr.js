(function () {
  const STORAGE_KEYS = {
    lastMode: 'jfvr:last-mode',
    uiDistance: 'jfvr:ui-distance',
    uiScale: 'jfvr:ui-scale'
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
       passthroughBrightness: 1.0
    };
    let interactables = [];
    let ptBtn;

    // UI elements references
    let timeTextObj, playBtnObj, modeTextObj;

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
      buttonsContainer.style.bottom = '20px';
      buttonsContainer.style.left = '50%';
      buttonsContainer.style.transform = 'translateX(-50%)';
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.gap = '20px';
      buttonsContainer.style.zIndex = '999999';
      overlay.appendChild(buttonsContainer);

      vrButton = VRButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
      vrButton.style.position = 'relative';
      vrButton.style.bottom = 'auto';
      vrButton.style.left = 'auto';
      vrButton.style.transform = 'none';
      vrButton.addEventListener('click', () => {
         state.isAR = false;
         state.passthroughEnabled = false;
      });
      buttonsContainer.appendChild(vrButton);

      arButton = ARButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
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
         // Update visually when session starts based on parsed AR request
         if (typeof updatePassthroughVisuals === 'function') updatePassthroughVisuals();
         if (ptBtn && ptBtn.children && ptBtn.children.length > 0) {
             ptBtn.children[0].text = state.passthroughEnabled ? '👁️' : '🕶️';
         }
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

      function applyMode(modeId) {
         state.mode = MODES_BY_ID[modeId] || MODES_BY_ID['360-mono'];
         let mode = state.mode;
         
         let geometry;
         if (mode.projection === 'screen') {
            geometry = new THREE.PlaneGeometry(18, 10.125);
            surfaceRoot.position.set(0, 1.6, -12);
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
         materials.preview.side = side; materials.left.side = side; materials.right.side = side;

         // Viewports
         function getViewport(m, eye) {
            if (m.projection === 'screen') {
               if (m.stereo === 'sbs') return eye === 'right' ? {x:0.5, y:0, rx:0.5, ry:1} : {x:0, y:0, rx:0.5, ry:1};
               return {x:0, y:0, rx:1, ry:1};
            }
            if (m.stereo === 'mono') return {x:1, y:0, rx:-1, ry:1};
            if (m.stereo === 'sbs') return eye === 'right' ? {x:1, y:0, rx:-0.5, ry:1} : {x:0.5, y:0, rx:-0.5, ry:1};
            return eye === 'right' ? {x:1, y:0, rx:-1, ry:0.5} : {x:1, y:0.5, rx:-1, ry:0.5};
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
         
         if (modeTextObj) modeTextObj.text = mode.label;
         
         updateStereoVisibility();
      }
      applyMode(modeId);

      // UI Builder (Frosted Glass iOS Style)
      uiGroup = new THREE.Group();
      uiGroup.position.set(0, -0.4, -2);
      scene.add(uiGroup);

      function createRoundedRectShape(w, h, r) {
         const s = new THREE.Shape();
         s.moveTo(-w/2 + r, h/2); s.lineTo(w/2 - r, h/2); s.quadraticCurveTo(w/2, h/2, w/2, h/2 - r);
         s.lineTo(w/2, -h/2 + r); s.quadraticCurveTo(w/2, -h/2, w/2 - r, -h/2);
         s.lineTo(-w/2 + r, -h/2); s.quadraticCurveTo(-w/2, -h/2, -w/2, -h/2 + r);
         s.lineTo(-w/2, h/2 - r); s.quadraticCurveTo(-w/2, h/2, -w/2 + r, h/2);
         return s;
      }

      function createPanel(w, h, r, hexColor, opacity) {
         const geo = new THREE.ShapeGeometry(createRoundedRectShape(w, h, r));
         const mat = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity });
         return new THREE.Mesh(geo, mat);
      }

      function createTextObj(str, x, y, size, color, anchorX = 'center') {
         const t = new Text();
         t.text = str; t.fontSize = size; t.color = color;
         t.position.set(x, y, 0.01); t.anchorX = anchorX; t.anchorY = 'middle';
         uiGroup.add(t);
         return t;
      }

      function createIconBtn(id, x, y, r, bg, hover, labelRaw, onClick) {
         const geo = new THREE.ShapeGeometry(createRoundedRectShape(r*2, r*2, r*0.5));
         const mat = new THREE.MeshBasicMaterial({ color: bg, transparent: true, opacity: 0.85 });
         const mesh = new THREE.Mesh(geo, mat);
         mesh.position.set(x, y, 0);
         mesh.userData = { id, isBtn: true, bg, hover, onClick };
         uiGroup.add(mesh); interactables.push(mesh);
         
         const t = new Text(); t.text = labelRaw; t.fontSize = r * 0.9; t.color = 0xffffff;
         t.position.set(0, 0, 0.01); t.anchorX = 'center'; t.anchorY = 'middle';
         mesh.add(t);
         return mesh;
      }

      const bgMesh = createPanel(2.1, 1.0, 0.1, 0x020617, 0.88);
      bgMesh.position.set(0, -0.05, -0.01); uiGroup.add(bgMesh);
      const bgGlow = createPanel(2.12, 1.02, 0.12, 0x38bdf8, 0.15);
      bgGlow.position.set(0, -0.05, -0.015); uiGroup.add(bgGlow);

      // User requested debug indicator
      const debugText = createTextObj('DEBUG: UI v2.0', 0, 0.52, 0.04, 0xfb7185, 'center');

      const itemNameEl = document.querySelector('.itemName');
      createTextObj(itemNameEl ? itemNameEl.textContent : 'Jellyfin VR Player', 0, 0.35, 0.045, 0xffffff);

      const seekBg = createPanel(1.8, 0.06, 0.03, 0x1e293b, 0.8);
      seekBg.position.set(0, 0.15, 0);
      const handleSeekDrag = (pt) => {
         const local = seekBg.worldToLocal(pt.clone());
         const ratio = Math.max(0, Math.min(1, (local.x + 0.9) / 1.8));
         if (Number.isFinite(jellyfinVideo.duration)) jellyfinVideo.currentTime = ratio * jellyfinVideo.duration;
      };
      seekBg.userData = { isSeek: true, hover: 0x334155, bg: 0x1e293b, onClick: handleSeekDrag, onDrag: handleSeekDrag };
      uiGroup.add(seekBg); interactables.push(seekBg);

      const seekBuf = createPanel(1.8, 0.06, 0.03, 0x475569, 0.9);
      seekBuf.position.set(0, 0.15, 0.003); uiGroup.add(seekBuf);

      const seekFill = createPanel(1.8, 0.06, 0.03, 0x38bdf8, 1.0);
      seekFill.position.set(0, 0.15, 0.006); uiGroup.add(seekFill);

      timeTextObj = createTextObj('0:00 / 0:00', 0.85, 0.06, 0.032, 0xc8ddf0, 'right');
      const statusText = createTextObj('Ready', -0.85, 0.06, 0.032, 0x7dd3fc, 'left');

      createIconBtn('btn-back', -0.35, -0.08, 0.08, 0x0f172a, 0x1e293b, '⏪', () => jellyfinVideo.currentTime -= 10);
      playBtnObj = createIconBtn('btn-play', 0, -0.08, 0.11, 0x0c4a6e, 0x0ea5e9, '⏸', () => jellyfinVideo.paused ? jellyfinVideo.play() : jellyfinVideo.pause());
      createIconBtn('btn-fwd', 0.35, -0.08, 0.08, 0x0f172a, 0x1e293b, '⏩', () => jellyfinVideo.currentTime += 10);
      createIconBtn('btn-close', -0.75, -0.08, 0.08, 0x450a0a, 0x7f1d1d, '✖', () => close());
      
      ptBtn = createIconBtn('btn-pt', 0.75, -0.08, 0.08, 0x0f172a, 0x1e293b, '👁️', () => {
         state.passthroughEnabled = !state.passthroughEnabled;
         if (ptBtn.children[0]) ptBtn.children[0].text = state.passthroughEnabled ? '👁️' : '🕶️';
         updatePassthroughVisuals();
      });

      let screenSettingsPopup = new THREE.Group();
      createIconBtn('btn-screen', 0.15, -0.32, 0.08, 0x0f172a, 0x1e293b, '🖥️', () => {
         screenSettingsPopup.visible = !screenSettingsPopup.visible;
      });

      modeTextObj = createTextObj(state.mode.label, 0.35, -0.32, 0.04, 0xf0f6ff, 'left');
      createIconBtn('btn-cycle', 0.8, -0.32, 0.08, 0x0f172a, 0x1e293b, '🔄', () => {
         let idx = VIEW_MODES.findIndex(m => m.id === state.mode.id);
         idx = (idx + 1) % VIEW_MODES.length;
         applyMode(VIEW_MODES[idx].id);
      });

      screenSettingsPopup.position.set(0, 0, 0.02);
      screenSettingsPopup.visible = false;
      const popupBg = createPanel(0.8, 0.45, 0.06, 0x020617, 0.96);
      popupBg.position.set(0, 0.25, 0.05); screenSettingsPopup.add(popupBg);
      createTextObj('Screen Adjust', -0.35, 0.4, 0.04, 0x7dd3fc, 'left').parent = screenSettingsPopup;
      createTextObj('Dist:', -0.15, 0.3, 0.03, 0xe2e8f0, 'right').parent = screenSettingsPopup;
      createTextObj('Size:', -0.15, 0.2, 0.03, 0xe2e8f0, 'right').parent = screenSettingsPopup;
      createTextObj('Curve:', -0.15, 0.1, 0.03, 0xe2e8f0, 'right').parent = screenSettingsPopup;
      uiGroup.add(screenSettingsPopup);

      // Dummy objects to prevent missing ref errors in render loop
      const dimGroup = { visible: false };
      const dimFill = { scale: { x: 1 }, position: { x: 0 } };
      const dimTextObj = { text: '' };

      window.jfvrShowStatus = (msg) => { statusText.text = msg; };

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
         // UI updates mapping player state
         const dur = jellyfinVideo.duration || 0;
         const cur = jellyfinVideo.currentTime || 0;
         timeTextObj.text = `${formatTime(cur)} / ${formatTime(dur)}`;
         
         const ratio = dur > 0 ? (cur / dur) : 0;
         seekFill.scale.x = ratio || 0.001;
         seekFill.position.x = -0.8 + (1.6 * ratio) / 2;

         if (playBtnObj && playBtnObj.children[0]) {
            playBtnObj.children[0].text = jellyfinVideo.paused ? 'Play' : 'Pause';
         }

         updateHover([renderer.xr.getController(0), renderer.xr.getController(1)]);

         // Handle dragging
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

         if (state.uiVisible && Date.now() - state.lastInteraction > 4000) {
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

import { STORAGE_KEYS } from '../constants.js';
import { getVideoTitle, getJellyfinApiClient, getJellyfinItemId } from '../utils.js';
import { removeVersionModal, openVersionModal } from '../version-modal.js';
import { setActiveInlinePlayer } from '../active-player.js';
import { createRuntimeContext, RUNTIME_CONSTANTS } from './context.js';
import { createCurvedScreenGeometry } from './geometry.js';
import { getScreenSurfaceSpec } from './screen-math.js';
import { clearCompositionVideoLayer, syncCompositionVideoLayer, getSurfaceWorldTransform } from './composition-layers.js';
import { updateHarnessState, exposeHarnessActions, exposeHarnessDebug, updateImmersiveDebugScreen } from './harness.js';
import { injectImportMap, getPreferredWebXROptionalFeatures, ensureWebXRPolyfills } from './xr-session.js';
import {
  applyUiAnchorFromViewer, applyDebugPanelAnchorFromViewer,
  recenterActiveMode, updateStereoVisibility,
  toggleUI, toggleDebugPanel, wake, cycleStereoLock, refreshUiDistance, setFacePlayerEnabled, faceObjectTowardViewer
} from './ui-controls.js';
import {
  onSelectStart, onSelectEnd, onSqueezeStart, onSqueezeEnd
} from './interaction.js';
import { createAnimationLoop } from './animation-loop.js';
import { buildUI } from './ui-builder.js';

function selectTrickplayInfo(trickplayManifest) {
  if (!trickplayManifest || typeof trickplayManifest !== 'object') return null;

  const variants = [];
  const outerEntries = Object.values(trickplayManifest);
  for (let i = 0; i < outerEntries.length; i += 1) {
    const entry = outerEntries[i];
    if (!entry || typeof entry !== 'object') continue;
    const widthEntries = Object.entries(entry);
    for (let j = 0; j < widthEntries.length; j += 1) {
      const [widthKey, info] = widthEntries[j];
      if (!info || typeof info !== 'object') continue;
      const width = Number(info.Width || widthKey);
      if (!Number.isFinite(width) || width <= 0) continue;
      variants.push({ width, info });
    }
  }

  if (!variants.length) return null;

  variants.sort((a, b) => a.width - b.width);
  const preferred = variants.find((variant) => variant.width >= 320) || variants[0];
  return {
    width: preferred.width,
    ...preferred.info
  };
}

async function loadTrickplayMetadata(ctx) {
  const apiClient = getJellyfinApiClient();
  const itemId = getJellyfinItemId(ctx.jellyfinVideo);
  ctx.trickplayItemId = itemId;

  if (!apiClient || !itemId || typeof apiClient.getItems !== 'function') {
    ctx.trickplayFetchState = 'unavailable';
    return;
  }

  ctx.trickplayFetchState = 'loading';

  try {
    const userId = typeof apiClient.getCurrentUserId === 'function' ? apiClient.getCurrentUserId() : null;
    const result = await apiClient.getItems(userId, {
      ids: itemId,
      fields: 'Trickplay'
    });

    if (!ctx.active) return;

    const items = result && Array.isArray(result.Items) ? result.Items : [];
    const item = items[0] || null;
    const info = item ? selectTrickplayInfo(item.Trickplay) : null;
    ctx.trickplayInfo = info;
    ctx.trickplayFetchState = info ? 'ready' : 'missing';
  } catch (error) {
    console.warn('Failed to load trickplay metadata:', error);
    if (!ctx.active) return;
    ctx.trickplayInfo = null;
    ctx.trickplayFetchState = 'error';
  }
}

export function createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId) {
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
      ctx.trickplayTileLoader = new THREE.TextureLoader();
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
        updateStereoVisibility(ctx, THREE);
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
      updateStereoVisibility(ctx, THREE);
    }

    // Build 3D UI
    buildUI(ctx, THREE, Text, close, applyModeFromState, updatePassthroughVisuals);
    loadTrickplayMetadata(ctx);

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
      updateStereoVisibility(ctx, THREE);
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
      updateStereoVisibility(ctx, THREE);
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
        refreshUiDistance(ctx, THREE);
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
        toggleDebugPanel(ctx, THREE, null, 'harness');
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
        updateStereoVisibility(ctx, THREE);
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
        updateStereoVisibility(ctx, THREE);
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
          toggleDebugPanel(ctx, THREE, controller, 'harness');
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
      ctx.trickplayTileCache.forEach((texture) => {
        if (texture && typeof texture.dispose === 'function') texture.dispose();
      });
      ctx.trickplayTileCache.clear();
      ctx.trickplayTileLoads.clear();
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

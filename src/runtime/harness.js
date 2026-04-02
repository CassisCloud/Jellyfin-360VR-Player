import { RUNTIME_CONSTANTS } from './context.js';
import { getScreenSurfaceSpec } from './screen-math.js';

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

export function updateImmersiveDebugScreen(ctx) {
  if (!ctx.immersiveDebugScreen) return;
  ctx.immersiveDebugScreen.visible = immersiveDebugScreenActive();
}

export function updateHarnessState(ctx) {
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

export function exposeHarnessActions(ctx) {
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

export function exposeHarnessDebug(ctx) {
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
          const surfaceTransform = getSurfaceWorldTransform(ctx, THREERef);
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
        effectiveStereo: ctx.meshes.left ? ctx.meshes.left.visible === true : false,
        visibleTextCount,
        readyTextCount
      };
    }
  };
}

function getSurfaceWorldTransform(ctx, THREE) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  ctx.surfaceRoot.updateMatrixWorld(true);
  ctx.surfaceRoot.matrixWorld.decompose(position, quaternion, scale);
  return { position, quaternion, scale };
}

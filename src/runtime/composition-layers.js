import { RUNTIME_CONSTANTS } from './context.js';
import { getScreenSurfaceSpec } from './screen-math.js';
import { updateHarnessState } from './harness.js';

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

export function clearCompositionVideoLayer(ctx, session, skipUpdate) {
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

export function getSurfaceWorldTransform(ctx, THREE) {
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

export function syncCompositionVideoLayer(ctx, THREE) {
  ctx.xrLayerSyncCount += 1;
  const session = ctx.renderer && ctx.renderer.xr && typeof ctx.renderer.xr.getSession === 'function' ? ctx.renderer.xr.getSession() : null;
  const sessionMode = session && typeof session.mode === 'string' ? session.mode : ctx.xrSessionMode;
  const isSessionVR = sessionMode === 'immersive-vr';
  const forceMeshInVR = RUNTIME_CONSTANTS.DISABLE_COMPOSITION_LAYERS_IN_VR && isSessionVR;
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

  if (forceMeshInVR) {
    clearCompositionVideoLayer(ctx, session);
    ctx.mediaLayerStatus = 'inactive';
    ctx.mediaLayerReason = 'vr-kill-switch';
    ctx.xrMediaBindingFactory = typeof window.XRMediaBinding === 'function' ? 'available' : 'missing';
    ctx.xrMediaLayerSupport = 'skipped';
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

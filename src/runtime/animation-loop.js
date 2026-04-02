import { formatTime, getJellyfinApiClient } from '../utils.js';
import { getSurfaceWorldTransform } from './composition-layers.js';
import { toggleUI, updateFloatingPanelFacing, faceObjectTowardViewer } from './ui-controls.js';
import { updateVideoGrab, updateFloatingPanelGrab, updateHover } from './interaction.js';
import { RUNTIME_CONSTANTS } from './context.js';

function hideSeekPreview(ctx) {
  if (ctx.seekPreviewGroup) ctx.seekPreviewGroup.visible = false;
  if (ctx.seekPreviewImage) ctx.seekPreviewImage.visible = false;
}

function getTrickplayTileUrl(ctx, tileIndex) {
  const apiClient = getJellyfinApiClient();
  const info = ctx.trickplayInfo;
  if (!apiClient || !info || !ctx.trickplayItemId || typeof apiClient.getUrl !== 'function') return '';
  return apiClient.getUrl(`Videos/${ctx.trickplayItemId}/Trickplay/${info.width}/${tileIndex}.jpg`);
}

function ensureTrickplayTileTexture(ctx, THREE, tileIndex) {
  if (ctx.trickplayTileCache.has(tileIndex)) {
    return Promise.resolve(ctx.trickplayTileCache.get(tileIndex));
  }
  if (ctx.trickplayTileLoads.has(tileIndex)) {
    return ctx.trickplayTileLoads.get(tileIndex);
  }

  const url = getTrickplayTileUrl(ctx, tileIndex);
  if (!url || !ctx.trickplayTileLoader) {
    return Promise.resolve(null);
  }

  const loadPromise = new Promise((resolve) => {
    ctx.trickplayTileLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        ctx.trickplayTileCache.set(tileIndex, texture);
        ctx.trickplayTileLoads.delete(tileIndex);
        resolve(texture);
      },
      undefined,
      () => {
        ctx.trickplayTileLoads.delete(tileIndex);
        resolve(null);
      }
    );
  });

  ctx.trickplayTileLoads.set(tileIndex, loadPromise);
  return loadPromise;
}

function applySeekPreviewFrame(ctx, columns, rows, frameIndex) {
  if (!ctx.trickplayActiveTexture || !ctx.seekPreviewImage || !ctx.seekPreviewImage.material) return false;
  const cellIndex = frameIndex % (columns * rows);
  const cellX = cellIndex % columns;
  const cellY = Math.floor(cellIndex / columns);
  ctx.trickplayActiveTexture.repeat.set(1 / columns, 1 / rows);
  ctx.trickplayActiveTexture.offset.set(cellX / columns, 1 - ((cellY + 1) / rows));
  ctx.trickplayActiveTexture.needsUpdate = true;
  ctx.seekPreviewImage.material.map = ctx.trickplayActiveTexture;
  ctx.seekPreviewImage.material.needsUpdate = true;
  ctx.seekPreviewImage.visible = true;
  ctx.trickplayActiveFrameIndex = frameIndex;
  return true;
}

function updateSeekPreview(ctx, THREE, durationSeconds) {
  const info = ctx.trickplayInfo;
  if (!ctx.seekPreviewGroup || !info || !ctx.seekHoverVisible || durationSeconds <= 0) {
    hideSeekPreview(ctx);
    return;
  }

  const hoverRatio = THREE.MathUtils.clamp(ctx.seekHoverRatio, 0, 1);
  const previewSeconds = hoverRatio * durationSeconds;
  const intervalMs = Math.max(1, Number(info.Interval) || 1000);
  const frameCount = Math.max(1, Number(info.ThumbnailCount) || 1);
  const frameIndex = Math.max(0, Math.min(Math.floor((previewSeconds * 1000) / intervalMs), frameCount - 1));
  const columns = Math.max(1, Number(info.TileWidth) || 1);
  const rows = Math.max(1, Number(info.TileHeight) || 1);
  const tileIndex = Math.floor(frameIndex / (columns * rows));
  const previewWidth = ctx.seekPreviewGroup.userData && ctx.seekPreviewGroup.userData.previewWidth
    ? ctx.seekPreviewGroup.userData.previewWidth
    : 0.44;
  const seekWidth = ctx.seekBg && ctx.seekBg.userData && ctx.seekBg.userData.seekWidth
    ? ctx.seekBg.userData.seekWidth
    : 1.9;
  const previewHalfWidth = previewWidth / 2;
  const previewX = THREE.MathUtils.clamp(
    (-seekWidth / 2) + (seekWidth * hoverRatio),
    (-seekWidth / 2) + previewHalfWidth,
    (seekWidth / 2) - previewHalfWidth
  );

  ctx.seekPreviewGroup.visible = true;
  ctx.seekPreviewGroup.position.x = previewX;
  if (ctx.seekPreviewTimeObj) {
    ctx.seekPreviewTimeObj.text = formatTime(previewSeconds);
    ctx.seekPreviewTimeObj.sync();
  }

  if (ctx.trickplayActiveTexture && ctx.trickplayActiveTileIndex === tileIndex) {
    applySeekPreviewFrame(ctx, columns, rows, frameIndex);
    return;
  }

  ensureTrickplayTileTexture(ctx, THREE, tileIndex).then((texture) => {
    if (!ctx.active || !texture || !ctx.trickplayInfo) return;
    if (ctx.trickplayActiveTileIndex !== tileIndex) {
      ctx.trickplayActiveTexture = texture;
      ctx.trickplayActiveTileIndex = tileIndex;
    }
  });

  if (ctx.trickplayTileCache.has(tileIndex)) {
    ctx.trickplayActiveTexture = ctx.trickplayTileCache.get(tileIndex);
    ctx.trickplayActiveTileIndex = tileIndex;
  }

  if (ctx.trickplayActiveTexture && ctx.trickplayActiveTileIndex === tileIndex) {
    applySeekPreviewFrame(ctx, columns, rows, frameIndex);
  } else {
    ctx.seekPreviewImage.visible = false;
  }
}

export function createAnimationLoop(ctx, THREE) {
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

    updateSeekPreview(ctx, THREE, dur);

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

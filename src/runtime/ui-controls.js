import { updateHarnessState, updateImmersiveDebugScreen } from './harness.js';
import { syncCompositionVideoLayer } from './composition-layers.js';
import { STORAGE_KEYS } from '../constants.js';

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

export function getViewerObject(ctx) {
  return ctx.renderer && ctx.renderer.xr && ctx.renderer.xr.isPresenting
    ? ctx.renderer.xr.getCamera()
    : ctx.camera;
}

export function faceObjectTowardViewer(ctx, THREE, object3D, options) {
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

export function registerFloatingPanel(ctx, panelState) {
  ctx.floatingPanels = ctx.floatingPanels.filter((panel) => panel.id !== panelState.id);
  ctx.floatingPanels.push(panelState);
}

export function getFloatingPanelState(ctx, panelId) {
  return ctx.floatingPanels.find((panel) => panel.id === panelId) || null;
}

export function updateFloatingPanelFacing(ctx, THREE, panelState) {
  if (!panelState || !panelState.group || !panelState.group.visible) return;
  if (panelState.facePlayerEnabled === false) return;
  faceObjectTowardViewer(ctx, THREE, panelState.group, { yawOnly: true });
}

export function applyUiAnchorFromViewer(ctx, THREE, anchorType, controller) {
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

export function applyDebugPanelAnchorFromViewer(ctx, THREE, controller) {
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

export function recenterActiveMode(ctx, THREE) {
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

export function updateStereoVisibility(ctx, _THREE) {
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

export function openDebugPanel(ctx, THREE, controller, _source) {
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

export function closeDebugPanel(ctx) {
  ctx.state.showingDebugPanel = false;
  if (ctx.debugPanelGroup) ctx.debugPanelGroup.visible = false;
  if (ctx.updateInfoPanelStatus) ctx.updateInfoPanelStatus(true);
  updateHarnessState(ctx);
}

export function setFacePlayerEnabled(ctx, THREE, enabled) {
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

export function toggleDebugPanel(ctx, THREE, controller) {
  if (ctx.state.showingDebugPanel) {
    closeDebugPanel(ctx);
  } else {
    openDebugPanel(ctx, THREE, controller, 'toggle');
  }
}

function syncFloatingPanels(ctx) {
  if (ctx.settingsGroup) ctx.settingsGroup.visible = ctx.state.showingSettings;
  if (ctx.layoutGroup) ctx.layoutGroup.visible = ctx.state.showingLayout;
}

export function refreshUiDistance(ctx, _THREE) {
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

export function openUI(ctx, THREE, controller, source) {
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
  updateStereoVisibility(ctx, THREE);
  updateHarnessState(ctx);
}

export function closeUI(ctx, THREE, source) {
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
  updateStereoVisibility(ctx, THREE);
  updateHarnessState(ctx);
}

export function wake(ctx, THREE, controller) {
  ctx.state.lastInteraction = Date.now();
  if (!ctx.state.uiVisible) {
    openUI(ctx, THREE, controller, 'wake');
  }
}

export function toggleUI(ctx, THREE, controller, source) {
  if (ctx.state.uiVisible) {
    closeUI(ctx, THREE, source || 'toggle');
  } else {
    openUI(ctx, THREE, controller, source || 'toggle');
  }
}

export function cycleStereoLock(ctx, THREE) {
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
  updateStereoVisibility(ctx, THREE);
}

// Raycaster helpers shared with interaction module
export function getControllerRay(ctx, controller) {
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

export function getVisibleIntersections(ctx, objects) {
  return ctx._raycaster.intersectObjects(objects, false).filter((hit) => isActuallyVisible(hit.object));
}

export function getSurfaceMeshes(ctx) {
  return [ctx.meshes.hitProxy || ctx.meshes.preview].filter(Boolean);
}

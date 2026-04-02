import { RUNTIME_CONSTANTS } from './context.js';
import { updateHarnessState } from './harness.js';
import {
  openUI, closeUI, getControllerRay, getVisibleIntersections, getSurfaceMeshes, getFloatingPanelState
} from './ui-controls.js';

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

export function updateVideoGrab(ctx, THREE, controller) {
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

export function updateFloatingPanelGrab(ctx, THREE, controller) {
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

export function onSelectStart(ctx, THREE, event) {
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

export function onSqueezeStart(ctx, THREE, event) {
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

export function onSelectEnd(ctx, THREE, event) {
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

export function onSqueezeEnd(ctx, event) {
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

export function updateHover(ctx, THREE, controllers) {
  let hit = false;
  let seekHoverVisible = false;
  let seekHoverRatio = ctx.seekHoverRatio;
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
      if (obj === ctx.seekBg) {
        const local = ctx.seekBg.worldToLocal(interactableIntersections[0].point.clone());
        const seekWidth = ctx.seekBg.userData && ctx.seekBg.userData.seekWidth ? ctx.seekBg.userData.seekWidth : 1.9;
        seekHoverVisible = true;
        seekHoverRatio = THREE.MathUtils.clamp((local.x + (seekWidth / 2)) / seekWidth, 0, 1);
      }
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

  ctx.seekHoverVisible = seekHoverVisible;
  if (seekHoverVisible) {
    ctx.seekHoverRatio = seekHoverRatio;
  }
}

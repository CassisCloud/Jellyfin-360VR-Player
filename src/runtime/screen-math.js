import { RUNTIME_CONSTANTS } from './context.js';

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

export function getScreenSurfaceSpec(ctx, scaleOverride) {
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

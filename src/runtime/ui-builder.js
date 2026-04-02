import { MODES_BY_ID, VIEW_MODES, MODE_GROUPS, STORAGE_KEYS } from '../constants.js';
import { getVideoTitle } from '../utils.js';
import { RUNTIME_CONSTANTS } from './context.js';
import { createRoundedRectGeometry } from './geometry.js';
import { syncCompositionVideoLayer } from './composition-layers.js';
import { updateHarnessState } from './harness.js';
import {
  recenterActiveMode, refreshUiDistance,
  cycleStereoLock, updateStereoVisibility,
  toggleDebugPanel, applyDebugPanelAnchorFromViewer,
  registerFloatingPanel, setFacePlayerEnabled
} from './ui-controls.js';
import {
  createPlayIcon, createPauseIcon, createSeekBackIcon, createSeekFwdIcon,
  createSpeakerIcon, createSunIcon, createGearIcon, createCloseIcon,
  createCenterIcon, createLayoutIcon, createCurveStartIcon, createCurveEndIcon,
  createNearIcon, createFarIcon, createMoonIcon, createBillboardIcon
} from './icons.js';
import { getModeShapeLabel } from '../constants.js';

export function buildUI(ctx, THREE, Text, closeFn, applyModeFromState, updatePassthroughVisuals) {
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
    panelBg.position.set(0, 0, -0.005);
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

  const stereoBtn3d = createRoundBtn('btn-stereo-lock', ctx.uiGroup, -0.60, btnY, btnR, null, () => cycleStereoLock(ctx, THREE));
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

  createTextObj('Settings', ctx.settingsGroup, -SETTINGS_LAYOUT.width / 2 + SETTINGS_LAYOUT.paddingX, SETTINGS_LAYOUT.headerY, 0.03, 0x7dd3fc, 'left');

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
    refreshUiDistance(ctx, THREE);
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
    updateStereoVisibility(ctx, window.THREE);
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

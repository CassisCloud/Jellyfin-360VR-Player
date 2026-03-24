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
    }
  ];

  const MODES_BY_ID = VIEW_MODES.reduce((acc, mode) => {
    acc[mode.id] = mode;
    return acc;
  }, {});

  const PLAYER_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jellyfin VR Player</title>
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <style>
        :root {
            color-scheme: dark;
            --panel-bg: rgba(4, 12, 20, 0.86);
            --panel-line: rgba(148, 163, 184, 0.22);
            --panel-text: #e5eef7;
            --panel-muted: #94a3b8;
            --panel-accent: #38bdf8;
            --panel-accent-strong: #0ea5e9;
            --panel-button: rgba(15, 23, 42, 0.92);
            --panel-button-hover: rgba(30, 41, 59, 0.98);
            --panel-danger: #fb7185;
            --panel-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
        }

        * { box-sizing: border-box; }

        html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background:
                radial-gradient(circle at top, rgba(14, 165, 233, 0.20), transparent 28%),
                radial-gradient(circle at bottom, rgba(59, 130, 246, 0.16), transparent 24%),
                #000;
            color: var(--panel-text);
            font-family: "Segoe UI", Arial, sans-serif;
        }

        #hud {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 20;
        }

        .hud-card {
            pointer-events: auto;
            background: var(--panel-bg);
            border: 1px solid var(--panel-line);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            box-shadow: var(--panel-shadow);
        }

        #topbar {
            position: fixed;
            top: 18px;
            left: 18px;
            right: 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        #topbar-left,
        #topbar-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .hud-btn,
        .hud-chip {
            border-radius: 999px;
            border: 1px solid var(--panel-line);
            background: rgba(2, 8, 14, 0.78);
            color: var(--panel-text);
            font: inherit;
        }

        .hud-btn {
            cursor: pointer;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .hud-btn:hover,
        .hud-btn:focus-visible {
            background: rgba(15, 23, 42, 0.95);
            border-color: rgba(56, 189, 248, 0.4);
            transform: translateY(-1px);
            outline: none;
        }

        .hud-btn.primary {
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.9), rgba(56, 189, 248, 0.7));
            color: #04111b;
            border-color: rgba(56, 189, 248, 0.65);
        }

        .hud-chip {
            padding: 9px 14px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .hud-chip.mode {
            color: #7dd3fc;
        }

        .hud-chip.status {
            color: var(--panel-muted);
            min-width: 120px;
            text-align: center;
        }

        #dock {
            position: fixed;
            left: 18px;
            right: 18px;
            bottom: 18px;
            padding: 14px 16px;
            border-radius: 22px;
        }

        #dock-row {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        #seek-wrap {
            flex: 1 1 260px;
            display: grid;
            gap: 6px;
            min-width: 220px;
        }

        #seekInput {
            width: 100%;
            accent-color: var(--panel-accent-strong);
            cursor: pointer;
        }

        #timeDisplay,
        #comfortDisplay,
        #hintText {
            color: var(--panel-muted);
            font-size: 13px;
            white-space: nowrap;
        }

        #dockControls {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        #volumeSlider {
            width: 110px;
            accent-color: var(--panel-accent-strong);
        }

        .hidden {
            display: none !important;
        }

        a-scene {
            width: 100%;
            height: 100%;
        }

        .a-enter-vr,
        .a-enter-ar {
            display: none !important;
        }

        @media (max-width: 720px) {
            #topbar {
                top: 12px;
                left: 12px;
                right: 12px;
                flex-direction: column;
                align-items: stretch;
            }

            #topbar-left,
            #topbar-right {
                justify-content: space-between;
            }

            #dock {
                left: 12px;
                right: 12px;
                bottom: 12px;
            }

            #dock-row {
                align-items: stretch;
            }

            #dockControls {
                width: 100%;
                justify-content: space-between;
            }

            #volumeSlider {
                width: 80px;
            }
        }
    </style>
</head>
<body>
    <div id="hud">
        <div id="topbar">
            <div id="topbar-left">
                <button class="hud-btn" id="closeBtn">Back</button>
                <div class="hud-chip mode" id="modeChip">360 Mono</div>
                <div class="hud-chip status" id="statusChip">Loading...</div>
            </div>
            <div id="topbar-right">
                <div id="comfortDisplay">UI 1.90m / 1.00x</div>
                <button class="hud-btn primary" id="enterVrBtn">Enter VR</button>
            </div>
        </div>

        <div class="hud-card" id="dock">
            <div id="dock-row">
                <div id="dockControls">
                    <button class="hud-btn" id="playPauseBtn">Pause</button>
                    <button class="hud-btn" id="seekBackBtn">-10s</button>
                    <button class="hud-btn" id="seekFwdBtn">+10s</button>
                    <button class="hud-btn" id="muteBtn">Mute</button>
                    <input id="volumeSlider" type="range" min="0" max="1" step="0.02" value="1">
                </div>

                <div id="seek-wrap">
                    <input id="seekInput" type="range" min="0" max="1000" step="1" value="0">
                    <div id="timeDisplay">0:00 / 0:00</div>
                </div>

                <div id="hintText">Space play/pause, arrows seek, V enter VR, X swap stereo</div>
            </div>
        </div>
    </div>

    <a-scene
        id="scene"
        background="color: #000"
        renderer="antialias: true; colorManagement: true"
        embedded
        xr-mode-ui="enabled: true"
        webxr="requiredFeatures: local-floor; optionalFeatures: bounded-floor,unbounded"
        cursor__mouse="rayOrigin: mouse"
        raycaster__mouse="objects: .clickable; far: 30">
        <a-assets id="assets"></a-assets>

        <a-entity id="cameraRig" position="0 0 0">
            <a-camera id="camera" position="0 1.6 0" look-controls="enabled: true" wasd-controls-enabled="false">
                <a-entity
                    id="gazeCursor"
                    cursor="fuse: true; fuseTimeout: 900"
                    raycaster="objects: .clickable; far: 20"
                    position="0 0 -1.35"
                    geometry="primitive: ring; radiusInner: 0.010; radiusOuter: 0.016"
                    material="shader: flat; color: #7dd3fc; opacity: 0.92"></a-entity>

                <a-entity id="uiRoot" position="0 -0.38 -1.90" scale="1 1 1">
                    <a-plane width="1.86" height="0.62" color="#05111a" opacity="0.88" material="shader: flat; transparent: true; opacity: 0.88"></a-plane>
                    <a-plane width="1.80" height="0.56" color="#0b1b2a" opacity="0.12" position="0 0 0.001" material="shader: flat; transparent: true; opacity: 0.12"></a-plane>

                    <a-entity id="panelModeText" position="0 0.20 0.01" text="value: 360 Mono; align: center; width: 2.5; color: #f8fbff; wrapCount: 28"></a-entity>
                    <a-entity id="panelStatusText" position="0 0.13 0.01" text="value: Loading...; align: center; width: 2.1; color: #8fb8d8; wrapCount: 34"></a-entity>

                    <a-entity id="uiExit3d" class="clickable" position="-0.70 0.03 0.02" geometry="primitive: plane; width: 0.20; height: 0.10" material="shader: flat; color: #3b0b19; opacity: 0.95">
                        <a-entity id="uiExit3dLabel" position="0 0 0.01" text="value: Exit; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiSeekBack3d" class="clickable" position="-0.42 0.03 0.02" geometry="primitive: plane; width: 0.20; height: 0.10" material="shader: flat; color: #13283a; opacity: 0.95">
                        <a-entity id="uiSeekBack3dLabel" position="0 0 0.01" text="value: -10s; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiPlay3d" class="clickable" position="-0.14 0.03 0.02" geometry="primitive: plane; width: 0.20; height: 0.10" material="shader: flat; color: #11415a; opacity: 0.98">
                        <a-entity id="uiPlay3dLabel" position="0 0 0.01" text="value: Pause; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiSeekFwd3d" class="clickable" position="0.14 0.03 0.02" geometry="primitive: plane; width: 0.20; height: 0.10" material="shader: flat; color: #13283a; opacity: 0.95">
                        <a-entity id="uiSeekFwd3dLabel" position="0 0 0.01" text="value: +10s; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiEnterVr3d" class="clickable" position="0.42 0.03 0.02" geometry="primitive: plane; width: 0.20; height: 0.10" material="shader: flat; color: #0a4a3d; opacity: 0.98">
                        <a-entity id="uiEnterVr3dLabel" position="0 0 0.01" text="value: VR; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiSwap3d" class="clickable" position="0.70 0.03 0.02" geometry="primitive: plane; width: 0.20; height: 0.10" material="shader: flat; color: #13283a; opacity: 0.95">
                        <a-entity id="uiSwap3dLabel" position="0 0 0.01" text="value: Swap; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>

                    <a-entity id="comfortText3d" position="0 -0.07 0.01" text="value: UI 1.90m / 1.00x; align: center; width: 2.1; color: #d0e7ff; wrapCount: 32"></a-entity>
                    <a-entity id="uiNear3d" class="clickable" position="-0.42 -0.07 0.02" geometry="primitive: plane; width: 0.18; height: 0.08" material="shader: flat; color: #13283a; opacity: 0.95">
                        <a-entity position="0 0 0.01" text="value: Near; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiFar3d" class="clickable" position="-0.18 -0.07 0.02" geometry="primitive: plane; width: 0.18; height: 0.08" material="shader: flat; color: #13283a; opacity: 0.95">
                        <a-entity position="0 0 0.01" text="value: Far; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiScaleDown3d" class="clickable" position="0.18 -0.07 0.02" geometry="primitive: plane; width: 0.18; height: 0.08" material="shader: flat; color: #13283a; opacity: 0.95">
                        <a-entity position="0 0 0.01" text="value: Scale -; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>
                    <a-entity id="uiScaleUp3d" class="clickable" position="0.42 -0.07 0.02" geometry="primitive: plane; width: 0.18; height: 0.08" material="shader: flat; color: #13283a; opacity: 0.95">
                        <a-entity position="0 0 0.01" text="value: Scale +; align: center; width: 0.8; color: #ffffff"></a-entity>
                    </a-entity>

                    <a-entity id="seekTrack3d" class="clickable" position="0 -0.20 0.02" geometry="primitive: plane; width: 1.44; height: 0.06" material="shader: flat; color: #102131; opacity: 0.96"></a-entity>
                    <a-entity id="seekBuffered3d" position="-0.72 -0.20 0.025" geometry="primitive: plane; width: 0.001; height: 0.032" material="shader: flat; color: #33536b; opacity: 0.9"></a-entity>
                    <a-entity id="seekPlayed3d" position="-0.72 -0.20 0.03" geometry="primitive: plane; width: 0.001; height: 0.032" material="shader: flat; color: #38bdf8; opacity: 1"></a-entity>
                    <a-entity id="seekTime3d" position="0 -0.29 0.01" text="value: 0:00 / 0:00; align: center; width: 2.1; color: #d7e8f7"></a-entity>
                </a-entity>
            </a-camera>
        </a-entity>

        <a-entity id="leftHand" laser-controls="hand: left" raycaster="objects: .clickable; far: 20; lineColor: #7dd3fc; lineOpacity: 0.7"></a-entity>
        <a-entity id="rightHand" laser-controls="hand: right" raycaster="objects: .clickable; far: 20; lineColor: #7dd3fc; lineOpacity: 0.7"></a-entity>
    </a-scene>

    <script>
        (function () {
            var MODE_LIST = ${JSON.stringify(VIEW_MODES)};
            var MODE_MAP = {};
            MODE_LIST.forEach(function (mode) {
                MODE_MAP[mode.id] = mode;
            });

            var STORAGE_KEYS = {
                uiDistance: 'jfvr:ui-distance',
                uiScale: 'jfvr:ui-scale'
            };

            var SEEK_TRACK_WIDTH = 1.44;
            var statusTimers = [];
            var pendingPayload = null;
            var surfacesReady = false;
            var autoEnterRequested = false;
            var swapEyes = false;
            var panelDistance = clamp(parseFloat(localStorage.getItem(STORAGE_KEYS.uiDistance)) || 1.9, 1.2, 3.4);
            var panelScale = clamp(parseFloat(localStorage.getItem(STORAGE_KEYS.uiScale)) || 1.0, 0.7, 1.55);

            var sceneEl = document.getElementById('scene');
            var assetsEl = document.getElementById('assets');
            var closeBtn = document.getElementById('closeBtn');
            var enterVrBtn = document.getElementById('enterVrBtn');
            var modeChip = document.getElementById('modeChip');
            var statusChip = document.getElementById('statusChip');
            var comfortDisplay = document.getElementById('comfortDisplay');
            var playPauseBtn = document.getElementById('playPauseBtn');
            var seekBackBtn = document.getElementById('seekBackBtn');
            var seekFwdBtn = document.getElementById('seekFwdBtn');
            var muteBtn = document.getElementById('muteBtn');
            var volumeSlider = document.getElementById('volumeSlider');
            var seekInput = document.getElementById('seekInput');
            var timeDisplay = document.getElementById('timeDisplay');

            var uiRoot = document.getElementById('uiRoot');
            var panelModeText = document.getElementById('panelModeText');
            var panelStatusText = document.getElementById('panelStatusText');
            var comfortText3d = document.getElementById('comfortText3d');
            var uiExit3d = document.getElementById('uiExit3d');
            var uiSeekBack3d = document.getElementById('uiSeekBack3d');
            var uiPlay3d = document.getElementById('uiPlay3d');
            var uiPlay3dLabel = document.getElementById('uiPlay3dLabel');
            var uiSeekFwd3d = document.getElementById('uiSeekFwd3d');
            var uiEnterVr3d = document.getElementById('uiEnterVr3d');
            var uiEnterVr3dLabel = document.getElementById('uiEnterVr3dLabel');
            var uiSwap3d = document.getElementById('uiSwap3d');
            var uiSwap3dLabel = document.getElementById('uiSwap3dLabel');
            var uiNear3d = document.getElementById('uiNear3d');
            var uiFar3d = document.getElementById('uiFar3d');
            var uiScaleDown3d = document.getElementById('uiScaleDown3d');
            var uiScaleUp3d = document.getElementById('uiScaleUp3d');
            var seekTrack3d = document.getElementById('seekTrack3d');
            var seekBuffered3d = document.getElementById('seekBuffered3d');
            var seekPlayed3d = document.getElementById('seekPlayed3d');
            var seekTime3d = document.getElementById('seekTime3d');

            var playerState = {
                currentMode: MODE_MAP['360-mono'],
                video: null,
                currentSrc: '',
                textures: null,
                materials: null,
                meshes: null,
                surfaceRoot: null,
                isImmersive: false,
                isSeeking: false,
                requestedCurrentTime: 0,
                lastStatus: 'Loading...',
                statusSticky: false
            };

            function clamp(value, min, max) {
                if (!Number.isFinite(value)) return min;
                return Math.min(max, Math.max(min, value));
            }

            function formatTime(seconds) {
                if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
                var total = Math.floor(seconds);
                var hrs = Math.floor(total / 3600);
                var mins = Math.floor((total % 3600) / 60);
                var secs = total % 60;
                if (hrs > 0) {
                    return hrs + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
                }
                return mins + ':' + String(secs).padStart(2, '0');
            }

            function setEntityText(el, value) {
                el.setAttribute('text', 'value', value);
            }

            function setStatus(text, sticky) {
                playerState.lastStatus = text;
                playerState.statusSticky = Boolean(sticky);
                statusChip.textContent = text;
                setEntityText(panelStatusText, text);

                while (statusTimers.length) {
                    clearTimeout(statusTimers.pop());
                }

                if (!sticky) {
                    statusTimers.push(setTimeout(function () {
                        if (!playerState.statusSticky) {
                            var idleText = playerState.video && !playerState.video.paused ? 'Ready' : 'Paused';
                            statusChip.textContent = idleText;
                            setEntityText(panelStatusText, idleText);
                        }
                    }, 1800));
                }
            }

            function updateComfortUi() {
                var comfortText = 'UI ' + panelDistance.toFixed(2) + 'm / ' + panelScale.toFixed(2) + 'x';
                comfortDisplay.textContent = comfortText;
                setEntityText(comfortText3d, comfortText);
                uiRoot.setAttribute('position', '0 -0.38 -' + panelDistance.toFixed(2));
                uiRoot.object3D.scale.set(panelScale, panelScale, panelScale);
                localStorage.setItem(STORAGE_KEYS.uiDistance, String(panelDistance));
                localStorage.setItem(STORAGE_KEYS.uiScale, String(panelScale));
            }

            function updateButtonLabels() {
                var video = playerState.video;
                var paused = !video || video.paused;
                playPauseBtn.textContent = paused ? 'Play' : 'Pause';
                setEntityText(uiPlay3dLabel, paused ? 'Play' : 'Pause');
                muteBtn.textContent = video && video.muted ? 'Unmute' : 'Mute';
                var inVr = playerState.isImmersive;
                enterVrBtn.textContent = inVr ? 'Exit VR' : 'Enter VR';
                setEntityText(uiEnterVr3dLabel, inVr ? 'Exit VR' : 'VR');
                setEntityText(uiSwap3dLabel, swapEyes ? 'Swap On' : 'Swap');
            }

            function updateModeUi() {
                var mode = playerState.currentMode || MODE_MAP['360-mono'];
                modeChip.textContent = mode.label;
                setEntityText(panelModeText, mode.label);
                var stereoEnabled = mode.stereo !== 'mono';
                setClickableState(uiSwap3d, stereoEnabled);
                if (!stereoEnabled) {
                    swapEyes = false;
                }
                updateButtonLabels();
            }

            function updateTimeUi() {
                var video = playerState.video;
                var duration = video && Number.isFinite(video.duration) ? video.duration : 0;
                var currentTime = video ? video.currentTime : 0;
                var ratio = duration > 0 ? currentTime / duration : 0;
                var bufferedRatio = 0;

                if (video && video.buffered && video.buffered.length) {
                    try {
                        bufferedRatio = video.buffered.end(video.buffered.length - 1) / duration;
                    } catch (error) {
                        bufferedRatio = ratio;
                    }
                }

                ratio = clamp(ratio, 0, 1);
                bufferedRatio = clamp(bufferedRatio, 0, 1);

                if (!playerState.isSeeking) {
                    seekInput.value = String(Math.round(ratio * 1000));
                }

                var label = formatTime(currentTime) + ' / ' + formatTime(duration);
                timeDisplay.textContent = label;
                setEntityText(seekTime3d, label);

                updateSeekFill(seekPlayed3d, ratio, '#38bdf8');
                updateSeekFill(seekBuffered3d, bufferedRatio, '#33536b');
            }

            function updateSeekFill(el, ratio, color) {
                var width = Math.max(0.001, SEEK_TRACK_WIDTH * clamp(ratio, 0, 1));
                el.setAttribute('geometry', 'width', width);
                el.setAttribute('material', 'color', color);
                el.setAttribute('position', (-SEEK_TRACK_WIDTH / 2 + width / 2) + ' -0.20 ' + (el === seekPlayed3d ? '0.03' : '0.025'));
            }

            function seekTo(nextTime) {
                var video = playerState.video;
                if (!video || !Number.isFinite(video.duration)) return;
                var clampedTime = clamp(nextTime, 0, video.duration);
                video.currentTime = clampedTime;
                updateTimeUi();
            }

            function getViewportForEye(mode, eye) {
                var stereo = mode.stereo;
                if (stereo === 'mono') {
                    return { offsetX: 1, repeatX: -1, offsetY: 0, repeatY: 1 };
                }

                if (stereo === 'sbs') {
                    if (eye === 'right') {
                        return { offsetX: 1, repeatX: -0.5, offsetY: 0, repeatY: 1 };
                    }
                    return { offsetX: 0.5, repeatX: -0.5, offsetY: 0, repeatY: 1 };
                }

                if (eye === 'right') {
                    return { offsetX: 1, repeatX: -1, offsetY: 0, repeatY: 0.5 };
                }
                return { offsetX: 1, repeatX: -1, offsetY: 0.5, repeatY: 0.5 };
            }

            function applyViewport(material, viewport) {
                if (!material || !material.map) return;
                material.map.wrapS = THREE.ClampToEdgeWrapping;
                material.map.wrapT = THREE.ClampToEdgeWrapping;
                material.map.offset.set(viewport.offsetX, viewport.offsetY);
                material.map.repeat.set(viewport.repeatX, viewport.repeatY);
                material.map.needsUpdate = true;
                material.needsUpdate = true;
            }

            function buildProjectionGeometry(mode) {
                var radius = 32;
                if (mode.projection === '180') {
                    return new THREE.SphereGeometry(radius, 96, 64, 0, Math.PI, 0, Math.PI);
                }
                return new THREE.SphereGeometry(radius, 96, 64);
            }

            function createVideoTexture(video) {
                var texture = new THREE.VideoTexture(video);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                if (texture.colorSpace !== undefined && THREE.SRGBColorSpace !== undefined) {
                    texture.colorSpace = THREE.SRGBColorSpace;
                } else if (texture.encoding !== undefined && THREE.sRGBEncoding !== undefined) {
                    texture.encoding = THREE.sRGBEncoding;
                }
                return texture;
            }

            function createVideoMaterial(texture) {
                return new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                    toneMapped: false
                });
            }

            function configureStereoLayers() {
                var camera = sceneEl.camera;
                if (!camera) return;

                camera.layers.enable(0);
                camera.layers.enable(1);
                camera.layers.enable(2);

                var renderer = sceneEl.renderer;
                if (!renderer || !renderer.xr || !renderer.xr.getCamera) return;

                var xrCamera = renderer.xr.getCamera();
                if (!xrCamera || !xrCamera.cameras || xrCamera.cameras.length < 2) return;

                xrCamera.layers.enable(0);
                xrCamera.layers.enable(1);
                xrCamera.layers.enable(2);

                xrCamera.cameras[0].layers.enable(0);
                xrCamera.cameras[0].layers.enable(1);
                xrCamera.cameras[0].layers.disable(2);

                xrCamera.cameras[1].layers.enable(0);
                xrCamera.cameras[1].layers.enable(2);
                xrCamera.cameras[1].layers.disable(1);
            }

            function updateSurfaceVisibility() {
                if (!playerState.meshes) return;
                var mode = playerState.currentMode;
                var useStereo = mode.stereo !== 'mono' && playerState.isImmersive;
                playerState.meshes.preview.visible = !useStereo;
                playerState.meshes.left.visible = useStereo;
                playerState.meshes.right.visible = useStereo;
                configureStereoLayers();
            }

            function applyMode(modeId) {
                var mode = MODE_MAP[modeId] || MODE_MAP['360-mono'];
                playerState.currentMode = mode;

                if (!surfacesReady || !playerState.meshes || !playerState.materials) {
                    updateModeUi();
                    return;
                }

                if (playerState.meshes.currentProjection !== mode.projection) {
                    var geometry = buildProjectionGeometry(mode);
                    playerState.meshes.preview.geometry.dispose();
                    playerState.meshes.left.geometry.dispose();
                    playerState.meshes.right.geometry.dispose();
                    playerState.meshes.preview.geometry = geometry.clone();
                    playerState.meshes.left.geometry = geometry.clone();
                    playerState.meshes.right.geometry = geometry.clone();
                    playerState.meshes.currentProjection = mode.projection;
                }

                var leftEye = swapEyes ? 'right' : 'left';
                var rightEye = swapEyes ? 'left' : 'right';
                applyViewport(playerState.materials.preview, getViewportForEye(mode, leftEye));
                applyViewport(playerState.materials.left, getViewportForEye(mode, leftEye));
                applyViewport(playerState.materials.right, getViewportForEye(mode, rightEye));

                updateModeUi();
                updateSurfaceVisibility();
            }

            function destroyVideoResources() {
                if (playerState.video) {
                    playerState.video.pause();
                    playerState.video.removeAttribute('src');
                    playerState.video.load();
                    if (playerState.video.parentNode) {
                        playerState.video.parentNode.removeChild(playerState.video);
                    }
                }

                if (playerState.materials) {
                    Object.keys(playerState.materials).forEach(function (key) {
                        var material = playerState.materials[key];
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                }

                playerState.video = null;
                playerState.materials = null;
                playerState.textures = null;
            }

            function wireVideoEvents(video) {
                video.addEventListener('loadedmetadata', function () {
                    if (Number.isFinite(playerState.requestedCurrentTime) && playerState.requestedCurrentTime > 0) {
                        try {
                            video.currentTime = Math.min(playerState.requestedCurrentTime, video.duration || playerState.requestedCurrentTime);
                        } catch (error) {
                            video.currentTime = playerState.requestedCurrentTime;
                        }
                    }
                    updateTimeUi();
                    updateButtonLabels();
                    setStatus('Metadata ready', false);
                });

                video.addEventListener('durationchange', updateTimeUi);
                video.addEventListener('timeupdate', updateTimeUi);
                video.addEventListener('progress', updateTimeUi);
                video.addEventListener('seeking', function () { setStatus('Seeking...', true); });
                video.addEventListener('seeked', function () { setStatus('Seek complete', false); updateTimeUi(); });
                video.addEventListener('waiting', function () { setStatus('Buffering...', true); });
                video.addEventListener('stalled', function () { setStatus('Network stalled', true); });
                video.addEventListener('canplay', function () { setStatus('Ready', false); });
                video.addEventListener('canplaythrough', function () { setStatus('Buffered', false); });
                video.addEventListener('playing', function () { setStatus('Playing', false); updateButtonLabels(); });
                video.addEventListener('pause', function () { setStatus('Paused', false); updateButtonLabels(); });
                video.addEventListener('volumechange', updateButtonLabels);
                video.addEventListener('ended', function () {
                    updateButtonLabels();
                    setStatus('Playback ended', false);
                });
                video.addEventListener('error', function () {
                    setStatus('Video failed to load', true);
                });
            }

            function requestAutoEnterVr() {
                if (!autoEnterRequested || !sceneEl.enterVR) return;
                autoEnterRequested = false;
                try {
                    var result = sceneEl.enterVR();
                    if (result && typeof result.catch === 'function') {
                        result.catch(function () {});
                    }
                } catch (error) {
                    // ignored - explicit button remains available
                }
            }

            function loadVideo(payload) {
                destroyVideoResources();

                swapEyes = false;
                playerState.requestedCurrentTime = Number(payload.currentTime) || 0;
                playerState.currentSrc = payload.src || '';
                autoEnterRequested = Boolean(payload.autoEnterVr);

                var video = document.createElement('video');
                video.id = 'jfvr-video';
                video.crossOrigin = 'anonymous';
                video.preload = 'auto';
                video.autoplay = true;
                video.loop = false;
                video.playsInline = true;
                video.setAttribute('playsinline', 'playsinline');
                video.setAttribute('webkit-playsinline', 'webkit-playsinline');
                video.disableRemotePlayback = true;
                var initialVolume = parseFloat(payload.volume);
                video.volume = clamp(Number.isFinite(initialVolume) ? initialVolume : (parseFloat(volumeSlider.value) || 1), 0, 1);
                video.muted = Boolean(payload.muted);
                volumeSlider.value = String(video.volume || 0);
                video.src = payload.src;

                assetsEl.appendChild(video);
                wireVideoEvents(video);

                playerState.video = video;
                playerState.textures = {
                    preview: createVideoTexture(video),
                    left: createVideoTexture(video),
                    right: createVideoTexture(video)
                };
                playerState.materials = {
                    preview: createVideoMaterial(playerState.textures.preview),
                    left: createVideoMaterial(playerState.textures.left),
                    right: createVideoMaterial(playerState.textures.right)
                };

                playerState.meshes.preview.material = playerState.materials.preview;
                playerState.meshes.left.material = playerState.materials.left;
                playerState.meshes.right.material = playerState.materials.right;

                applyMode(payload.modeId || '360-mono');
                updateTimeUi();
                updateButtonLabels();
                setStatus('Loading stream...', true);

                if (payload.paused) {
                    video.pause();
                    setStatus('Paused', false);
                    requestAutoEnterVr();
                    return;
                }

                var playAttempt = video.play();
                if (playAttempt && typeof playAttempt.catch === 'function') {
                    playAttempt.catch(function () {
                        setStatus('Tap Play to start video', true);
                    });
                }

                requestAutoEnterVr();
            }

            function closePlayer() {
                parent.postMessage({ type: 'CLOSE_PLAYER' }, '*');
            }

            function sendPlayerState() {
                var video = playerState.video;
                parent.postMessage({
                    type: 'PLAYER_STATE',
                    currentTime: video ? video.currentTime : 0,
                    paused: video ? video.paused : true,
                    volume: video ? video.volume : 1,
                    muted: video ? video.muted : false,
                    playbackRate: video ? video.playbackRate : 1,
                    modeId: playerState.currentMode ? playerState.currentMode.id : '360-mono'
                }, '*');
            }

            function togglePlay() {
                var video = playerState.video;
                if (!video) return;
                if (video.paused) {
                    var playAttempt = video.play();
                    if (playAttempt && typeof playAttempt.catch === 'function') {
                        playAttempt.catch(function () {
                            setStatus('Playback blocked by browser', true);
                        });
                    }
                } else {
                    video.pause();
                }
                updateButtonLabels();
            }

            function toggleMute() {
                var video = playerState.video;
                if (!video) return;
                video.muted = !video.muted;
                if (!video.muted && video.volume === 0) {
                    video.volume = 0.8;
                    volumeSlider.value = '0.8';
                }
                updateButtonLabels();
            }

            function toggleVrSession() {
                if (playerState.isImmersive) {
                    var exitResult = sceneEl.exitVR && sceneEl.exitVR();
                    if (exitResult && typeof exitResult.catch === 'function') {
                        exitResult.catch(function () {});
                    }
                    return;
                }
                autoEnterRequested = true;
                requestAutoEnterVr();
            }

            function setClickableState(el, enabled) {
                if (!el) return;
                if (enabled) {
                    el.classList.add('clickable');
                    el.dataset.disabled = '0';
                    el.setAttribute('material', 'opacity', 0.95);
                } else {
                    el.classList.remove('clickable');
                    el.dataset.disabled = '1';
                    el.setAttribute('material', 'opacity', 0.38);
                }
            }

            function registerPanelButton(el, baseColor, hoverColor, handler) {
                if (!el) return;
                el.dataset.baseColor = baseColor;
                el.dataset.hoverColor = hoverColor;
                el.setAttribute('material', 'color', baseColor);
                el.addEventListener('mouseenter', function () {
                    if (el.dataset.disabled === '1') return;
                    el.setAttribute('material', 'color', hoverColor);
                });
                el.addEventListener('mouseleave', function () {
                    el.setAttribute('material', 'color', baseColor);
                });
                el.addEventListener('click', function (event) {
                    if (el.dataset.disabled === '1') return;
                    handler(event);
                });
            }

            function seekFrom3dEvent(event) {
                var video = playerState.video;
                if (!video || !Number.isFinite(video.duration)) return;
                if (!event.detail || !event.detail.intersection || !event.detail.intersection.point) return;

                var point = event.detail.intersection.point.clone();
                seekTrack3d.object3D.worldToLocal(point);
                var ratio = clamp((point.x + SEEK_TRACK_WIDTH / 2) / SEEK_TRACK_WIDTH, 0, 1);
                seekTo(video.duration * ratio);
            }

            function bootstrapSurfaces() {
                if (surfacesReady) return;
                var surfaceRoot = new THREE.Group();
                surfaceRoot.rotation.y = Math.PI;

                var geometry = buildProjectionGeometry(playerState.currentMode);
                var fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x01070c, side: THREE.BackSide });

                var previewMesh = new THREE.Mesh(geometry.clone(), fallbackMaterial.clone());
                previewMesh.layers.set(0);
                var leftMesh = new THREE.Mesh(geometry.clone(), fallbackMaterial.clone());
                leftMesh.layers.set(1);
                var rightMesh = new THREE.Mesh(geometry.clone(), fallbackMaterial.clone());
                rightMesh.layers.set(2);

                surfaceRoot.add(previewMesh);
                surfaceRoot.add(leftMesh);
                surfaceRoot.add(rightMesh);
                sceneEl.object3D.add(surfaceRoot);

                playerState.surfaceRoot = surfaceRoot;
                playerState.meshes = {
                    preview: previewMesh,
                    left: leftMesh,
                    right: rightMesh,
                    currentProjection: playerState.currentMode.projection
                };

                registerPanelButton(uiExit3d, '#3b0b19', '#5c1025', closePlayer);
                registerPanelButton(uiSeekBack3d, '#13283a', '#1b3951', function () {
                    seekTo((playerState.video ? playerState.video.currentTime : 0) - 10);
                });
                registerPanelButton(uiPlay3d, '#11415a', '#15597a', togglePlay);
                registerPanelButton(uiSeekFwd3d, '#13283a', '#1b3951', function () {
                    seekTo((playerState.video ? playerState.video.currentTime : 0) + 10);
                });
                registerPanelButton(uiEnterVr3d, '#0a4a3d', '#0e6b58', toggleVrSession);
                registerPanelButton(uiSwap3d, '#13283a', '#1b3951', function () {
                    if (playerState.currentMode.stereo === 'mono') return;
                    swapEyes = !swapEyes;
                    applyMode(playerState.currentMode.id);
                    setStatus(swapEyes ? 'Stereo eyes swapped' : 'Stereo eyes restored', false);
                });
                registerPanelButton(uiNear3d, '#13283a', '#1b3951', function () {
                    panelDistance = clamp(panelDistance - 0.15, 1.2, 3.4);
                    updateComfortUi();
                });
                registerPanelButton(uiFar3d, '#13283a', '#1b3951', function () {
                    panelDistance = clamp(panelDistance + 0.15, 1.2, 3.4);
                    updateComfortUi();
                });
                registerPanelButton(uiScaleDown3d, '#13283a', '#1b3951', function () {
                    panelScale = clamp(panelScale - 0.08, 0.7, 1.55);
                    updateComfortUi();
                });
                registerPanelButton(uiScaleUp3d, '#13283a', '#1b3951', function () {
                    panelScale = clamp(panelScale + 0.08, 0.7, 1.55);
                    updateComfortUi();
                });
                registerPanelButton(seekTrack3d, '#102131', '#163248', seekFrom3dEvent);

                surfacesReady = true;
                updateComfortUi();
                updateModeUi();
                updateTimeUi();

                if (pendingPayload) {
                    loadVideo(pendingPayload);
                    pendingPayload = null;
                }
            }

            playPauseBtn.addEventListener('click', togglePlay);
            seekBackBtn.addEventListener('click', function () {
                seekTo((playerState.video ? playerState.video.currentTime : 0) - 10);
            });
            seekFwdBtn.addEventListener('click', function () {
                seekTo((playerState.video ? playerState.video.currentTime : 0) + 10);
            });
            muteBtn.addEventListener('click', toggleMute);
            closeBtn.addEventListener('click', closePlayer);
            enterVrBtn.addEventListener('click', toggleVrSession);

            volumeSlider.addEventListener('input', function () {
                if (!playerState.video) return;
                playerState.video.volume = parseFloat(volumeSlider.value);
                if (playerState.video.volume > 0) {
                    playerState.video.muted = false;
                }
                updateButtonLabels();
            });

            seekInput.addEventListener('pointerdown', function () {
                playerState.isSeeking = true;
            });
            seekInput.addEventListener('pointerup', function () {
                playerState.isSeeking = false;
                if (!playerState.video || !Number.isFinite(playerState.video.duration)) return;
                seekTo(playerState.video.duration * (parseFloat(seekInput.value) / 1000));
            });
            seekInput.addEventListener('input', function () {
                if (!playerState.video || !Number.isFinite(playerState.video.duration)) return;
                var previewTime = playerState.video.duration * (parseFloat(seekInput.value) / 1000);
                var label = formatTime(previewTime) + ' / ' + formatTime(playerState.video.duration);
                timeDisplay.textContent = label;
                setEntityText(seekTime3d, label);
                updateSeekFill(seekPlayed3d, parseFloat(seekInput.value) / 1000, '#38bdf8');
            });

            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closePlayer();
                    return;
                }

                if (!playerState.video) return;

                if (event.key === ' ') {
                    event.preventDefault();
                    togglePlay();
                } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    seekTo(playerState.video.currentTime - 10);
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    seekTo(playerState.video.currentTime + 10);
                } else if (event.key === 'm' || event.key === 'M') {
                    event.preventDefault();
                    toggleMute();
                } else if (event.key === 'v' || event.key === 'V') {
                    event.preventDefault();
                    toggleVrSession();
                } else if (event.key === 'x' || event.key === 'X') {
                    event.preventDefault();
                    if (playerState.currentMode.stereo !== 'mono') {
                        swapEyes = !swapEyes;
                        applyMode(playerState.currentMode.id);
                        setStatus(swapEyes ? 'Stereo eyes swapped' : 'Stereo eyes restored', false);
                    }
                } else if (event.key === '[') {
                    event.preventDefault();
                    panelDistance = clamp(panelDistance - 0.1, 1.2, 3.4);
                    updateComfortUi();
                } else if (event.key === ']') {
                    event.preventDefault();
                    panelDistance = clamp(panelDistance + 0.1, 1.2, 3.4);
                    updateComfortUi();
                } else if (event.key === '-') {
                    event.preventDefault();
                    panelScale = clamp(panelScale - 0.06, 0.7, 1.55);
                    updateComfortUi();
                } else if (event.key === '=' || event.key === '+') {
                    event.preventDefault();
                    panelScale = clamp(panelScale + 0.06, 0.7, 1.55);
                    updateComfortUi();
                }
            });

            sceneEl.addEventListener('loaded', bootstrapSurfaces);
            sceneEl.addEventListener('renderstart', configureStereoLayers);
            sceneEl.addEventListener('enter-vr', function () {
                playerState.isImmersive = true;
                updateButtonLabels();
                updateSurfaceVisibility();
                setStatus('Immersive VR active', false);
            });
            sceneEl.addEventListener('exit-vr', function () {
                playerState.isImmersive = false;
                updateButtonLabels();
                updateSurfaceVisibility();
                setStatus('Exited immersive VR', false);
            });

            if (sceneEl.hasLoaded) {
                bootstrapSurfaces();
            }

            window.addEventListener('message', function (event) {
                var data = event.data || {};
                if (data.type === 'LOAD_VIDEO') {
                    if (!surfacesReady) {
                        pendingPayload = data;
                        return;
                    }
                    loadVideo(data);
                    return;
                }

                if (data.type === 'REQUEST_STATE') {
                    sendPlayerState();
                }
            });

            updateComfortUi();
            updateButtonLabels();
            updateModeUi();
            setStatus('Waiting for stream...', true);
        })();
    </script>
</body>
</html>`;

  function injectParentStyles() {
    if (document.getElementById('jfvr-style')) return;

    const style = document.createElement('style');
    style.id = 'jfvr-style';
    style.textContent = `
      #jfvr-mode-menu {
        position: fixed;
        z-index: 100001;
        width: min(92vw, 430px);
        max-height: min(78vh, 740px);
        overflow: auto;
        border-radius: 22px;
        border: 1px solid rgba(103, 132, 162, 0.28);
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 32%),
          linear-gradient(180deg, rgba(4, 11, 18, 0.98), rgba(2, 8, 14, 0.98));
        color: #eef7ff;
        box-shadow: 0 26px 60px rgba(0, 0, 0, 0.52);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      #jfvr-mode-menu * {
        box-sizing: border-box;
      }

      .jfvr-menu-head {
        padding: 18px 20px 12px;
        border-bottom: 1px solid rgba(103, 132, 162, 0.16);
      }

      .jfvr-menu-title {
        font: 700 18px/1.2 "Segoe UI", Arial, sans-serif;
        margin: 0;
      }

      .jfvr-menu-subtitle {
        margin-top: 7px;
        color: rgba(211, 227, 242, 0.76);
        font: 500 13px/1.5 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-menu-section {
        padding: 12px 12px 14px;
      }

      .jfvr-menu-section + .jfvr-menu-section {
        border-top: 1px solid rgba(103, 132, 162, 0.12);
      }

      .jfvr-menu-label {
        padding: 0 8px 10px;
        color: #7dd3fc;
        font: 700 12px/1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .jfvr-mode-option {
        width: 100%;
        display: grid;
        gap: 5px;
        padding: 14px 14px;
        border: 1px solid rgba(103, 132, 162, 0.16);
        border-radius: 16px;
        background: rgba(6, 14, 22, 0.78);
        color: inherit;
        cursor: pointer;
        text-align: left;
        transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
      }

      .jfvr-mode-option + .jfvr-mode-option {
        margin-top: 10px;
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
        gap: 10px;
      }

      .jfvr-mode-name {
        font: 700 15px/1.2 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-mode-tag {
        border-radius: 999px;
        padding: 5px 10px;
        font: 700 11px/1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #04111b;
        background: linear-gradient(135deg, #7dd3fc, #38bdf8);
      }

      .jfvr-mode-desc {
        color: rgba(211, 227, 242, 0.76);
        font: 500 13px/1.45 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-mode-meta {
        color: rgba(148, 163, 184, 0.92);
        font: 600 12px/1.4 "Segoe UI", Arial, sans-serif;
      }

      @media (max-width: 640px) {
        #jfvr-mode-menu {
          width: calc(100vw - 24px);
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
    if (!video || !video.src) return null;
    return {
      src: video.src,
      currentTime: Number(video.currentTime) || 0,
      paused: video.paused,
      volume: Number(video.volume),
      muted: Boolean(video.muted)
    };
  }

  function createModeMenuButton(mode) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jfvr-mode-option';
    button.dataset.modeId = mode.id;

    const modeTag = mode.stereo === 'mono' ? mode.projection + ' Mono' : mode.projection + ' ' + mode.stereo.toUpperCase();
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
    document.removeEventListener('click', onParentDocumentClick, true);
    window.removeEventListener('resize', positionExistingModeMenu);
  }

  function positionExistingModeMenu() {
    const menu = document.getElementById('jfvr-mode-menu');
    if (!menu || !menu._anchorButton) return;
    positionModeMenu(menu, menu._anchorButton);
  }

  function onParentDocumentClick(event) {
    const menu = document.getElementById('jfvr-mode-menu');
    if (!menu) return;
    if (menu.contains(event.target) || (menu._anchorButton && menu._anchorButton.contains(event.target))) {
      return;
    }
    removeModeMenu();
  }

  function positionModeMenu(menu, anchorButton) {
    const rect = anchorButton.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 24, 430);
    const left = clampNumber(rect.right - width, 12, Math.max(12, window.innerWidth - width - 12));
    const preferredTop = rect.bottom + 12;
    const top = preferredTop + 420 > window.innerHeight ? Math.max(12, rect.top - 24) : preferredTop;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function openModeMenu(anchorButton) {
    injectParentStyles();

    const existing = document.getElementById('jfvr-mode-menu');
    if (existing) {
      removeModeMenu();
      return;
    }

    const menu = document.createElement('div');
    menu.id = 'jfvr-mode-menu';
    menu._anchorButton = anchorButton;
    const lastMode = localStorage.getItem(STORAGE_KEYS.lastMode) || '180-sbs-half';

    const groups = ['180', '360'].map((projection) => {
      const options = VIEW_MODES.filter((mode) => mode.projection === projection);
      const section = document.createElement('div');
      section.className = 'jfvr-menu-section';
      section.innerHTML = `<div class="jfvr-menu-label">${projection} VR Modes</div>`;
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
        <div class="jfvr-menu-title">Choose a VR projection</div>
        <div class="jfvr-menu-subtitle">Pick the layout that matches the video file. Recommended recent mode: <strong>${escapeHtml(recommended.label)}</strong>.</div>
      </div>
    `;
    groups.forEach((section) => menu.appendChild(section));

    document.body.appendChild(menu);
    positionModeMenu(menu, anchorButton);
    document.addEventListener('click', onParentDocumentClick, true);
    window.addEventListener('resize', positionExistingModeMenu);
  }

  function requestPlayerState(iframe) {
    return new Promise((resolve) => {
      if (!iframe || !iframe.contentWindow) {
        resolve(null);
        return;
      }

      let settled = false;
      const timeout = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 500);

      const onMessage = (event) => {
        if (event.source !== iframe.contentWindow) return;
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
      iframe.contentWindow.postMessage({ type: 'REQUEST_STATE' }, '*');
    });
  }

  async function closeOverlay(overlay, iframe, blobUrl, jellyfinVideo, overlayState) {
    if (overlayState.closing) return;
    overlayState.closing = true;

    let playerState = null;
    try {
      playerState = await requestPlayerState(iframe);
    } catch (error) {
      playerState = null;
    }

    if (jellyfinVideo && playerState) {
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
    } else if (jellyfinVideo) {
      jellyfinVideo.play().catch(() => {});
    }

    window.removeEventListener('message', overlayState.onMessage);
    document.removeEventListener('keydown', overlayState.onKeyDown);
    overlay.remove();
    URL.revokeObjectURL(blobUrl);
  }

  function openPlayer(modeId) {
    const playback = getCurrentPlaybackSnapshot();
    if (!playback) {
      window.alert('No video is currently playing in Jellyfin. Start playback first.');
      return;
    }

    const mode = MODES_BY_ID[modeId] || MODES_BY_ID['360-mono'];
    localStorage.setItem(STORAGE_KEYS.lastMode, mode.id);

    const jellyfinVideo = getCurrentJellyfinVideo();
    if (jellyfinVideo) {
      jellyfinVideo.pause();
    }

    const blob = new Blob([PLAYER_HTML], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const overlay = document.createElement('div');
    overlay.id = 'jfvr-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#000;';

    const emergencyCloseButton = document.createElement('button');
    emergencyCloseButton.type = 'button';
    emergencyCloseButton.textContent = 'Back';
    emergencyCloseButton.style.cssText = [
      'position:absolute',
      'top:16px',
      'left:16px',
      'z-index:100001',
      'padding:10px 16px',
      'border-radius:999px',
      'border:1px solid rgba(148,163,184,0.24)',
      'background:rgba(4,12,20,0.82)',
      'color:#eef7ff',
      'font:600 14px "Segoe UI", Arial, sans-serif',
      'cursor:pointer',
      'backdrop-filter:blur(14px)',
      '-webkit-backdrop-filter:blur(14px)'
    ].join(';');

    const iframe = document.createElement('iframe');
    iframe.src = blobUrl;
    iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;background:#000;';

    const overlayState = {
      closing: false,
      onMessage: null,
      onKeyDown: null
    };

    overlayState.onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data || {};
      if (data.type === 'CLOSE_PLAYER') {
        closeOverlay(overlay, iframe, blobUrl, jellyfinVideo, overlayState);
      }
    };
    window.addEventListener('message', overlayState.onMessage);

    overlayState.onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay(overlay, iframe, blobUrl, jellyfinVideo, overlayState);
      }
    };
    document.addEventListener('keydown', overlayState.onKeyDown);

    emergencyCloseButton.addEventListener('click', () => {
      closeOverlay(overlay, iframe, blobUrl, jellyfinVideo, overlayState);
    });

    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage({
        type: 'LOAD_VIDEO',
        src: playback.src,
        currentTime: playback.currentTime,
        paused: playback.paused,
        volume: playback.volume,
        muted: playback.muted,
        modeId: mode.id,
        autoEnterVr: true
      }, '*');
    });

    overlay.appendChild(emergencyCloseButton);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
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

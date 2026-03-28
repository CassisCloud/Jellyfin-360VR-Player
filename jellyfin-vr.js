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

    const PLAYER_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jellyfin VR Player</title>
    <script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>
    <script src="https://unpkg.com/aframe-troika-text/dist/aframe-troika-text.min.js"></script>
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

                <div id="hintText"></div>
            </div>
        </div>
    </div>

    <a-scene
        id="scene"
        background="color: #000"
        renderer="antialias: true; colorManagement: true; highRefreshRate: true; alpha: true"
        embedded
        xr-mode-ui="enabled: true"
        webxr="referenceSpaceType: local; optionalFeatures: local-floor,bounded-floor,hand-tracking,layers"
        jfvr-grab-manager
        cursor__mouse="rayOrigin: mouse"
        raycaster__mouse="objects: .clickable; far: 30">
        <a-assets id="assets"></a-assets>

        <a-entity id="videoSurfaceEntity" class="clickable"></a-entity>

        <a-entity id="cameraRig" position="0 0 0">
            <a-camera id="camera" position="0 1.6 0" look-controls="enabled: true" wasd-controls-enabled="false"></a-camera>

            <a-entity id="uiRoot" jfvr-ui-manager position="0 -0.65 -1.6" scale="1 1 1" visible="false">
                <a-entity id="uiPanel">
                    <a-plane width="2.2" height="1.02" color="#0ea5e9" opacity="0.06"
                        material="shader: flat; transparent: true; opacity: 0.06; blending: additive"
                        position="0 -0.04 -0.02"></a-plane>
                    <a-plane width="2.1" height="0.96" color="#060e16" opacity="0.94"
                        material="shader: flat; transparent: true; opacity: 0.94"
                        position="0 -0.04 -0.01"></a-plane>
                    <a-plane width="2.08" height="0.94"
                        material="shader: flat; wireframe: true; color: #1e3a5f; transparent: true; opacity: 0.25"
                        position="0 -0.04 0"></a-plane>
                </a-entity>

                <!-- Row 1: Mode selector (clickable) + Status -->
                <a-entity class="clickable" id="uiModeBtnBg3d" position="-0.20 0.30 0.02"
                    geometry="primitive: plane; width: 1.20; height: 0.14"
                    material="shader: flat; color: #0f172a; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.04 1.1 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-troika-text id="panelModeText" value="360 Mono" color="#f0f6ff" font-size="0.046"
                        anchor="center" baseline="center" position="0 0 0.01" max-width="1.1"
                        outline-width="0.003" outline-color="#000000"></a-troika-text>
                    <a-entity position="0.52 0 0.01"
                        geometry="primitive: triangle; vertexA: -0.018 0.012 0; vertexB: 0.018 0.012 0; vertexC: 0 -0.012 0"
                        material="shader: flat; color: #7dd3fc; side: double"></a-entity>
                </a-entity>

                <a-troika-text id="panelStatusText" value="Ready" color="#7dd3fc" font-size="0.032"
                    anchor="right" baseline="center" position="0.98 0.30 0.02" max-width="0.5"
                    outline-width="0.002" outline-color="#000000"></a-troika-text>

                <!-- Mode list overlay (hidden by default) -->
                <a-entity id="modeListRoot3d" visible="false" position="0 0.30 0.05">
                </a-entity>

                <!-- Row 2: Seek bar + Time -->
                <a-entity class="clickable" id="seekTrack3d" position="0 0.12 0.02"
                    geometry="primitive: plane; width: 1.80; height: 0.05"
                    material="shader: flat; color: #1e293b; opacity: 0.98; transparent: true"
                    animation__hover="property: scale; to: 1.02 1.4 1; dur: 150; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 150; startEvents: mouseleave"></a-entity>
                <a-entity id="seekBuffered3d" position="-0.9 0.12 0.025"
                    geometry="primitive: plane; width: 0.001; height: 0.05"
                    material="shader: flat; color: #475569; opacity: 0.8"></a-entity>
                <a-entity id="seekPlayed3d" position="-0.9 0.12 0.03"
                    geometry="primitive: plane; width: 0.001; height: 0.05"
                    material="shader: flat; color: #38bdf8; opacity: 1"></a-entity>
                <a-troika-text id="seekTime3d" value="0:00 / 0:00" color="#c8ddf0" font-size="0.032"
                    anchor="right" baseline="center" position="0.98 0.03 0.02" max-width="1.0"
                    outline-width="0.002" outline-color="#000000"></a-troika-text>

                <!-- Row 3: Main controls -->
                <a-entity class="clickable" id="uiExit3d" position="-0.92 -0.10 0.02"
                    geometry="primitive: plane; width: 0.20; height: 0.17"
                    material="shader: flat; color: #450a0a; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity position="0 0 0.01" rotation="0 0 45"
                        geometry="primitive: plane; width: 0.06; height: 0.012"
                        material="shader: flat; color: #fca5a5; side: double"></a-entity>
                    <a-entity position="0 0 0.01" rotation="0 0 -45"
                        geometry="primitive: plane; width: 0.06; height: 0.012"
                        material="shader: flat; color: #fca5a5; side: double"></a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiRecenterVideo3d" position="-0.74 -0.10 0.02"
                    geometry="primitive: circle; radius: 0.07"
                    material="shader: flat; color: #1e293b; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity position="0 0 0.01" geometry="primitive: circle; radius: 0.035" material="shader: flat; wireframe: true; color: #7dd3fc"></a-entity>
                    <a-entity position="0 0 0.01" geometry="primitive: circle; radius: 0.012" material="shader: flat; color: #7dd3fc"></a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiSeekBack3d" position="-0.56 -0.10 0.02"
                    geometry="primitive: plane; width: 0.22; height: 0.17"
                    material="shader: flat; color: #0f172a; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity position="-0.01 0 0.01"
                        geometry="primitive: triangle; vertexA: 0.02 0.03 0; vertexB: 0.02 -0.03 0; vertexC: -0.02 0 0"
                        material="shader: flat; color: #94a3b8; side: double"></a-entity>
                    <a-entity position="0.03 0 0.01"
                        geometry="primitive: triangle; vertexA: 0.02 0.03 0; vertexB: 0.02 -0.03 0; vertexC: -0.02 0 0"
                        material="shader: flat; color: #94a3b8; side: double"></a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiPlay3d" position="-0.22 -0.10 0.02"
                    geometry="primitive: plane; width: 0.26; height: 0.19"
                    material="shader: flat; color: #0c4a6e; opacity: 0.98; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity id="uiPlayIcon" position="0 0 0.01"
                        geometry="primitive: triangle; vertexA: -0.025 0.035 0; vertexB: -0.025 -0.035 0; vertexC: 0.03 0 0"
                        material="shader: flat; color: #7dd3fc; side: double"></a-entity>
                    <a-entity id="uiPauseIcon" position="0 0 0.01" visible="false">
                        <a-entity geometry="primitive: plane; width: 0.014; height: 0.06"
                            material="shader: flat; color: #7dd3fc" position="-0.016 0 0"></a-entity>
                        <a-entity geometry="primitive: plane; width: 0.014; height: 0.06"
                            material="shader: flat; color: #7dd3fc" position="0.016 0 0"></a-entity>
                    </a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiSeekFwd3d" position="0.12 -0.10 0.02"
                    geometry="primitive: plane; width: 0.22; height: 0.17"
                    material="shader: flat; color: #0f172a; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity position="-0.03 0 0.01"
                        geometry="primitive: triangle; vertexA: -0.02 0.03 0; vertexB: -0.02 -0.03 0; vertexC: 0.02 0 0"
                        material="shader: flat; color: #94a3b8; side: double"></a-entity>
                    <a-entity position="0.01 0 0.01"
                        geometry="primitive: triangle; vertexA: -0.02 0.03 0; vertexB: -0.02 -0.03 0; vertexC: 0.02 0 0"
                        material="shader: flat; color: #94a3b8; side: double"></a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiEnterVr3d" position="0.44 -0.10 0.02"
                    geometry="primitive: plane; width: 0.22; height: 0.17"
                    material="shader: flat; color: #064e3b; opacity: 0.98; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-troika-text id="uiEnterVr3dLabel" value="VR" color="#6ee7b7" font-size="0.055"
                        anchor="center" baseline="center" position="0 0 0.01"
                        outline-width="0.002" outline-color="#000000"></a-troika-text>
                </a-entity>

                <a-entity class="clickable" id="uiMute3d" position="0.72 -0.10 0.02"
                    geometry="primitive: plane; width: 0.20; height: 0.17"
                    material="shader: flat; color: #1e293b; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity id="uiMuteIcon" position="0 0 0.01">
                        <a-entity geometry="primitive: plane; width: 0.018; height: 0.028"
                            material="shader: flat; color: #cbd5e1" position="-0.022 0 0"></a-entity>
                        <a-entity geometry="primitive: triangle; vertexA: -0.01 0.02 0; vertexB: -0.01 -0.02 0; vertexC: 0.015 0.035 0"
                            material="shader: flat; color: #cbd5e1; side: double" position="-0.005 0 0"></a-entity>
                        <a-entity geometry="primitive: triangle; vertexA: -0.01 0.02 0; vertexB: -0.01 -0.02 0; vertexC: 0.015 -0.035 0"
                            material="shader: flat; color: #cbd5e1; side: double" position="-0.005 0 0"></a-entity>
                        <a-entity geometry="primitive: plane; width: 0.006; height: 0.022" rotation="0 0 20"
                            material="shader: flat; color: #7dd3fc" position="0.018 0.006 0"></a-entity>
                        <a-entity geometry="primitive: plane; width: 0.006; height: 0.032" rotation="0 0 15"
                            material="shader: flat; color: #7dd3fc" position="0.030 0.005 0"></a-entity>
                    </a-entity>
                    <a-entity id="uiMutedIcon" position="0 0 0.01" visible="false">
                        <a-entity geometry="primitive: plane; width: 0.018; height: 0.028"
                            material="shader: flat; color: #64748b" position="-0.022 0 0"></a-entity>
                        <a-entity geometry="primitive: triangle; vertexA: -0.01 0.02 0; vertexB: -0.01 -0.02 0; vertexC: 0.015 0.035 0"
                            material="shader: flat; color: #64748b; side: double" position="-0.005 0 0"></a-entity>
                        <a-entity geometry="primitive: triangle; vertexA: -0.01 0.02 0; vertexB: -0.01 -0.02 0; vertexC: 0.015 -0.035 0"
                            material="shader: flat; color: #64748b; side: double" position="-0.005 0 0"></a-entity>
                        <a-entity geometry="primitive: plane; width: 0.06; height: 0.008" rotation="0 0 45"
                            material="shader: flat; color: #fb7185; side: double" position="0.005 0 0.005"></a-entity>
                        <a-entity geometry="primitive: plane; width: 0.06; height: 0.008" rotation="0 0 -45"
                            material="shader: flat; color: #fb7185; side: double" position="0.005 0 0.005"></a-entity>
                    </a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiSwap3d" position="0.98 -0.10 0.02"
                    geometry="primitive: plane; width: 0.20; height: 0.17"
                    material="shader: flat; color: #1e293b; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity id="uiSwapIcon" position="0 0 0.01">
                        <a-entity geometry="primitive: plane; width: 0.045; height: 0.008"
                            material="shader: flat; color: #cbd5e1" position="0 0.01 0"></a-entity>
                        <a-entity geometry="primitive: triangle; vertexA: -0.008 0.01 0; vertexB: -0.008 -0.01 0; vertexC: 0.008 0 0"
                            material="shader: flat; color: #cbd5e1; side: double" position="0.025 0.01 0"></a-entity>
                        <a-entity geometry="primitive: plane; width: 0.045; height: 0.008"
                            material="shader: flat; color: #cbd5e1" position="0 -0.01 0"></a-entity>
                        <a-entity geometry="primitive: triangle; vertexA: 0.008 0.01 0; vertexB: 0.008 -0.01 0; vertexC: -0.008 0 0"
                            material="shader: flat; color: #cbd5e1; side: double" position="-0.025 -0.01 0"></a-entity>
                    </a-entity>
                </a-entity>

                <!-- Volume slider -->
                <a-entity class="clickable" id="uiVolTrack3d" position="0 -0.22 0.02"
                    geometry="primitive: plane; width: 0.80; height: 0.04"
                    material="shader: flat; color: #1e293b; opacity: 0.98; transparent: true"></a-entity>
                <a-entity id="uiVolFill3d" position="-0.40 -0.22 0.025"
                    geometry="primitive: plane; width: 0.80; height: 0.04"
                    material="shader: flat; color: #38bdf8; opacity: 1"></a-entity>
                <a-troika-text id="uiVolLabel3d" value="Vol 100%" color="#94a3b8" font-size="0.026"
                    anchor="left" baseline="center" position="-0.40 -0.27 0.02" max-width="0.5"
                    outline-width="0.002" outline-color="#000000"></a-troika-text>

                <!-- Row 4: Settings -->
                <a-entity class="clickable" id="uiNear3d" position="-0.42 -0.36 0.02"
                    geometry="primitive: plane; width: 0.18; height: 0.13"
                    material="shader: flat; color: #1e293b; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity position="0 0 0.01"
                        geometry="primitive: triangle; vertexA: 0.018 0.022 0; vertexB: 0.018 -0.022 0; vertexC: -0.012 0 0"
                        material="shader: flat; color: #94a3b8; side: double"></a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiFar3d" position="-0.14 -0.36 0.02"
                    geometry="primitive: plane; width: 0.18; height: 0.13"
                    material="shader: flat; color: #1e293b; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity position="0 0 0.01"
                        geometry="primitive: triangle; vertexA: -0.018 0.022 0; vertexB: -0.018 -0.022 0; vertexC: 0.012 0 0"
                        material="shader: flat; color: #94a3b8; side: double"></a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiScaleDown3d" position="0.14 -0.36 0.02"
                    geometry="primitive: plane; width: 0.18; height: 0.13"
                    material="shader: flat; color: #1e293b; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity geometry="primitive: plane; width: 0.035; height: 0.008"
                        material="shader: flat; color: #94a3b8" position="0 0 0.01"></a-entity>
                </a-entity>

                <a-entity class="clickable" id="uiScaleUp3d" position="0.42 -0.36 0.02"
                    geometry="primitive: plane; width: 0.18; height: 0.13"
                    material="shader: flat; color: #1e293b; opacity: 0.95; transparent: true"
                    animation__hover="property: scale; to: 1.12 1.12 1; dur: 100; startEvents: mouseenter"
                    animation__leave="property: scale; to: 1 1 1; dur: 100; startEvents: mouseleave">
                    <a-entity geometry="primitive: plane; width: 0.035; height: 0.008"
                        material="shader: flat; color: #94a3b8" position="0 0 0.01"></a-entity>
                    <a-entity geometry="primitive: plane; width: 0.008; height: 0.035"
                        material="shader: flat; color: #94a3b8" position="0 0 0.01"></a-entity>
                </a-entity>
            </a-entity>
        </a-entity>

        <!-- Laser Controllers -->
        <a-entity id="leftController" laser-controls="hand: left"
            raycaster="objects: .clickable; far: 20; lineColor: #7dd3fc; lineOpacity: 0.6; showLine: true"
            cursor="fuse: false"></a-entity>
        <a-entity id="rightController" laser-controls="hand: right"
            raycaster="objects: .clickable; far: 20; lineColor: #7dd3fc; lineOpacity: 0.6; showLine: true"
            cursor="fuse: false"></a-entity>

        <!-- Hand Tracking -->
        <a-entity id="leftHand" hand-tracking-controls="hand: left; modelColor: #394d63"
            raycaster="objects: .clickable; far: 5; lineColor: #7dd3fc; lineOpacity: 0.4; showLine: true"
            cursor="fuse: false; downEvents: pinchstarted; upEvents: pinchended"></a-entity>
        <a-entity id="rightHand" hand-tracking-controls="hand: right; modelColor: #394d63"
            raycaster="objects: .clickable; far: 5; lineColor: #7dd3fc; lineOpacity: 0.4; showLine: true"
            cursor="fuse: false; downEvents: pinchstarted; upEvents: pinchended"></a-entity>
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

            var SEEK_TRACK_WIDTH = 1.80;
            var statusTimers = [];
            var pendingPayload = null;
            var surfacesReady = false;
            var isQuestBrowser = /OculusBrowser/i.test(navigator.userAgent || '');
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
            var uiModeBtnBg3d = document.getElementById('uiModeBtnBg3d');
            var modeListRoot3d = document.getElementById('modeListRoot3d');
            var modeListOpen = false;
            var uiExit3d = document.getElementById('uiExit3d');
            var uiSeekBack3d = document.getElementById('uiSeekBack3d');
            var uiPlay3d = document.getElementById('uiPlay3d');
            var uiPlayIcon = document.getElementById('uiPlayIcon');
            var uiPauseIcon = document.getElementById('uiPauseIcon');
            var uiSeekFwd3d = document.getElementById('uiSeekFwd3d');
            var uiEnterVr3d = document.getElementById('uiEnterVr3d');
            var uiEnterVr3dLabel = document.getElementById('uiEnterVr3dLabel');
            var uiSwap3d = document.getElementById('uiSwap3d');
            var uiMute3d = document.getElementById('uiMute3d');
            var uiMuteIcon = document.getElementById('uiMuteIcon');
            var uiMutedIcon = document.getElementById('uiMutedIcon');
            var uiNear3d = document.getElementById('uiNear3d');
            var uiFar3d = document.getElementById('uiFar3d');
            var uiScaleDown3d = document.getElementById('uiScaleDown3d');
            var uiScaleUp3d = document.getElementById('uiScaleUp3d');
            var seekTrack3d = document.getElementById('seekTrack3d');
            var seekBuffered3d = document.getElementById('seekBuffered3d');
            var seekPlayed3d = document.getElementById('seekPlayed3d');
            var seekTime3d = document.getElementById('seekTime3d');
            var uiVolTrack3d = document.getElementById('uiVolTrack3d');
            var uiVolFill3d = document.getElementById('uiVolFill3d');
            var uiVolLabel3d = document.getElementById('uiVolLabel3d');

            
            if (typeof AFRAME !== 'undefined' && !AFRAME.components['jfvr-ui-manager']) {
                AFRAME.registerComponent('jfvr-ui-manager', {
                    schema: { distance: {type: 'number', default: 1.9} },
                    init: function () {
                        this.lastInteraction = Date.now();
                        this.uiVisible = true;
                        this.initialRecenterDone = false;
                        
                        var self = this;
                        var wake = function() {
                            self.lastInteraction = Date.now();
                            if (!self.uiVisible) {
                                self.uiVisible = true;
                                self.el.object3D.visible = true;
                            }
                        };
                        var wakeAndRecenter = function() {
                            wake();
                            self.recenter();
                        };
                        var toggleUi = function() {
                            if (self.uiVisible) {
                                self.uiVisible = false;
                                self.el.object3D.visible = false;
                            } else {
                                self.uiVisible = true;
                                self.el.object3D.visible = true;
                                self.lastInteraction = Date.now();
                            }
                        };
                        
                        this.el.sceneEl.addEventListener('enter-vr', function() {
                            setTimeout(function() {
                                self.uiVisible = true;
                                self.el.object3D.visible = true;
                                self.lastInteraction = Date.now();
                                self.recenter();
                                self.initialRecenterDone = true;
                            }, 400);
                        });

                        document.addEventListener('mousemove', wake);
                        document.addEventListener('mousedown', wake);
                        document.addEventListener('keydown', function(e) {
                            if (e.code === 'Space') self.recenter();
                            wake();
                        });

                        this.el.sceneEl.addEventListener('triggerdown', wake);
                        this.el.sceneEl.addEventListener('thumbstickdown', wakeAndRecenter);

                        setTimeout(function() {
                            var controllers = document.querySelectorAll('[laser-controls]');
                            controllers.forEach(function(ctrl) {
                                ctrl.addEventListener('triggerdown', wake);
                                ctrl.addEventListener('gripdown', toggleUi);
                                ctrl.addEventListener('bbuttondown', wake);
                                ctrl.addEventListener('ybuttondown', wakeAndRecenter);
                            });
                            var handEls = document.querySelectorAll('[hand-tracking-controls]');
                            handEls.forEach(function(h) {
                                h.addEventListener('pinchstarted', wake);
                                h.addEventListener('pinchended', wake);
                            });
                        }, 1000);
                        
                        this.el.object3D.visible = true;
                        setTimeout(function() { self.recenter(); }, 500);
                    },
                    recenter: function() {
                        var cam = this.el.sceneEl.camera;
                        if (!cam) return;
                        var camObj = cam.el ? cam.el.object3D : cam.object3D || cam;
                        if (!camObj || !camObj.getWorldQuaternion) return;
                        var euler = new THREE.Euler().setFromQuaternion(camObj.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
                        
                        this.el.object3D.rotation.set(0, euler.y, 0);
                        var pos = new THREE.Vector3();
                        camObj.getWorldPosition(pos);
                        
                        var d = parseFloat(localStorage.getItem('jfvr:ui-distance')) || this.data.distance;
                        pos.y -= 0.65;
                        pos.x -= Math.sin(euler.y) * d;
                        pos.z -= Math.cos(euler.y) * d;
                        
                        if (this.el.object3D.parent) {
                            this.el.object3D.parent.worldToLocal(pos);
                        }
                        this.el.object3D.position.copy(pos);
                    },
                    tick: function() {
                        var now = Date.now();
                        if (this.uiVisible && (now - this.lastInteraction > 6000)) {
                            this.uiVisible = false;
                            this.el.object3D.visible = false;
                        }
                        if (playerState.isImmersive && playerState.currentMode && playerState.currentMode.stereo !== 'mono') {
                            var renderer = this.el.sceneEl.renderer;
                            if (renderer && renderer.xr && renderer.xr.isPresenting) {
                                var xrCam = typeof renderer.xr.getCamera === 'function' ? renderer.xr.getCamera() : null;
                                if (xrCam && xrCam.cameras && xrCam.cameras.length >= 2) {
                                    xrCam.layers.enable(0);
                                    xrCam.layers.enable(1);
                                    xrCam.layers.enable(2);
                                    xrCam.cameras[0].layers.set(0);
                                    xrCam.cameras[0].layers.enable(1);
                                    xrCam.cameras[1].layers.set(0);
                                    xrCam.cameras[1].layers.enable(2);
                                }
                            }
                        }
                    }
                });
            }

            if (typeof AFRAME !== 'undefined' && !AFRAME.components['jfvr-grab-manager']) {
                AFRAME.registerComponent('jfvr-grab-manager', {
                    init: function () {
                        this.targets = [];
                        this.grabs = { left: null, right: null };
                        this.lastRelease = { left: 0, right: 0 };
                        this._inputsReady = false;
                        var self = this;
                        this.el.addEventListener('enter-vr', function () {
                            setTimeout(function () { self.setupInputs(); }, 600);
                        });
                    },
                    addTarget: function (obj3d) {
                        this.targets.push({
                            obj: obj3d,
                            iPos: obj3d.position.clone(),
                            iRot: obj3d.rotation.clone(),
                            iScl: obj3d.scale.clone()
                        });
                    },
                    resetAll: function () {
                        this.targets.forEach(function (t) {
                            t.obj.position.copy(t.iPos);
                            t.obj.rotation.copy(t.iRot);
                            t.obj.scale.copy(t.iScl);
                        });
                    },
                    setupInputs: function () {
                        if (this._inputsReady) return;
                        this._inputsReady = true;
                        var self = this;
                        var parts = [
                            ['left', '#leftController'], ['right', '#rightController'],
                            ['left', '#leftHand'], ['right', '#rightHand']
                        ];
                        parts.forEach(function (pair) {
                            var hand = pair[0];
                            var ctrl = self.el.querySelector(pair[1]);
                            if (!ctrl) return;
                            
                            var onStart = function () { 
                                self['_ctrl_' + hand] = ctrl;
                                self.startGrab(hand); 
                            };
                            var onEnd = function () { 
                                self.endGrab(hand); 
                            };
                            
                            ctrl.addEventListener('gripdown', onStart);
                            ctrl.addEventListener('gripup', onEnd);
                            ctrl.addEventListener('pinchstarted', onStart);
                            ctrl.addEventListener('pinchended', onEnd);
                            ctrl.addEventListener('thumbstickmoved', function (e) { self.onStick(hand, e.detail); });
                        });
                    },
                    isChild: function (child, parent) {
                        var n = child;
                        while (n) { if (n === parent) return true; n = n.parent; }
                        return false;
                    },
                    findTarget: function (ctrlEl) {
                        var rc = ctrlEl.components.raycaster;
                        if (!rc || !rc.intersectedEls || rc.intersectedEls.length === 0) return null;
                        for (var i = 0; i < rc.intersectedEls.length; i++) {
                            var hit = rc.intersectedEls[i].object3D;
                            for (var j = 0; j < this.targets.length; j++) {
                                if (this.isChild(hit, this.targets[j].obj)) return this.targets[j];
                            }
                        }
                        return null;
                    },
                    startGrab: function (hand) {
                        var ctrl = this['_ctrl_' + hand];
                        if (!ctrl) return;
                        var now = Date.now();
                        if (now - this.lastRelease[hand] < 400) {
                            this.resetAll();
                            return;
                        }
                        var tgt = this.findTarget(ctrl);
                        if (!tgt) return;
                        var other = hand === 'left' ? 'right' : 'left';
                        if (this.grabs[other] && this.grabs[other].tgt === tgt) {
                            var dist = this.handDist();
                            this.grabs[hand] = { tgt: tgt, ctrl: ctrl, two: true, d0: dist, s0: tgt.obj.scale.clone() };
                            this.grabs[other].two = true;
                            this.grabs[other].d0 = dist;
                            this.grabs[other].s0 = tgt.obj.scale.clone();
                            return;
                        }
                        var cp = new THREE.Vector3(); ctrl.object3D.getWorldPosition(cp);
                        var tp = new THREE.Vector3(); tgt.obj.getWorldPosition(tp);
                        var q0_obj = tgt.obj.quaternion.clone();
                        var fwd0 = new THREE.Vector3(0, 0, -1).applyQuaternion(ctrl.object3D.quaternion);
                        this.grabs[hand] = { 
                            tgt: tgt, ctrl: ctrl, 
                            off: tp.sub(cp), 
                            q0: ctrl.object3D.quaternion.clone(), 
                            cp0: cp.clone(),
                            fwd0: fwd0,
                            q0_obj: q0_obj,
                            two: false 
                        };
                    },
                    endGrab: function (hand) {
                        this.lastRelease[hand] = Date.now();
                        var g = this.grabs[hand];
                        if (!g) return;
                        if (g.two) {
                            var other = hand === 'left' ? 'right' : 'left';
                            var og = this.grabs[other];
                            if (og) {
                                og.two = false;
                                var cp = new THREE.Vector3(); og.ctrl.object3D.getWorldPosition(cp);
                                var tp = new THREE.Vector3(); g.tgt.obj.getWorldPosition(tp);
                                og.off = tp.sub(cp);
                                og.q0 = og.ctrl.object3D.quaternion.clone();
                                og.cp0 = cp.clone();
                                og.fwd0 = new THREE.Vector3(0, 0, -1).applyQuaternion(og.ctrl.object3D.quaternion);
                                og.q0_obj = g.tgt.obj.quaternion.clone();
                            }
                        }
                        this.grabs[hand] = null;
                    },
                    handDist: function () {
                        var lc = this._ctrl_left, rc = this._ctrl_right;
                        if (!lc || !rc) return 1;
                        var a = new THREE.Vector3(), b = new THREE.Vector3();
                        lc.object3D.getWorldPosition(a); rc.object3D.getWorldPosition(b);
                        return a.distanceTo(b);
                    },
                    onStick: function (hand, detail) {
                        var g = this.grabs[hand];
                        if (!g || !g.tgt || g.two) return;
                        
                        var isSphere = false;
                        if (typeof playerState !== 'undefined' && playerState.currentMode) {
                            isSphere = (playerState.currentMode.projection === '180' || playerState.currentMode.projection === '360');
                        }
                        var isSurface = g.tgt.obj.el && g.tgt.obj.el.id === 'videoSurfaceEntity';

                        if (Math.abs(detail.y) > 0.15 && !(isSurface && isSphere)) {
                            var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(g.ctrl.object3D.quaternion);
                            var offLen = g.off.length();
                            var deltaMag = -detail.y * (offLen * 0.02 + 0.01);
                            var delta = fwd.multiplyScalar(deltaMag);
                            
                            var newLen = offLen + deltaMag;
                            if (newLen > 0.5 && newLen < 250.0) {
                                g.off.add(delta);
                                g.tgt.obj.position.add(delta);
                            }
                        }
                        if (Math.abs(detail.x) > 0.15) {
                            var rotDelta = detail.x * 0.025;
                            if (isSurface && isSphere) {
                                g.tgt.obj.rotation.y += rotDelta;
                                g.q0_obj.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotDelta));
                            } else {
                                g.tgt.obj.rotation.y += rotDelta;
                            }
                        }
                    },
                    tick: function () {
                        var self = this;
                        var cam = this.el.sceneEl.camera;
                        var isSphere = false;
                        if (typeof playerState !== 'undefined' && playerState.currentMode) {
                            isSphere = (playerState.currentMode.projection === '180' || playerState.currentMode.projection === '360');
                        }
                        ['left', 'right'].forEach(function (hand) {
                            var g = self.grabs[hand];
                            if (!g || !g.tgt) return;
                            if (g.two) {
                                if (hand === 'left') return;
                                var dist = self.handDist();
                                if (g.d0 > 0.01 && g.s0) {
                                    var sf = Math.max(0.3, Math.min(3.0, dist / g.d0));
                                    g.tgt.obj.scale.copy(g.s0).multiplyScalar(sf);
                                }
                                var a = new THREE.Vector3(), b = new THREE.Vector3();
                                self._ctrl_left.object3D.getWorldPosition(a);
                                self._ctrl_right.object3D.getWorldPosition(b);
                                var mid = a.lerp(b, 0.5);
                                g.tgt.obj.position.copy(mid);
                                return;
                            }
                            var cp = new THREE.Vector3();
                            g.ctrl.object3D.getWorldPosition(cp);
                            var dq = g.ctrl.object3D.quaternion.clone().multiply(g.q0.clone().invert());
                            
                            var isSurface = g.tgt.obj.el && g.tgt.obj.el.id === 'videoSurfaceEntity';

                            if (isSurface && isSphere) {
                                var headPos = new THREE.Vector3();
                                if (cam) cam.getWorldPosition(headPos);
                                var v0 = g.cp0.clone().sub(headPos).normalize();
                                var v1 = cp.clone().sub(headPos).normalize();
                                var dragRot = new THREE.Quaternion().setFromUnitVectors(v0, v1);
                                var totalDq = dragRot.multiply(dq);
                                g.tgt.obj.quaternion.copy(totalDq.multiply(g.q0_obj));
                                return;
                            }

                            if (g.lastCp) {
                                var dp = cp.clone().sub(g.lastCp);
                                var push = dp.dot(g.fwd0);
                                if (Math.abs(push) > 0.0001) {
                                    var offLen = g.off.length();
                                    offLen += push * 6.0;
                                    offLen = Math.max(0.3, Math.min(offLen, 250.0));
                                    g.off.normalize().multiplyScalar(offLen);
                                }
                            }
                            g.lastCp = cp.clone();

                            var ro = g.off.clone().applyQuaternion(dq);
                            g.tgt.obj.position.copy(cp).add(ro);
                        });
                    }
                });
            }

            var playerState = {
                currentMode: MODE_MAP['360-mono'],
                video: null,
                currentSrc: '',
                hostSessionId: '',
                textures: null,
                materials: null,
                meshes: null,
                surfaceRoot: null,
                isImmersive: false,
                sessionMode: 'none',
                arSupported: false,
                preferAR: true,
                mediaLayer: null,
                savedBaseLayer: null,
                isSeeking: false,
                syncTimer: null,
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
                if (!el) return;
                if (el.hasAttribute('troika-text') || el.tagName === 'A-TROIKA-TEXT') {
                    el.setAttribute('troika-text', 'value', value);
                } else {
                    el.setAttribute('text', { value: value });
                }
            }

            function reportXrAvailability() {
                if (!navigator.xr) {
                    setStatus('WebXR unavailable in this window', true);
                    return;
                }

                if (!navigator.xr.isSessionSupported) {
                    setStatus('WebXR API is present', false);
                    return;
                }

                navigator.xr.isSessionSupported('immersive-vr').then(function (supported) {
                    if (!supported) {
                        setStatus('Immersive VR unsupported here', true);
                    } else if (!playerState.video) {
                        setStatus('Waiting for stream...', true);
                    }
                }).catch(function (error) {
                    var reason = error && error.message ? error.message : 'XR availability check failed';
                    setStatus('WebXR check failed: ' + reason, true);
                });
            }

            function getHostSession() {
                var hostWindow = getHostWindow();
                if (!hostWindow || !playerState.hostSessionId) return null;
                var store = hostWindow.__JFVRHostSessions;
                if (!store) return null;
                return store[playerState.hostSessionId] || null;
            }

            function getMasterVideo() {
                var hostSession = getHostSession();
                if (hostSession && hostSession.video) {
                    return hostSession.video;
                }
                return playerState.video;
            }

            function getVolumeTargetVideo() {
                if (playerState.video) {
                    return playerState.video;
                }
                return getMasterVideo();
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
                uiRoot.object3D.scale.set(panelScale, panelScale, panelScale);
                localStorage.setItem(STORAGE_KEYS.uiDistance, String(panelDistance));
                localStorage.setItem(STORAGE_KEYS.uiScale, String(panelScale));
                
                // Trigger recenter to adjust the distance appropriately
                if (uiRoot && uiRoot.components && uiRoot.components['jfvr-ui-manager']) {
                    uiRoot.components['jfvr-ui-manager'].recenter();
                } else if (uiRoot && uiRoot.getObject3D && uiRoot.object3D) {
                    // Fallback to update Z manually if component isn't bound yet
                    uiRoot.object3D.position.z = -panelDistance;
                }
            }

            var VOL_TRACK_WIDTH = 0.80;

            function updateVolumeFill() {
                var audioVideo = getVolumeTargetVideo();
                var vol = audioVideo ? (audioVideo.muted ? 0 : audioVideo.volume) : 1;
                var width = Math.max(0.001, VOL_TRACK_WIDTH * clamp(vol, 0, 1));
                if (uiVolFill3d) {
                    uiVolFill3d.setAttribute('geometry', 'width', width);
                    uiVolFill3d.setAttribute('position', (-VOL_TRACK_WIDTH / 2 + width / 2) + ' -0.22 0.025');
                }
                if (uiVolLabel3d) {
                    setEntityText(uiVolLabel3d, 'Vol ' + Math.round(vol * 100) + '%');
                }
            }

            function updateButtonLabels() {
                var video = getMasterVideo();
                var audioVideo = getVolumeTargetVideo();
                var paused = !video || video.paused;
                playPauseBtn.textContent = paused ? 'Play' : 'Pause';
                if (uiPlayIcon) uiPlayIcon.object3D.visible = paused;
                if (uiPauseIcon) uiPauseIcon.object3D.visible = !paused;
                muteBtn.textContent = audioVideo && audioVideo.muted ? 'Unmute' : 'Mute';
                if (uiMuteIcon) uiMuteIcon.object3D.visible = !(audioVideo && audioVideo.muted);
                if (uiMutedIcon) uiMutedIcon.object3D.visible = !!(audioVideo && audioVideo.muted);
                var inVr = playerState.isImmersive;
                var isAR = playerState.sessionMode === 'immersive-ar';
                var preferLabel = playerState.preferAR && playerState.arSupported ? 'AR' : 'VR';
                enterVrBtn.textContent = inVr ? (isAR ? 'Exit AR' : 'Exit VR') : ('Enter ' + preferLabel);
                setEntityText(uiEnterVr3dLabel, inVr ? (isAR ? 'Exit' : 'Exit') : preferLabel);
                updateVolumeFill();
            }

            function cycleMode(direction) {
                var currentId = playerState.currentMode ? playerState.currentMode.id : '360-mono';
                var idx = 0;
                for (var i = 0; i < MODE_LIST.length; i++) {
                    if (MODE_LIST[i].id === currentId) { idx = i; break; }
                }
                idx = (idx + direction + MODE_LIST.length) % MODE_LIST.length;
                applyMode(MODE_LIST[idx].id);
                setStatus(MODE_LIST[idx].label, false);
            }

            function buildModeList() {
                if (!modeListRoot3d) return;
                while (modeListRoot3d.firstChild) {
                    modeListRoot3d.removeChild(modeListRoot3d.firstChild);
                }
                var itemH = 0.10;
                var totalH = MODE_LIST.length * itemH;
                var bgEl = document.createElement('a-plane');
                bgEl.setAttribute('width', '1.30');
                bgEl.setAttribute('height', String(totalH + 0.06));
                bgEl.setAttribute('color', '#060e16');
                bgEl.setAttribute('material', 'shader: flat; transparent: true; opacity: 0.96');
                bgEl.setAttribute('position', '0 ' + (totalH / 2 + 0.04) + ' -0.01');
                modeListRoot3d.appendChild(bgEl);
                for (var i = 0; i < MODE_LIST.length; i++) {
                    (function(mode, index) {
                        var y = totalH - index * itemH;
                        var itemEl = document.createElement('a-entity');
                        itemEl.classList.add('clickable');
                        itemEl.setAttribute('geometry', 'primitive: plane; width: 1.24; height: ' + (itemH - 0.01));
                        var isActive = playerState.currentMode && playerState.currentMode.id === mode.id;
                        itemEl.setAttribute('material', 'shader: flat; color: ' + (isActive ? '#1e3a5f' : '#0f172a') + '; opacity: 0.95; transparent: true');
                        itemEl.setAttribute('position', '0 ' + y + ' 0');
                        itemEl.setAttribute('animation__hover', 'property: material.color; to: #1b3951; dur: 80; startEvents: mouseenter');
                        itemEl.setAttribute('animation__leave', 'property: material.color; to: ' + (isActive ? '#1e3a5f' : '#0f172a') + '; dur: 80; startEvents: mouseleave');
                        var textEl = document.createElement('a-troika-text');
                        textEl.setAttribute('value', mode.label);
                        textEl.setAttribute('color', isActive ? '#7dd3fc' : '#e2e8f0');
                        textEl.setAttribute('font-size', '0.038');
                        textEl.setAttribute('anchor', 'center');
                        textEl.setAttribute('baseline', 'center');
                        textEl.setAttribute('position', '0 0 0.01');
                        textEl.setAttribute('max-width', '1.1');
                        itemEl.appendChild(textEl);
                        itemEl.addEventListener('click', function() {
                            applyMode(mode.id);
                            setStatus(mode.label, false);
                            toggleModeList();
                        });
                        modeListRoot3d.appendChild(itemEl);
                    })(MODE_LIST[i], i);
                }
            }

            function toggleModeList() {
                modeListOpen = !modeListOpen;
                if (modeListOpen) {
                    buildModeList();
                }
                if (modeListRoot3d) {
                    modeListRoot3d.object3D.visible = modeListOpen;
                }
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
                if (modeListOpen) {
                    buildModeList();
                }
                updateButtonLabels();
            }

            function updateSeekFill(el, ratio, color) {
                var width = Math.max(0.001, SEEK_TRACK_WIDTH * clamp(ratio, 0, 1));
                el.setAttribute('geometry', 'width', width);
                el.setAttribute('material', 'color', color);
                el.setAttribute('position', (-SEEK_TRACK_WIDTH / 2 + width / 2) + ' 0.12 ' + (el === seekPlayed3d ? '0.03' : '0.025'));
            }

            function updateTimeUi() {
                var video = getMasterVideo();
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

            function seekTo(nextTime) {
                var video = getMasterVideo();
                if (!video || !Number.isFinite(video.duration)) return;
                var clampedTime = clamp(nextTime, 0, video.duration);
                video.currentTime = clampedTime;
                updateTimeUi();
            }

            function getViewportForEye(mode, eye) {
                if (mode.projection === 'screen') {
                    if (mode.stereo === 'sbs') {
                        if (eye === 'right') {
                            return { offsetX: 0.5, repeatX: 0.5, offsetY: 0, repeatY: 1 };
                        }
                        return { offsetX: 0, repeatX: 0.5, offsetY: 0, repeatY: 1 };
                    }
                    return { offsetX: 0, repeatX: 1, offsetY: 0, repeatY: 1 };
                }

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

            function getPreviewViewport(mode, leftEye) {
                if (mode.projection === 'screen') {
                    return { offsetX: 0, repeatX: 1, offsetY: 0, repeatY: 1 };
                }
                return getViewportForEye(mode, leftEye);
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
                if (mode.projection === 'screen') {
                    return new THREE.PlaneGeometry(18, 10.125, 1, 1);
                }
                var radius = 32;
                if (mode.projection === '180') {
                    return new THREE.SphereGeometry(radius, 96, 64, 0, Math.PI, 0, Math.PI);
                }
                return new THREE.SphereGeometry(radius, 96, 64);
            }

            function resetVideoRotation() {
                var surfaceEntity = document.getElementById('videoSurfaceEntity');
                if (!surfaceEntity) return;
                var mode = playerState.currentMode;
                var cam = sceneEl.camera;
                var camObj = cam ? (cam.el ? cam.el.object3D : cam.object3D || cam) : null;

                var euler = new THREE.Euler(0, 0, 0, 'YXZ');
                var pos = new THREE.Vector3(0, 1.6, 0);

                if (camObj && camObj.getWorldQuaternion) {
                    euler.setFromQuaternion(camObj.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
                    camObj.getWorldPosition(pos);
                }

                if (mode && mode.projection === 'screen') {
                    var d = 12;
                    pos.y = Math.max(0.5, pos.y);
                    pos.x -= Math.sin(euler.y) * d;
                    pos.z -= Math.cos(euler.y) * d;
                    surfaceEntity.object3D.position.copy(pos);
                    surfaceEntity.object3D.rotation.set(0, euler.y, 0);
                    surfaceEntity.object3D.scale.set(1, 1, 1);
                } else {
                    surfaceEntity.object3D.position.set(0, 0, 0);
                    surfaceEntity.object3D.rotation.set(0, euler.y + Math.PI, 0);
                    surfaceEntity.object3D.scale.set(1, 1, 1);
                }
            }

            function applyProjectionPlacement(mode) {
                resetVideoRotation();
            }

            function applyProjectionMaterialSettings(mode) {
                if (!playerState.materials) return;

                var side = mode.projection === 'screen' ? THREE.FrontSide : THREE.BackSide;
                Object.keys(playerState.materials).forEach(function (key) {
                    playerState.materials[key].side = side;
                    playerState.materials[key].needsUpdate = true;
                });
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

            var stereoLayersConfigured = false;

            function configureStereoLayers() {
                var camera = sceneEl.camera;
                if (!camera) return false;

                camera.layers.enable(0);
                camera.layers.enable(1);
                camera.layers.enable(2);

                var renderer = sceneEl.renderer;
                if (!renderer || !renderer.xr) return false;

                var xrCamera = null;
                if (typeof renderer.xr.getCamera === 'function') {
                    xrCamera = renderer.xr.getCamera();
                }
                if (!xrCamera || !xrCamera.cameras || xrCamera.cameras.length < 2) return false;

                xrCamera.layers.enable(0);
                xrCamera.layers.enable(1);
                xrCamera.layers.enable(2);

                xrCamera.cameras[0].layers.enable(0);
                xrCamera.cameras[0].layers.enable(1);
                xrCamera.cameras[0].layers.disable(2);

                xrCamera.cameras[1].layers.enable(0);
                xrCamera.cameras[1].layers.enable(2);
                xrCamera.cameras[1].layers.disable(1);

                stereoLayersConfigured = true;
                return true;
            }

            function retryStereoLayers(attemptsLeft) {
                if (stereoLayersConfigured || attemptsLeft <= 0) return;
                if (configureStereoLayers()) return;
                setTimeout(function() { retryStereoLayers(attemptsLeft - 1); }, 200);
            }

            function updateSurfaceVisibility() {
                if (!playerState.meshes) return;
                var mode = playerState.currentMode;
                var useMediaLayer = !!playerState.mediaLayer;
                var useStereo = mode.stereo !== 'mono' && playerState.isImmersive;
                playerState.meshes.preview.visible = !useStereo && !useMediaLayer;
                playerState.meshes.left.visible = useStereo && !useMediaLayer;
                playerState.meshes.right.visible = useStereo && !useMediaLayer;
                if (!useMediaLayer) configureStereoLayers();
            }

            function getMediaLayerLayout(mode) {
                if (mode.stereo === 'sbs') return 'stereo-left-right';
                if (mode.stereo === 'ou') return 'stereo-top-bottom';
                return 'mono';
            }

            function tryMediaLayers() {
                destroyMediaLayer();
                var renderer = sceneEl.renderer;
                if (!renderer || !renderer.xr || !renderer.xr.isPresenting) return;
                var session = renderer.xr.getSession();
                if (!session) return;
                if (typeof XRMediaBinding === 'undefined') return;
                if (!session.enabledFeatures || session.enabledFeatures.indexOf('layers') === -1) return;
                var refSpace = renderer.xr.getReferenceSpace();
                if (!refSpace) return;
                var video = getMasterVideo();
                if (!video) return;
                var mode = playerState.currentMode;
                if (!mode) return;

                var binding;
                try { binding = new XRMediaBinding(session); } catch (e) { return; }

                var layout = getMediaLayerLayout(mode);
                var layer;
                try {
                    if (mode.projection === 'screen') {
                        layer = binding.createQuadLayer(video, {
                            space: refSpace,
                            layout: layout,
                            width: 3.2,
                            height: 1.8,
                            transform: new XRRigidTransform(
                                { x: 0, y: 1.6, z: -2.5, w: 1 },
                                { x: 0, y: 0, z: 0, w: 1 }
                            )
                        });
                    } else if (mode.projection === '180') {
                        layer = binding.createEquirectLayer(video, {
                            space: refSpace,
                            layout: layout,
                            centralHorizontalAngle: Math.PI,
                            upperVerticalAngle: Math.PI / 2,
                            lowerVerticalAngle: -Math.PI / 2
                        });
                    } else {
                        layer = binding.createEquirectLayer(video, {
                            space: refSpace,
                            layout: layout,
                            centralHorizontalAngle: Math.PI * 2,
                            upperVerticalAngle: Math.PI / 2,
                            lowerVerticalAngle: -Math.PI / 2
                        });
                    }
                } catch (e) { return; }
                if (!layer) return;

                try {
                    playerState.savedBaseLayer = session.renderState.baseLayer || null;
                    var layers = [layer];
                    if (playerState.savedBaseLayer) layers.push(playerState.savedBaseLayer);
                    session.updateRenderState({ layers: layers });
                    playerState.mediaLayer = layer;
                    updateSurfaceVisibility();
                    setStatus('Media Layer active', false);
                } catch (e) {
                    playerState.mediaLayer = null;
                }
            }

            function destroyMediaLayer() {
                if (!playerState.mediaLayer) return;
                playerState.mediaLayer = null;
                var renderer = sceneEl.renderer;
                if (renderer && renderer.xr && renderer.xr.isPresenting) {
                    var session = renderer.xr.getSession();
                    if (session && playerState.savedBaseLayer) {
                        try {
                            session.updateRenderState({ baseLayer: playerState.savedBaseLayer, layers: undefined });
                        } catch (e) {}
                    }
                }
                playerState.savedBaseLayer = null;
                updateSurfaceVisibility();
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
                applyProjectionPlacement(mode);
                applyProjectionMaterialSettings(mode);
                applyViewport(playerState.materials.preview, getPreviewViewport(mode, leftEye));
                applyViewport(playerState.materials.left, getViewportForEye(mode, leftEye));
                applyViewport(playerState.materials.right, getViewportForEye(mode, rightEye));

                updateModeUi();
                updateSurfaceVisibility();
                if (playerState.isImmersive) tryMediaLayers();
            }

            function destroyVideoResources() {
                if (playerState.syncTimer) {
                    clearInterval(playerState.syncTimer);
                    playerState.syncTimer = null;
                }

                if (playerState.video) {
                    playerState.video.pause();
                    playerState.video.srcObject = null;
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
                playerState.hostSessionId = '';
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
                    setStatus(isQuestBrowser ? 'Metadata ready - tap Enter VR' : 'Metadata ready', isQuestBrowser);
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

            function checkArSupport() {
                if (!navigator.xr || typeof navigator.xr.isSessionSupported !== 'function') return;
                navigator.xr.isSessionSupported('immersive-ar').then(function (supported) {
                    playerState.arSupported = supported;
                    updateButtonLabels();
                }).catch(function () {});
            }

            function detectMediaCapabilities() {
                var caps = {
                    codecs: {},
                    maxResolution: { width: 1920, height: 1080 },
                    preferredCodec: 'h264'
                };
                if (!navigator.mediaCapabilities || typeof navigator.mediaCapabilities.decodingInfo !== 'function') {
                    playerState.capabilities = caps;
                    return;
                }
                var tests = [
                    { label: 'hevc-4k', codec: 'hevc', config: { type: 'media-source', video: { contentType: 'video/mp4; codecs="hev1.1.6.L153.B0"', width: 3840, height: 2160, bitrate: 20000000, framerate: 30 } } },
                    { label: 'vp9-4k', codec: 'vp9', config: { type: 'media-source', video: { contentType: 'video/webm; codecs="vp09.00.50.08"', width: 3840, height: 2160, bitrate: 20000000, framerate: 30 } } },
                    { label: 'av1-4k', codec: 'av1', config: { type: 'media-source', video: { contentType: 'video/mp4; codecs="av01.0.12M.08"', width: 3840, height: 2160, bitrate: 20000000, framerate: 30 } } },
                    { label: 'h264-4k', codec: 'h264', config: { type: 'media-source', video: { contentType: 'video/mp4; codecs="avc1.640033"', width: 3840, height: 2160, bitrate: 20000000, framerate: 30 } } },
                    { label: 'h264-1080', codec: 'h264', config: { type: 'media-source', video: { contentType: 'video/mp4; codecs="avc1.640028"', width: 1920, height: 1080, bitrate: 10000000, framerate: 30 } } }
                ];
                var promises = tests.map(function (test) {
                    return navigator.mediaCapabilities.decodingInfo(test.config).then(function (info) {
                        caps.codecs[test.label] = { supported: info.supported, smooth: info.smooth, powerEfficient: info.powerEfficient };
                    }).catch(function () {
                        caps.codecs[test.label] = { supported: false, smooth: false, powerEfficient: false };
                    });
                });
                Promise.all(promises).then(function () {
                    var pick = function (label) { var c = caps.codecs[label]; return c && c.smooth && c.powerEfficient; };
                    if (pick('hevc-4k')) { caps.preferredCodec = 'hevc'; caps.maxResolution = { width: 3840, height: 2160 }; }
                    else if (pick('vp9-4k')) { caps.preferredCodec = 'vp9'; caps.maxResolution = { width: 3840, height: 2160 }; }
                    else if (pick('av1-4k')) { caps.preferredCodec = 'av1'; caps.maxResolution = { width: 3840, height: 2160 }; }
                    else if (caps.codecs['h264-4k'] && caps.codecs['h264-4k'].smooth) { caps.preferredCodec = 'h264'; caps.maxResolution = { width: 3840, height: 2160 }; }
                    else { caps.preferredCodec = 'h264'; caps.maxResolution = { width: 1920, height: 1080 }; }
                    playerState.capabilities = caps;
                    window.parent.postMessage({ type: 'MEDIA_CAPABILITIES', capabilities: caps }, '*');
                }).catch(function () {
                    playerState.capabilities = caps;
                });
            }

            function requestEnterXr(forceMode) {
                if (!navigator.xr) {
                    setStatus('WebXR unavailable in this window', true);
                    return;
                }
                if (!sceneEl.enterVR) {
                    setStatus('VR scene is still loading', true);
                    return;
                }
                var useAR = forceMode === 'ar' || (forceMode !== 'vr' && playerState.preferAR && playerState.arSupported);
                var label = useAR ? 'AR (Passthrough)' : 'VR';
                setStatus('Requesting ' + label + '...', true);
                try {
                    var result = useAR && typeof sceneEl.enterAR === 'function'
                        ? sceneEl.enterAR()
                        : sceneEl.enterVR();
                    if (result && typeof result.catch === 'function') {
                        result.catch(function (error) {
                            var reason = error && error.cause && error.cause.message
                                ? error.cause.message
                                : (error && error.message ? error.message : 'Tap to retry');
                            if (useAR) {
                                setStatus('AR failed, trying VR...', true);
                                requestEnterXr('vr');
                            } else {
                                setStatus('Immersive failed: ' + reason, true);
                            }
                        });
                    }
                } catch (error) {
                    var reason = error && error.cause && error.cause.message
                        ? error.cause.message
                        : (error && error.message ? error.message : 'Tap to retry');
                    if (useAR) {
                        setStatus('AR failed, trying VR...', true);
                        requestEnterXr('vr');
                    } else {
                        setStatus('Immersive failed: ' + reason, true);
                    }
                }
            }

            function toggleSessionMode() {
                playerState.preferAR = !playerState.preferAR;
                var label = playerState.preferAR && playerState.arSupported ? 'AR (Passthrough)' : 'VR';
                setStatus('Mode: ' + label, false);
                if (playerState.isImmersive) {
                    var exitResult = sceneEl.exitVR && sceneEl.exitVR();
                    if (exitResult && typeof exitResult.then === 'function') {
                        exitResult.then(function () {
                            setTimeout(function () { requestEnterXr(); }, 300);
                        }).catch(function () {
                            setTimeout(function () { requestEnterXr(); }, 300);
                        });
                    } else {
                        setTimeout(function () { requestEnterXr(); }, 300);
                    }
                }
                updateButtonLabels();
            }

            function loadVideo(payload) {
                destroyVideoResources();

                swapEyes = false;
                playerState.requestedCurrentTime = Number(payload.currentTime) || 0;
                playerState.currentSrc = payload.src || '';
                playerState.hostSessionId = payload.sessionId || '';

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
                video.defaultMuted = Boolean(payload.muted);
                video.muted = Boolean(payload.muted);
                volumeSlider.value = String(video.volume || 0);

                var hostSession = getHostSession();
                if (hostSession && hostSession.stream) {
                    video.defaultMuted = true;
                    video.muted = true;
                    video.srcObject = hostSession.stream;
                } else {
                    video.src = payload.src;
                }

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
                setStatus(hostSession && hostSession.stream ? 'Mirroring Jellyfin playback - audio starts muted' : 'Loading stream...', true);

                playerState.syncTimer = setInterval(function () {
                    updateTimeUi();
                    updateButtonLabels();
                }, 250);

                if (payload.paused) {
                    video.pause();
                    setStatus(isQuestBrowser ? 'Paused - tap Enter VR when ready' : 'Paused', isQuestBrowser);
                    return;
                }

                var playAttempt = video.play();
                if (playAttempt && typeof playAttempt.catch === 'function') {
                    playAttempt.catch(function () {
                        setStatus('Tap Play to start video', true);
                    });
                }
            }

            function getHostWindow() {
                if (window.opener && !window.opener.closed) {
                    return window.opener;
                }
                if (window.parent && window.parent !== window) {
                    return window.parent;
                }
                return null;
            }

            function postToHost(message) {
                var hostWindow = getHostWindow();
                if (!hostWindow) return;
                hostWindow.postMessage(message, '*');
            }

            function closePlayer() {
                sendPlayerState();
                postToHost({ type: 'CLOSE_PLAYER' });
                setTimeout(function () {
                    try {
                        window.close();
                    } catch (error) {
                        // ignored
                    }
                }, 40);
            }

            function sendPlayerState() {
                var video = getMasterVideo();
                var audioVideo = getVolumeTargetVideo();
                postToHost({
                    type: 'PLAYER_STATE',
                    currentTime: video ? video.currentTime : 0,
                    paused: video ? video.paused : true,
                    volume: audioVideo ? audioVideo.volume : 1,
                    muted: audioVideo ? audioVideo.muted : false,
                    playbackRate: video ? video.playbackRate : 1,
                    modeId: playerState.currentMode ? playerState.currentMode.id : '360-mono'
                }, '*');
            }

            function togglePlay() {
                var video = getMasterVideo();
                if (!video) return;
                if (video.paused) {
                    var playAttempt = video.play();
                    if (playAttempt && typeof playAttempt.catch === 'function') {
                        playAttempt.catch(function () {
                            setStatus('Playback blocked by browser', true);
                        });
                    }
                    if (playerState.video && playerState.video !== video && playerState.video.paused) {
                        playerState.video.play().catch(function () {});
                    }
                } else {
                    video.pause();
                    if (playerState.video && playerState.video !== video && !playerState.video.paused) {
                        playerState.video.pause();
                    }
                }
                updateButtonLabels();
            }

            function toggleMute() {
                var video = getVolumeTargetVideo();
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
                requestEnterXr();
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
                var video = getMasterVideo();
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

                var videoSurfaceEntity = document.getElementById('videoSurfaceEntity');
                if (videoSurfaceEntity) {
                    videoSurfaceEntity.object3D.add(surfaceRoot);
                } else {
                    sceneEl.object3D.add(surfaceRoot);
                }

                playerState.surfaceRoot = surfaceRoot;
                playerState.meshes = {
                    preview: previewMesh,
                    left: leftMesh,
                    right: rightMesh,
                    currentProjection: playerState.currentMode.projection
                };

                applyProjectionPlacement(playerState.currentMode);

                var grabMgr = sceneEl.components['jfvr-grab-manager'];
                if (grabMgr) {
                    if (videoSurfaceEntity) {
                        grabMgr.addTarget(videoSurfaceEntity.object3D);
                    } else {
                        grabMgr.addTarget(surfaceRoot);
                    }
                    var uiRootEl = document.getElementById('uiRoot');
                    if (uiRootEl) grabMgr.addTarget(uiRootEl.object3D);
                }

                registerPanelButton(uiModeBtnBg3d, '#0f172a', '#1b2a40', function () { toggleModeList(); });
                registerPanelButton(uiExit3d, '#3b0b19', '#5c1025', closePlayer);
                registerPanelButton(uiSeekBack3d, '#13283a', '#1b3951', function () {
                    var video = getMasterVideo();
                    seekTo((video ? video.currentTime : 0) - 10);
                });
                registerPanelButton(uiPlay3d, '#11415a', '#15597a', togglePlay);
                registerPanelButton(uiSeekFwd3d, '#13283a', '#1b3951', function () {
                    var video = getMasterVideo();
                    seekTo((video ? video.currentTime : 0) + 10);
                });
                registerPanelButton(uiEnterVr3d, '#0a4a3d', '#0e6b58', toggleVrSession);
                registerPanelButton(uiSwap3d, '#13283a', '#1b3951', function () {
                    if (playerState.currentMode.stereo === 'mono') return;
                    swapEyes = !swapEyes;
                    applyMode(playerState.currentMode.id);
                    setStatus(swapEyes ? 'Stereo eyes swapped' : 'Stereo eyes restored', false);
                });
                registerPanelButton(uiMute3d, '#1e293b', '#334155', function () {
                    var audioVideo = getVolumeTargetVideo();
                    if (!audioVideo) return;
                    audioVideo.muted = !audioVideo.muted;
                    if (!audioVideo.muted && audioVideo.volume === 0) {
                        audioVideo.volume = 0.8;
                    }
                    updateButtonLabels();
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
                var uiRecenterVideo3d = document.getElementById('uiRecenterVideo3d');
                if (uiRecenterVideo3d) {
                    registerPanelButton(uiRecenterVideo3d, '#13283a', '#1b3951', function () {
                        resetVideoRotation();
                        setStatus('Video recentered', false);
                    });
                }
                registerPanelButton(seekTrack3d, '#102131', '#163248', seekFrom3dEvent);
                registerPanelButton(uiVolTrack3d, '#1e293b', '#2a3a4d', function (event) {
                    var audioVideo = getVolumeTargetVideo();
                    if (!audioVideo) return;
                    if (!event.detail || !event.detail.intersection || !event.detail.intersection.point) return;
                    var point = event.detail.intersection.point.clone();
                    uiVolTrack3d.object3D.worldToLocal(point);
                    var vol = clamp((point.x + VOL_TRACK_WIDTH / 2) / VOL_TRACK_WIDTH, 0, 1);
                    audioVideo.volume = vol;
                    audioVideo.muted = (vol === 0);
                    volumeSlider.value = String(vol);
                    updateButtonLabels();
                });

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
                var video = getMasterVideo();
                seekTo((video ? video.currentTime : 0) - 10);
            });
            seekFwdBtn.addEventListener('click', function () {
                var video = getMasterVideo();
                seekTo((video ? video.currentTime : 0) + 10);
            });
            muteBtn.addEventListener('click', toggleMute);
            closeBtn.addEventListener('click', closePlayer);
            enterVrBtn.addEventListener('click', toggleVrSession);

            volumeSlider.addEventListener('input', function () {
                var video = getVolumeTargetVideo();
                if (!video) return;
                video.volume = parseFloat(volumeSlider.value);
                if (video.volume > 0) {
                    video.muted = false;
                }
                updateButtonLabels();
            });

            seekInput.addEventListener('pointerdown', function () {
                playerState.isSeeking = true;
            });
            seekInput.addEventListener('pointerup', function () {
                playerState.isSeeking = false;
                var video = getMasterVideo();
                if (!video || !Number.isFinite(video.duration)) return;
                seekTo(video.duration * (parseFloat(seekInput.value) / 1000));
            });
            seekInput.addEventListener('input', function () {
                var video = getMasterVideo();
                if (!video || !Number.isFinite(video.duration)) return;
                var previewTime = video.duration * (parseFloat(seekInput.value) / 1000);
                var label = formatTime(previewTime) + ' / ' + formatTime(video.duration);
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

                var video = getMasterVideo();
                if (!video) return;

                if (event.key === ' ') {
                    event.preventDefault();
                    togglePlay();
                } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    seekTo(video.currentTime - 10);
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    seekTo(video.currentTime + 10);
                } else if (event.key === 'm' || event.key === 'M') {
                    event.preventDefault();
                    toggleMute();
                } else if (event.key === 'v' || event.key === 'V') {
                    event.preventDefault();
                    toggleVrSession();
                } else if (event.key === 'a' || event.key === 'A') {
                    event.preventDefault();
                    toggleSessionMode();
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
                stereoLayersConfigured = false;
                var isAR = typeof sceneEl.is === 'function' ? sceneEl.is('ar-mode') : false;
                playerState.sessionMode = isAR ? 'immersive-ar' : 'immersive-vr';
                if (isAR && sceneEl.renderer) {
                    sceneEl.renderer.setClearColor(0x000000, 0);
                }
                updateButtonLabels();
                updateSurfaceVisibility();
                retryStereoLayers(15);
                setStatus(isAR ? 'Passthrough AR active' : 'Immersive VR active', false);
                setTimeout(function () { tryMediaLayers(); }, 500);
                setTimeout(function () { resetVideoRotation(); }, 1200);
            });
            sceneEl.addEventListener('exit-vr', function () {
                destroyMediaLayer();
                playerState.isImmersive = false;
                playerState.sessionMode = 'none';
                stereoLayersConfigured = false;
                if (sceneEl.renderer) {
                    sceneEl.renderer.setClearColor(0x000000, 1);
                }
                updateButtonLabels();
                updateSurfaceVisibility();
                setStatus(isQuestBrowser ? 'Exited - tap Enter to re-enter' : 'Exited immersive session', isQuestBrowser);
            });

            if (sceneEl.hasLoaded) {
                bootstrapSurfaces();
            }

            reportXrAvailability();
            checkArSupport();
            detectMediaCapabilities();

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

            window.addEventListener('pagehide', function () {
                sendPlayerState();
                postToHost({ type: 'PLAYER_CLOSED' });
            });

            updateComfortUi();
            updateButtonLabels();
            updateModeUi();
            setStatus('Initializing VR player...', true);
            postToHost({ type: 'PLAYER_READY' });
        })();
    </script>
</body>
</html>`;

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
            uiDistance: Math.abs(parseFloat(localStorage.getItem('jfvr:ui-distance'))) || 2.3,
            uiScale: parseFloat(localStorage.getItem('jfvr:ui-scale')) || 1.0,
            isAR: false,
            passthroughEnabled: false,
            passthroughBrightness: 1.0,
            screenCurvature: 0.0,
            screenSize: 1.0,
            screenDistance: -12.0,
            showingSettings: false
        };
        let interactables = [];
        let timeCurrentObj, timeDurationObj, titleTextObj;
        let playIconGroup, pauseIconGroup;
        let seekBg, seekBuf, seekFill;
        let bgMesh, settingsGroup;
        let volSliderGroup, ptSliderGroup;
        let volSliderUpdateFill, ptSliderUpdateFill;
        let volSliderVisible = false, ptSliderVisible = false;
        let marqueeOffset = 0, marqueeDir = 0, marqueePauseTimer = 0;

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
                if (typeof updatePassthroughVisuals === 'function') updatePassthroughVisuals();
                if (ptSliderUpdateFill) ptSliderUpdateFill(state.passthroughBrightness);
                if (uiGroup) uiGroup.position.set(0, -0.4, -state.uiDistance);
                camera.layers.enable(0);
                camera.layers.enable(1);
                camera.layers.enable(2);
                updateStereoVisibility();
            });
            renderer.xr.addEventListener('sessionend', () => {
                state.isImmersive = false;
                scene.background = new THREE.Color(0x000000);
                if (uiGroup) uiGroup.position.set(0, -0.4, -state.uiDistance);
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

                const targetPos = origin.clone().add(dir.multiplyScalar(state.uiDistance));
                uiGroup.position.copy(targetPos);

                const xrCam = renderer.xr.getCamera();
                if (xrCam) {
                    const camPos = new THREE.Vector3();
                    xrCam.getWorldPosition(camPos);
                    // Lock Y rotation only
                    uiGroup.lookAt(camPos.x, uiGroup.position.y, camPos.z);
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
                    } else if (state.uiVisible) {
                        const xrCam = renderer.xr.getCamera();
                        if (xrCam) {
                            const camPos = new THREE.Vector3();
                            xrCam.getWorldPosition(camPos);
                            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCam.quaternion);
                            dir.y = 0; dir.normalize(); // Horizon level
                            uiGroup.position.copy(camPos).add(dir.multiplyScalar(state.uiDistance));
                            uiGroup.position.y = camPos.y - 0.5;
                            uiGroup.lookAt(camPos.x, uiGroup.position.y, camPos.z);
                        }
                    }
                }
                if (state.uiVisible) {
                    state.lastInteraction = Date.now();
                    settingsGroup.visible = false;
                }
                updateStereoVisibility();
            }

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

            function updatePassthroughVisuals() {
                if (state.passthroughEnabled) {
                    scene.background = null;
                    if (typeof dimSphereMat !== 'undefined') dimSphereMat.opacity = 1.0 - state.passthroughBrightness;
                } else {
                    scene.background = new THREE.Color(0x000000);
                    if (typeof dimSphereMat !== 'undefined') dimSphereMat.opacity = 1.0;
                }
            }

            function applyModeFromState() {
                let mode = state.mode;
                let geometry;
                surfaceRoot.scale.setScalar(state.screenSize);

                if (mode.projection === 'screen') {
                    if (state.screenCurvature > 0.05) {
                        // Cylinder curve
                        const radius = 18 / state.screenCurvature;
                        const theta = 18 / radius;
                        geometry = new THREE.CylinderGeometry(radius, radius, 10.125, 64, 1, true, -theta / 2 + Math.PI / 2, theta);
                        geometry.scale(-1, 1, 1);
                        surfaceRoot.position.set(0, 1.6, state.screenDistance + radius);
                    } else {
                        geometry = new THREE.PlaneGeometry(18, 10.125);
                        surfaceRoot.position.set(0, 1.6, state.screenDistance);
                    }
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

                if (titleTextObj) {
                    const t = getVideoTitle();
                    if (t) titleTextObj.text = t;
                }
                updateStereoVisibility();
            }

            function switchMode(newModeId) {
                if (MODES_BY_ID[newModeId]) {
                    state.mode = MODES_BY_ID[newModeId];
                    jellyfinVideo.dataset.currentMode = newModeId;
                    applyModeFromState();
                }
            }

            // Rounded Geometries Utility
            function createRoundedRectGeometry(width, height, radius, segments) {
                const shape = new THREE.Shape();
                const w = width / 2;
                const h = height / 2;
                shape.moveTo(-w, -h + radius);
                shape.lineTo(-w, h - radius);
                shape.quadraticCurveTo(-w, h, -w + radius, h);
                shape.lineTo(w - radius, h);
                shape.quadraticCurveTo(w, h, w, h - radius);
                shape.lineTo(w, -h + radius);
                shape.quadraticCurveTo(w, -h, w - radius, -h);
                shape.lineTo(-w + radius, -h);
                shape.quadraticCurveTo(-w, -h, -w, -h + radius);
                return new THREE.ShapeGeometry(shape, segments || 16);
            }

            // UI Builder
            uiGroup = new THREE.Group();
            uiGroup.position.set(0, -0.4, -state.uiDistance);
            scene.add(uiGroup);

            // Materials
            const frostedMat = new THREE.MeshBasicMaterial({
                color: 0x0f172a,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide
            });

            const btnMatBase = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.9 });
            const iconMatColor = 0xe2e8f0;

            function createTextObj(str, parent, x, y, size, color, align) {
                const t = new Text();
                t.text = str;
                t.fontSize = size;
                t.color = color;
                t.position.set(x, y, 0.01);
                t.anchorX = align || 'center';
                t.anchorY = 'middle';
                parent.add(t);
                return t;
            }

            function createRoundBtn(id, parent, x, y, radius, label, onClick) {
                const geo = new THREE.CircleGeometry(radius, 48);
                const mat = btnMatBase.clone();
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x, y, 0.005);
                mesh.userData = { id, isBtn: true, bg: 0x1e293b, hover: 0x334155, onClick };
                parent.add(mesh);
                interactables.push(mesh);
                let textObj = null;
                if (label) {
                    textObj = createTextObj(label, mesh, 0, 0, radius * 0.9, iconMatColor);
                }
                return { mesh, textObj };
            }

            function createSlider(id, parent, x, y, w, h, initVal, onChange) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                parent.add(group);

                const bgGeo = createRoundedRectGeometry(w, h, h / 2);
                const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
                const bg = new THREE.Mesh(bgGeo, bgMat);

                const fillGeo = createRoundedRectGeometry(w, h, h / 2);
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

                const dragHandler = (pt) => {
                    const local = bg.worldToLocal(pt.clone());
                    const raw = (local.x + (w / 2)) / w;
                    const ratio = Math.max(0, Math.min(1, raw));
                    updateFill(ratio);
                    if (onChange) onChange(ratio);
                };

                bg.userData = { id, hover: 0x1e293b, bg: 0x0f172a, onClick: dragHandler, onDrag: dragHandler };
                interactables.push(bg);

                return { group, updateFill };
            }

            // --- Helper: get video title from Jellyfin DOM ---
            function getVideoTitle() {
                const titleEl = document.querySelector('.osdTitle, .videoOsdTitle, h3.osdTitle');
                if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();
                const headerEl = document.querySelector('.itemName, .nowPlayingTitle, [data-type="title"]');
                if (headerEl && headerEl.textContent.trim()) return headerEl.textContent.trim();
                if (document.title && document.title !== 'Jellyfin') return document.title.replace(' | Jellyfin', '').trim();
                return '';
            }

            // --- Helper: create mesh-based icons (no squares) ---
            function createPlayIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const shape = new THREE.Shape();
                shape.moveTo(-0.025 * s, 0.035 * s);
                shape.lineTo(-0.025 * s, -0.035 * s);
                shape.lineTo(0.03 * s, 0);
                shape.closePath();
                const geo = new THREE.ShapeGeometry(shape);
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                group.add(new THREE.Mesh(geo, mat));
                parent.add(group);
                return group;
            }

            function createPauseIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const barW = 0.012 * s, barH = 0.06 * s, gap = 0.016 * s;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const lGeo = new THREE.PlaneGeometry(barW, barH);
                const rGeo = new THREE.PlaneGeometry(barW, barH);
                const lBar = new THREE.Mesh(lGeo, mat);
                lBar.position.x = -gap;
                const rBar = new THREE.Mesh(rGeo, mat);
                rBar.position.x = gap;
                group.add(lBar);
                group.add(rBar);
                parent.add(group);
                return group;
            }

            function createSeekBackIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const t1 = new THREE.Shape();
                t1.moveTo(0.015 * s, 0.025 * s);
                t1.lineTo(0.015 * s, -0.025 * s);
                t1.lineTo(-0.015 * s, 0);
                t1.closePath();
                const m1 = new THREE.Mesh(new THREE.ShapeGeometry(t1), mat);
                m1.position.x = -0.01 * s;
                group.add(m1);
                const t2 = new THREE.Shape();
                t2.moveTo(0.015 * s, 0.025 * s);
                t2.lineTo(0.015 * s, -0.025 * s);
                t2.lineTo(-0.015 * s, 0);
                t2.closePath();
                const m2 = new THREE.Mesh(new THREE.ShapeGeometry(t2), mat);
                m2.position.x = 0.015 * s;
                group.add(m2);
                parent.add(group);
                return group;
            }

            function createSeekFwdIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const t1 = new THREE.Shape();
                t1.moveTo(-0.015 * s, 0.025 * s);
                t1.lineTo(-0.015 * s, -0.025 * s);
                t1.lineTo(0.015 * s, 0);
                t1.closePath();
                const m1 = new THREE.Mesh(new THREE.ShapeGeometry(t1), mat);
                m1.position.x = -0.015 * s;
                group.add(m1);
                const t2 = new THREE.Shape();
                t2.moveTo(-0.015 * s, 0.025 * s);
                t2.lineTo(-0.015 * s, -0.025 * s);
                t2.lineTo(0.015 * s, 0);
                t2.closePath();
                const m2 = new THREE.Mesh(new THREE.ShapeGeometry(t2), mat);
                m2.position.x = 0.01 * s;
                group.add(m2);
                parent.add(group);
                return group;
            }

            function createSpeakerIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const body = new THREE.PlaneGeometry(0.014 * s, 0.022 * s);
                const bm = new THREE.Mesh(body, mat);
                bm.position.x = -0.016 * s;
                group.add(bm);
                const cone = new THREE.Shape();
                cone.moveTo(-0.008 * s, 0.015 * s);
                cone.lineTo(-0.008 * s, -0.015 * s);
                cone.lineTo(0.012 * s, -0.028 * s);
                cone.lineTo(0.012 * s, 0.028 * s);
                cone.closePath();
                group.add(new THREE.Mesh(new THREE.ShapeGeometry(cone), mat));
                parent.add(group);
                return group;
            }

            function createSunIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const circle = new THREE.CircleGeometry(0.012 * s, 24);
                group.add(new THREE.Mesh(circle, mat));
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const ray = new THREE.PlaneGeometry(0.004 * s, 0.012 * s);
                    const rm = new THREE.Mesh(ray, mat);
                    rm.position.set(Math.cos(angle) * 0.022 * s, Math.sin(angle) * 0.022 * s, 0);
                    rm.rotation.z = angle;
                    group.add(rm);
                }
                parent.add(group);
                return group;
            }

            function createGearIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const inner = new THREE.CircleGeometry(0.015 * s, 24);
                group.add(new THREE.Mesh(inner, mat));
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const tooth = new THREE.PlaneGeometry(0.01 * s, 0.008 * s);
                    const tm = new THREE.Mesh(tooth, mat);
                    tm.position.set(Math.cos(angle) * 0.022 * s, Math.sin(angle) * 0.022 * s, 0);
                    tm.rotation.z = angle;
                    group.add(tm);
                }
                const hole = new THREE.CircleGeometry(0.007 * s, 24);
                const holeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
                const hm = new THREE.Mesh(hole, holeMat);
                hm.position.z = 0.001;
                group.add(hm);
                parent.add(group);
                return group;
            }

            function createCloseIcon(parent, x, y, scale, color) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.01);
                const s = scale;
                const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
                const bar1 = new THREE.PlaneGeometry(0.05 * s, 0.008 * s);
                const m1 = new THREE.Mesh(bar1, mat);
                m1.rotation.z = Math.PI / 4;
                group.add(m1);
                const bar2 = new THREE.PlaneGeometry(0.05 * s, 0.008 * s);
                const m2 = new THREE.Mesh(bar2, mat);
                m2.rotation.z = -Math.PI / 4;
                group.add(m2);
                parent.add(group);
                return group;
            }

            // --- Helper: vertical slider with top/bottom icons ---
            function createVerticalSlider(id, parent, x, y, w, h, initVal, onChange, bottomIcon, topIcon) {
                const group = new THREE.Group();
                group.position.set(x, y, 0.02);
                group.visible = false;
                parent.add(group);

                const panelH = h + 0.12;
                const panelGeo = createRoundedRectGeometry(w + 0.06, panelH, 0.04);
                const panelBg = new THREE.Mesh(panelGeo, frostedMat.clone());
                panelBg.position.set(0, 0, -0.005);
                group.add(panelBg);

                const bgGeo = createRoundedRectGeometry(w, h, w / 2);
                const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
                const bg = new THREE.Mesh(bgGeo, bgMat);
                group.add(bg);

                const fillGeo = createRoundedRectGeometry(w, h, w / 2);
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

                if (bottomIcon) bottomIcon(group, 0, -h / 2 - 0.045, 0.7, 0x64748b);
                if (topIcon) topIcon(group, 0, h / 2 + 0.045, 0.7, 0xe2e8f0);

                const dragHandler = (pt) => {
                    const local = bg.worldToLocal(pt.clone());
                    const raw = (local.y + (h / 2)) / h;
                    const ratio = Math.max(0, Math.min(1, raw));
                    updateFill(ratio);
                    if (onChange) onChange(ratio);
                };

                bg.userData = { id, hover: 0x1e293b, bg: 0x0f172a, onClick: dragHandler, onDrag: dragHandler };
                interactables.push(bg);

                return { group, updateFill };
            }

            // --- Main Dock (3 rows: title / controls / seekbar+time) ---
            const dockW = 2.2;
            const dockH = 0.48;
            const dockGeo = createRoundedRectGeometry(dockW, dockH, 0.08);
            bgMesh = new THREE.Mesh(dockGeo, frostedMat);
            bgMesh.position.set(0, 0, 0);
            uiGroup.add(bgMesh);

            // === Row 1 (top): Video Title with marquee ===
            const titleY = 0.16;
            const titleMaxW = 1.9;
            const titleClipGroup = new THREE.Group();
            titleClipGroup.position.set(0, titleY, 0.01);
            uiGroup.add(titleClipGroup);

            const videoTitle = getVideoTitle();
            titleTextObj = new Text();
            titleTextObj.text = videoTitle || 'Loading...';
            titleTextObj.fontSize = 0.038;
            titleTextObj.color = 0xf0f6ff;
            titleTextObj.anchorX = 'center';
            titleTextObj.anchorY = 'middle';
            titleTextObj.maxWidth = 8;
            titleTextObj.position.set(0, 0, 0.01);
            titleClipGroup.add(titleTextObj);

            // === Row 2 (middle): Control buttons ===
            const btnY = 0.02;
            const btnR = 0.055;
            const playR = 0.065;
            const ctrlSpacing = 0.16;
            const sideSpacing = 0.22;

            // Close button (left end)
            const closeBtn3d = createRoundBtn('btn-close', uiGroup, -0.92, btnY, btnR, null, () => close());
            createCloseIcon(closeBtn3d.mesh, 0, 0, 1.0, 0xfca5a5);

            // Seek Back
            const seekBackBtn3d = createRoundBtn('btn-back', uiGroup, -ctrlSpacing, btnY, btnR, null, () => jellyfinVideo.currentTime -= 10);
            createSeekBackIcon(seekBackBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

            // Play / Pause (center)
            const playBtn3d = createRoundBtn('btn-play', uiGroup, 0, btnY, playR, null, () => jellyfinVideo.paused ? jellyfinVideo.play() : jellyfinVideo.pause());
            playIconGroup = createPlayIcon(playBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);
            pauseIconGroup = createPauseIcon(playBtn3d.mesh, 0, 0, 1.0, 0x7dd3fc);
            pauseIconGroup.visible = false;

            // Seek Forward
            const seekFwdBtn3d = createRoundBtn('btn-fwd', uiGroup, ctrlSpacing, btnY, btnR, null, () => jellyfinVideo.currentTime += 10);
            createSeekFwdIcon(seekFwdBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

            // Volume button (right of playback controls)
            const volBtnX = ctrlSpacing + sideSpacing;
            const volBtn3d = createRoundBtn('btn-vol', uiGroup, volBtnX, btnY, btnR, null, () => {
                volSliderVisible = !volSliderVisible;
                volSliderGroup.visible = volSliderVisible;
                if (volSliderVisible) { ptSliderVisible = false; ptSliderGroup.visible = false; }
            });
            createSpeakerIcon(volBtn3d.mesh, 0, 0, 1.0, 0xe2e8f0);

            // Passthrough lighting button
            const ptBtnX = volBtnX + 0.14;
            const ptBtn3d = createRoundBtn('btn-pt', uiGroup, ptBtnX, btnY, btnR, null, () => {
                ptSliderVisible = !ptSliderVisible;
                ptSliderGroup.visible = ptSliderVisible;
                if (ptSliderVisible) { volSliderVisible = false; volSliderGroup.visible = false; }
                if (!state.passthroughEnabled) {
                    state.passthroughEnabled = true;
                    updatePassthroughVisuals();
                }
            });
            createSunIcon(ptBtn3d.mesh, 0, 0, 1.0, 0xfbbf24);

            // Settings button (right end)
            const settingsBtn3d = createRoundBtn('btn-settings', uiGroup, 0.92, btnY, btnR, null, () => {
                state.showingSettings = !state.showingSettings;
                settingsGroup.visible = state.showingSettings;
            });
            createGearIcon(settingsBtn3d.mesh, 0, 0, 1.0, 0x94a3b8);

            // === Vertical Sliders (above buttons) ===
            const vSliderW = 0.05;
            const vSliderH = 0.35;

            // Volume vertical slider
            const volSld = createVerticalSlider('vs-vol', uiGroup, volBtnX, btnY + 0.32, vSliderW, vSliderH,
                jellyfinVideo.volume || 1,
                (v) => {
                    jellyfinVideo.volume = v;
                    jellyfinVideo.muted = (v === 0);
                },
                (p, x, y, s, c) => {
                    const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
                    const body = new THREE.PlaneGeometry(0.01 * s, 0.015 * s);
                    const bm = new THREE.Mesh(body, mat);
                    bm.position.set(x, y, 0.01);
                    p.add(bm);
                },
                (p, x, y, s, c) => {
                    createSpeakerIcon(p, x, y, s, c);
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
            volSliderGroup = volSld.group;
            volSliderUpdateFill = volSld.updateFill;

            // Passthrough lighting vertical slider
            const ptSld = createVerticalSlider('vs-pt', uiGroup, ptBtnX, btnY + 0.32, vSliderW, vSliderH,
                state.passthroughBrightness,
                (v) => { state.passthroughBrightness = v; updatePassthroughVisuals(); },
                (p, x, y, s, c) => {
                    const mat = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
                    const crescent = new THREE.CircleGeometry(0.012 * s, 24);
                    const cm = new THREE.Mesh(crescent, mat);
                    cm.position.set(x, y, 0.01);
                    p.add(cm);
                },
                (p, x, y, s, c) => { createSunIcon(p, x, y, s, c); }
            );
            ptSliderGroup = ptSld.group;
            ptSliderUpdateFill = ptSld.updateFill;

            // === Row 3 (bottom): Seekbar + split time ===
            const seekY = -0.14;
            const seekW = 1.9;
            const seekH = 0.04;
            const seekGroup = new THREE.Group();
            seekGroup.position.set(0, seekY, 0.01);
            uiGroup.add(seekGroup);

            const sBgGeo = createRoundedRectGeometry(seekW, seekH, seekH / 2);
            seekBg = new THREE.Mesh(sBgGeo, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
            seekGroup.add(seekBg);

            const sBufGeo = createRoundedRectGeometry(seekW, seekH, seekH / 2);
            seekBuf = new THREE.Mesh(sBufGeo, new THREE.MeshBasicMaterial({ color: 0x475569 }));
            seekBuf.position.z = 0.001;
            seekGroup.add(seekBuf);

            const sFillGeo = createRoundedRectGeometry(seekW, seekH, seekH / 2);
            seekFill = new THREE.Mesh(sFillGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
            seekFill.position.z = 0.002;
            seekGroup.add(seekFill);

            const handleSeekDrag = (pt) => {
                const local = seekBg.worldToLocal(pt.clone());
                const raw = (local.x + seekW / 2) / seekW;
                const ratio = Math.max(0, Math.min(1, raw));
                if (Number.isFinite(jellyfinVideo.duration)) jellyfinVideo.currentTime = ratio * jellyfinVideo.duration;
            };
            seekBg.userData = { hover: 0x1e293b, bg: 0x0f172a, onClick: handleSeekDrag, onDrag: handleSeekDrag };
            interactables.push(seekBg);

            timeCurrentObj = createTextObj('0:00', uiGroup, -seekW / 2, seekY - 0.04, 0.03, 0x94a3b8, 'left');
            timeDurationObj = createTextObj('0:00', uiGroup, seekW / 2, seekY - 0.04, 0.03, 0x94a3b8, 'right');

            // --- Settings Menu ---
            settingsGroup = new THREE.Group();
            settingsGroup.position.set(0, 0.55, 0);
            settingsGroup.visible = false;
            uiGroup.add(settingsGroup);

            const setGeo = createRoundedRectGeometry(1.6, 0.5, 0.08);
            const setBg = new THREE.Mesh(setGeo, frostedMat);
            settingsGroup.add(setBg);

            const pY = 0.16;
            createTextObj('Layout', settingsGroup, -0.65, pY, 0.035, 0xe2e8f0, 'left');

            createRoundBtn('m-2d', settingsGroup, -0.3, pY, 0.045, '2D', () => switchMode('3d-sbs-half')).textObj.fontSize = 0.025;
            createRoundBtn('m-3d', settingsGroup, -0.15, pY, 0.045, '3D', () => {
                const b = state.mode.stereo === 'mono' ? 'sbs' : 'mono';
                const id = state.mode.projection === 'screen' ? (b === 'mono' ? '3d-sbs-half' : '3d-sbs-full') : state.mode.projection + '-' + b + '-full';
                switchMode(id);
            }).textObj.fontSize = 0.025;

            createRoundBtn('m-180', settingsGroup, 0.1, pY, 0.045, '180', () => switchMode('180-sbs-full')).textObj.fontSize = 0.025;
            createRoundBtn('m-360', settingsGroup, 0.25, pY, 0.045, '360', () => switchMode('360-sbs-full')).textObj.fontSize = 0.025;

            const sY1 = 0.02; const sY2 = -0.06; const sY3 = -0.14;
            createTextObj('Curve', settingsGroup, -0.65, sY1, 0.03, 0x94a3b8, 'left');
            const sCrv = createSlider('s-curve', settingsGroup, -0.2, sY1, 0.5, 0.03, state.screenCurvature, (v) => { state.screenCurvature = v; applyModeFromState(); });

            createTextObj('Dist.', settingsGroup, -0.65, sY2, 0.03, 0x94a3b8, 'left');
            const initDistRatio = (state.screenDistance - (-20)) / (-4 - (-20));
            const sDist = createSlider('s-dist', settingsGroup, -0.2, sY2, 0.5, 0.03, initDistRatio, (v) => { state.screenDistance = -20 + (v * 16); applyModeFromState(); });

            createTextObj('Size', settingsGroup, -0.65, sY3, 0.03, 0x94a3b8, 'left');
            const initSizeRatio = (state.screenSize - 0.5) / (3.0 - 0.5);
            const sSize = createSlider('s-size', settingsGroup, -0.2, sY3, 0.5, 0.03, initSizeRatio, (v) => { state.screenSize = 0.5 + (v * 2.5); applyModeFromState(); });

            createTextObj('UI Dist', settingsGroup, 0.15, sY1, 0.03, 0x94a3b8, 'left');
            const initUIDist = (state.uiDistance - 1) / (4 - 1);
            const sUIDist = createSlider('s-uidist', settingsGroup, 0.55, sY1, 0.4, 0.03, initUIDist, (v) => {
                state.uiDistance = 1 + (v * 3);
                localStorage.setItem('jfvr:ui-distance', state.uiDistance.toString());
            });

            createTextObj('Dimmer', settingsGroup, 0.15, sY2, 0.03, 0x94a3b8, 'left');
            const sDim = createSlider('s-dimmer', settingsGroup, 0.55, sY2, 0.4, 0.03, state.passthroughBrightness, (v) => { state.passthroughBrightness = v; updatePassthroughVisuals(); });


            // Raycaster & Interaction
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

                const geometryLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]);
                const line = new THREE.Line(geometryLine, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
                controller.add(line);
            }

            function updateHover(controllers) {
                let hit = false;
                if (!state.uiVisible) {
                    for (let i = 0; i < controllers.length; i++) {
                        const cont = controllers[i];
                        if (cont && cont.children[0]) cont.children[0].scale.z = 1;
                    }
                    if (hoveredObj) {
                        if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.bg);
                        hoveredObj = null;
                    }
                    return;
                }

                for (let i = 0; i < controllers.length; i++) {
                    const controller = controllers[i];
                    if (!controller.visible) continue;
                    tempMatrix.identity().extractRotation(controller.matrixWorld);
                    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                    const intersects = raycaster.intersectObjects(interactables, false);
                    if (intersects.length > 0) {
                        const obj = intersects[0].object;
                        if (hoveredObj && hoveredObj !== obj) {
                            if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.bg);
                        }
                        hoveredObj = obj;
                        if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.hover);
                        hit = true;
                        state.lastInteraction = Date.now();

                        const dist = intersects[0].distance;
                        const line = controller.children[0];
                        if (line) line.scale.z = dist / 5;
                    } else {
                        const line = controller.children[0];
                        if (line) line.scale.z = 1;
                    }
                }
                if (!hit && hoveredObj) {
                    if (hoveredObj.material.color) hoveredObj.material.color.setHex(hoveredObj.userData.bg);
                    hoveredObj = null;
                }
            }

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

            // Init the scene look
            applyModeFromState();

            renderer.setAnimationLoop(() => {
                const dur = jellyfinVideo.duration || 0;
                const cur = jellyfinVideo.currentTime || 0;
                if (timeCurrentObj) timeCurrentObj.text = formatTime(cur);
                if (timeDurationObj) timeDurationObj.text = formatTime(dur);

                const ratio = dur > 0 ? (cur / dur) : 0;
                const sW = 1.9;
                seekFill.scale.x = ratio || 0.001;
                seekFill.position.x = (-sW / 2) + (sW * ratio) / 2;

                if (jellyfinVideo.buffered && jellyfinVideo.buffered.length > 0) {
                    const bufEnd = jellyfinVideo.buffered.end(jellyfinVideo.buffered.length - 1);
                    const bRatio = dur > 0 ? (bufEnd / dur) : 0;
                    seekBuf.scale.x = bRatio || 0.001;
                    seekBuf.position.x = (-sW / 2) + (sW * bRatio) / 2;
                } else {
                    seekBuf.scale.x = 0.001;
                }

                if (playIconGroup && pauseIconGroup) {
                    playIconGroup.visible = jellyfinVideo.paused;
                    pauseIconGroup.visible = !jellyfinVideo.paused;
                }

                // Marquee scroll for long titles
                if (titleTextObj && titleTextObj.textRenderInfo) {
                    const titleW = titleTextObj.textRenderInfo.blockBounds
                        ? (titleTextObj.textRenderInfo.blockBounds[2] - titleTextObj.textRenderInfo.blockBounds[0])
                        : 0;
                    const clipW = 1.9;
                    if (titleW > clipW) {
                        const overflow = titleW - clipW;
                        if (marqueePauseTimer > 0) {
                            marqueePauseTimer -= 0.016;
                        } else {
                            marqueeOffset += (marqueeDir === 0 ? -0.3 : 0.3) * 0.016;
                            if (marqueeOffset < -overflow / 2) {
                                marqueeOffset = -overflow / 2;
                                marqueeDir = 1;
                                marqueePauseTimer = 1.5;
                            } else if (marqueeOffset > 0) {
                                marqueeOffset = 0;
                                marqueeDir = 0;
                                marqueePauseTimer = 2.0;
                            }
                        }
                        titleTextObj.position.x = marqueeOffset;
                    } else {
                        titleTextObj.position.x = 0;
                    }
                }

                updateHover([renderer.xr.getController(0), renderer.xr.getController(1)]);

                for (let i = 0; i < 2; i++) {
                    const controller = renderer.xr.getController(i);
                    if (controller && controller.userData && controller.userData.dragTarget) {
                        const obj = controller.userData.dragTarget;
                        tempMatrix.identity().extractRotation(controller.matrixWorld);
                        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

                        // Intersect against local plane of the UI
                        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(uiGroup.quaternion);
                        let dragPlanePos = obj.getWorldPosition(new THREE.Vector3());
                        if (obj.parent) dragPlanePos = obj.parent.getWorldPosition(new THREE.Vector3());
                        else dragPlanePos = uiGroup.getWorldPosition(new THREE.Vector3());

                        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, dragPlanePos);
                        const intersectPoint = new THREE.Vector3();
                        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
                            if (obj.userData.onDrag) obj.userData.onDrag(intersectPoint);
                        }
                        state.lastInteraction = Date.now();
                    }
                }

                if (state.uiVisible && Date.now() - state.lastInteraction > 5000) {
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
                jellyfinVideo.play().catch(() => { });
            }
        } else {
            jellyfinVideo.play().catch(() => { });
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

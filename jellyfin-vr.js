(function () {

    console.log('[Extended VR] Script loading...');

    const PLAYER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extended VR Video Player</title>
    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <style>
        * { box-sizing: border-box; }
        
        .material-icons {
            font-family: 'Material Icons';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
        }
        
        body { 
            margin: 0; 
            overflow: hidden; 
            font-family: 'Noto Sans', sans-serif; 
            background: #000; 
            color: rgba(255,255,255,0.87); 
        }

        #ui {
            position: absolute;
            bottom: 0; 
            left: 0; 
            right: 0;
            z-index: 100;
            background: linear-gradient(to top, rgba(0,0,0,0.9) 50%, transparent 100%);
            color: #fff;
            padding: 8px 16px 20px;
            transition: opacity 0.4s ease;
            opacity: 1;
            pointer-events: auto;
        }
        
        #ui.hidden { 
            opacity: 0; 
            pointer-events: none; 
        }

        .progress-container {
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            cursor: pointer;
            position: relative;
            margin-bottom: 10px;
            transition: height 0.15s;
        }
        
        .progress-container:hover { 
            height: 6px; 
        }
        
        .progress-fill {
            height: 100%;
            width: 0%;
            background: #00a4dc;
            border-radius: 2px;
            pointer-events: none;
            position: relative;
        }
        
        .progress-fill::after {
            content: '';
            position: absolute;
            right: -6px; 
            top: 50%;
            transform: translateY(-50%);
            width: 12px; 
            height: 12px;
            background: #fff;
            border-radius: 50%;
            opacity: 0;
            transition: opacity 0.15s;
        }
        
        .progress-container:hover .progress-fill::after { 
            opacity: 1; 
        }

        .control-row {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .jf-btn {
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.87);
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, color 0.2s;
            flex-shrink: 0;
        }
        
        .jf-btn:hover { 
            background: rgba(255,255,255,0.15); 
            color: #fff; 
        }
        
        .jf-btn .material-icons { 
            font-size: 24px; 
        }
        
        .jf-btn.small .material-icons { 
            font-size: 20px; 
        }

        .time {
            font-size: 13px;
            font-family: 'Noto Sans', sans-serif;
            color: rgba(255,255,255,0.87);
            white-space: nowrap;
            padding: 0 8px;
            flex-shrink: 0;
        }

        .volume-wrap {
            position: relative;
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }
        
        .volume-popup {
            display: none;
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            background: #1c1c1c;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            padding: 12px 10px;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 120px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
            z-index: 200;
        }
        
        .volume-wrap:hover .volume-popup,
        .volume-popup:hover { 
            display: flex; 
        }

        .volume-slider-vert {
            writing-mode: vertical-lr;
            direction: rtl;
            appearance: none;
            -webkit-appearance: none;
            width: 4px;
            height: 90px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
            accent-color: #00a4dc;
        }
        
        .volume-slider-vert::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px; 
            height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
        }
        
        .volume-slider-vert::-moz-range-thumb {
            width: 14px; 
            height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            border: none;
        }

        .vr-badge {
            font-size: 11px;
            font-family: 'Noto Sans', sans-serif;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #00a4dc;
            border: 1px solid #00a4dc;
            padding: 2px 7px;
            border-radius: 3px;
            flex-shrink: 0;
        }

        .spacer { flex: 1; }

        .settings-panel, .settings-sub {
            display: none;
            position: fixed;
            bottom: 80px;
            right: 16px;
            background: #1c1c1c;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            min-width: 280px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7);
            z-index: 9999;
            overflow: hidden;
        }
        
        .settings-panel.open, .settings-sub.open { 
            display: block; 
        }

        .settings-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            transition: background 0.15s;
        }
        
        .settings-row:last-child { 
            border-bottom: none; 
        }
        
        .settings-row:hover { 
            background: rgba(255,255,255,0.07); 
        }

        .settings-label {
            font-family: 'Noto Sans', sans-serif;
            font-size: 14px;
            color: rgba(255,255,255,0.87);
        }
        
        .settings-value {
            font-family: 'Noto Sans', sans-serif;
            font-size: 14px;
            color: rgba(255,255,255,0.5);
        }

        .settings-sub-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            cursor: pointer;
        }
        
        .settings-sub-header:hover { 
            background: rgba(255,255,255,0.05); 
        }
        
        .settings-sub-header .material-icons { 
            font-size: 18px; 
            color: rgba(255,255,255,0.6); 
        }
        
        .settings-sub-header span.title {
            font-family: 'Noto Sans', sans-serif;
            font-size: 14px;
            color: rgba(255,255,255,0.87);
            font-weight: 600;
        }

        .settings-option {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 20px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            transition: background 0.15s;
        }
        
        .settings-option:last-child { 
            border-bottom: none; 
        }
        
        .settings-option:hover { 
            background: rgba(255,255,255,0.07); 
        }
        
        .settings-option.active .opt-label { 
            color: #00a4dc; 
        }
        
        .settings-option .check-icon {
            font-size: 18px;
            color: #00a4dc;
            visibility: hidden;
        }
        
        .settings-option.active .check-icon { 
            visibility: visible; 
        }
        
        .opt-label {
            font-family: 'Noto Sans', sans-serif;
            font-size: 14px;
            color: rgba(255,255,255,0.87);
        }

        #mode-select-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(0,0,0,0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        #mode-select-overlay.hidden {
            display: none;
        }

        .mode-select-title {
            font-family: 'Noto Sans', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 8px;
            text-align: center;
        }

        .mode-select-subtitle {
            font-family: 'Noto Sans', sans-serif;
            font-size: 14px;
            color: rgba(255,255,255,0.6);
            margin-bottom: 32px;
            text-align: center;
        }

        .mode-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            max-width: 700px;
            width: 100%;
        }

        @media (max-width: 700px) {
            .mode-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 400px) {
            .mode-grid {
                grid-template-columns: 1fr;
            }
        }

        .mode-card {
            background: #1c1c1c;
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
        }

        .mode-card:hover {
            border-color: #00a4dc;
            background: #252525;
            transform: translateY(-2px);
        }

        .mode-card.selected {
            border-color: #00a4dc;
            background: rgba(0,164,220,0.15);
        }

        .mode-card .mode-icon {
            font-size: 48px;
            margin-bottom: 12px;
            display: block;
        }

        .mode-card .mode-name {
            font-family: 'Noto Sans', sans-serif;
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 4px;
        }

        .mode-card .mode-desc {
            font-family: 'Noto Sans', sans-serif;
            font-size: 12px;
            color: rgba(255,255,255,0.5);
        }

        .mode-select-actions {
            margin-top: 32px;
            display: flex;
            gap: 16px;
        }

        .mode-btn {
            font-family: 'Noto Sans', sans-serif;
            font-size: 16px;
            font-weight: 600;
            padding: 12px 32px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }

        .mode-btn.primary {
            background: #00a4dc;
            color: #fff;
        }

        .mode-btn.primary:hover {
            background: #0090c0;
        }

        .mode-btn.secondary {
            background: transparent;
            color: rgba(255,255,255,0.7);
            border: 1px solid rgba(255,255,255,0.2);
        }

        .mode-btn.secondary:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
        }

        #loading-overlay {
            position: fixed;
            inset: 0;
            z-index: 9998;
            background: #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        #loading-overlay.hidden {
            display: none;
        }

        .loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #00a4dc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-text {
            font-family: 'Noto Sans', sans-serif;
            font-size: 14px;
            color: rgba(255,255,255,0.7);
            margin-top: 16px;
        }

        #vr-button {
            position: absolute;
            bottom: 20px;
            right: 20px;
            z-index: 100;
            background: #00a4dc;
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-family: 'Noto Sans', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: none;
            align-items: center;
            gap: 8px;
        }

        #vr-button.visible {
            display: flex;
        }

        #vr-button:hover {
            background: #0090c0;
        }
    </style>
</head>
<body>
    <div id="loading-overlay" class="hidden">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading video...</div>
    </div>

    <div id="mode-select-overlay" class="hidden">
        <div class="mode-select-title">Select VR Mode</div>
        <div class="mode-select-subtitle">Choose how you want to view this video</div>
        
        <div class="mode-grid">
            <div class="mode-card" data-mode="360">
                <span class="material-icons mode-icon">panorama</span>
                <div class="mode-name">360° Sphere</div>
                <div class="mode-desc">Full 360° panoramic view</div>
            </div>
            <div class="mode-card" data-mode="fullsbs">
                <span class="material-icons mode-icon">view_in_ar</span>
                <div class="mode-name">Full SBS</div>
                <div class="mode-desc">360° side-by-side 3D</div>
            </div>
            <div class="mode-card" data-mode="halfsbs">
                <span class="material-icons mode-icon">3d_rotation</span>
                <div class="mode-name">Half SBS</div>
                <div class="mode-desc">360° half-width 3D</div>
            </div>
            <div class="mode-card" data-mode="sbs180">
                <span class="material-icons mode-icon">vr_view</span>
                <div class="mode-name">SBS 180°</div>
                <div class="mode-desc">Side-by-side 180° VR</div>
            </div>
            <div class="mode-card" data-mode="ou180">
                <span class="material-icons mode-icon">fold</span>
                <div class="mode-name">OU 180°</div>
                <div class="mode-desc">Over-under 180° VR</div>
            </div>
            <div class="mode-card" data-mode="ou360">
                <span class="material-icons mode-icon">panorama_horizontal</span>
                <div class="mode-name">OU 360°</div>
                <div class="mode-desc">Over-under 360° VR</div>
            </div>
        </div>
        
        <div class="mode-select-actions">
            <button class="mode-btn secondary" id="cancel-mode">Cancel</button>
            <button class="mode-btn primary" id="start-mode">Start VR</button>
        </div>
    </div>

    <div id="ui">
        <div class="progress-container" id="seekContainer">
            <div class="progress-fill" id="seekBar"></div>
        </div>

        <div class="control-row">
            <button class="jf-btn" id="playPauseBtn" title="Play/Pause">
                <span class="material-icons">play_arrow</span>
            </button>

            <button class="jf-btn small" id="skipBackBtn" title="Rewind 10s">
                <span class="material-icons">replay_10</span>
            </button>

            <button class="jf-btn small" id="skipFwdBtn" title="Forward 10s">
                <span class="material-icons">forward_10</span>
            </button>

            <div class="volume-wrap" id="volumeWrap">
                <button class="jf-btn small" id="muteBtn" title="Mute">
                    <span class="material-icons">volume_up</span>
                </button>
                <div class="volume-popup" id="volumePopup">
                    <input type="range" class="volume-slider-vert" id="volumeSlider" min="0" max="1" step="0.02" value="1">
                </div>
            </div>

            <span class="time" id="timeDisplay">0:00 / 0:00</span>
            <span class="time" id="endsAt"></span>

            <div class="spacer"></div>

            <span class="vr-badge" id="modeBadge">360°</span>

            <button class="jf-btn small" id="settingsBtn" title="Settings">
                <span class="material-icons">settings</span>
            </button>

            <button class="jf-btn" id="fullscreenBtn" title="Fullscreen">
                <span class="material-icons">fullscreen</span>
            </button>
        </div>
    </div>

    <div class="settings-panel" id="settingsPanel">
        <div class="settings-row" id="setSpeed">
            <span class="settings-label">Playback Speed</span>
            <span class="settings-value" id="speedLabel">1x</span>
        </div>
        <div class="settings-row" id="setQuality">
            <span class="settings-label">Quality</span>
            <span class="settings-value" id="qualityLabel">Auto</span>
        </div>
        <div class="settings-row" id="setRepeat">
            <span class="settings-label">Repeat Mode</span>
            <span class="settings-value" id="repeatLabel">None</span>
        </div>
        <div class="settings-row" id="setScale">
            <span class="settings-label">VR Scale</span>
            <span class="settings-value" id="scaleLabel">1.0x</span>
        </div>
    </div>

    <div class="settings-sub" id="speedPanel">
        <div class="settings-sub-header" id="speedBack">
            <span class="material-icons">chevron_left</span>
            <span class="title">Playback Speed</span>
        </div>
        <div class="settings-option" data-speed="0.25"><span class="material-icons check-icon">check</span><span class="opt-label">0.25x</span></div>
        <div class="settings-option" data-speed="0.5"><span class="material-icons check-icon">check</span><span class="opt-label">0.5x</span></div>
        <div class="settings-option" data-speed="0.75"><span class="material-icons check-icon">check</span><span class="opt-label">0.75x</span></div>
        <div class="settings-option active" data-speed="1"><span class="material-icons check-icon">check</span><span class="opt-label">1x</span></div>
        <div class="settings-option" data-speed="1.25"><span class="material-icons check-icon">check</span><span class="opt-label">1.25x</span></div>
        <div class="settings-option" data-speed="1.5"><span class="material-icons check-icon">check</span><span class="opt-label">1.5x</span></div>
        <div class="settings-option" data-speed="2"><span class="material-icons check-icon">check</span><span class="opt-label">2x</span></div>
    </div>

    <div class="settings-sub" id="repeatPanel">
        <div class="settings-sub-header" id="repeatBack">
            <span class="material-icons">chevron_left</span>
            <span class="title">Repeat Mode</span>
        </div>
        <div class="settings-option active" data-repeat="none"><span class="material-icons check-icon">check</span><span class="opt-label">None</span></div>
        <div class="settings-option" data-repeat="one"><span class="material-icons check-icon">check</span><span class="opt-label">Repeat One</span></div>
        <div class="settings-option" data-repeat="all"><span class="material-icons check-icon">check</span><span class="opt-label">Repeat All</span></div>
    </div>

    <div class="settings-sub" id="qualityPanel">
        <div class="settings-sub-header" id="qualityBack">
            <span class="material-icons">chevron_left</span>
            <span class="title">Quality</span>
        </div>
        <div class="settings-option active" data-bitrate="0"><span class="material-icons check-icon">check</span><span class="opt-label">Auto</span></div>
        <div class="settings-option" data-bitrate="120000000"><span class="material-icons check-icon">check</span><span class="opt-label">Max</span></div>
        <div class="settings-option" data-bitrate="15000000"><span class="material-icons check-icon">check</span><span class="opt-label">15 Mbps</span></div>
        <div class="settings-option" data-bitrate="8000000"><span class="material-icons check-icon">check</span><span class="opt-label">8 Mbps</span></div>
        <div class="settings-option" data-bitrate="6000000"><span class="material-icons check-icon">check</span><span class="opt-label">6 Mbps</span></div>
        <div class="settings-option" data-bitrate="4000000"><span class="material-icons check-icon">check</span><span class="opt-label">4 Mbps</span></div>
        <div class="settings-option" data-bitrate="3000000"><span class="material-icons check-icon">check</span><span class="opt-label">3 Mbps</span></div>
        <div class="settings-option" data-bitrate="1500000"><span class="material-icons check-icon">check</span><span class="opt-label">1.5 Mbps</span></div>
    </div>

    <div class="settings-sub" id="scalePanel">
        <div class="settings-sub-header" id="scaleBack">
            <span class="material-icons">chevron_left</span>
            <span class="title">VR Scale</span>
        </div>
        <div class="settings-option" data-scale="0.5"><span class="material-icons check-icon">check</span><span class="opt-label">0.5x</span></div>
        <div class="settings-option" data-scale="0.75"><span class="material-icons check-icon">check</span><span class="opt-label">0.75x</span></div>
        <div class="settings-option active" data-scale="1"><span class="material-icons check-icon">check</span><span class="opt-label">1.0x</span></div>
        <div class="settings-option" data-scale="1.5"><span class="material-icons check-icon">check</span><span class="opt-label">1.5x</span></div>
        <div class="settings-option" data-scale="2"><span class="material-icons check-icon">check</span><span class="opt-label">2.0x</span></div>
    </div>

    <a-scene id="a-scene" vr-mode-ui="enabled: true" background="color: #000000" renderer="antialias: true; colorManagement: true">
        <a-assets id="assets"></a-assets>
        <a-entity id="videosphere"
                  geometry="primitive: sphere; radius: 5000; segmentsWidth: 64; segmentsHeight: 32"
                  material="shader: flat; side: back;"
                  rotation="0 180 0">
        </a-entity>
        <a-entity id="videosphere-left"
                  geometry="primitive: sphere; radius: 5000; segmentsWidth: 64; segmentsHeight: 32"
                  material="shader: flat; side: back; transparent: true; opacity: 0"
                  rotation="0 180 0">
        </a-entity>
        <a-camera id="camera"
                  position="0 1.6 0"
                  look-controls="enabled: true"
                  wasd-controls-enabled="false">
        </a-camera>
        <a-entity id="vr-ui" position="0 1.2 -3" visible="false">
            <a-plane id="vr-progress-bg" 
                     geometry="width: 4; height: 0.1" 
                     material="color: #333; opacity: 0.8; transparent: true"
                     position="0 -0.5 0">
            </a-plane>
            <a-plane id="vr-progress-fill" 
                     geometry="width: 0; height: 0.1" 
                     material="color: #00a4dc; opacity: 0.9; transparent: true"
                     position="-2 -0.5 0.01">
            </a-plane>
            <a-plane class="clickable" 
                     geometry="width: 4; height: 0.5" 
                     material="transparent: true; opacity: 0; color: #fff"
                     position="0 -0.5 0"
                     vr-progress-control>
            </a-plane>
            <a-text id="vr-time-display" 
                    value="0:00 / 0:00" 
                    position="0 -0.7 0" 
                    align="center" 
                    color="#fff"
                    width="4">
            </a-text>
            <a-entity id="vr-controls" position="0 -1 0">
                <a-plane class="clickable vr-btn" 
                         geometry="width: 0.5; height: 0.5" 
                         material="color: #1c1c1c; opacity: 0.9"
                         position="-1.5 0 0"
                         vr-play-btn>
                    <a-text value="PLAY" position="0 0 0.01" align="center" color="#fff" width="2"></a-text>
                </a-plane>
                <a-plane class="clickable vr-btn" 
                         geometry="width: 0.5; height: 0.5" 
                         material="color: #1c1c1c; opacity: 0.9"
                         position="-0.7 0 0"
                         vr-skip-back-btn>
                    <a-text value="-10" position="0 0 0.01" align="center" color="#fff" width="2"></a-text>
                </a-plane>
                <a-plane class="clickable vr-btn" 
                         geometry="width: 0.5; height: 0.5" 
                         material="color: #1c1c1c; opacity: 0.9"
                         position="0.7 0 0"
                         vr-skip-fwd-btn>
                    <a-text value="+10" position="0 0 0.01" align="center" color="#fff" width="2"></a-text>
                </a-plane>
                <a-plane class="clickable vr-btn" 
                         geometry="width: 0.5; height: 0.5" 
                         material="color: #1c1c1c; opacity: 0.9"
                         position="1.5 0 0"
                         vr-fullscreen-btn>
                    <a-text value="EXIT" position="0 0 0.01" align="center" color="#fff" width="2"></a-text>
                </a-plane>
            </a-entity>
            <a-text id="vr-mode-label" 
                    value="" 
                    position="0 0.8 0" 
                    align="center" 
                    color="#00a4dc"
                    width="6">
            </a-text>
        </a-entity>
    </a-scene>

    <script>
        const ui = document.getElementById('ui');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const playIcon = playPauseBtn.querySelector('.material-icons');
        const skipBackBtn = document.getElementById('skipBackBtn');
        const skipFwdBtn = document.getElementById('skipFwdBtn');
        const muteBtn = document.getElementById('muteBtn');
        const muteIcon = muteBtn.querySelector('.material-icons');
        const seekContainer = document.getElementById('seekContainer');
        const seekBar = document.getElementById('seekBar');
        const timeDisplay = document.getElementById('timeDisplay');
        const endsAt = document.getElementById('endsAt');
        const volumeSlider = document.getElementById('volumeSlider');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const fsIcon = fullscreenBtn.querySelector('.material-icons');
        const modeBadge = document.getElementById('modeBadge');
        const modeSelectOverlay = document.getElementById('mode-select-overlay');
        const loadingOverlay = document.getElementById('loading-overlay');
        const startModeBtn = document.getElementById('start-mode');
        const cancelModeBtn = document.getElementById('cancel-mode');
        const vrUi = document.getElementById('vr-ui');
        const aScene = document.getElementById('a-scene');

        let videoElement = null;
        let hideTimer = null;
        let muted = false;
        let currentMode = '360';
        let vrScale = 1.0;
        let isInVR = false;

        const modeNames = {
            '360': '360°',
            'fullsbs': 'Full SBS',
            'halfsbs': 'Half SBS',
            'sbs180': 'SBS 180°',
            'ou180': 'OU 180°',
            'ou360': 'OU 360°'
        };

        function updateEndsAt() {
            if (!videoElement || !videoElement.duration || isNaN(videoElement.duration)) return;
            
            const remaining = (videoElement.duration - videoElement.currentTime) / (videoElement.playbackRate || 1);
            const end = new Date(Date.now() + remaining * 1000);
            const hours = end.getHours();
            const minutes = end.getMinutes().toString().padStart(2,'0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const h12 = hours % 12 || 12;
            
            endsAt.textContent = `\u00a0\u00a0\u00a0\u00a0Ends at ${h12}:${minutes} ${ampm}`;
        }

        function formatTime(seconds) {
            if (isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2,'0')}`;
        }

        function updateProgress() {
            if (!videoElement) return;
            
            const percentage = (videoElement.currentTime / videoElement.duration) * 100;
            seekBar.style.width = percentage + '%';
            timeDisplay.textContent = `${formatTime(videoElement.currentTime)} / ${formatTime(videoElement.duration)}`;
            
            if (isInVR) {
                const vrProgressFill = document.getElementById('vr-progress-fill');
                const vrTimeDisplay = document.getElementById('vr-time-display');
                if (vrProgressFill) {
                    vrProgressFill.setAttribute('geometry', 'width', percentage / 100 * 4);
                    vrProgressFill.setAttribute('position', `${(percentage / 100 * 4) - 2} -0.5 0.01`);
                }
                if (vrTimeDisplay) {
                    vrTimeDisplay.setAttribute('value', `${formatTime(videoElement.currentTime)} / ${formatTime(videoElement.duration)}`);
                }
            }
            
            updateEndsAt();
        }

        function seekTo(targetTime) {
            if (!videoElement) return;
            videoElement.currentTime = Math.max(0, Math.min(targetTime, videoElement.duration));
            updateProgress();
        }

        function showControls() {
            ui.classList.remove('hidden');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => ui.classList.add('hidden'), 4000);
        }

        document.addEventListener('mousemove', showControls);
        document.addEventListener('touchstart', showControls);

        seekContainer.addEventListener('click', (e) => {
            if (!videoElement || !videoElement.duration) return;
            
            const rect = seekContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = (clickX / rect.width) * videoElement.duration;
            seekTo(newTime);
        });

        let dragging = false;
        seekContainer.addEventListener('mousedown', () => dragging = true);
        document.addEventListener('mouseup', () => dragging = false);
        
        seekContainer.addEventListener('mousemove', (e) => {
            if (!dragging || !videoElement?.duration) return;
            
            const rect = seekContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
            seekTo(ratio * videoElement.duration);
        });

        playPauseBtn.onclick = () => {
            if (!videoElement) return;
            
            if (videoElement.paused) { 
                videoElement.play(); 
                playIcon.textContent = 'pause'; 
            } else { 
                videoElement.pause(); 
                playIcon.textContent = 'play_arrow'; 
            }
            showControls();
        };

        skipBackBtn.onclick = () => {
            const currentTime = videoElement?.currentTime || 0;
            seekTo(currentTime - 10);
        };
        
        skipFwdBtn.onclick = () => {
            const currentTime = videoElement?.currentTime || 0;
            seekTo(currentTime + 10);
        };

        muteBtn.onclick = () => {
            if (!videoElement) return;
            
            muted = !muted;
            videoElement.muted = muted;
            
            muteIcon.textContent = muted ? 'volume_off' : (videoElement.volume > 0.5 ? 'volume_up' : 'volume_down');
        };

        volumeSlider.oninput = () => {
            if (!videoElement) return;
            
            videoElement.volume = volumeSlider.value;
            
            if (volumeSlider.value == 0) {
                muteIcon.textContent = 'volume_off';
            } else if (volumeSlider.value < 0.5) {
                muteIcon.textContent = 'volume_down';
            } else {
                muteIcon.textContent = 'volume_up';
            }
        };

        fullscreenBtn.onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                fsIcon.textContent = 'fullscreen_exit';
            } else {
                document.exitFullscreen();
                fsIcon.textContent = 'fullscreen';
            }
        };

        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const speedPanel = document.getElementById('speedPanel');
        const repeatPanel = document.getElementById('repeatPanel');
        const qualityPanel = document.getElementById('qualityPanel');
        const scalePanel = document.getElementById('scalePanel');
        const speedLabel = document.getElementById('speedLabel');
        const repeatLabel = document.getElementById('repeatLabel');
        const qualityLabel = document.getElementById('qualityLabel');
        const scaleLabel = document.getElementById('scaleLabel');

        function closeAll() {
            settingsPanel.classList.remove('open');
            speedPanel.classList.remove('open');
            repeatPanel.classList.remove('open');
            qualityPanel.classList.remove('open');
            scalePanel.classList.remove('open');
        }

        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = settingsPanel.classList.contains('open');
            closeAll();
            if (!isOpen) settingsPanel.classList.add('open');
            showControls();
        };

        document.getElementById('setSpeed').onclick = (e) => {
            e.stopPropagation();
            settingsPanel.classList.remove('open');
            speedPanel.classList.add('open');
        };

        document.getElementById('setRepeat').onclick = (e) => {
            e.stopPropagation();
            settingsPanel.classList.remove('open');
            repeatPanel.classList.add('open');
        };

        document.getElementById('setQuality').onclick = (e) => {
            e.stopPropagation();
            settingsPanel.classList.remove('open');
            qualityPanel.classList.add('open');
        };

        document.getElementById('setScale').onclick = (e) => {
            e.stopPropagation();
            settingsPanel.classList.remove('open');
            scalePanel.classList.add('open');
        };

        document.getElementById('speedBack').onclick = (e) => {
            e.stopPropagation();
            speedPanel.classList.remove('open');
            settingsPanel.classList.add('open');
        };

        document.getElementById('repeatBack').onclick = (e) => {
            e.stopPropagation();
            repeatPanel.classList.remove('open');
            settingsPanel.classList.add('open');
        };

        document.getElementById('qualityBack').onclick = (e) => {
            e.stopPropagation();
            qualityPanel.classList.remove('open');
            settingsPanel.classList.add('open');
        };

        document.getElementById('scaleBack').onclick = (e) => {
            e.stopPropagation();
            scalePanel.classList.remove('open');
            settingsPanel.classList.add('open');
        };

        document.querySelectorAll('[data-speed]').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const speed = parseFloat(opt.dataset.speed);
                if (videoElement) videoElement.playbackRate = speed;
                
                speedLabel.textContent = speed + 'x';
                
                document.querySelectorAll('[data-speed]').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                updateEndsAt();
                closeAll();
                settingsPanel.classList.add('open');
            });
        });

        document.querySelectorAll('[data-repeat]').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const mode = opt.dataset.repeat;
                if (videoElement) videoElement.loop = (mode === 'one');
                
                repeatLabel.textContent = opt.querySelector('.opt-label').textContent;
                
                document.querySelectorAll('[data-repeat]').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                closeAll();
                settingsPanel.classList.add('open');
            });
        });

        document.querySelectorAll('[data-bitrate]').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const bitrate = parseInt(opt.dataset.bitrate);
                const label = opt.querySelector('.opt-label').textContent;
                
                qualityLabel.textContent = label;
                
                document.querySelectorAll('[data-bitrate]').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                if (videoElement && videoElement.src) {
                    const currentTime = videoElement.currentTime;
                    const url = new URL(videoElement.src);
                    
                    if (bitrate === 0) {
                        url.searchParams.delete('maxStreamingBitrate');
                    } else {
                        url.searchParams.set('maxStreamingBitrate', bitrate);
                    }
                    
                    videoElement.src = url.toString();
                    videoElement.currentTime = currentTime;
                    videoElement.play().catch(() => {});
                }
                
                closeAll();
                settingsPanel.classList.add('open');
            });
        });

        document.querySelectorAll('[data-scale]').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                
                vrScale = parseFloat(opt.dataset.scale);
                scaleLabel.textContent = vrScale + 'x';
                
                document.querySelectorAll('[data-scale]').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                if (videoElement) {
                    videoElement.playbackRate = vrScale;
                }
                
                const camera = document.getElementById('camera');
                if (camera) {
                    camera.setAttribute('position', `0 ${1.6 * vrScale} 0`);
                }
                
                closeAll();
                settingsPanel.classList.add('open');
            });
        });

        document.addEventListener('click', () => closeAll());

        document.addEventListener('keydown', (e) => {
            if (!videoElement) return;
            
            if (e.key === ' ') { 
                e.preventDefault(); 
                playPauseBtn.click(); 
            }
            
            if (e.key === 'ArrowRight') { 
                e.preventDefault(); 
                seekTo(videoElement.currentTime + 5); 
            }
            
            if (e.key === 'ArrowLeft') { 
                e.preventDefault(); 
                seekTo(videoElement.currentTime - 5); 
            }
            
            if (e.key === 'm' || e.key === 'M') {
                muteBtn.click();
            }
            
            if (e.key === 'f' || e.key === 'F') {
                fullscreenBtn.click();
            }
            
            showControls();
        });

        const modeCards = document.querySelectorAll('.mode-card');
        modeCards.forEach(card => {
            card.addEventListener('click', () => {
                modeCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                currentMode = card.dataset.mode;
            });
        });

        if (modeCards.length > 0) {
            modeCards[0].classList.add('selected');
            currentMode = '360';
        }

        startModeBtn.addEventListener('click', () => {
            modeSelectOverlay.classList.add('hidden');
            startVRPlayer();
        });

        cancelModeBtn.addEventListener('click', () => {
            modeSelectOverlay.classList.add('hidden');
            window.parent.postMessage({ type: 'CLOSE_PLAYER' }, '*');
        });

        function configureScene() {
            const videosphere = document.getElementById('videosphere');
            const videosphereLeft = document.getElementById('videosphere-left');
            
            if (currentMode === '360' || currentMode === 'fullsbs' || currentMode === 'halfsbs' || currentMode === 'ou360') {
                videosphere.setAttribute('geometry', 'primitive: sphere; radius: 5000; segmentsWidth: 64; segmentsHeight: 32');
                videosphere.setAttribute('rotation', '0 180 0');
                videosphere.setAttribute('material', 'shader: flat; side: back; transparent: false; opacity: 1');
                videosphereLeft.setAttribute('material', 'opacity: 0');
            } else if (currentMode === 'sbs180' || currentMode === 'ou180') {
                videosphere.setAttribute('geometry', 'primitive: sphere; radius: 5000; segmentsWidth: 64; segmentsHeight: 32; phiStart: 0; phiLength: 180');
                videosphere.setAttribute('rotation', '0 90 0');
                videosphere.setAttribute('material', 'shader: flat; side: back; transparent: false; opacity: 1');
                videosphereLeft.setAttribute('material', 'opacity: 0');
            }

            modeBadge.textContent = modeNames[currentMode] || '360°';
        }

        function applyVideoTexture() {
            const videosphere = document.getElementById('videosphere');
            
            switch (currentMode) {
                case '360':
                    videosphere.setAttribute('material', {
                        shader: 'flat', 
                        side: 'back',
                        src: '#my360video', 
                        repeat: '-1 1'
                    });
                    break;
                    
                case 'fullsbs':
                    videosphere.setAttribute('material', {
                        shader: 'flat', 
                        side: 'back',
                        src: '#my360video', 
                        repeat: '-0.5 1',
                        offset: '0.5 0'
                    });
                    break;
                    
                case 'halfsbs':
                    videosphere.setAttribute('material', {
                        shader: 'flat', 
                        side: 'double',
                        src: '#my360video', 
                        repeat: '-2 1'
                    });
                    break;
                    
                case 'sbs180':
                    videosphere.setAttribute('material', {
                        shader: 'flat', 
                        side: 'back',
                        src: '#my360video', 
                        repeat: '-1 1'
                    });
                    break;
                    
                case 'ou180':
                    videosphere.setAttribute('material', {
                        shader: 'flat', 
                        side: 'back',
                        src: '#my360video', 
                        repeat: '1 -0.5'
                    });
                    break;
                    
                case 'ou360':
                    videosphere.setAttribute('material', {
                        shader: 'flat', 
                        side: 'back',
                        src: '#my360video', 
                        repeat: '1 -0.5'
                    });
                    break;
            }
        }

        function startVRPlayer() {
            loadingOverlay.classList.remove('hidden');
            
            configureScene();
            
            const scene = document.getElementById('a-scene');
            
            scene.addEventListener('loaded', () => {
                applyVideoTexture();
                
                if (videoElement) {
                    videoElement.play().catch(() => {});
                }
                
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                    updateProgress();
                    showControls();
                }, 1000);
            });

            scene.addEventListener('enter-vr', () => {
                isInVR = true;
                vrUi.setAttribute('visible', true);
                ui.classList.add('hidden');
                
                const vrModeLabel = document.getElementById('vr-mode-label');
                if (vrModeLabel) {
                    vrModeLabel.setAttribute('value', modeNames[currentMode] || 'VR Mode');
                }
            });

            scene.addEventListener('exit-vr', () => {
                isInVR = false;
                vrUi.setAttribute('visible', false);
                ui.classList.remove('hidden');
            });
        }

        AFRAME.registerComponent('vr-progress-control', {
            init: function() {
                this.el.addEventListener('click', (evt) => {
                    if (!videoElement || !videoElement.duration) return;
                    
                    const intersection = evt.detail.intersection;
                    if (intersection) {
                        const x = intersection.point.x;
                        const ratio = (x + 2) / 4;
                        const newTime = ratio * videoElement.duration;
                        seekTo(newTime);
                    }
                });
            }
        });

        AFRAME.registerComponent('vr-play-btn', {
            init: function() {
                this.el.addEventListener('click', () => {
                    if (!videoElement) return;
                    
                    if (videoElement.paused) { 
                        videoElement.play(); 
                    } else { 
                        videoElement.pause(); 
                    }
                });
            }
        });

        AFRAME.registerComponent('vr-skip-back-btn', {
            init: function() {
                this.el.addEventListener('click', () => {
                    const currentTime = videoElement?.currentTime || 0;
                    seekTo(currentTime - 10);
                });
            }
        });

        AFRAME.registerComponent('vr-skip-fwd-btn', {
            init: function() {
                this.el.addEventListener('click', () => {
                    const currentTime = videoElement?.currentTime || 0;
                    seekTo(currentTime + 10);
                });
            }
        });

        AFRAME.registerComponent('vr-fullscreen-btn', {
            init: function() {
                this.el.addEventListener('click', () => {
                    window.parent.postMessage({ type: 'CLOSE_PLAYER' }, '*');
                });
            }
        });

        window.addEventListener('message', (e) => {
            const { type, src, currentTime, mode } = e.data || {};
            
            if (type === 'OPEN_MODE_SELECT') {
                modeSelectOverlay.classList.remove('hidden');
                loadingOverlay.classList.add('hidden');
                return;
            }
            
            if (type === 'LOAD_VIDEO') {
                if (!src) return;

                videoElement = document.createElement('video');
                videoElement.id = 'my360video';
                videoElement.src = src;
                videoElement.crossOrigin = 'anonymous';
                videoElement.autoplay = false;
                videoElement.loop = false;
                videoElement.playsInline = true;
                videoElement.volume = parseFloat(volumeSlider.value);

                document.getElementById('assets').appendChild(videoElement);

                videoElement.addEventListener('timeupdate', updateProgress);
                videoElement.addEventListener('durationchange', updateEndsAt);

                videoElement.onloadedmetadata = () => {
                    if (currentTime) videoElement.currentTime = currentTime;
                    playIcon.textContent = 'pause';
                    updateEndsAt();
                };

                modeSelectOverlay.classList.remove('hidden');
            }
            
            if (type === 'CHANGE_MODE') {
                if (mode) {
                    currentMode = mode;
                    configureScene();
                    applyVideoTexture();
                }
            }
        });

        const aframeRemove = new MutationObserver(() => {
            document.querySelectorAll('.a-enter-vr, .a-enter-ar').forEach(el => el.remove());
        });
        aframeRemove.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('.a-enter-vr, .a-enter-ar').forEach(el => el.remove());
    </script>
</body>
</html>`;

    const MODE_ICONS = {
        '360': 'panorama',
        'fullsbs': 'view_in_ar',
        'halfsbs': '3d_rotation',
        'sbs180': 'vr_view',
        'ou180': 'fold',
        'ou360': 'panorama_horizontal'
    };

    function getJellyfinStamp() {
        const vid = document.querySelector('video');
        if (!vid || !vid.src) return null;
        return { src: vid.src, currentTime: vid.currentTime };
    }

    function opentheplayer() {
        if (document.getElementById('vr360-overlay')) return;

        const videoInfo = getJellyfinStamp();
        if (!videoInfo) {
            alert('No video playing — start a video in Jellyfin first.');
            return;
        }

        const jellyfinVideo = document.querySelector('video');
        if (jellyfinVideo) jellyfinVideo.pause();

        const blob = new Blob([PLAYER_HTML], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);

        const overlay = document.createElement('div');
        overlay.id = 'vr360-overlay';
        overlay.style.cssText = `position:fixed;inset:0;z-index:99999;background:#000;`;

        const backBtn = document.createElement('button');
        backBtn.style.cssText = `
            position:absolute;top:12px;left:12px;z-index:100000;
            background:transparent;border:none;color:rgba(255,255,255,0.87);
            cursor:pointer;display:flex;align-items:center;gap:4px;
            font-family:'Noto Sans',sans-serif;font-size:15px;font-weight:600;
            padding:8px;border-radius:50%;transition:background 0.2s;z-index:100001;
        `;
        backBtn.innerHTML = '<span style="font-family:\'Material Icons\',sans-serif;font-size:26px;line-height:1;">arrow_back</span>';
        
        backBtn.onmouseenter = () => backBtn.style.background = 'rgba(255,255,255,0.1)';
        backBtn.onmouseleave = () => backBtn.style.background = 'transparent';
        
        backBtn.onclick = () => {
            URL.revokeObjectURL(blobUrl);
            overlay.remove();
            if (jellyfinVideo) jellyfinVideo.play();
        };

        const iframe = document.createElement('iframe');
        iframe.src = blobUrl;
        iframe.style.cssText = `position:absolute;inset:0;border:none;width:100%;height:100%;`;
        iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking; vr';
        
        iframe.onload = () => {
            iframe.contentWindow.postMessage({
                type: 'LOAD_VIDEO',
                src: videoInfo.src,
                currentTime: videoInfo.currentTime
            }, '*');
        };

        overlay.appendChild(backBtn);
        overlay.appendChild(iframe);
        document.body.appendChild(overlay);

        const onKey = (e) => {
            if (e.key === 'Escape') {
                URL.revokeObjectURL(blobUrl);
                overlay.remove();
                if (jellyfinVideo) jellyfinVideo.play();
                document.removeEventListener('keydown', onKey);
            }
        };
        document.addEventListener('keydown', onKey);

        window.addEventListener('message', function closePlayerHandler(e) {
            if (e.data?.type === 'CLOSE_PLAYER') {
                URL.revokeObjectURL(blobUrl);
                overlay.remove();
                if (jellyfinVideo) jellyfinVideo.play();
                window.removeEventListener('message', closePlayerHandler);
                document.removeEventListener('keydown', onKey);
            }
        });
    }

    function createVRstuff() {
        if (document.getElementById('vr360-toggleplay')) return;

        console.log('[Extended VR] Searching for player controls...');

        // Find the main buttons container based on the user's provided HTML structure.
        const controlsContainer = document.querySelector('.buttons.focuscontainer-x');

        if (!controlsContainer) {
            console.log('[Extended VR] Could not find controls container (.buttons.focuscontainer-x). Aborting button creation.');
            return;
        }

        console.log('[Extended VR] Found controls container:', controlsContainer);

        // Create a new button mimicking Jellyfin's native buttons
        const btn = document.createElement('button');
        btn.id = 'vr360-toggleplay';
        btn.setAttribute('is', 'paper-icon-button-light');
        // Use classes from other buttons for consistency
        btn.classList.add('autoSize');
        btn.type = 'button';
        btn.title = 'Extended VR Player';

        // Use Material Icons for consistency
        const icon = document.createElement('span');
        // Use classes from other icons for consistency
        icon.classList.add('xlargePaperIconButton', 'material-icons');
        icon.textContent = 'view_in_ar'; // A fitting icon for VR
        icon.setAttribute('aria-hidden', 'true');

        btn.appendChild(icon);
        btn.onclick = opentheplayer;

        // Add some specific styles for our button
        const style = document.createElement('style');
        style.textContent = `
            #vr360-toggleplay .material-icons {
                color: #00a4dc !important; /* Jellyfin blue accent */
            }
        `;
        document.head.appendChild(style);


        // Find the fullscreen button to insert our button before it for a consistent position.
        const fullscreenButton = controlsContainer.querySelector('.btnFullscreen');
        if (fullscreenButton) {
            controlsContainer.insertBefore(btn, fullscreenButton);
        } else {
            // Fallback if the fullscreen button isn't found for some reason.
            controlsContainer.appendChild(btn);
        }

        console.log('[Extended VR] VR button created and injected successfully.');
    }

    function removeVRstuff() {
        const el = document.getElementById('vr360-toggleplay');
        if (el) {
            console.log('[Extended VR] Removing VR button');
            el.remove();
        }
    }

    function checkForVideo() {
        const vid = document.querySelector('video');
        const hasVideo = vid && (vid.src || vid.currentSrc || vid.querySelector('source'));
        
        console.log('[Extended VR] checkForVideo - video found:', !!vid, 'has source:', !!hasVideo);
        
        if (hasVideo) {
            if (!document.getElementById('vr360-toggleplay')) {
                console.log('[Extended VR] Creating VR button...');
                createVRstuff();
            }
        } else {
            removeVRstuff();
        }
    }

    const observer = new MutationObserver(checkForVideo);

    function init() {
        try {
            console.log('[Extended VR] Initializing...');
            checkForVideo();
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('[Extended VR] Observer started');
        } catch (e) {
            console.error('[Extended VR] Init error:', e);
        }
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
    
    console.log('[Extended VR] Script initialization complete');
})();

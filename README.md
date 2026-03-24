# Extended VR Player for Jellyfin

A custom VR video player for Jellyfin with support for 360°, Full SBS, Half SBS, SBS 180°, OU 180°, and OU 360° viewing modes. Features WebXR support for Meta Quest 3 and VR spatial UI controls.

Forked from [Mix1C/Jellyfin-360VR-Player](https://github.com/Mix1C/Jellyfin-360VR-Player)

![License](https://img.shields.io/badge/License-AGPL--3.0-purple) ![Jellyfin](https://img.shields.io/badge/Jellyfin-10.10+-00a4dc?logo=jellyfin) ![VR](https://img.shields.io/badge/VR-WebXR-00a4dc)

---

## Features

### Multiple VR Modes
- **360° Sphere** - Full panoramic equirectangular viewing
- **Full SBS** - Side-by-side 360° stereoscopic 3D
- **Half SBS** - Half-width side-by-side 360° stereoscopic 3D
- **SBS 180°** - Side-by-side 180° VR content
- **OU 180°** - Over-under 180° VR content
- **OU 360°** - Over-under 360° VR content

### VR Support
- WebXR support for Meta Quest 3 and other VR headsets
- VR spatial UI with 3D seek bar and controls
- Gaze and controller interaction in VR mode

### Playback Features
- Custom playback controls (play/pause, skip ±10s, seek bar, volume)
- Playback speed control (0.25x - 2x)
- Quality/bitrate selection
- Repeat modes (None, Repeat One, Repeat All)
- "Ends at" clock display
- Auto-hiding controls
- VR scale adjustment (0.5x - 2x)

### Controls
- Mouse drag to look around (desktop)
- Gaze cursor in VR
- Keyboard shortcuts
- Fullscreen support
- Resumes from where Jellyfin left off

---

## Installation

**1. Install JavaScript Injector Plugin**

In Jellyfin, go to **Dashboard → Plugins → Repositories** and add a JavaScript injector repository:

```
https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/10.11/manifest.json 
```

Then install **JavaScript Injector** from the Catalog tab and restart Jellyfin.

**2. Add the player script**

- Download `jellyfin-vr.js` from this repository
- In Jellyfin, go to **Dashboard → JS Injector (Under Plugins)**
- Paste the contents of the file into the text box and save

**3. Done**

Refresh Jellyfin in your browser. When you play any video, a **VR** button will appear in the player controls next to the fullscreen button.

---

## Usage

1. Start playing any video in Jellyfin
2. Click the **VR** button in the player controls
3. Select your desired viewing mode from the mode selection screen
4. Click **Start VR** to launch the VR player
5. Click and drag to look around (desktop) or use VR controllers (Quest 3)
6. Access settings via the gear icon for speed, quality, repeat, and VR scale
7. Press **Escape** or click the back arrow to return to Jellyfin

### Mode Selection

| Mode | Description | Best For |
|------|-------------|----------|
| 360° Sphere | Standard 360° panoramic view | Standard 360° videos |
| Full SBS | Side-by-side 3D, left/right halves mapped to eyes | DMM VR, SBS 360° content |
| Half SBS | Entire image horizontally split | Dual-eye 3D content |
| SBS 180° | Side-by-side 180° VR | DMM VR 180°, immersive VR |
| OU 180° | Over-under 180° VR | Top/bottom 180° content |
| OU 360° | Over-under 360° VR | Top/bottom 360° content |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| ← → | Seek back / forward 5s |
| M | Mute / Unmute |
| F | Toggle Fullscreen |
| Escape | Close VR player |

---

## VR Mode Controls

When in VR mode (Meta Quest 3, etc.):
- **Gaze cursor** - Look at controls to interact
- **Trigger** - Select/click
- **3D seek bar** - Gaze at position to seek
- **Play/Pause button** - Gaze + click to toggle
- **Skip buttons** - Jump ±10 seconds
- **Exit button** - Return to Jellyfin

---

## Dependencies

This project uses the following libraries:
- [A-Frame 1.5.0](https://aframe.io) by Mozilla — MIT License
- [Material Icons](https://fonts.google.com/icons) by Google — Apache 2.0 License

---

## License

Copyright (C) 2026 Mix1C

This project is licensed under the **GNU Affero General Public License v2.0 (AGPL-2.0)**

---

## Contributing

This is a forked repository from [Mix1C/Jellyfin-360VR-Player](https://github.com/Mix1C/Jellyfin-360VR-Player).

Original project by Mix1C.
Extended by CassisCloud.

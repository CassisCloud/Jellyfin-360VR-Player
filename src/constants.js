export const VERSION = '0.1.3';

export const STORAGE_KEYS = {
  lastMode: 'jfvr:last-mode',
  uiDistance: 'jfvr:ui-distance',
  uiScale: 'jfvr:ui-scale',
  screenFacePlayer: 'jfvr:screen-face-player',
  uiFacePlayer: 'jfvr:ui-face-player'
};

export const VIEW_MODES = [
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
    id: 'screen-2d',
    label: '2D Screen',
    shortLabel: '2D',
    description: 'Flat theater screen with no stereoscopic split.',
    projection: 'screen',
    stereo: 'mono',
    variant: 'mono'
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
  },
  {
    id: '3d-ou-full',
    label: '3D Full OU',
    shortLabel: '3D OU',
    description: 'Stereo theater screen for full over-under 3D video.',
    projection: 'screen',
    stereo: 'ou',
    variant: 'full'
  },
  {
    id: '3d-ou-half',
    label: '3D Half OU',
    shortLabel: '3D OU',
    description: 'Stereo theater screen for half over-under 3D video.',
    projection: 'screen',
    stereo: 'ou',
    variant: 'half'
  }
];

export const MODES_BY_ID = VIEW_MODES.reduce((acc, mode) => {
  acc[mode.id] = mode;
  return acc;
}, {});

export const MODE_GROUPS = [
  { projection: '360', title: '360 VR Modes' },
  { projection: '180', title: '180 VR Modes' },
  { projection: 'screen', title: 'Screen Modes' }
];

export function getModeShapeLabel(mode) {
  if (mode.stereo === 'mono') return '2D';
  if (mode.stereo === 'sbs') return mode.variant === 'full' ? 'SBS Full' : 'SBS Half';
  return mode.variant === 'full' ? 'OU Full' : 'OU Half';
}

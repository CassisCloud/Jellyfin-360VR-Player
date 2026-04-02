import terser from '@rollup/plugin-terser';

const external = [
  'three',
  'three/addons/webxr/VRButton.js',
  'three/addons/webxr/ARButton.js',
  'three/addons/webxr/XRControllerModelFactory.js',
  'three/addons/webxr/XRHandModelFactory.js',
  'troika-three-text'
];

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'jellyfin-vr.js',
      format: 'iife',
      globals: {}
    },
    external
  },
  {
    input: 'src/index.js',
    output: {
      file: 'jellyfin-vr.min.js',
      format: 'iife',
      globals: {}
    },
    external,
    plugins: [terser()]
  }
];

export function getPreferredWebXROptionalFeatures() {
  if (window.__JFVR_HARNESS_RUNTIME_MODE__ === 'extension') {
    return ['local-floor', 'hand-tracking'];
  }

  return ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'];
}

export function injectImportMap() {
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

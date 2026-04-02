const WEBXR_POLYFILL_URL = 'https://unpkg.com/webxr-polyfill@2.0.3/build/webxr-polyfill.js';
const WEBXR_LAYERS_POLYFILL_URL = 'https://unpkg.com/webxr-layers-polyfill@1.1.0/build/webxr-layers-polyfill.js';

let polyfillInitPromise = null;

export function getPreferredWebXROptionalFeatures() {
  if (window.__JFVR_HARNESS_RUNTIME_MODE__ === 'extension') {
    return ['local-floor', 'hand-tracking'];
  }

  return ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'];
}

function loadExternalScript(id, src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script#${id}`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function hasNativeNavigatorXR() {
  return Boolean(navigator.xr && typeof navigator.xr.requestSession === 'function');
}

function hasLayerSupport() {
  return typeof window.XRMediaBinding === 'function';
}

export async function ensureWebXRPolyfills() {
  if (polyfillInitPromise) {
    return polyfillInitPromise;
  }

  polyfillInitPromise = (async () => {
    const result = {
      xr: hasNativeNavigatorXR() ? 'native' : 'missing',
      layers: hasLayerSupport() ? 'native' : 'missing',
      error: null
    };

    try {
      if (!hasNativeNavigatorXR()) {
        await loadExternalScript('jfvr-webxr-polyfill', WEBXR_POLYFILL_URL);
        if (typeof window.WebXRPolyfill === 'function') {
          if (!window.__JFVR_WEBXR_POLYFILL__) {
            window.__JFVR_WEBXR_POLYFILL__ = new window.WebXRPolyfill();
          }
          result.xr = hasNativeNavigatorXR() ? 'polyfilled' : 'missing';
        }
      }

      if (!hasLayerSupport()) {
        await loadExternalScript('jfvr-webxr-layers-polyfill', WEBXR_LAYERS_POLYFILL_URL);
        if (typeof window.WebXRLayersPolyfill === 'function') {
          if (!window.__JFVR_WEBXR_LAYERS_POLYFILL__) {
            window.__JFVR_WEBXR_LAYERS_POLYFILL__ = new window.WebXRLayersPolyfill();
          }
          result.layers = hasLayerSupport() ? 'polyfilled' : 'missing';
        }
      }
    } catch (error) {
      result.error = error;
    }

    if (result.xr === 'missing' && hasNativeNavigatorXR()) {
      result.xr = 'native';
    }
    if (result.layers === 'missing' && hasLayerSupport()) {
      result.layers = 'native';
    }

    return result;
  })();

  return polyfillInitPromise;
}

export function injectImportMap() {
  if (document.querySelector('script#jfvr-importmap')) return;
  const im = document.createElement('script');
  im.id = 'jfvr-importmap';
  im.type = 'importmap';
  im.textContent = JSON.stringify({
    imports: {
      "three": "https://unpkg.com/three@0.183.2/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.183.2/examples/jsm/",
      "troika-three-text": "https://esm.sh/troika-three-text@0.52.4?external=three"
    }
  });
  document.head.appendChild(im);
}

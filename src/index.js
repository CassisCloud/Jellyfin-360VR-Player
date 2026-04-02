import { getCurrentJellyfinVideo } from './utils.js';
import { createVRButton, removeVRButton } from './jellyfin-button.js';
import { openPlayer } from './open-player.js';

(function () {
  if (window.__JFVRLoaded) {
    return;
  }

  window.__JFVRLoaded = true;

  function checkForVideo() {
    const video = getCurrentJellyfinVideo();
    const hasVideo = video && video.src;
    if (hasVideo) {
      createVRButton(openPlayer);
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

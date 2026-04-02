import { STORAGE_KEYS } from './constants.js';
import { getCurrentJellyfinVideo } from './utils.js';
import { INLINE_PLAYER_STYLE, INLINE_PLAYER_HTML } from './styles.js';
import { getActiveInlinePlayer, setActiveInlinePlayer } from './active-player.js';
import { createInlinePlayerRuntime } from './runtime/index.js';

async function openInlinePlayer(modeId) {
  const jellyfinVideo = getCurrentJellyfinVideo();
  if (!jellyfinVideo || !(jellyfinVideo.currentSrc || jellyfinVideo.src)) {
    window.alert('No video is currently playing in Jellyfin. Start playback first.');
    return;
  }

  const currentPlayer = getActiveInlinePlayer();
  if (currentPlayer) {
    currentPlayer.close();
  }

  localStorage.setItem(STORAGE_KEYS.lastMode, modeId);

  try {
    /* three.js loaded dynamically */
  } catch (_error) {
    window.alert('Failed to load the VR runtime.');
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.id = 'jfvr-inline-style';
  styleEl.textContent = INLINE_PLAYER_STYLE;
  document.head.appendChild(styleEl);

  const overlay = document.createElement('div');
  overlay.id = 'jfvr-inline-overlay';
  overlay.tabIndex = -1;
  overlay.innerHTML = INLINE_PLAYER_HTML;
  document.body.appendChild(overlay);
  overlay.focus();

  setActiveInlinePlayer(createInlinePlayerRuntime(overlay, styleEl, jellyfinVideo, modeId));
}

export function openPlayer(modeId) {
  openInlinePlayer(modeId);
}

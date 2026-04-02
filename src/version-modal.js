import { VERSION } from './constants.js';
import { injectParentStyles } from './styles.js';

export function removeVersionModal() {
  const existing = document.getElementById('jfvr-version-menu');
  if (existing) existing.remove();
  const backdrop = document.getElementById('jfvr-version-backdrop');
  if (backdrop) backdrop.remove();
}

export function openVersionModal() {
  injectParentStyles();
  removeVersionModal();

  const backdrop = document.createElement('div');
  backdrop.id = 'jfvr-version-backdrop';

  const modal = document.createElement('div');
  modal.id = 'jfvr-version-menu';
  modal.innerHTML = '<div class="jfvr-version-head"><span class="jfvr-version-title">About</span><button class="jfvr-version-close" id="jfvr-version-close-btn">&#10005;</button></div><div class="jfvr-version-body"><div class="jfvr-version-version">v' + VERSION + '</div><div class="jfvr-version-name">Jellyfin VR Player</div><a class="jfvr-version-link" href="https://github.com/CassisCloud/Jellyfin-360VR-Player" target="_blank" rel="noopener noreferrer">View on GitHub</a></div>';

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      removeVersionModal();
    }
  });

  modal.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const closeBtn = document.getElementById('jfvr-version-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeVersionModal();
    });
  }
}

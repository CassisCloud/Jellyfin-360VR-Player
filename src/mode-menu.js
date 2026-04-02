import { STORAGE_KEYS, VIEW_MODES, MODES_BY_ID, MODE_GROUPS } from './constants.js';
import { escapeHtml } from './utils.js';
import { injectParentStyles } from './styles.js';

function createModeMenuButton(mode) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'jfvr-mode-option';
  button.dataset.modeId = mode.id;

  const modeTag = mode.projection === 'screen'
    ? (mode.stereo === 'mono' ? '2D Screen' : 'Screen ' + mode.stereo.toUpperCase())
    : (mode.stereo === 'mono' ? mode.projection + ' Mono' : mode.projection + ' ' + mode.stereo.toUpperCase());
  const variantLabel = mode.variant === 'mono' ? 'Single view' : mode.variant === 'full' ? 'Full layout' : 'Half layout';

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

export function removeModeMenu() {
  const existing = document.getElementById('jfvr-mode-menu');
  if (existing) existing.remove();
  const backdrop = document.getElementById('jfvr-mode-backdrop');
  if (backdrop) backdrop.remove();
}

export function openModeMenu(openPlayer) {
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

  const groups = MODE_GROUPS.map(({ projection, title }) => {
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
            <div class="jfvr-menu-subtitle">Pick the layout that matches the file. 180 and 360 stay immersive, while screen modes open as a theater view with 2D or stereo splits.</div>
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

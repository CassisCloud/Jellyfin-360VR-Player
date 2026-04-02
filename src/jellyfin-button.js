import { openModeMenu, removeModeMenu } from './mode-menu.js';

export function createVRButton(openPlayer) {
  if (document.getElementById('vr360-toggleplay')) return;

  const fullscreenBtn = document.querySelector('.btnFullscreen');
  if (!fullscreenBtn || !fullscreenBtn.parentNode) return;

  const button = document.createElement('button');
  button.id = 'vr360-toggleplay';
  button.setAttribute('is', 'paper-icon-button-light');
  button.className = 'autoSize paper-icon-button-light';
  button.title = 'VR Player';
  button.setAttribute('aria-label', 'VR Player');

  const label = document.createElement('span');
  label.className = 'largePaperIconButton';
  label.setAttribute('aria-hidden', 'true');
  label.textContent = 'VR';
  label.style.cssText = 'font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; display:inline-flex; align-items:center; justify-content:center;';

  button.appendChild(label);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openModeMenu(openPlayer);
  });

  fullscreenBtn.parentNode.insertBefore(button, fullscreenBtn);
}

export function removeVRButton() {
  const button = document.getElementById('vr360-toggleplay');
  if (button) button.remove();
  removeModeMenu();
}

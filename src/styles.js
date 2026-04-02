import { VERSION } from './constants.js';

export const INLINE_PLAYER_STYLE = `
  #jfvr-inline-overlay { position: fixed; inset: 0; z-index: 99999; background: #000; overflow: hidden; color-scheme: dark; }
  #jfvr-inline-overlay canvas { display: block; width: 100vw; height: 100vh; }
  #jfvr-canvas-container { width: 100%; height: 100%; }
  #jfvr-inline-toolbar {
    position: absolute;
    top: 18px;
    right: 18px;
    z-index: 999999;
    display: flex;
    gap: 10px;
    pointer-events: auto;
  }
  .jfvr-inline-chip {
    border: 1px solid rgba(103, 132, 162, 0.28);
    border-radius: 999px;
    background: rgba(4, 11, 18, 0.78);
    color: #eef7ff;
    padding: 10px 14px;
    font: 700 12px/1 "Segoe UI", Arial, sans-serif;
    letter-spacing: 0.04em;
    cursor: pointer;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  }
  .jfvr-inline-chip:hover,
  .jfvr-inline-chip:focus-visible {
    background: rgba(15, 23, 42, 0.95);
    border-color: rgba(56, 189, 248, 0.4);
    transform: translateY(-1px);
    outline: none;
  }
  #jfvr-inline-version { color: #7dd3fc; }
  @media (max-width: 720px) {
    #jfvr-inline-toolbar {
      top: 12px;
      right: 12px;
      gap: 8px;
    }
    .jfvr-inline-chip {
      padding: 9px 12px;
      font-size: 11px;
    }
  }
`;

export const INLINE_PLAYER_HTML = `
  <div id="jfvr-canvas-container"></div>
  <div id="jfvr-inline-toolbar">
    <button type="button" id="jfvr-inline-version" class="jfvr-inline-chip">v${VERSION}</button>
  </div>
`;

export function injectParentStyles() {
  if (document.getElementById('jfvr-style')) return;

  const style = document.createElement('style');
  style.id = 'jfvr-style';
  style.textContent = `
      #jfvr-mode-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(2, 6, 12, 0.56);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      #jfvr-mode-menu {
        width: min(96vw, 980px);
        max-height: min(86vh, 860px);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        overflow: hidden;
        border-radius: 26px;
        border: 1px solid rgba(103, 132, 162, 0.28);
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(4, 11, 18, 0.98), rgba(2, 8, 14, 0.98));
        color: #eef7ff;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.56);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      #jfvr-mode-menu * {
        box-sizing: border-box;
      }

      .jfvr-menu-head {
        display: grid;
        gap: 10px;
        padding: 18px 20px 16px;
        border-bottom: 1px solid rgba(103, 132, 162, 0.16);
      }

      .jfvr-menu-head-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .jfvr-menu-title {
        font: 700 18px/1.2 "Segoe UI", Arial, sans-serif;
        margin: 0;
      }

      .jfvr-menu-subtitle {
        color: rgba(211, 227, 242, 0.76);
        font: 500 13px/1.5 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-menu-recommend {
        align-self: start;
        border-radius: 999px;
        padding: 8px 12px;
        border: 1px solid rgba(56, 189, 248, 0.26);
        background: rgba(12, 30, 46, 0.78);
        color: #cdefff;
        font: 700 11px/1.1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .jfvr-menu-body {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        padding: 14px;
        overflow: auto;
        align-items: start;
      }

      .jfvr-menu-section {
        display: grid;
        gap: 8px;
        align-content: start;
        padding: 12px;
        border: 1px solid rgba(103, 132, 162, 0.12);
        border-radius: 18px;
        background: rgba(8, 16, 25, 0.56);
      }

      .jfvr-menu-label {
        padding: 0 2px 4px;
        color: #7dd3fc;
        font: 700 12px/1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .jfvr-mode-option {
        display: grid;
        gap: 4px;
        padding: 12px 12px 11px;
        border: 1px solid rgba(103, 132, 162, 0.16);
        border-radius: 14px;
        background: rgba(6, 14, 22, 0.78);
        color: inherit;
        cursor: pointer;
        text-align: left;
        transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
      }

      .jfvr-mode-option + .jfvr-mode-option {
        margin-top: 0;
      }

      .jfvr-mode-option:hover,
      .jfvr-mode-option:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(56, 189, 248, 0.38);
        background: rgba(13, 28, 43, 0.92);
        outline: none;
      }

      .jfvr-mode-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .jfvr-mode-name {
        font: 700 14px/1.2 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-mode-tag {
        border-radius: 999px;
        padding: 4px 8px;
        font: 700 10px/1 "Segoe UI", Arial, sans-serif;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #04111b;
        background: linear-gradient(135deg, #7dd3fc, #38bdf8);
      }

      .jfvr-mode-desc {
        color: rgba(211, 227, 242, 0.76);
        font: 500 12px/1.4 "Segoe UI", Arial, sans-serif;
      }

      .jfvr-mode-meta {
        color: rgba(148, 163, 184, 0.92);
        font: 600 11px/1.35 "Segoe UI", Arial, sans-serif;
      }

      @media (max-width: 960px) {
        .jfvr-menu-body {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        #jfvr-mode-backdrop {
          padding: 12px;
          align-items: stretch;
        }

        #jfvr-mode-menu {
          width: 100%;
          max-height: 100%;
        }

        .jfvr-menu-head-top {
          flex-direction: column;
          align-items: flex-start;
        }

        .jfvr-menu-recommend {
          white-space: normal;
        }

        .jfvr-menu-body {
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          padding: 10px;
        }

        .jfvr-menu-section {
          padding: 10px;
        }
      }

      #jfvr-version-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(2, 6, 12, 0.56);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      #jfvr-version-menu {
        width: min(96vw, 340px);
        border-radius: 22px;
        border: 1px solid rgba(103, 132, 162, 0.28);
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(4, 11, 18, 0.98), rgba(2, 8, 14, 0.98));
        color: #eef7ff;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.56);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        overflow: hidden;
      }

      #jfvr-version-menu * {
        box-sizing: border-box;
      }

      .jfvr-version-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        border-bottom: 1px solid rgba(103, 132, 162, 0.16);
      }

      .jfvr-version-title {
        font: 700 16px/1.2 "Segoe UI", Arial, sans-serif;
        color: #eef7ff;
      }

      .jfvr-version-close {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(103, 132, 162, 0.22);
        border-radius: 50%;
        background: rgba(8, 16, 25, 0.56);
        color: #94a3b8;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.18s ease, border-color 0.18s ease;
      }

      .jfvr-version-close:hover,
      .jfvr-version-close:focus-visible {
        background: rgba(15, 23, 42, 0.95);
        border-color: rgba(56, 189, 248, 0.4);
        outline: none;
      }

      .jfvr-version-body {
        display: grid;
        gap: 12px;
        padding: 24px 18px 28px;
        text-align: center;
      }

      .jfvr-version-version {
        font: 700 24px/1.2 "Segoe UI", Arial, sans-serif;
        color: #7dd3fc;
      }

      .jfvr-version-name {
        font: 500 15px/1.4 "Segoe UI", Arial, sans-serif;
        color: #eef7ff;
        margin-top: 4px;
      }

      .jfvr-version-link {
        display: inline-block;
        margin-top: 8px;
        padding: 10px 20px;
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 999px;
        background: rgba(12, 30, 46, 0.78);
        color: #7dd3fc;
        font: 600 13px/1.2 "Segoe UI", Arial, sans-serif;
        text-decoration: none;
        transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
      }

      .jfvr-version-link:hover,
      .jfvr-version-link:focus-visible {
        background: rgba(15, 23, 42, 0.95);
        border-color: rgba(56, 189, 248, 0.6);
        transform: translateY(-1px);
        outline: none;
      }
    `;
  document.head.appendChild(style);
}

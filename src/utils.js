export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function getCurrentJellyfinVideo() {
  return document.querySelector('video');
}

export function getVideoTitle() {
  const titleEl = document.querySelector('.osdTitle, .videoOsdTitle, h3.osdTitle');
  if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();
  const headerEl = document.querySelector('.itemName, .nowPlayingTitle, [data-type="title"]');
  if (headerEl && headerEl.textContent.trim()) return headerEl.textContent.trim();
  if (document.title && document.title !== 'Jellyfin') return document.title.replace(' | Jellyfin', '').trim();
  return '';
}

export function getJellyfinItemId(video) {
  const srcCandidates = [video && video.currentSrc, video && video.src].filter(Boolean);
  for (let i = 0; i < srcCandidates.length; i += 1) {
    try {
      const url = new URL(srcCandidates[i], window.location.href);
      const videoMatch = url.pathname.match(/\/Videos\/([^/]+)/i);
      if (videoMatch && videoMatch[1]) return videoMatch[1];
      const itemParam = url.searchParams.get('itemId') || url.searchParams.get('id');
      if (itemParam) return itemParam;
    } catch (_error) {
      const fallbackMatch = String(srcCandidates[i]).match(/\/Videos\/([^/?#]+)/i);
      if (fallbackMatch && fallbackMatch[1]) return fallbackMatch[1];
    }
  }

  const hash = window.location.hash || '';
  const hashQueryIndex = hash.indexOf('?');
  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(hash.slice(hashQueryIndex + 1));
    const hashItemId = hashParams.get('id') || hashParams.get('itemId');
    if (hashItemId) return hashItemId;
  }

  const pageParams = new URLSearchParams(window.location.search);
  return pageParams.get('id') || pageParams.get('itemId') || '';
}

export function getJellyfinApiClient() {
  return window.ApiClient || window.apiClient || null;
}

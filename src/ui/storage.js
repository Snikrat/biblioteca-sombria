/**
 * Presets do usuário guardados no navegador (localStorage).
 */
const KEY = 'biblioteca-sombria-presets';

export function loadCustomPresets() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export function saveCustomPresets(presets) {
  try { localStorage.setItem(KEY, JSON.stringify(presets)); return true; } catch { return false; }
}

/*
 * Quando a página roda publicada no claude.ai, downloads diretos são bloqueados e passam
 * pela capacidade "downloads". Fora dele (localhost), usa o link de download normal.
 */
let claudeDownloads = null;
(function detect(n) {
  if (typeof window === 'undefined') return;
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then((d) => { claudeDownloads = d; }).catch(() => {});
  } else if (n < 20) setTimeout(() => detect(n + 1), 250);
})(0);

/** Baixa um arquivo gerado no navegador. Resolve false se o usuário recusou. */
export async function downloadBlob(blob, filename) {
  if (claudeDownloads) {
    try { await claudeDownloads.save({ filename, data: blob }); return true; }
    catch (e) { if (e && e.code === 'declined') return false; }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

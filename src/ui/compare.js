/**
 * Comparação antes/depois: divisória arrastável e botão "segure para ver o original".
 */
export function createCompare({ viewer, before, divider, tagL, tagR, holdButton, modeButton }) {
  let split = 0.5, mode = 'split', dragging = false;

  function apply() {
    const isSplit = mode === 'split';
    before.style.clipPath = isSplit ? `inset(0 ${(1 - split) * 100}% 0 0)` : 'inset(0 100% 0 0)';
    divider.style.display = isSplit ? 'block' : 'none';
    divider.style.left = split * 100 + '%';
    tagL.style.display = tagR.style.display = isSplit ? 'block' : 'none';
    modeButton.classList.toggle('on', isSplit);
    modeButton.setAttribute('aria-pressed', isSplit);
  }
  const setSplit = (v) => { split = Math.min(1, Math.max(0, v)); apply(); };
  const fromEvent = (e) => { const r = viewer.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };

  viewer.addEventListener('pointerdown', (e) => {
    if (mode !== 'split') return;
    dragging = true; viewer.setPointerCapture(e.pointerId); setSplit(fromEvent(e));
  });
  viewer.addEventListener('pointermove', (e) => { if (dragging) setSplit(fromEvent(e)); });
  ['pointerup', 'pointercancel'].forEach((t) => viewer.addEventListener(t, () => { dragging = false; }));

  modeButton.addEventListener('click', () => { mode = mode === 'split' ? 'after' : 'split'; apply(); });

  holdButton.addEventListener('pointerdown', (e) => {
    e.preventDefault(); before.style.clipPath = 'inset(0 0 0 0)'; divider.style.display = 'none';
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => holdButton.addEventListener(t, apply));

  apply();
  return { refresh: apply };
}

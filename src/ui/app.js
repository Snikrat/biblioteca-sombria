/**
 * Filtros fotográficos (Biblioteca Sombria, Âmbar 1979, Sala Escura, Neon Garoa, Ultravioleta, Penumbra, Vermelho Veludo, Capela de Pedra) — interface.
 */
import {
  analyze, adaptFactor, describeExposure, buildLUT, processImage,
  LOOKS, DEFAULT_LOOK, PRESET_LABELS, PARAMS, presetsFor, defaultsFor, toPresetJSON, parsePreset,
} from '../pipeline/index.js';
import { loadCustomPresets, saveCustomPresets, downloadBlob } from './storage.js';
import { createCompare } from './compare.js';

const $ = (id) => document.getElementById(id);
const PREVIEW_MAX_SIDE = 1600;
const THUMB_SIDE = 260;

const state = {
  look: DEFAULT_LOOK,
  params: defaultsFor(DEFAULT_LOOK),
  presetId: 'original',          // null = ajustes personalizados não salvos
  intensity: 1,
  custom: loadCustomPresets(),
  bitmap: null, fileName: 'foto', fullW: 0, fullH: 0,
  pw: 0, ph: 0, src: null, out: null, stats: null, thumbSrc: null,
};

const cvAfter = $('cvAfter'), cvBefore = $('cvBefore');
const ctxAfter = cvAfter.getContext('2d'), ctxBefore = cvBefore.getContext('2d', { willReadFrequently: true });

/* ---------- utilidades ---------- */
function toast(text) {
  const el = $('toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}
function busy(on, text) { $('busyText').textContent = text || 'Processando…'; $('busy').classList.toggle('show', on); }
const nextFrame = () => new Promise((r) => setTimeout(r, 40));
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
const fmtSigned = (v) => sign(Math.round(v)) + Math.abs(Math.round(v));
const fmtEV = (v) => sign(v) + Math.abs(v).toFixed(2).replace('.', ',') + ' EV';

/* ---------- controles ---------- */
const controls = {};
function createSlider(def) {
  const host = def.advanced ? $('sliders2') : $('sliders');
  const fmt = def.unit === 'EV' ? fmtEV : fmtSigned;
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<label for="p_${def.key}">${def.label}</label><output></output>
    <input type="range" id="p_${def.key}" min="${def.min}" max="${def.max}" step="${def.step ?? 1}">`;
  const input = row.querySelector('input'), out = row.querySelector('output');
  if (def.min < 0) input.classList.add('bipolar');
  input.addEventListener('input', () => {
    state.params[def.key] = parseFloat(input.value);
    out.textContent = fmt(state.params[def.key]);
    markCustom(); scheduleRender();
  });
  // duplo clique volta ao valor do preset
  input.addEventListener('dblclick', () => { state.params[def.key] = basePreset()[def.key]; syncUI(); scheduleRender(); });
  controls[def.key] = { input, out, fmt };
  host.appendChild(row);
}
PARAMS.forEach(createSlider);

function syncUI() {
  for (const k in controls) { controls[k].input.value = state.params[k]; controls[k].out.textContent = controls[k].fmt(state.params[k]); }
  $('adaptive').checked = !!state.params.adaptive;
  const pct = Math.round(state.intensity * 100);
  $('intensity').value = pct; $('intensityOut').textContent = pct + '%';
  renderPresetChips(); updateAdaptNote(); updateLookUI();
}

$('intensity').addEventListener('input', (e) => {
  state.intensity = e.target.value / 100; $('intensityOut').textContent = e.target.value + '%'; scheduleRender();
});
$('adaptive').addEventListener('change', (e) => {
  state.params.adaptive = e.target.checked; markCustom(); updateAdaptNote(); scheduleRender();
});

function updateAdaptNote() {
  const el = $('adaptNote');
  if (!state.stats) { el.textContent = ''; return; }
  el.textContent = state.params.adaptive
    ? `Leitura: ${describeExposure(state.stats)} (fator ${adaptFactor(state.stats).toFixed(2).replace('.', ',')}).`
    : 'Adaptação desligada: valores aplicados exatamente.';
}

/* ---------- presets ---------- */
const isBuiltin = (id) => id in PRESET_LABELS;
function basePreset() {
  if (isBuiltin(state.presetId)) return presetsFor(state.look)[state.presetId];
  return state.custom[state.presetId]?.parametros || defaultsFor(state.look);
}
function markCustom() { if (state.presetId !== null) { state.presetId = null; renderPresetChips(); } }

function renderPresetChips() {
  // Suave / Original / Intenso
  const seg = $('presetChips'); seg.innerHTML = '';
  for (const id in PRESET_LABELS) {
    const b = document.createElement('button');
    b.textContent = PRESET_LABELS[id];
    b.className = state.presetId === id ? 'on' : '';
    b.setAttribute('aria-pressed', state.presetId === id);
    b.addEventListener('click', () => applyPreset(id));
    seg.appendChild(b);
  }
  // Ajustes salvos deste filtro
  const list = $('savedList'); list.innerHTML = '';
  for (const id in state.custom) {
    if ((state.custom[id].filtroId || DEFAULT_LOOK) !== state.look) continue;
    const item = document.createElement('div');
    item.className = 'item' + (state.presetId === id ? ' on' : '');
    const pick = document.createElement('button'); pick.className = 'pick'; pick.textContent = state.custom[id].nome;
    pick.addEventListener('click', () => applyPreset(id));
    const del = document.createElement('button'); del.className = 'del'; del.textContent = 'Excluir';
    del.setAttribute('aria-label', 'Excluir ' + state.custom[id].nome);
    del.addEventListener('click', () => {
      const name = state.custom[id].nome;
      delete state.custom[id]; saveCustomPresets(state.custom);
      if (state.presetId === id) state.presetId = null;
      renderPresetChips(); toast('Excluído: ' + name);
    });
    item.append(pick, del); list.appendChild(item);
  }

}

function applyPreset(id) {
  state.presetId = id;
  if (isBuiltin(id)) state.params = { ...presetsFor(state.look)[id] };
  else {
    const c = state.custom[id];
    state.look = c.filtroId || DEFAULT_LOOK;
    state.params = { ...defaultsFor(state.look), ...c.parametros };
    state.intensity = c.intensidade / 100;
  }
  syncUI(); scheduleRender();
}

/* ---------- seletor de filtros ---------- */
const lookCards = {};
function buildLookGrid() {
  const host = $('lookGrid');
  Object.keys(LOOKS).forEach((id, i) => {
    const L = LOOKS[id];
    const card = document.createElement('button');
    card.className = 'frame';
    card.setAttribute('aria-label', `${L.name}: ${L.tagline}`);
    card.innerHTML = `<span class="shot"><span class="sw">${L.swatch.map((c) => `<i style="background:${c}"></i>`).join('')}</span></span>
      <span class="edge"><span>${L.name}</span><span>${i + 1}A</span></span>`;
    card.addEventListener('click', () => selectLook(id));
    lookCards[id] = card;
    host.appendChild(card);
  });
}
function selectLook(id) {
  if (!LOOKS[id]) return;
  state.look = id;
  applyPreset('original');
}
function updateLookUI() {
  for (const id in lookCards) {
    lookCards[id].classList.toggle('on', id === state.look);
    lookCards[id].setAttribute('aria-pressed', id === state.look);
  }
  $('lookName').textContent = LOOKS[state.look].name;
  $('lookTagline').textContent = LOOKS[state.look].tagline;
}
/** Miniaturas: a foto do usuário com cada filtro (preset Original). */
function renderThumbs() {
  if (!state.thumbSrc) return;
  const { data, width: w, height: h } = state.thumbSrc;
  for (const id in LOOKS) {
    const thumb = lookCards[id].querySelector('.shot');
    let cv = thumb.querySelector('canvas');
    if (!cv) { cv = document.createElement('canvas'); thumb.appendChild(cv); }
    cv.width = w; cv.height = h;
    const out = new ImageData(w, h);
    processImage(data, out.data, w, h, presetsFor(id).original, 1, state.stats,
      { look: id, grainScale: 0.3, seed: 7 });
    cv.getContext('2d').putImageData(out, 0, 0);
  }
}
$('resetBtn').addEventListener('click', () => applyPreset(state.presetId ?? 'original'));
buildLookGrid();

function addCustomPreset(preset) {
  const id = 'c' + Date.now().toString(36);
  state.custom[id] = preset;
  if (!saveCustomPresets(state.custom)) toast('O navegador não permitiu salvar — use Exportar JSON.');
  return id;
}

$('savePreset').addEventListener('click', () => {
  const name = $('presetName').value.trim() || `Meus ajustes ${Object.keys(state.custom).length + 1}`;
  state.presetId = addCustomPreset(parsePreset(toPresetJSON(name, state.params, state.intensity, state.look)));
  $('presetName').value = ''; renderPresetChips(); toast('Ajustes salvos: ' + name);
});

const currentJSON = () =>
  JSON.stringify(toPresetJSON($('presetName').value.trim() || LOOKS[state.look].name, state.params, state.intensity, state.look), null, 2);

$('exportJson').addEventListener('click', () => {
  const name = ($('presetName').value.trim() || state.look).replace(/[^\w\-]+/g, '-');
  downloadBlob(new Blob([currentJSON()], { type: 'application/json' }), name + '.json');
});
$('copyJson').addEventListener('click', async () => {
  const txt = currentJSON(); $('jsonBox').value = txt;
  try { await navigator.clipboard.writeText(txt); toast('JSON copiado'); } catch { toast('JSON exibido na caixa para copiar'); }
});

function importPresetText(txt) {
  try {
    const p = parsePreset(JSON.parse(txt));
    applyPreset(addCustomPreset(p));
    toast(`Preset importado: ${p.nome} (${LOOKS[p.filtroId].name})`);
  }
  catch { toast('Não foi possível ler esse JSON'); }
}
$('applyJson').addEventListener('click', () => importPresetText($('jsonBox').value));
$('importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (f) importPresetText(await f.text()); e.target.value = '';
});

/* ---------- abrir imagem ---------- */
async function loadFile(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) { toast('Use JPG, PNG ou WebP'); return; }
  busy(true, 'Abrindo foto…'); await nextFrame();
  try {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
    state.bitmap?.close?.();
    Object.assign(state, { bitmap: bmp, fullW: bmp.width, fullH: bmp.height, fileName: file.name.replace(/\.[^.]+$/, '') || 'foto' });

    const sc = Math.min(1, PREVIEW_MAX_SIDE / Math.max(bmp.width, bmp.height));
    state.pw = Math.max(1, Math.round(bmp.width * sc)); state.ph = Math.max(1, Math.round(bmp.height * sc));
    cvAfter.width = cvBefore.width = state.pw; cvAfter.height = cvBefore.height = state.ph;
    ctxBefore.imageSmoothingQuality = 'high';
    ctxBefore.drawImage(bmp, 0, 0, state.pw, state.ph);
    state.src = ctxBefore.getImageData(0, 0, state.pw, state.ph);
    state.out = new ImageData(state.pw, state.ph);
    state.stats = analyze(state.src.data);
    const ts = Math.min(1, THUMB_SIDE / Math.max(bmp.width, bmp.height));
    const tc = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(bmp.width * ts)), height: Math.max(1, Math.round(bmp.height * ts)) });
    const tctx = tc.getContext('2d', { willReadFrequently: true });
    tctx.imageSmoothingQuality = 'high'; tctx.drawImage(bmp, 0, 0, tc.width, tc.height);
    state.thumbSrc = tctx.getImageData(0, 0, tc.width, tc.height);

    $('drop').style.display = 'none'; $('viewer').style.display = 'block'; $('viewbar').style.display = 'flex';
    document.querySelector('.stage-bar').style.display = 'flex';
    $('quick').style.display = 'flex';
    $('exportBtn').disabled = false;
    $('meta').textContent = `${state.fullW} × ${state.fullH} px. A prévia usa ${state.pw} × ${state.ph}; a exportação, o tamanho original.`;
    updateAdaptNote(); render(); renderThumbs(); compare.refresh();
    // revelação da foto (uma vez, ao abrir)
    const v = $('viewer'); v.classList.remove('developing'); void v.offsetWidth; v.classList.add('developing');
  } catch { toast('Não consegui abrir essa imagem'); }
  busy(false);
}
$('file').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
$('changeImg').addEventListener('click', () => $('file').click());
const stage = $('stage');
['dragenter', 'dragover'].forEach((t) => stage.addEventListener(t, (e) => { e.preventDefault(); $('drop').classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => stage.addEventListener(t, (e) => { e.preventDefault(); $('drop').classList.remove('over'); }));
stage.addEventListener('drop', (e) => loadFile(e.dataTransfer.files[0]));

/* ---------- prévia ---------- */
let raf = 0;
function scheduleRender() { if (!state.src || raf) return; raf = requestAnimationFrame(() => { raf = 0; render(); }); }
function render() {
  if (!state.src) return;
  const lut = buildLUT(state.params, state.stats, state.intensity, state.look);
  // grainScale: a prévia é reduzida, então o grão é atenuado para representar o resultado final
  processImage(state.src.data, state.out.data, state.pw, state.ph, state.params, state.intensity, state.stats,
    { lut, look: state.look, grainScale: Math.sqrt(state.pw / state.fullW), seed: 1337 });
  ctxAfter.putImageData(state.out, 0, 0);
}

const compare = createCompare({
  viewer: $('viewer'), before: cvBefore, divider: $('divider'), tagL: $('tagL'), tagR: $('tagR'),
  holdButton: $('holdBefore'), modeButton: $('modeSplit'),
});

/* ---------- exportação em resolução original ---------- */
function processInWorker(imageData) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker(new URL('../pipeline/worker.js', import.meta.url), { type: 'module' }); }
    catch (e) { reject(e); return; }
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.ok) resolve(new Uint8ClampedArray(e.data.buffer)); else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => { worker.terminate(); reject(e); };
    const buffer = imageData.data.buffer;
    worker.postMessage({
      buffer, width: imageData.width, height: imageData.height,
      params: { ...state.params }, intensity: state.intensity, stats: state.stats, look: state.look,
    }, [buffer]);
  });
}

$('fmt').addEventListener('change', () => { $('qualRow').style.display = $('fmt').value === 'image/png' ? 'none' : 'grid'; });
$('quality').addEventListener('input', (e) => { $('qualityOut').textContent = e.target.value; });

$('exportBtn').addEventListener('click', async () => {
  if (!state.bitmap) return;
  const { fullW: w, fullH: h } = state;
  busy(true, `Processando ${w} × ${h} px…`); await nextFrame();
  try {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(state.bitmap, 0, 0);
    const original = ctx.getImageData(0, 0, w, h);

    let result;
    try { result = new ImageData(await processInWorker(original), w, h); }
    catch {
      // Sem worker (ex.: arquivo aberto sem servidor): processa na thread principal
      const fresh = ctx.getImageData(0, 0, w, h);
      processImage(fresh.data, fresh.data, w, h, state.params, state.intensity, state.stats, { look: state.look, grainScale: 1, seed: 1337 });
      result = fresh;
    }
    ctx.putImageData(result, 0, 0);

    const type = $('fmt').value, quality = $('quality').value / 100;
    const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), type, quality));
    if (type !== 'image/png' && blob.type === 'image/png') toast('Este navegador não gera esse formato; exportado em PNG.');
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[blob.type] || 'png';
    canvas.width = canvas.height = 1;
    busy(false);
    if (await downloadBlob(blob, `${state.fileName}-${state.look}.${ext}`)) toast('Imagem exportada');
  } catch {
    toast('A imagem é grande demais para este navegador.');
  }
  busy(false);
});

/* ---------- início ---------- */
syncUI();
$('qualRow').style.display = 'grid';

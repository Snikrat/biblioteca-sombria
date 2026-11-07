/**
 * Parâmetros, presets e (de)serialização JSON.
 */
import { LOOKS, DEFAULT_LOOK } from './looks.js';

export const PRESET_LABELS = { suave: 'Suave', original: 'Original', intenso: 'Intenso' };

/** Presets de um filtro: { suave, original, intenso } */
export const presetsFor = (lookId) => (LOOKS[lookId] || LOOKS[DEFAULT_LOOK]).presets;

/** Parâmetros padrão (preset Original) de um filtro. */
export const defaultsFor = (lookId) => ({ ...presetsFor(lookId).original });

/** Atalhos para o filtro principal (compatibilidade). */
export const DEFAULTS = Object.freeze(defaultsFor(DEFAULT_LOOK));
export const PRESETS = Object.freeze(presetsFor(DEFAULT_LOOK));

/** Definição dos controles. Valores normalizados -100..100, exceto exposição (EV). */
export const PARAMS = [
  { key: 'exposure', label: 'Exposição', min: -2, max: 2, step: 0.05, unit: 'EV' },
  { key: 'contrast', label: 'Contraste', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturação', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperatura', min: -100, max: 100 },
  { key: 'tint', label: 'Matiz', min: -100, max: 100 },
  { key: 'highlights', label: 'Realces', min: -100, max: 100 },
  { key: 'shadows', label: 'Sombras', min: -100, max: 100 },
  { key: 'sharpness', label: 'Nitidez', min: -100, max: 100 },
  { key: 'grain', label: 'Granulação', min: 0, max: 100 },
  { key: 'fade', label: 'Fade', min: -100, max: 100 },
  { key: 'gradeStrength', label: 'Força do color grading', min: 0, max: 100, advanced: true },
  { key: 'skinProtect', label: 'Proteção de pele', min: 0, max: 100, advanced: true },
];

/** Gera o JSON exportável de um preset. */
export function toPresetJSON(name, params, intensity, lookId = DEFAULT_LOOK) {
  return {
    filtro: (LOOKS[lookId] || LOOKS[DEFAULT_LOOK]).name,
    filtroId: LOOKS[lookId] ? lookId : DEFAULT_LOOK,
    versao: 2,
    nome: name || 'Minha configuração',
    intensidade: Math.round(intensity * 100),
    parametros: { ...params },
  };
}

/** Descobre o filtro de um JSON (por id ou pelo nome). */
function lookIdFrom(obj) {
  if (obj.filtroId && LOOKS[obj.filtroId]) return obj.filtroId;
  const byName = Object.keys(LOOKS).find((id) => LOOKS[id].name === obj.filtro);
  return byName || DEFAULT_LOOK;
}

/** Valida/normaliza um JSON de preset (aceita também só o objeto de parâmetros). */
export function parsePreset(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('JSON inválido');
  const lookId = lookIdFrom(obj);
  const src = { ...(obj.parametros || obj) };
  if (src.gradeStrength === undefined && src.shadowTone !== undefined) src.gradeStrength = src.shadowTone; // versão 1
  const out = defaultsFor(lookId);
  for (const { key, min, max } of PARAMS) {
    const v = Number(src[key]);
    if (Number.isFinite(v)) out[key] = Math.min(max, Math.max(min, v));
  }
  if (typeof src.adaptive === 'boolean') out.adaptive = src.adaptive;
  let I = Number(obj.intensidade);
  I = Number.isFinite(I) ? Math.min(100, Math.max(0, I)) : 100;
  return { nome: String(obj.nome || 'Importado').slice(0, 40), filtroId: lookId, intensidade: I, parametros: out };
}

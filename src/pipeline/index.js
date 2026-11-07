/**
 * Filtros fotográficos — API pública do pipeline.
 *
 *   import { analyze, processImage, presetsFor } from './pipeline/index.js';
 *   const stats = analyze(imageData.data);
 *   processImage(imageData.data, imageData.data, w, h, presetsFor('neon-garoa').original, 1, stats,
 *                { look: 'neon-garoa' });
 */
import { buildLUT, applyLUT } from './lut.js';
import { applyDetail } from './detail.js';

export { analyze, adaptFactor, describeExposure } from './analyze.js';
export { buildLUT, applyLUT, makeColorFunction } from './lut.js';
export { applyDetail } from './detail.js';
export { LOOKS, DEFAULT_LOOK, getLook } from './looks.js';
export { DEFAULTS, PRESETS, PRESET_LABELS, PARAMS, presetsFor, defaultsFor, toPresetJSON, parsePreset } from './presets.js';

/**
 * Processa uma imagem RGBA completa. Não altera a resolução.
 * @param {Uint8ClampedArray} src
 * @param {Uint8ClampedArray} dst pode ser o mesmo array de src
 * @param {number} w
 * @param {number} h
 * @param {object} params
 * @param {number} intensity 0..1
 * @param {{key:number}} stats
 * @param {{look?:string, lut?:object, grainScale?:number, seed?:number}} [opts]
 */
export function processImage(src, dst, w, h, params, intensity, stats, opts = {}) {
  const lut = opts.lut || buildLUT(params, stats, intensity, opts.look);
  applyLUT(src, dst, lut);
  applyDetail(dst, w, h, params, intensity, { grainScale: opts.grainScale ?? 1, seed: opts.seed ?? 1337 });
  return lut;
}

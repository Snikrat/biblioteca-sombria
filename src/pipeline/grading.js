/**
 * Color grading por faixa de luminância (sombras / meios-tons / altas luzes).
 * As cores de cada faixa vêm do filtro (looks.js).
 */
import { smoothstep } from './colorspace.js';

/**
 * @param {number[]} rgb cor (0..1), alterada no lugar
 * @param {number} L luminância da cor
 * @param {number} strength força do grading (1 = padrão)
 * @param {{shadows:number[],mids:number[],highlights:number[],map?:number[][],mapMix?:number}} grading
 * @param {number} warmNeutralize 0..1 — neutraliza luz artificial quente nas altas luzes
 */
/** Interpola a escala de cor { stops: [[L, r, g, b], ...] } (valores 0..255) na luminância L. */
function sampleMap(stops, L) {
  if (L <= stops[0][0]) return stops[0].slice(1).map((v) => v / 255);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    if (L <= b[0]) {
      const t = (L - a[0]) / (b[0] - a[0]);
      return [1, 2, 3].map((c) => (a[c] + (b[c] - a[c]) * t) / 255);
    }
  }
  return stops[stops.length - 1].slice(1).map((v) => v / 255);
}

export function gradeByLuminance(rgb, L, strength, grading, warmNeutralize = 0) {
  const wS = 1 - smoothstep(0.0, 0.5, L);            // sombras
  const wM = Math.exp(-Math.pow((L - 0.5) / 0.2, 2)); // meios-tons
  const wH = smoothstep(0.6, 1.0, L);                 // altas luzes
  const { shadows: s, mids: m, highlights: h } = grading;
  for (let c = 0; c < 3; c++) rgb[c] += (s[c] * wS + m[c] * wM + h[c] * wH) * strength;

  // Colorização: mistura a cor com uma escala por luminância (filtros quase monocromáticos)
  if (grading.map) {
    const mix = Math.min(1, Math.max(0, (grading.mapMix ?? 0.85) * strength));
    const t = sampleMap(grading.map, L);
    for (let c = 0; c < 3; c++) rgb[c] += (t[c] - rgb[c]) * mix;
  }

  if (warmNeutralize > 0) {
    const warm = Math.max(0, rgb[0] - rgb[2]) * wH * warmNeutralize;
    rgb[0] -= warm;
    rgb[1] -= warm * 0.4;
  }
  return rgb;
}

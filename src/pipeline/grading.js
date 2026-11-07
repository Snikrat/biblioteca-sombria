/**
 * Color grading por faixa de luminância (sombras / meios-tons / altas luzes).
 * As cores de cada faixa vêm do filtro (looks.js).
 */
import { smoothstep } from './colorspace.js';

/**
 * @param {number[]} rgb cor (0..1), alterada no lugar
 * @param {number} L luminância da cor
 * @param {number} strength força do grading (1 = padrão)
 * @param {{shadows:number[],mids:number[],highlights:number[]}} grading
 * @param {number} warmNeutralize 0..1 — neutraliza luz artificial quente nas altas luzes
 */
export function gradeByLuminance(rgb, L, strength, grading, warmNeutralize = 0) {
  const wS = 1 - smoothstep(0.0, 0.5, L);            // sombras
  const wM = Math.exp(-Math.pow((L - 0.5) / 0.2, 2)); // meios-tons
  const wH = smoothstep(0.6, 1.0, L);                 // altas luzes
  const { shadows: s, mids: m, highlights: h } = grading;
  for (let c = 0; c < 3; c++) rgb[c] += (s[c] * wS + m[c] * wM + h[c] * wH) * strength;

  if (warmNeutralize > 0) {
    const warm = Math.max(0, rgb[0] - rgb[2]) * wH * warmNeutralize;
    rgb[0] -= warm;
    rgb[1] -= warm * 0.4;
  }
  return rgb;
}

/**
 * Manipulação HSL seletiva por faixa de matiz, com proteção de tons de pele.
 */
import { smoothstep } from './colorspace.js';

/** Peso suave (cosseno) de um matiz em relação ao centro de uma faixa. */
export function bandWeight(h, center, width) {
  let d = Math.abs(h - center);
  if (d > 180) d = 360 - d;
  return d >= width ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * d) / width);
}

/** Máscara de tons de pele (0..1) a partir de H, S, L. */
export function skinMask(h, s, l) {
  return bandWeight(h, 25, 22)
    * smoothstep(0.08, 0.18, s) * (1 - smoothstep(0.6, 0.8, s))
    * smoothstep(0.15, 0.3, l) * (1 - smoothstep(0.82, 0.95, l));
}

/**
 * Soma os ajustes das faixas (definidas em looks.js) para um matiz.
 * @returns {{dSat:number,dLum:number,dHue:number}}
 */
export function bandAdjustments(h, bands) {
  let dSat = 0, dLum = 0, dHue = 0;
  for (const b of bands) {
    const w = bandWeight(h, b.center, b.width);
    if (w > 0) { dSat += w * b.sat; dLum += w * b.lum; dHue += w * b.hue; }
  }
  return { dSat, dLum, dHue };
}

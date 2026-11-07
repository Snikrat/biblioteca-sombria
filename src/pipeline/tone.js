/**
 * Correção tonal: sombras, realces e curva de contraste.
 * Opera na luminância perceptual (sRGB) e garante f(0) = 0.
 */
import { clamp, smoothstep } from './colorspace.js';

/**
 * @param {object} p parâmetros do filtro
 * @param {number} af fator de adaptação à exposição
 * @returns {(x:number)=>number}
 */
export function makeToneCurve(p, af) {
  const sh = (p.shadows / 100) * (p.shadows < 0 ? Math.min(af, 1) : 1);
  const hi = (p.highlights / 100) * (p.highlights < 0 ? Math.min(af, 1.3) : 1);
  const k = (p.contrast / 100) * 1.2;
  const pivot = 0.45;

  return function tone(x) {
    // Sombras: ajuste multiplicativo — preserva as texturas relativas nos escuros
    x = x * (1 + sh * 0.6 * (1 - smoothstep(0.05, 0.55, x)));
    // Realces
    x = x + hi * 0.3 * smoothstep(0.45, 1, x) * x;
    // Curva S de contraste em torno do pivô
    const xc = clamp(x, 0, 1);
    const s = xc < pivot
      ? pivot * Math.pow(xc / pivot, 2)
      : 1 - (1 - pivot) * Math.pow((1 - xc) / (1 - pivot), 2);
    return x + k * (s - xc);
  };
}

/** Compressão suave dos brancos (evita realces estourados). */
export const highlightRolloff = (x, knee = 0.8) =>
  x <= knee ? x : knee + (1 - knee) * (1 - Math.exp(-(x - knee) / (1 - knee)));

/** Limites de preto/branco do "fade". */
export function fadeLimits(fade, fadeTop = 0.006) {
  return {
    floor: Math.max(0.008, 0.015 + 0.004 * fade),
    top: Math.min(1, 1 - fadeTop * Math.max(fade, 0)),
  };
}

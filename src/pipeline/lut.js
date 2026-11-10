/**
 * LUT 3D: todo o tratamento de cor (exposição, balanço de branco, curva tonal,
 * HSL, saturação, color grading, fade e intensidade) é pré-calculado numa
 * grade N×N×N e aplicado por interpolação trilinear — rápido em qualquer resolução.
 */
import { clamp, smoothstep, toLinear, toSrgb, luma, rgbToHsl, hslToRgb } from './colorspace.js';
import { adaptFactor } from './analyze.js';
import { makeToneCurve, highlightRolloff, fadeLimits } from './tone.js';
import { bandAdjustments, bandToneKeep, skinMask } from './hsl.js';
import { gradeByLuminance } from './grading.js';
import { getLook } from './looks.js';

/**
 * Função que trata uma única cor sRGB (0..1).
 * @param {object} p parâmetros
 * @param {{key:number}} stats
 * @param {string|object} look id do filtro (looks.js) ou definição
 */
export function makeColorFunction(p, stats, look) {
  const L0 = getLook(look), T = L0.tone;
  const af = p.adaptive ? adaptFactor(stats) : 1;
  const ev = p.exposure < 0 ? p.exposure * af : p.exposure;
  const expMul = Math.pow(2, ev);
  const t = p.temperature / 100, m = p.tint / 100;
  const wbR = 1 + 0.35 * t, wbB = 1 - 0.35 * t, wbG = 1 - 0.25 * m;
  const tone = makeToneCurve(p, af);
  const lowRatio = tone(1e-3) / 1e-3;
  const S = p.saturation / 100, sp = p.skinProtect / 100, st = p.gradeStrength / 60;
  const { floor, top } = fadeLimits(p.fade, T.fadeTop);
  const hasKeep = L0.bands.some((b) => b.keepTone);

  return function color(r0, g0, b0) {
    // 1) Exposição + balanço de branco em luz linear
    let r = toSrgb(toLinear(r0) * expMul * wbR);
    let g = toSrgb(toLinear(g0) * expMul * wbG);
    let b = toSrgb(toLinear(b0) * expMul * wbB);

    // 2) Curva tonal aplicada à luminância, preservando a cor
    const L = luma(r, g, b);
    let ratio = L > 1e-3 ? tone(L) / L : lowRatio;
    if (hasKeep) {
      const [h0, s0, l0] = rgbToHsl(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
      const keep = bandToneKeep(h0, s0, L0.bands) * (1 - skinMask(h0, s0, l0));
      // a cor protegida mantém o brilho de antes da exposição/curva
      if (keep > 0) ratio += (toSrgb(toLinear(L) / expMul) / Math.max(L, 1e-3) - ratio) * keep;
    }
    r = clamp(r * ratio, 0, 1); g = clamp(g * ratio, 0, 1); b = clamp(b * ratio, 0, 1);

    // 3) HSL seletivo com proteção de pele
    const [h, s, l] = rgbToHsl(r, g, b);
    const skin = skinMask(h, s, l);
    const protect = 1 - sp * skin * 0.85;
    const chroma = smoothstep(0.04, 0.22, s);
    let { dSat, dLum, dHue } = bandAdjustments(h, L0.bands);
    dSat *= protect; dLum *= protect * chroma; dHue *= protect * chroma;
    if (dLum !== 0 || dHue !== 0) [r, g, b] = hslToRgb(h + dHue, s, clamp(l * (1 + dLum), 0, 1));

    // 4) Saturação global preservando luminância; pele menos afetada; sombras profundas mais neutras
    const Lc = luma(r, g, b);
    const satMul = Math.max(0,
      (1 + dSat) * (1 + S * (1 - sp * skin * T.skinSatRelief)) * (1 - T.shadowDesat + T.shadowDesat * smoothstep(0.04, 0.3, Lc)));
    const rgb = [Lc + (r - Lc) * satMul, Lc + (g - Lc) * satMul, Lc + (b - Lc) * satMul];

    // 5) Color grading por faixa de luminância
    gradeByLuminance(rgb, Lc, st, L0.grading, T.warmNeutralize);

    // 6) Suavização de brancos + fade (pretos nunca chegam a 0 puro)
    for (let c = 0; c < 3; c++) rgb[c] = floor + highlightRolloff(clamp(rgb[c], 0, 1.2), T.knee) * (top - floor);
    return rgb;
  };
}

/**
 * @param {object} p parâmetros
 * @param {{key:number}} stats resultado de analyze()
 * @param {number} intensity 0..1
 * @param {string|object} look id do filtro
 * @param {number} [N=33] tamanho da grade
 */
export function buildLUT(p, stats, intensity, look, N = 33) {
  const color = makeColorFunction(p, stats, look);
  const I = clamp(intensity, 0, 1);
  const lut = new Float32Array(N * N * N * 3);
  let o = 0;
  for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
    const r0 = ri / (N - 1), g0 = gi / (N - 1), b0 = bi / (N - 1);
    const [r, g, b] = color(r0, g0, b0);
    lut[o++] = 255 * clamp(r0 + (r - r0) * I, 0, 1);
    lut[o++] = 255 * clamp(g0 + (g - g0) * I, 0, 1);
    lut[o++] = 255 * clamp(b0 + (b - b0) * I, 0, 1);
  }
  return { lut, N };
}

/** Aplica a LUT com interpolação trilinear (src e dst RGBA; podem ser o mesmo array). */
export function applyLUT(src, dst, { lut, N }) {
  const n1 = N - 1;
  const idx = new Int32Array(256), fr = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const x = (v / 255) * n1;
    let i = Math.floor(x);
    if (i >= n1) i = n1 - 1;
    idx[v] = i; fr[v] = x - i;
  }
  const sG = N * 3, sB = N * N * 3;
  for (let k = 0, len = src.length; k < len; k += 4) {
    const R = src[k], G = src[k + 1], B = src[k + 2];
    const fR = fr[R], fG = fr[G], fB = fr[B];
    const base = idx[B] * sB + idx[G] * sG + idx[R] * 3;
    for (let c = 0; c < 3; c++) {
      const p = base + c;
      const c00 = lut[p] + (lut[p + 3] - lut[p]) * fR;
      const c10 = lut[p + sG] + (lut[p + sG + 3] - lut[p + sG]) * fR;
      const c01 = lut[p + sB] + (lut[p + sB + 3] - lut[p + sB]) * fR;
      const c11 = lut[p + sB + sG] + (lut[p + sB + sG + 3] - lut[p + sB + sG]) * fR;
      const c0 = c00 + (c10 - c00) * fG, c1 = c01 + (c11 - c01) * fG;
      dst[k + c] = c0 + (c1 - c0) * fB;
    }
    dst[k + 3] = src[k + 3];
  }
}

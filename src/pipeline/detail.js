/**
 * Nitidez (só na luminância, com limiar anti-ruído e limite anti-halo)
 * e granulação cinematográfica monocromática.
 */
import { clamp } from './colorspace.js';

/** Desfoque gaussiano 3×3 separável. */
function blur3(Y, w, h) {
  const n = w * h, T = new Float32Array(n), B = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const r = y * w;
    for (let x = 0; x < w; x++) {
      const xl = x > 0 ? x - 1 : x, xr = x < w - 1 ? x + 1 : x;
      T[r + x] = (Y[r + xl] + 2 * Y[r + x] + Y[r + xr]) * 0.25;
    }
  }
  for (let y = 0; y < h; y++) {
    const ru = (y > 0 ? y - 1 : y) * w, r = y * w, rd = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) B[r + x] = (T[ru + x] + 2 * T[r + x] + T[rd + x]) * 0.25;
  }
  return B;
}

/**
 * @param {Uint8ClampedArray} d RGBA (alterado no lugar)
 * @param {number} w largura
 * @param {number} h altura
 * @param {object} p parâmetros
 * @param {number} intensity 0..1
 * @param {object} [opts] { grainScale: 1 na resolução final; seed }
 */
export function applyDetail(d, w, h, p, intensity, opts = {}) {
  const I = clamp(intensity, 0, 1);
  const amount = (p.sharpness / 100) * 1.6 * I;
  const grainAmp = (p.grain / 100) * 40 * I * (opts.grainScale ?? 1);
  if (Math.abs(amount) < 1e-3 && grainAmp < 1e-3) return;

  const n = w * h, Y = new Float32Array(n);
  for (let i = 0, k = 0; i < n; i++, k += 4) Y[i] = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
  const B = Math.abs(amount) >= 1e-3 ? blur3(Y, w, h) : null;

  let s = (opts.seed >>> 0) || 0x9e3779b9; // xorshift32 determinístico
  for (let i = 0, k = 0; i < n; i++, k += 4) {
    let delta = 0;
    if (B) {
      let dd = Y[i] - B[i];
      if (amount > 0) {
        const a = Math.abs(dd);
        dd = a < 2 ? 0 : Math.sign(dd) * Math.min(a - 2, 12); // limiar (ruído) + teto (halo)
      }
      delta += dd * amount;
    }
    if (grainAmp > 0) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const u1 = (s >>> 0) / 4294967296;
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const u2 = (s >>> 0) / 4294967296;
      const L = Y[i] / 255;
      delta += (u1 + u2 - 1) * grainAmp * (0.35 + 2.6 * L * (1 - L)); // mais grão nos meios-tons
    }
    d[k] += delta; d[k + 1] += delta; d[k + 2] += delta; // Uint8ClampedArray limita/arredonda
  }
}

/**
 * Análise da exposição original, usada para adaptar a intensidade do efeito.
 */
import { clamp, luma, toLinear } from './colorspace.js';

/**
 * Média logarítmica da luminância linear ("key" da cena).
 * @param {Uint8ClampedArray} data RGBA
 * @returns {{key:number}}
 */
export function analyze(data) {
  const n = data.length / 4;
  const step = Math.max(1, Math.floor(n / 200000));
  let sum = 0, count = 0;
  for (let i = 0; i < n; i += step) {
    const k = i * 4;
    const L = luma(toLinear(data[k] / 255), toLinear(data[k + 1] / 255), toLinear(data[k + 2] / 255));
    sum += Math.log(L + 1e-4);
    count++;
  }
  return { key: Math.exp(sum / count) };
}

/**
 * Fator de adaptação: < 1 em fotos escuras (suaviza o escurecimento),
 * > 1 em fotos claras (contém realces com mais força).
 */
export function adaptFactor(stats) {
  const k = stats ? stats.key : 0.12;
  if (k < 0.12) return clamp(Math.pow(k / 0.12, 0.8), 0.35, 1);
  return 1 + Math.min(0.35, (k - 0.12) * 2.5);
}

/** Descrição legível da leitura de exposição. */
export function describeExposure(stats) {
  const k = stats.key;
  if (k < 0.06) return 'foto bem escura — escurecimento suavizado';
  if (k < 0.12) return 'foto um pouco escura — escurecimento reduzido';
  if (k < 0.2) return 'exposição equilibrada';
  return 'foto clara — realces contidos com mais força';
}

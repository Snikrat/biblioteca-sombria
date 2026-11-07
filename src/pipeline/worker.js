/**
 * Web Worker: processa a imagem em resolução original fora da thread principal.
 * Mensagem: { buffer, width, height, params, intensity, stats, look }
 */
import { processImage } from './index.js';

self.onmessage = (e) => {
  const { buffer, width, height, params, intensity, stats, look } = e.data;
  try {
    const data = new Uint8ClampedArray(buffer);
    processImage(data, data, width, height, params, intensity, stats, { look, grainScale: 1, seed: 1337 });
    self.postMessage({ ok: true, buffer: data.buffer }, [data.buffer]);
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};

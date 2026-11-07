import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, buildLUT, processImage, makeColorFunction, PRESETS, LOOKS, presetsFor, parsePreset, toPresetJSON } from '../src/pipeline/index.js';

const STATS = { key: 0.12 };
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sat = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);

function gradient(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4;
    d[k] = (x * 255) / (w - 1); d[k + 1] = (y * 255) / (h - 1); d[k + 2] = ((x + y) * 127) / (w + h); d[k + 3] = 255;
  }
  return d;
}

test('pretos não são esmagados nem brancos estourados', () => {
  const f = makeColorFunction(PRESETS.original, STATS);
  const black = f(0, 0, 0), white = f(1, 1, 1);
  assert.ok(Math.min(...black) > 0.02, 'preto mantém informação');
  assert.ok(Math.max(...white) < 0.97, 'branco suavizado');
});

test('pretos recebem tom azul-petróleo (frio)', () => {
  const [r, , b] = makeColorFunction(PRESETS.original, STATS)(0.05, 0.05, 0.05);
  assert.ok(b > r);
});

test('não vira preto e branco', () => {
  const red = makeColorFunction(PRESETS.original, STATS)(0.7, 0.15, 0.12);
  assert.ok(sat(red) > 0.05, 'vermelho mantém identidade');
  assert.ok(red[0] > red[1] && red[0] > red[2]);
});

test('vermelhos ficam mais escuros e menos saturados', () => {
  const src = [0.75, 0.2, 0.15], out = makeColorFunction(PRESETS.original, STATS)(...src);
  assert.ok(lum(out) < lum(src)); assert.ok(sat(out) < sat(src));
});

test('amarelos perdem mais saturação que a pele', () => {
  const f = makeColorFunction(PRESETS.original, STATS);
  const skin = [0.85, 0.66, 0.55], yellow = [0.85, 0.8, 0.2];
  assert.ok(sat(f(...yellow)) / sat(yellow) < sat(f(...skin)) / sat(skin));
});

test('intensidade 0 preserva a imagem', () => {
  const w = 32, h = 32, src = gradient(w, h), dst = new Uint8ClampedArray(src.length);
  processImage(src, dst, w, h, PRESETS.original, 0, STATS);
  let maxDiff = 0; for (let i = 0; i < src.length; i++) maxDiff = Math.max(maxDiff, Math.abs(src[i] - dst[i]));
  assert.ok(maxDiff <= 1, `diferença máxima ${maxDiff}`);
});

test('processamento mantém resolução e é determinístico', () => {
  const w = 40, h = 30, src = gradient(w, h);
  const a = new Uint8ClampedArray(src.length), b = new Uint8ClampedArray(src.length);
  processImage(src, a, w, h, PRESETS.intenso, 1, analyze(src));
  processImage(src, b, w, h, PRESETS.intenso, 1, analyze(src));
  assert.equal(a.length, w * h * 4); assert.deepEqual(a, b);
});

test('adaptação: foto escura é escurecida menos', () => {
  const p = PRESETS.original, x = 0.3;
  const dark = makeColorFunction(p, { key: 0.03 })(x, x, x), normal = makeColorFunction(p, { key: 0.12 })(x, x, x);
  assert.ok(lum(dark) > lum(normal));
});

test('preset JSON: ida e volta e valores fora da faixa', () => {
  const json = toPresetJSON('Teste', presetsFor('neon-garoa').suave, 0.8, 'neon-garoa');
  const back = parsePreset(JSON.parse(JSON.stringify(json)));
  assert.deepEqual(back.parametros, presetsFor('neon-garoa').suave);
  assert.equal(back.filtroId, 'neon-garoa');
  // JSON da versão 1 (sem filtroId, com shadowTone)
  const v1 = parsePreset({ filtro: 'Biblioteca Sombria', parametros: { shadowTone: 33 } });
  assert.equal(v1.filtroId, 'biblioteca-sombria'); assert.equal(v1.parametros.gradeStrength, 33);
  assert.equal(parsePreset({ parametros: { contrast: 999 } }).parametros.contrast, 100);
  assert.throws(() => parsePreset(null));
});

test('LUT tem o tamanho esperado', () => {
  const { lut, N } = buildLUT(PRESETS.original, STATS, 1, 'biblioteca-sombria', 17);
  assert.equal(lut.length, N * N * N * 3);
});

const lookColor = (id, ...rgb) => makeColorFunction(presetsFor(id).original, STATS, id)(...rgb);

test('todos os filtros têm 3 presets e resultados diferentes', () => {
  const outs = Object.keys(LOOKS).map((id) => {
    assert.deepEqual(Object.keys(LOOKS[id].presets).sort(), ['intenso', 'original', 'suave']);
    return lookColor(id, 0.6, 0.45, 0.35).map((v) => v.toFixed(3)).join();
  });
  assert.equal(new Set(outs).size, outs.length);
});

test('Âmbar 1979 é quente e com pretos lavados', () => {
  const [r, , b] = lookColor('ambar-1979', 0.6, 0.6, 0.6);
  assert.ok(r > b + 0.04);
  assert.ok(Math.min(...lookColor('ambar-1979', 0, 0, 0)) > 0.08);
});

test('Sala Escura é quase P&B, mas o vermelho sobrevive', () => {
  assert.ok(sat(lookColor('sala-escura', 0.3, 0.6, 0.4)) < 0.05, 'verde vira cinza');
  const red = lookColor('sala-escura', 0.75, 0.15, 0.12);
  assert.ok(red[0] - Math.max(red[1], red[2]) > 0.05, 'vermelho visível');
});

test('Neon Garoa: sombras azuladas e altas luzes rosadas', () => {
  const dark = lookColor('neon-garoa', 0.12, 0.12, 0.12), light = lookColor('neon-garoa', 0.85, 0.85, 0.85);
  assert.ok(dark[2] > dark[0] + 0.03);
  assert.ok(light[0] > light[1] && light[2] > light[1]);
});

test('Ultravioleta: tudo vira violeta, do escuro ao claro', () => {
  for (const rgb of [[0.1, 0.1, 0.1], [0.5, 0.45, 0.4], [0.2, 0.6, 0.3], [0.85, 0.85, 0.85]]) {
    const [r, g, b] = lookColor('ultravioleta', ...rgb);
    assert.ok(b > r && r > g, `violeta esperado para ${rgb}`);
  }
});

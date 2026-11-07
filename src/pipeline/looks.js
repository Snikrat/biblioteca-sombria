/**
 * Definição dos filtros ("looks").
 *
 * Cada filtro descreve:
 *  - presets: Suave / Original / Intenso (valores dos controles)
 *  - bands:   ajustes HSL por faixa de matiz (Δsat, Δlum, deslocamento de matiz em graus)
 *  - grading: deslocamento RGB somado em sombras, meios-tons e altas luzes
 *  - tone:    knee (início da compressão dos brancos), fadeTop (quanto o fade escurece os brancos),
 *             shadowDesat (neutraliza sombras profundas), skinSatRelief (quanto a pele escapa da
 *             dessaturação global), warmNeutralize (neutraliza luz artificial quente nas altas luzes)
 *
 * Para criar um filtro novo, copie um bloco, mude o id e ajuste os números.
 */

const band = (center, width, sat, lum = 0, hue = 0) => ({ center, width, sat, lum, hue });

export const LOOKS = {
  'biblioteca-sombria': {
    name: 'Biblioteca Sombria',
    tagline: 'Frio e silencioso, com vermelhos contidos.',
    swatch: ['#0f1416', '#2c3b3d', '#5c6b6c', '#6b2a28', '#c9cfd0'],
    presets: {
      suave:    { exposure: -0.10, contrast: 15, saturation: -35, temperature: -5,  tint: -2, highlights: -12, shadows: -20, sharpness: 10, grain: 8,  fade: 4, gradeStrength: 40, skinProtect: 75, adaptive: true },
      original: { exposure: -0.20, contrast: 25, saturation: -55, temperature: -8,  tint: -4, highlights: -20, shadows: -35, sharpness: 15, grain: 12, fade: 6, gradeStrength: 60, skinProtect: 70, adaptive: true },
      intenso:  { exposure: -0.30, contrast: 35, saturation: -70, temperature: -12, tint: -6, highlights: -30, shadows: -50, sharpness: 18, grain: 18, fade: 8, gradeStrength: 85, skinProtect: 65, adaptive: true },
    },
    bands: [
      band(0, 28, -0.06, -0.18),        // vermelho: escuro, mantém identidade
      band(30, 22, -0.20, -0.02),       // laranja
      band(58, 26, -0.55, -0.06, -4),   // amarelo: bem menos saturado
      band(120, 50, -0.25, -0.10, 22),  // verde → verde-petróleo
      band(180, 30, -0.05, -0.06),      // ciano
      band(222, 40, -0.05, -0.15),      // azul: frio e mais escuro
      band(275, 30, -0.35, -0.05),      // roxo
      band(322, 30, -0.35, -0.05),      // magenta
    ],
    grading: {
      shadows: [-0.020, 0.006, 0.020],     // azul-petróleo escuro
      mids: [-0.010, -0.002, 0.010],       // cinza frio
      highlights: [-0.006, 0, 0.008],      // branco neutro levemente azulado
    },
    tone: { knee: 0.80, fadeTop: 0.006, shadowDesat: 0.20, skinSatRelief: 0.5, warmNeutralize: 0.5 },
  },

  'ambar-1979': {
    name: 'Âmbar 1979',
    tagline: 'Filme quente de tarde dourada, pretos desbotados.',
    swatch: ['#2b2418', '#5a4a2c', '#a8743c', '#d9b77a', '#efe3c4'],
    presets: {
      suave:    { exposure: 0.00, contrast: 8,  saturation: -10, temperature: 12, tint: 3, highlights: -15, shadows: 5,  sharpness: 5, grain: 18, fade: 16, gradeStrength: 40, skinProtect: 60, adaptive: true },
      original: { exposure: 0.05, contrast: 12, saturation: -18, temperature: 22, tint: 6, highlights: -25, shadows: 10, sharpness: 5, grain: 28, fade: 26, gradeStrength: 60, skinProtect: 60, adaptive: true },
      intenso:  { exposure: 0.05, contrast: 18, saturation: -26, temperature: 30, tint: 8, highlights: -35, shadows: 15, sharpness: 5, grain: 40, fade: 38, gradeStrength: 85, skinProtect: 55, adaptive: true },
    },
    bands: [
      band(0, 28, -0.10, 0, 4),          // vermelho puxa para tijolo
      band(30, 22, 0.05, 0.02),          // laranja: pele dourada
      band(58, 26, -0.10, 0, -6),        // amarelo → ocre
      band(120, 50, -0.45, -0.10, -25),  // verde → oliva
      band(180, 30, -0.30, 0, 10),       // ciano desbotado
      band(222, 40, -0.35, 0.05, -15),   // azul → azul-petróleo desbotado
      band(275, 30, -0.50),              // roxo
      band(322, 30, -0.40),              // magenta
    ],
    grading: {
      shadows: [0.030, 0.026, -0.010],     // sombras oliva-marrom levantadas
      mids: [0.040, 0.016, -0.034],        // meios-tons quentes
      highlights: [0.030, 0.018, -0.045],  // altas luzes creme
    },
    tone: { knee: 0.72, fadeTop: 0.0025, shadowDesat: 0.30, skinSatRelief: 0.5, warmNeutralize: 0 },
  },

  'sala-escura': {
    name: 'Sala Escura',
    tagline: 'Noir quase preto e branco, só o vermelho resiste.',
    swatch: ['#050505', '#262626', '#5e5e5e', '#5a1414', '#d8d6d2'],
    presets: {
      suave:    { exposure: -0.05, contrast: 30, saturation: -80, temperature: 0, tint: 0, highlights: -5,  shadows: -15, sharpness: 15, grain: 14, fade: 2, gradeStrength: 40, skinProtect: 50, adaptive: true },
      original: { exposure: -0.15, contrast: 45, saturation: -90, temperature: 0, tint: 0, highlights: -10, shadows: -30, sharpness: 22, grain: 22, fade: 3, gradeStrength: 60, skinProtect: 50, adaptive: true },
      intenso:  { exposure: -0.25, contrast: 60, saturation: -96, temperature: 0, tint: 0, highlights: -15, shadows: -45, sharpness: 25, grain: 32, fade: 4, gradeStrength: 80, skinProtect: 45, adaptive: true },
    },
    bands: [
      band(0, 30, 1.20, -0.08),          // vermelho sobrevive à dessaturação
      band(30, 22, -0.30, 0.06),         // laranja: pele luminosa
      band(58, 26, -0.30, 0.05),         // amarelo claro
      band(120, 50, -0.30, -0.10),       // verde escuro
      band(180, 30, -0.30, -0.08),
      band(222, 40, -0.30, -0.25),       // azul/céu bem escuro (como filtro vermelho)
      band(275, 30, -0.30, -0.10),
      band(322, 30, 0.40, -0.05),        // magenta ajuda o vermelho
    ],
    grading: {
      shadows: [-0.004, 0, 0.008],         // preto de tinta, levemente frio
      mids: [0, 0, 0],
      highlights: [0.008, 0.005, -0.004],  // prata quente (gelatina de prata)
    },
    tone: { knee: 0.85, fadeTop: 0.006, shadowDesat: 0.20, skinSatRelief: 0.15, warmNeutralize: 0.3 },
  },

  'neon-garoa': {
    name: 'Neon Garoa',
    tagline: 'Noite de chuva na cidade, ciano e magenta.',
    swatch: ['#070b1a', '#123a4a', '#1fb5c4', '#c2307e', '#f2a7d6'],
    presets: {
      suave:    { exposure: -0.10, contrast: 15, saturation: 0,  temperature: -8,  tint: 6,  highlights: -20, shadows: -12, sharpness: 10, grain: 6,  fade: 3, gradeStrength: 45, skinProtect: 70, adaptive: true },
      original: { exposure: -0.15, contrast: 22, saturation: 10, temperature: -15, tint: 12, highlights: -30, shadows: -20, sharpness: 12, grain: 10, fade: 4, gradeStrength: 70, skinProtect: 70, adaptive: true },
      intenso:  { exposure: -0.25, contrast: 32, saturation: 20, temperature: -22, tint: 18, highlights: -40, shadows: -30, sharpness: 15, grain: 14, fade: 5, gradeStrength: 95, skinProtect: 65, adaptive: true },
    },
    bands: [
      band(0, 28, 0.20, 0, -26),         // vermelho → magenta
      band(30, 22, -0.10, 0, -4),        // laranja (pele protegida)
      band(58, 26, -0.50, -0.05, -10),   // amarelo apagado
      band(120, 50, -0.20, -0.05, 45),   // verde → ciano
      band(180, 30, 0.30, 0, 5),         // ciano elétrico
      band(222, 40, 0.20, -0.10, -8),    // azul → azul-ciano
      band(275, 30, 0.25, 0, 20),        // roxo → magenta
      band(322, 30, 0.30, 0.05),         // magenta vibrante
    ],
    grading: {
      shadows: [-0.030, 0.022, 0.075],     // azul-petróleo profundo
      mids: [0.020, -0.030, 0.045],        // violeta
      highlights: [0.055, -0.035, 0.040],  // brilho rosa-magenta
    },
    tone: { knee: 0.78, fadeTop: 0.004, shadowDesat: 0.10, skinSatRelief: 0.5, warmNeutralize: 0 },
  },

  'ultravioleta': {
    name: 'Ultravioleta',
    tagline: 'Quarto banhado em luz roxa, quase monocromático.',
    swatch: ['#0e0524', '#2d1264', '#5c2ec8', '#7c48ec', '#cdb2ff'],
    presets: {
      suave:    { exposure: -0.05, contrast: 8,  saturation: -30, temperature: 0, tint: 0, highlights: -10, shadows: -5,  sharpness: 8,  grain: 6,  fade: 3, gradeStrength: 40, skinProtect: 30, adaptive: true },
      original: { exposure: -0.10, contrast: 12, saturation: -40, temperature: 0, tint: 0, highlights: -15, shadows: -10, sharpness: 8,  grain: 8,  fade: 4, gradeStrength: 60, skinProtect: 20, adaptive: true },
      intenso:  { exposure: -0.20, contrast: 18, saturation: -50, temperature: 0, tint: 0, highlights: -20, shadows: -20, sharpness: 10, grain: 10, fade: 4, gradeStrength: 85, skinProtect: 10, adaptive: true },
    },
    bands: [],
    grading: {
      shadows: [0, 0, 0], mids: [0, 0, 0], highlights: [0, 0, 0],
      // Escala medida na foto de referência: o mesmo violeta (~258°) do preto ao claro
      map: [
        [0.00, 14, 5, 36],
        [0.15, 45, 18, 100],
        [0.35, 92, 46, 200],
        [0.60, 124, 72, 236],
        [0.80, 152, 100, 246],
        [1.00, 205, 178, 255],
      ],
      mapMix: 0.85,
    },
    tone: { knee: 0.85, fadeTop: 0.003, shadowDesat: 0, skinSatRelief: 0.2, warmNeutralize: 0 },
  },
};

export const DEFAULT_LOOK = 'biblioteca-sombria';

/** Aceita id ou objeto; cai no filtro padrão se o id não existir. */
export function getLook(look) {
  if (look && typeof look === 'object') return look;
  return LOOKS[look] || LOOKS[DEFAULT_LOOK];
}

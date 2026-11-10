# Filtros fotográficos — Biblioteca Sombria e outros

Oito filtros fotográficos que rodam 100% no navegador, sem dependências, e exportam na resolução original. Cada um tem os presets Suave, Original e Intenso.

| Filtro | Visual |
|---|---|
| **Biblioteca Sombria** | gótico frio / dark academia: sombras azul-petróleo, saturação baixa, vermelhos escuros, pele pálida |
| **Âmbar 1979** | filme analógico quente: pretos lavados, verdes oliva, altas luzes creme, grão aparente |
| **Sala Escura** | noir quase preto e branco, alto contraste, só o vermelho sobrevive discreto |
| **Neon Garoa** | noite chuvosa / cyberpunk: sombras azul-petróleo profundas, vermelhos → magenta, brilho rosado |
| **Ultravioleta** | quarto banhado em luz roxa: imagem quase monocromática em violeta, do preto ao lilás |
| **Penumbra** | fim de tarde sem luz: escuro, azul-ardósia, brancos baixos, pele e cores apagadas |
| **Vermelho Veludo** | escuridão quase total, pretos profundos, tons neutros-quentes, só o vermelho acende |
| **Capela de Pedra** | gótico sépia: marrom de pedra antiga do preto ao marfim, verdes viram musgo, flores malva desbotadas |

O seletor mostra a sua própria foto em miniatura com cada filtro aplicado.

## Como rodar

```cmd
cd biblioteca-sombria
npm start
```

Abra **http://localhost:5173**. (Os módulos ES precisam de um servidor: abrir o `index.html` direto pelo Explorador não funciona.)

Testes do pipeline:

```cmd
npm test
```

Requer Node.js 18 ou superior (o comando `npm test` usa glob do `node --test`, disponível a partir do Node 21).

## Estrutura

```
index.html              interface
css/style.css           estilos
src/
  pipeline/             processamento (puro, sem DOM — usável em Node, worker ou navegador)
    colorspace.js       sRGB ↔ linear, RGB ↔ HSL, utilidades
    analyze.js          leitura da exposição original e fator de adaptação
    tone.js             correção tonal: sombras, realces, curva S de contraste, fade, compressão de brancos
    hsl.js              ajustes HSL por faixa de matiz + máscara de pele
    grading.js          color grading por faixa de luminância
    lut.js              monta a LUT 3D com todo o tratamento de cor e aplica por interpolação trilinear
    detail.js           nitidez na luminância (limiar anti-ruído, teto anti-halo) e granulação
    looks.js            definição dos filtros (presets, faixas HSL, cores do grading, curva)
    presets.js          controles e JSON de preset
    worker.js           processamento em resolução original fora da thread principal
    index.js            API pública (processImage)
  ui/
    app.js              controles, presets, abertura e exportação
    compare.js          comparação antes/depois
    storage.js          presets salvos no navegador e downloads
presets/*.json          presets de todos os filtros (importáveis na interface)
tests/                  testes (node --test)
server.js               servidor estático sem dependências
```

## Pipeline

O mesmo pipeline serve para todos os filtros; o que muda entre eles vem de `looks.js`.

1. **Exposição e balanço de branco** em luz linear (temperatura e matiz).
2. **Curva tonal** na luminância, preservando a cor: sombras multiplicativas (mantêm textura em cabelo, roupa escura e tatuagens), realces e curva S de contraste.
3. **HSL seletivo** por faixa de matiz (vermelho, laranja, amarelo, verde, ciano, azul, roxo, magenta), definido por filtro. A **máscara de pele** reduz esses ajustes nos tons de pele.
4. **Saturação global** preservando a luminância, menor na pele.
5. **Color grading por luminância**: uma cor para sombras, meios-tons e altas luzes, definida por filtro. Filtros com uma cor dominante (Ultravioleta, Penumbra, Capela de Pedra) usam também uma escala de cor (`grading.map`) misturada conforme a luminosidade.
6. **Compressão de brancos + fade**: pretos nunca chegam a 0 puro, brancos sem estourar.
7. **Intensidade global** (0–100%) mistura com o original.
8. **Nitidez + granulação** aplicadas após a LUT.

Os passos 1–7 são pré-calculados numa **LUT 3D 33³**, então ajustar sliders na prévia é instantâneo e a exportação em alta resolução é rápida.

**Adaptação à exposição**: `analyze()` mede a média logarítmica da luminância. Em fotos escuras, a exposição negativa e o escurecimento das sombras são reduzidos. Em fotos claras, os realces são contidos com mais força. Dá para desligar no painel.

## Usar o pipeline em outro projeto

```js
import { analyze, processImage, presetsFor } from './src/pipeline/index.js';

const img = ctx.getImageData(0, 0, w, h);
const stats = analyze(img.data);
processImage(img.data, img.data, w, h, presetsFor('ambar-1979').original, 1 /* intensidade */, stats,
             { look: 'ambar-1979' });
ctx.putImageData(img, 0, 0);
```

IDs dos filtros: `biblioteca-sombria`, `ambar-1979`, `sala-escura`, `neon-garoa`, `ultravioleta`, `penumbra`, `vermelho-veludo`, `capela-de-pedra`.

## Criar um filtro novo

Em `src/pipeline/looks.js`, copie um bloco existente, dê um id novo e ajuste `presets`, `bands`, `grading` e `tone`. Ele aparece sozinho no seletor.

## Formato do preset (JSON)

```json
{
  "filtro": "Biblioteca Sombria",
  "filtroId": "biblioteca-sombria",
  "versao": 2,
  "nome": "Original",
  "intensidade": 100,
  "parametros": {
    "exposure": -0.2, "contrast": 25, "saturation": -55, "temperature": -8, "tint": -4,
    "highlights": -20, "shadows": -35, "sharpness": 15, "grain": 12, "fade": 6,
    "gradeStrength": 60, "skinProtect": 70, "adaptive": true
  }
}
```

Os valores vão de -100 a +100, exceto `exposure` (EV, -2 a +2) e `gradeStrength`/`skinProtect`/`grain` (0 a 100). Presets da versão 1 (com `shadowTone`) continuam sendo aceitos.

## Ajuste fino

- Faixas HSL, cores do grading e curva de cada filtro: `src/pipeline/looks.js`.
- Tamanho máximo da prévia: `PREVIEW_MAX_SIDE` em `src/ui/app.js`.

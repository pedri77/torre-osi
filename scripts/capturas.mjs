// Capturas de QA a lo largo del scroll con Playwright y el Chrome instalado.
// Uso: node capturas.mjs <url> <prefijo-salida> <ancho> <alto> [reducido=0|1]
// Ejemplo: node capturas.mjs http://localhost:5173/ /tmp/cap/d 1440 900
//          PUNTOS=0.05,0.1 node capturas.mjs … (fracciones del scroll total)
// Requiere playwright-core accesible: `npm i -g @playwright/cli` o `npm i -D playwright-core`.
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

let chromium;
try {
  ({chromium} = await import('playwright-core'));
} catch {
  // Módulos globales de npm. PLAYWRIGHT_CORE permite fijar la ruta a mano.
  const raices = [
    join(dirname(process.execPath), '..', 'lib', 'node_modules'),
    '/opt/homebrew/lib/node_modules',
    '/usr/local/lib/node_modules',
  ];
  const candidatos = [process.env.PLAYWRIGHT_CORE, ...raices.flatMap((r) => [`${r}/playwright-core`, `${r}/@playwright/cli/node_modules/playwright-core`])].filter(Boolean);
  const require = createRequire(import.meta.url);
  for (const c of candidatos) {
    try {
      ({chromium} = require(c));
      break;
    } catch {}
  }
}
if (!chromium) throw new Error('No encuentro playwright-core');

const [url, salida, vw = '1440', vh = '900', reducido = '0'] = process.argv.slice(2);
const navegador = await chromium.launch({channel: 'chrome'});
const pagina = await navegador.newPage({viewport: {width: +vw, height: +vh}, reducedMotion: reducido === '1' ? 'reduce' : 'no-preference'});
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
pagina.on('response', (r) => r.status() >= 400 && errores.push(`${r.status()} ${r.url()}`));
await pagina.goto(url, {waitUntil: 'networkidle'});
await pagina.waitForTimeout(800);
const H = await pagina.evaluate(() => document.documentElement.scrollHeight - innerHeight);
// PUNTOS=0.05,0.1 para elegir fracciones del scroll total.
const puntos = process.env.PUNTOS ? process.env.PUNTOS.split(',').map(Number) : [0, 0.03, 0.08, 0.13, 0.2, 0.3, 0.38, 0.47, 0.56, 0.66, 0.75, 0.85, 1];
for (const f of puntos) {
  await pagina.evaluate((y) => window.scrollTo(0, y), Math.round(H * f));
  await pagina.mouse.wheel(0, 1);
  await pagina.waitForTimeout(1300); // deja que Lenis y las transiciones asienten
  await pagina.screenshot({path: `${salida}-${String(Math.round(f * 100)).padStart(3, '0')}.png`});
}
console.log(JSON.stringify({alto_scroll: H, errores}));
await navegador.close();

import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import rough from 'roughjs';
import { PASOS, CATALOGO, HISTORICO, type Paso } from './data';
import { Torre, type Estado } from './torre';
import { iniciarPortada } from './hero3d';

gsap.registerPlugin(ScrollTrigger);

const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element>(sel: string) => document.querySelector(sel) as T;

(document.getElementById('enlace-catalogo') as HTMLAnchorElement).href = CATALOGO;
(document.getElementById('enlace-historico') as HTMLAnchorElement).href = HISTORICO;

// ---------- Portada 3D ----------
const portada = $<HTMLElement>('#portada');
iniciarPortada(portada, $<HTMLCanvasElement>('#c3d'), [...portada.querySelectorAll<HTMLElement>('.etiquetas span')], reducido);

const tlPortada = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: portada, start: 'top top', end: 'bottom bottom', scrub: true },
});
tlPortada
  .to('.titular', { opacity: 0, y: -40, duration: 0.25 }, 0.05)
  .to('.pista', { opacity: 0, duration: 0.05 }, 0)
  .fromTo('.cierre-portada', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.15 }, 0.68)
  .to('.cierre-portada', { opacity: 0, duration: 0.08 }, 0.92);

// ---------- Enlaces a MITRE ----------
const urlAttack = (id: string) => `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`;
const urlCwe = (id: string) => `https://cwe.mitre.org/data/definitions/${id.slice(4)}.html`;

// ---------- Tira de la kill chain (Rough en SVG) ----------
const tira = $<SVGSVGElement>('#tira');
let nodos: SVGGElement[] = [];
let tramos: SVGGElement[] = [];

function dibujarTira() {
  const rs = rough.svg(tira);
  tira.innerHTML = '';
  nodos = [];
  tramos = [];
  const w = tira.clientWidth;
  const movil = w < 600;
  const margen = movil ? 18 : 40;
  const paso = (w - margen * 2) / 6;
  const cy = 26;
  for (let i = 0; i < 7; i++) {
    const x = margen + i * paso;
    if (i > 0) {
      const t = rs.line(x - paso + 14, cy, x - 14, cy, { stroke: '#ef4444', strokeWidth: 2, roughness: 1.3, seed: 40 + i });
      t.querySelectorAll('path').forEach((p) => {
        const l = p.getTotalLength();
        p.style.strokeDasharray = `${l}`;
        p.style.strokeDashoffset = `${l}`;
      });
      tira.appendChild(t);
      tramos.push(t);
      const base = rs.line(x - paso + 14, cy, x - 14, cy, { stroke: '#333', strokeWidth: 1, roughness: 1, seed: 80 + i });
      tira.insertBefore(base, tira.firstChild);
    }
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const c = rs.circle(x, cy, 22, { stroke: '#f2ece1', strokeWidth: 1.5, fill: '#0b0b0b', fillStyle: 'solid', roughness: 1.2, seed: 20 + i });
    const lleno = rs.circle(x, cy, 22, { stroke: '#ef4444', strokeWidth: 2, fill: '#ef4444', fillStyle: 'hachure', hachureGap: 3.5, roughness: 1.4, seed: 60 + i });
    lleno.classList.add('lleno');
    lleno.style.opacity = '0';
    const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    num.setAttribute('x', String(x));
    num.setAttribute('y', String(cy + 5));
    num.setAttribute('text-anchor', 'middle');
    num.style.fontWeight = '700';
    num.style.fill = '#f2ece1';
    num.textContent = `L${i + 1}`;
    g.append(c, lleno, num);
    if (!movil) {
      const et = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      et.setAttribute('x', String(x));
      et.setAttribute('y', String(cy + 34));
      et.setAttribute('text-anchor', 'middle');
      et.textContent = PASOS[i].fase.toLowerCase();
      g.appendChild(et);
    }
    tira.appendChild(g);
    nodos.push(g);
  }
  pintarTira(pasoActual, false);
}

function pintarTira(n: number, animar = true) {
  const d = animar && !reducido ? 0.5 : 0;
  nodos.forEach((g, i) => {
    const on = i < Math.min(n, 7);
    g.classList.toggle('activa', on);
    gsap.to(g.querySelector('.lleno'), { opacity: on ? 1 : 0, duration: d });
  });
  tramos.forEach((t, i) => {
    const on = i + 1 < Math.min(n, 7);
    t.querySelectorAll('path').forEach((p) => gsap.to(p, { strokeDashoffset: on ? 0 : p.getTotalLength(), duration: d, ease: 'power2.out' }));
  });
}

// ---------- Ficha ----------
const ficha = $<HTMLElement>('#ficha');
const cuerpoFicha = ficha.querySelector<HTMLElement>('.ficha-cuerpo')!;
const marco = ficha.querySelector<SVGSVGElement>('.marco')!;

function dibujarMarco() {
  marco.innerHTML = '';
  const w = ficha.clientWidth;
  const h = ficha.clientHeight;
  if (!w || !h) return;
  const rs = rough.svg(marco);
  marco.appendChild(rs.rectangle(3, 3, w - 6, h - 6, { stroke: '#f2ece1', strokeWidth: 1.4, roughness: 1.5, seed: 5 }));
}

function htmlPaso(p: Paso) {
  const chips = [
    ...p.attack.map((a) => `<li class="attack"><a href="${urlAttack(a)}" target="_blank" rel="noopener">ATT&amp;CK ${a}</a></li>`),
    ...p.cwe.map((c) => `<li><a href="${urlCwe(c)}" target="_blank" rel="noopener">${c}</a></li>`),
  ].join('');
  return `
    <p class="fase">paso ${p.capa} de 7 · ${p.fase}</p>
    <h2>L${p.capa} ${p.nombreCapa}: ${p.ataque}</h2>
    <p class="relato">${p.relato}</p>
    <ul class="chips">${chips}</ul>
    <p class="control"><b>lo que lo habría parado</b>${p.control}</p>
    <p class="clase">clase ${p.clase} del catálogo</p>`;
}

const FICHA_INICIO = `
  <p class="fase">escenario ilustrativo</p>
  <h2>Un intruso entra en la oficina</h2>
  <p class="relato">Lleva una mochila y un mini PC. Su objetivo: sacar datos sin que nadie lo note. Va a necesitar un paso en cada capa.</p>
  <p class="control"><b>sigue bajando</b>Cada paso deja su capa marcada en rojo.</p>`;

const FICHA_FIN = `
  <p class="fase">impacto</p>
  <h2>La torre se cae</h2>
  <p class="relato">Siete fallos pequeños, ninguno espectacular. Con los datos fuera, la red entera queda en entredicho: credenciales, sesiones, tráfico. Toca reconstruir.</p>
  <p class="control"><b>la lección</b>Cada control habría roto la cadena en su capa. No hace falta tenerlos todos, pero sí más de uno.</p>`;

function contenidoFicha(n: number) {
  if (n <= 0) return FICHA_INICIO;
  if (n >= 8) return FICHA_FIN;
  return htmlPaso(PASOS[n - 1]);
}

let fichaMostrada = -1;
function mostrarFicha(n: number) {
  if (n === fichaMostrada) return;
  fichaMostrada = n;
  const html = contenidoFicha(n);
  if (reducido) {
    cuerpoFicha.innerHTML = html;
    return;
  }
  gsap.killTweensOf(cuerpoFicha);
  gsap.to(cuerpoFicha, {
    opacity: 0,
    y: -8,
    duration: 0.15,
    onComplete: () => {
      cuerpoFicha.innerHTML = html;
      gsap.fromTo(cuerpoFicha, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    },
  });
}

// ---------- Torre del relato ----------
const torreRelato = new Torre($<HTMLCanvasElement>('#c2d'), { reducido });
let pasoActual = 0;

function irA(n: number) {
  if (n === pasoActual) return;
  const anterior = pasoActual;
  pasoActual = n;
  mostrarFicha(n);
  pintarTira(n);
  if (n === anterior + 1 && n >= 1 && n <= 7 && !torreRelato.colapsada) {
    torreRelato.disparar(n);
    return;
  }
  if (n === 8 && anterior === 7) {
    torreRelato.colapsar();
    return;
  }
  // Salto o vuelta atrás: se restaura el estado sin animación.
  const estados: Estado[] = Array.from({ length: 7 }, (_, i) => (i < Math.min(n, 7) ? 'comprometida' : 'sana'));
  torreRelato.construir(estados);
  if (n >= 8) torreRelato.colapsar(true);
}

ScrollTrigger.create({
  trigger: '#cadena',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (st) => irA(Math.min(8, Math.floor(st.progress * 9))),
});

// ---------- Juego ----------
const MAX_CONTROLES = 3;
const torreJuego = new Torre($<HTMLCanvasElement>('#cdef'), { interactiva: true, reducido });
const lista = $<HTMLOListElement>('#controles');
const btnAtacar = $<HTMLButtonElement>('#atacar');
const btnReiniciar = $<HTMLButtonElement>('#reiniciar');
const veredicto = $<HTMLParagraphElement>('#veredicto');
const elegidos = new Set<number>();
let enMarcha = false;
let jugada = 0;

PASOS.forEach((p) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" aria-pressed="false" data-capa="${p.capa}"><span class="n">L${p.capa}</span><span>${p.control}</span></button>`;
  lista.appendChild(li);
});
const botonesControl = [...lista.querySelectorAll<HTMLButtonElement>('button')];

function refrescarControles() {
  botonesControl.forEach((b) => {
    const c = Number(b.dataset.capa);
    const on = elegidos.has(c);
    b.setAttribute('aria-pressed', String(on));
    b.disabled = enMarcha || (!on && elegidos.size >= MAX_CONTROLES);
  });
  btnAtacar.disabled = enMarcha;
}

function estadosJuego(): Estado[] {
  return Array.from({ length: 7 }, (_, i) => (elegidos.has(i + 1) ? 'protegida' : 'sana'));
}

botonesControl.forEach((b) =>
  b.addEventListener('click', () => {
    const c = Number(b.dataset.capa);
    if (elegidos.has(c)) elegidos.delete(c);
    else if (elegidos.size < MAX_CONTROLES) elegidos.add(c);
    torreJuego.construir(estadosJuego());
    veredicto.classList.remove('malo');
    veredicto.textContent = `${elegidos.size} de ${MAX_CONTROLES} controles puestos.`;
    refrescarControles();
  }),
);

btnReiniciar.addEventListener('click', () => {
  jugada++;
  enMarcha = false;
  torreJuego.construir(estadosJuego());
  veredicto.classList.remove('malo');
  veredicto.textContent = 'Torre en pie. Ajusta los controles y vuelve a atacar.';
  refrescarControles();
});

const espera = (s: number) => new Promise((r) => gsap.delayedCall(reducido ? 0.05 : s, r));

btnAtacar.addEventListener('click', async () => {
  const mia = ++jugada;
  enMarcha = true;
  refrescarControles();
  torreJuego.construir(estadosJuego());
  veredicto.classList.remove('malo');
  let rodeos = 2;
  let caidas = 0;
  let paradaEn = 0;
  for (let capa = 1; capa <= 7; capa++) {
    veredicto.textContent = `Paso ${capa}: ${PASOS[capa - 1].ataque.toLowerCase()}…`;
    const r = await torreJuego.disparar(capa);
    if (mia !== jugada) return;
    if (r === 'rebote') {
      rodeos--;
      if (rodeos < 0) {
        paradaEn = capa;
        break;
      }
      veredicto.textContent = `L${capa} aguanta. El intruso da un rodeo (le quedan ${rodeos}).`;
    } else {
      if (r === 'perdido') torreJuego.setEstado(capa, 'comprometida');
      caidas++;
    }
    await espera(0.55);
    if (mia !== jugada) return;
  }
  if (paradaEn) {
    const enPie = 7 - caidas;
    veredicto.textContent =
      `Cadena rota en L${paradaEn}. Torre en pie con ${enPie} de 7 capas sanas.` +
      (caidas ? ` Cuanto más abajo cortes, menos capas caen por el camino.` : ' Defensa perfecta.');
  } else {
    await espera(0.3);
    if (mia !== jugada) return;
    torreJuego.colapsar();
    veredicto.classList.add('malo');
    veredicto.textContent =
      elegidos.size < MAX_CONTROLES
        ? `Exfiltración completada: la torre cae. Te sobraban ${MAX_CONTROLES - elegidos.size} controles.`
        : 'Exfiltración completada: la torre cae.';
  }
  enMarcha = false;
  refrescarControles();
});

refrescarControles();

// ---------- Arranque y redibujos ----------
const redibujar = () => {
  dibujarTira();
  dibujarMarco();
};
document.fonts.ready.then(() => {
  redibujar();
  mostrarFicha(0);
  ScrollTrigger.refresh();
});
new ResizeObserver(() => dibujarMarco()).observe(ficha);
let anchoPrevio = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === anchoPrevio) return; // en móvil la barra de URL cambia el alto: no redibujar
  anchoPrevio = window.innerWidth;
  dibujarTira();
});

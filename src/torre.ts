// Torre OSI en 2D: física con Matter.js, trazo a mano con Rough.js sobre canvas.
// Cada bloque cachea su dibujo (seed fija) para que el trazo no tiemble entre fotogramas.
import Matter from 'matter-js';
import rough from 'roughjs';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { Drawable, Options } from 'roughjs/bin/core';
import { gsap } from 'gsap';
import { NOMBRES_CAPA } from './data';

const { Engine, Bodies, Body, Composite, Events, Mouse, MouseConstraint } = Matter;

export type Estado = 'sana' | 'comprometida' | 'protegida';
export type Resultado = 'impacto' | 'rebote' | 'perdido';

const TIZA = '#f2ece1';
const ROJO = '#ef4444';
const FONDO = '#0b0b0b';

interface Bloque {
  body: Matter.Body;
  capa: number;
  w: number;
  h: number;
  estado: Estado;
  dib?: Drawable;
  dibClave?: string;
  escudo?: Matter.Body;
}

interface Paquete {
  body: Matter.Body;
  capa: number;
  resolver: (r: Resultado) => void;
  nacido: number;
  rebotado: boolean;
}

interface Resto {
  body: Matter.Body;
  nacido: number;
}

export interface OpcionesTorre {
  interactiva?: boolean;
  reducido?: boolean;
}

export class Torre {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rc: RoughCanvas;
  private engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  private bloques: Bloque[] = [];
  private paquetes: Paquete[] = [];
  private restos: Resto[] = [];
  private suelo?: Matter.Body;
  private ancho = 0;
  private alto = 0;
  private atacanteY = 0;
  private atacanteObjetivo = 0;
  private visible = false;
  private reloj = 0;
  private dibSuelo?: Drawable;
  private dibAtacante?: Drawable;
  private opciones: OpcionesTorre;
  private raton?: Matter.MouseConstraint;
  colapsada = false;

  constructor(canvas: HTMLCanvasElement, opciones: OpcionesTorre = {}) {
    this.canvas = canvas;
    this.opciones = opciones;
    this.ctx = canvas.getContext('2d')!;
    this.rc = rough.canvas(canvas);

    Events.on(this.engine, 'beforeUpdate', () => {
      // Los paquetes vuelan recto: se anula la gravedad sobre ellos.
      const g = this.engine.gravity;
      for (const p of this.paquetes) {
        if (p.rebotado) continue;
        Body.applyForce(p.body, p.body.position, { x: 0, y: -p.body.mass * g.y * g.scale });
      }
    });
    Events.on(this.engine, 'collisionStart', (e) => this.alChocar(e));

    new IntersectionObserver(([en]) => (this.visible = en.isIntersecting), { rootMargin: '100px' }).observe(canvas);
    new ResizeObserver(() => this.medir()).observe(canvas);
    this.medir();
    gsap.ticker.add(this.tic);
  }

  private medir() {
    const r = this.canvas.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    if (Math.abs(r.width - this.ancho) < 2 && Math.abs(r.height - this.alto) < 2) return;
    const estados = this.bloques.map((b) => b.estado);
    const colapsada = this.colapsada;
    this.ancho = r.width;
    this.alto = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.construir(estados.length ? estados : undefined);
    if (colapsada) this.colapsar(true);
  }

  private get geo() {
    const w = Math.min(320, this.ancho * 0.5);
    const h = Math.min(58, (this.alto * 0.7) / 7);
    const cx = this.ancho * 0.64;
    const sueloY = this.alto - 28;
    return { w, h, cx, sueloY };
  }

  /** Reconstruye la torre en pie. Los estados permiten restaurar sin animación. */
  construir(estados?: Estado[]) {
    Composite.clear(this.engine.world, false);
    this.paquetes.forEach((p) => p.resolver('perdido'));
    this.paquetes = [];
    this.restos = [];
    this.colapsada = false;
    const { w, h, cx, sueloY } = this.geo;

    this.suelo = Bodies.rectangle(this.ancho / 2, sueloY + 30, this.ancho * 3, 60, { isStatic: true, label: 'suelo' });
    const paredes = [
      Bodies.rectangle(-40, this.alto / 2, 80, this.alto * 4, { isStatic: true, label: 'pared' }),
      Bodies.rectangle(this.ancho + 40, this.alto / 2, 80, this.alto * 4, { isStatic: true, label: 'pared' }),
    ];
    Composite.add(this.engine.world, [this.suelo, ...paredes]);

    this.bloques = [];
    for (let i = 0; i < 7; i++) {
      // Un poco de holgura vertical: los bloques se asientan solos en el primer fotograma.
      const body = Bodies.rectangle(cx, sueloY - h / 2 - i * h, w, h, {
        friction: 0.9,
        frictionStatic: 1.2,
        restitution: 0.05,
        density: 0.004,
        label: 'bloque',
        chamfer: { radius: 3 },
      });
      const b: Bloque = { body, capa: i + 1, w, h, estado: estados?.[i] ?? 'sana' };
      this.bloques.push(b);
      Composite.add(this.engine.world, body);
      if (b.estado === 'protegida') this.ponerEscudo(b);
    }

    this.dibSuelo = this.rc.generator.line(8, sueloY + 1, this.ancho - 8, sueloY + 1, { stroke: TIZA, roughness: 1.6, strokeWidth: 1.4, seed: 7 });
    this.dibAtacante = this.rc.generator.circle(0, 0, 34, {
      stroke: ROJO,
      strokeWidth: 2,
      fill: ROJO,
      fillStyle: 'cross-hatch',
      hachureGap: 5,
      roughness: 1.8,
      seed: 3,
    });
    this.atacanteY = this.atacanteObjetivo = sueloY - h / 2;

    if (this.opciones.interactiva) this.activarRaton();
  }

  private activarRaton() {
    if (this.raton) Composite.remove(this.engine.world, this.raton);
    // En táctil no: Matter cancela el touchmove y la página dejaría de hacer scroll sobre el canvas.
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const mouse = Mouse.create(this.canvas);
    const m = mouse as unknown as { mousewheel: EventListener };
    for (const ev of ['mousewheel', 'DOMMouseScroll', 'wheel']) this.canvas.removeEventListener(ev, m.mousewheel);
    this.raton = MouseConstraint.create(this.engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } as never });
    Composite.add(this.engine.world, this.raton);
  }

  private ponerEscudo(b: Bloque) {
    const x = b.body.position.x - b.w / 2 - 26;
    b.escudo = Bodies.rectangle(x, b.body.position.y, 8, b.h * 0.95, { isStatic: true, label: 'escudo', restitution: 1 });
    Composite.add(this.engine.world, b.escudo);
  }

  setEstado(capa: number, estado: Estado) {
    const b = this.bloques[capa - 1];
    if (!b) return;
    if (b.escudo) {
      Composite.remove(this.engine.world, b.escudo);
      b.escudo = undefined;
    }
    b.estado = estado;
    if (estado === 'protegida') this.ponerEscudo(b);
  }

  estados(): Estado[] {
    return this.bloques.map((b) => b.estado);
  }

  /** Lanza un paquete desde el intruso contra una capa. */
  disparar(capa: number): Promise<Resultado> {
    const b = this.bloques[capa - 1];
    if (!b || this.colapsada) return Promise.resolve('perdido');
    const y = b.body.position.y;
    this.atacanteObjetivo = y;
    return new Promise((resolver) => {
      gsap.delayedCall(this.opciones.reducido ? 0 : 0.35, () => {
        const body = Bodies.circle(44, y, 9, { label: 'paquete', restitution: 0.9, frictionAir: 0, density: 0.01 });
        Body.setVelocity(body, { x: 13, y: 0 });
        Composite.add(this.engine.world, body);
        this.paquetes.push({ body, capa, resolver, nacido: this.reloj, rebotado: false });
      });
    });
  }

  private alChocar(e: Matter.IEventCollision<Matter.Engine>) {
    for (const par of e.pairs) {
      const p = this.paquetes.find((q) => q.body === par.bodyA || q.body === par.bodyB);
      if (!p) continue;
      const otro = p.body === par.bodyA ? par.bodyB : par.bodyA;
      if (otro.label === 'escudo' && !p.rebotado) {
        p.rebotado = true;
        Body.setVelocity(p.body, { x: -6, y: -7 });
        this.astillas(p.body.position, TIZA, 5);
        p.resolver('rebote');
      } else if (otro.label === 'bloque' && !p.rebotado) {
        const b = this.bloques.find((x) => x.body === otro);
        if (!b) continue;
        this.quitarPaquete(p);
        this.astillas(p.body.position, ROJO, 9);
        b.estado = 'comprometida';
        if (!this.opciones.reducido) {
          Body.setVelocity(b.body, { x: 1.1, y: -0.4 });
          Body.setAngularVelocity(b.body, 0.004);
        }
        p.resolver('impacto');
      }
    }
  }

  private quitarPaquete(p: Paquete) {
    Composite.remove(this.engine.world, p.body);
    this.paquetes = this.paquetes.filter((q) => q !== p);
  }

  private astillas(pos: Matter.Vector, color: string, n: number) {
    if (this.opciones.reducido) return;
    for (let i = 0; i < n; i++) {
      const body = Bodies.rectangle(pos.x, pos.y, 4, 4, { label: 'resto', frictionAir: 0.02, collisionFilter: { group: -1 } });
      (body as unknown as { color: string }).color = color;
      Body.setVelocity(body, { x: -2 - Math.random() * 4, y: -3 - Math.random() * 4 });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
      Composite.add(this.engine.world, body);
      this.restos.push({ body, nacido: this.reloj });
    }
  }

  /** Derrumbe. Con `instantaneo` se simula sin pintar (reduced motion o restauración). */
  colapsar(instantaneo = false) {
    if (this.colapsada) return;
    this.colapsada = true;
    for (const b of this.bloques) {
      b.estado = 'comprometida';
      if (b.escudo) {
        Composite.remove(this.engine.world, b.escudo);
        b.escudo = undefined;
      }
      b.body.friction = 0.25;
      // Cuanto más arriba, más fuerte: la torre se abre en abanico y vuelca.
      const fuerza = 1.2 + b.capa * 0.95;
      const lado = b.capa % 2 ? 1 : -0.55;
      Body.setVelocity(b.body, { x: fuerza * lado * (0.8 + Math.random() * 0.6), y: -fuerza * 1.1 });
      Body.setAngularVelocity(b.body, (Math.random() - 0.5) * 0.22);
    }
    if (instantaneo || this.opciones.reducido) {
      for (let i = 0; i < 420; i++) Engine.update(this.engine, 1000 / 60);
    }
  }

  private tic = () => {
    this.reloj++;
    if (!this.visible || !this.ancho) return;
    Engine.update(this.engine, 1000 / 60);
    // Limpieza de paquetes y restos viejos.
    for (const p of [...this.paquetes]) {
      const fuera = p.body.position.x > this.ancho + 50 || p.body.position.y > this.alto + 50;
      if (fuera || this.reloj - p.nacido > 200) {
        this.quitarPaquete(p);
        p.resolver('perdido');
      }
    }
    this.restos = this.restos.filter((r) => {
      if (this.reloj - r.nacido < 150) return true;
      Composite.remove(this.engine.world, r.body);
      return false;
    });
    this.atacanteY += (this.atacanteObjetivo - this.atacanteY) * 0.15;
    this.pintar();
  };

  private opcionesBloque(b: Bloque): Options {
    const base: Options = { roughness: 1.4, strokeWidth: 1.8, seed: 11 + b.capa * 7, bowing: 1.2 };
    if (b.estado === 'comprometida') return { ...base, stroke: ROJO, fill: ROJO, fillStyle: 'hachure', hachureGap: 6, fillWeight: 1.3, hachureAngle: -41 };
    if (b.estado === 'protegida') return { ...base, stroke: TIZA, fill: '#1c1c1c', fillStyle: 'solid', strokeWidth: 2.4 };
    return { ...base, stroke: TIZA, fill: FONDO, fillStyle: 'solid' };
  }

  private pintar() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.ancho, this.alto);
    if (this.dibSuelo) this.rc.draw(this.dibSuelo);

    // Intruso
    ctx.save();
    ctx.translate(44, this.atacanteY);
    if (this.dibAtacante) this.rc.draw(this.dibAtacante);
    ctx.fillStyle = TIZA;
    ctx.font = '600 13px Kalam, cursive';
    ctx.textAlign = 'center';
    ctx.fillText('intruso', 0, -24);
    ctx.restore();

    for (const b of this.bloques) {
      const clave = `${b.estado}-${b.w | 0}-${b.h | 0}`;
      if (b.dibClave !== clave) {
        b.dib = this.rc.generator.rectangle(-b.w / 2, -b.h / 2, b.w, b.h, this.opcionesBloque(b));
        b.dibClave = clave;
      }
      ctx.save();
      ctx.translate(b.body.position.x, b.body.position.y);
      ctx.rotate(b.body.angle);
      this.rc.draw(b.dib!);
      ctx.fillStyle = b.estado === 'comprometida' ? '#fff' : TIZA;
      ctx.font = `700 ${Math.max(13, Math.min(19, b.h * 0.36))}px Kalam, cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const txt = b.w > 200 ? `L${b.capa} · ${NOMBRES_CAPA[b.capa - 1]}` : `L${b.capa}`;
      if (b.estado === 'comprometida') {
        ctx.fillStyle = FONDO;
        const m = ctx.measureText(txt).width;
        ctx.fillRect(-m / 2 - 6, -11, m + 12, 22);
        ctx.fillStyle = '#fff';
      }
      ctx.fillText(txt, 0, 1);
      ctx.restore();

      if (b.escudo) {
        const e = b.escudo.position;
        ctx.strokeStyle = TIZA;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x + 30, e.y, b.h * 0.75, Math.PI * 0.78, Math.PI * 1.22);
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(e.x + 36, e.y, b.h * 0.75, Math.PI * 0.8, Math.PI * 1.2);
        ctx.stroke();
      }
    }

    for (const p of this.paquetes) {
      const { x, y } = p.body.position;
      ctx.fillStyle = ROJO;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ROJO;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 40, y);
      ctx.lineTo(x - 12, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const r of this.restos) {
      ctx.fillStyle = (r.body as unknown as { color: string }).color;
      ctx.save();
      ctx.translate(r.body.position.x, r.body.position.y);
      ctx.rotate(r.body.angle);
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  }
}

// Portada en 3D: la torre de siete capas gira y se despiece con el scroll.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { NOMBRES_CAPA } from './data';

const TIZA = new THREE.Color('#f2ece1');
const ROJO = new THREE.Color('#ef4444');

/** Aristas con un poco de temblor: dos pasadas desplazadas imitan el trazo a mano de Rough. */
function aristasAMano(geo: THREE.BufferGeometry, semilla: number): THREE.BufferGeometry {
  const edges = new THREE.EdgesGeometry(geo);
  const pos = edges.attributes.position as THREE.BufferAttribute;
  let s = semilla;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 0.035;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    arr[i * 3] = pos.getX(i) + rnd();
    arr[i * 3 + 1] = pos.getY(i) + rnd();
    arr[i * 3 + 2] = pos.getZ(i) + rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return g;
}

export function iniciarPortada(seccion: HTMLElement, canvas: HTMLCanvasElement, etiquetas: HTMLElement[], reducido: boolean) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#0b0b0b');

  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog('#0b0b0b', 9, 22);
  const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  escena.add(new THREE.AmbientLight('#ffffff', 0.35));
  const luz = new THREE.DirectionalLight('#ffffff', 1.1);
  luz.position.set(4, 6, 5);
  escena.add(luz);
  const contra = new THREE.PointLight('#ef4444', 18, 12);
  contra.position.set(-3, 1, -3);
  escena.add(contra);

  const torre = new THREE.Group();
  escena.add(torre);

  const ALTO = 0.42;
  const geo = new THREE.BoxGeometry(3.2, ALTO, 2.1);
  const losas: { grupo: THREE.Group; lineas: THREE.LineBasicMaterial[]; cuerpo: THREE.MeshStandardMaterial }[] = [];
  for (let i = 0; i < 7; i++) {
    const grupo = new THREE.Group();
    const cuerpo = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.85, metalness: 0.1 });
    grupo.add(new THREE.Mesh(geo, cuerpo));
    const lineas: THREE.LineBasicMaterial[] = [];
    for (const semilla of [11 + i, 97 + i * 3]) {
      const m = new THREE.LineBasicMaterial({ color: TIZA.clone(), transparent: true, opacity: semilla > 50 ? 0.45 : 0.95 });
      grupo.add(new THREE.LineSegments(aristasAMano(geo, semilla), m));
      lineas.push(m);
    }
    grupo.position.y = (i - 3) * ALTO;
    torre.add(grupo);
    losas.push({ grupo, lineas, cuerpo });
  }

  // Paquetes que orbitan: tráfico de red.
  const N = 260;
  const puntos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3.2 + Math.random() * 5;
    const a = Math.random() * Math.PI * 2;
    puntos[i * 3] = Math.cos(a) * r;
    puntos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    puntos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute('position', new THREE.BufferAttribute(puntos, 3));
  const matP = new THREE.PointsMaterial({ color: '#ef4444', size: 0.045, transparent: true, opacity: 0.7 });
  const nube = new THREE.Points(geoP, matP);
  escena.add(nube);

  // Estado controlado por el scroll.
  const e = { despiece: 0, giro: 0, rojo: 0, camY: 2.4, zoom: 9.5 };
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: seccion, start: 'top top', end: 'bottom bottom', scrub: reducido ? true : 0.6 },
  });
  tl.to(e, { despiece: 1, giro: Math.PI * 0.75, camY: 1.8, zoom: 11, duration: 0.55 })
    .to(e, { rojo: 1, duration: 0.3 }, 0.6)
    .to(e, { zoom: 13, camY: 3, duration: 0.15 }, 0.85);

  const v = new THREE.Vector3();
  let ancho = 0;
  let alto = 0;
  const medir = () => {
    ancho = canvas.clientWidth;
    alto = canvas.clientHeight;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // En móvil la torre se aleja un poco para que quepa.
    camara.fov = ancho < 700 ? 52 : 38;
    // Encuadre desplazado sin cambiar la perspectiva: a la derecha en escritorio, arriba en móvil,
    // para dejar sitio al titular.
    const movil = ancho < 700;
    camara.setViewOffset(ancho, alto, movil ? 0 : -ancho * 0.2, movil ? alto * 0.13 : 0, ancho, alto);
    camara.updateProjectionMatrix();
  };
  new ResizeObserver(medir).observe(canvas);
  medir();

  let visible = true;
  ScrollTrigger.create({ trigger: seccion, start: 'top bottom', end: 'bottom top', onToggle: (st) => (visible = st.isActive) });

  let deriva = 0;
  gsap.ticker.add((_t, dt) => {
    if (!visible) return;
    if (!reducido) deriva += dt * 0.00012;
    torre.rotation.y = -0.6 + e.giro + deriva;
    torre.rotation.x = 0.08;
    nube.rotation.y = deriva * 1.6;
    camara.position.set(0, e.camY, e.zoom);
    camara.lookAt(0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const l = losas[i];
      l.grupo.position.y = (i - 3) * (ALTO + e.despiece * 0.62);
      l.grupo.position.x = Math.sin(i * 1.7) * e.despiece * 0.25;
      // Se enrojecen de abajo arriba: el ataque sube.
      const k = gsap.utils.clamp(0, 1, e.rojo * 8 - i);
      l.lineas.forEach((m) => m.color.copy(TIZA).lerp(ROJO, k));
      l.cuerpo.emissive.setRGB(0.25 * k, 0.02 * k, 0.02 * k);

      const et = etiquetas[i];
      if (et) {
        l.grupo.getWorldPosition(v);
        v.x += 1.75;
        v.project(camara);
        const x = (v.x * 0.5 + 0.5) * ancho;
        const y = (-v.y * 0.5 + 0.5) * alto;
        et.style.transform = `translate3d(${x}px, ${y}px, 0) translate(0, -50%)`;
        et.style.opacity = String(gsap.utils.clamp(0, 1, e.despiece * 3 - 1.2));
        et.classList.toggle('roja', k > 0.5);
      }
    }
    renderer.render(escena, camara);
  });

  etiquetas.forEach((et, i) => (et.textContent = `L${i + 1} · ${NOMBRES_CAPA[i]}`));
}

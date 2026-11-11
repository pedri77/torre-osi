# La torre OSI · Anatomía de un ataque

Web de una sola página: una kill chain ilustrativa que sube por las siete capas OSI hasta derribar la torre, y un juego para defenderla con tres controles.

- **Three.js**: portada 3D, la torre gira y se despiece con el scroll.
- **GSAP + ScrollTrigger**: todo el movimiento ligado al scroll.
- **Matter.js**: física de la torre, paquetes, escudos y derrumbe.
- **Rough.js**: trazo a mano en canvas y SVG (seed fija por figura para que no tiemble).

Contenido (clases, MITRE ATT&CK, CWE y controles) tomado del [catálogo por capa OSI](https://pedri77.github.io/vulnerabilidades-capas-osi/). La cadena es un escenario ilustrativo.

```bash
npm install
npm run dev
npm run build
```

Despliegue: GitHub Pages con `.github/workflows/pages.yml` (push a `main` = despliegue).

Accesibilidad: con `prefers-reduced-motion` no hay deriva automática ni sacudidas y el derrumbe se muestra ya resuelto.

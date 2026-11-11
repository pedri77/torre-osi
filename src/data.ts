// Contenido tomado de pedri77/vulnerabilidades-capas-osi (data/capas.yaml, catálogo v1).
// La cadena es un escenario ilustrativo: un intruso con acceso a la oficina que sube capa a capa.

export const CATALOGO = 'https://pedri77.github.io/vulnerabilidades-capas-osi/';
export const HISTORICO = 'https://pedri77.github.io/vulnerabilidades-capas-osi/historico/';

export interface Paso {
  capa: number;
  nombreCapa: string;
  clase: string;
  ataque: string;
  fase: string;
  relato: string;
  attack: string[];
  cwe: string[];
  control: string;
}

export const PASOS: Paso[] = [
  {
    capa: 1,
    nombreCapa: 'Física',
    clase: 'L1-ACCESO-FISICO',
    ataque: 'Implante en una roseta libre',
    fase: 'Acceso inicial',
    relato: 'Un mini PC del tamaño de un cargador, enchufado detrás de una impresora. Nadie mira debajo de las mesas.',
    attack: ['T1200'],
    cwe: ['CWE-1263'],
    control: 'Puertos de switch sin uso en shutdown y en una VLAN aislada',
  },
  {
    capa: 2,
    nombreCapa: 'Enlace',
    clase: 'L2-ARP-SPOOFING',
    ataque: 'Envenenamiento de caché ARP',
    fase: 'Hombre en medio',
    relato: 'El implante dice ser la puerta de enlace. Desde ese momento, el tráfico de la planta pasa por él.',
    attack: ['T1557.002', 'T1040'],
    cwe: ['CWE-345', 'CWE-290'],
    control: 'Dynamic ARP Inspection apoyado en la tabla de DHCP snooping',
  },
  {
    capa: 3,
    nombreCapa: 'Red',
    clase: 'L3-ICMP',
    ataque: 'Barrido ICMP de la red interna',
    fase: 'Descubrimiento',
    relato: 'Un ping a cada dirección. En diez segundos tiene el mapa de qué equipos responden.',
    attack: ['T1018', 'T1095'],
    cwe: ['CWE-400'],
    control: 'Permitir solo los tipos ICMP necesarios y segmentar la red',
  },
  {
    capa: 4,
    nombreCapa: 'Transporte',
    clase: 'L4-EXPOSICION-PUERTOS',
    ataque: 'Escaneo de puertos',
    fase: 'Descubrimiento de servicios',
    relato: 'SMB abierto en todos los puestos, un panel de gestión olvidado en el 8080. Ya sabe a qué llamar.',
    attack: ['T1046'],
    cwe: ['CWE-1327'],
    control: 'Firewall de denegación por defecto y revisión periódica de reglas',
  },
  {
    capa: 5,
    nombreCapa: 'Sesión',
    clase: 'L5-RELE-AUTENTICACION',
    ataque: 'Relé de autenticación NTLM',
    fase: 'Acceso a credenciales',
    relato: 'Un equipo pregunta por un nombre que no existe; el implante responde y reenvía su autenticación a un servidor.',
    attack: ['T1557.001', 'T1550.002'],
    cwe: ['CWE-294', 'CWE-522'],
    control: 'Firma SMB obligatoria y firma y channel binding en LDAP',
  },
  {
    capa: 6,
    nombreCapa: 'Presentación',
    clase: 'L6-DOWNGRADE',
    ataque: 'Degradación de HTTPS a HTTP',
    fase: 'Recolección',
    relato: 'La intranet acepta HTTP. El implante quita la redirección y lee formularios en claro.',
    attack: ['T1557'],
    cwe: ['CWE-757', 'CWE-319'],
    control: 'HSTS en servicios web y redirección única a HTTPS',
  },
  {
    capa: 7,
    nombreCapa: 'Aplicación',
    clase: 'L7-DNS',
    ataque: 'Túnel DNS hacia fuera',
    fase: 'Exfiltración',
    relato: 'Los datos salen troceados en consultas DNS a un dominio del atacante. El firewall deja pasar el puerto 53.',
    attack: ['T1071.004', 'T1048'],
    cwe: ['CWE-345', 'CWE-400'],
    control: 'Resolutores internos únicos y salida DNS directa bloqueada',
  },
];

export const NOMBRES_CAPA = PASOS.map((p) => p.nombreCapa);

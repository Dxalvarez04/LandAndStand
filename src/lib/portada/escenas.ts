/**
 * Portada: el planeta que acompaña al scroll. Cada sección de la portada tiene un «plano» (qué cara
 * de Marte se ve, de qué tamaño, en qué parte de la pantalla y de dónde le llega la luz) y el scroll
 * pasa de uno a otro por una curva suave (Catmull-Rom), sin paradas bruscas.
 *
 * El planeta no se mueve: lo que se mueve es la cámara (y el sol con ella). Ver otra cara es girar
 * la cámara alrededor de Marte; «mover» el planeta por la pantalla es desviar la mirada de su centro.
 * Así el globo de la portada es el mismo que el del mapa: al tocar el planeta en la última sección,
 * la cámara se acerca y Marte gira un poco, sin corte, hasta la vista de inicio del globo de la demo
 * (`PLANO_GLOBO`), desde la que se baja a Gale.
 *
 * Unidades del globo: radio 1, mismo convenio que lib/mapa3d/coordenadas.ts.
 */
import { MathUtils, Vector3 } from "three";
import { latLonAVector } from "@/lib/mapa3d/coordenadas";

/** Campo vertical de la cámara del globo (grados) */
export const FOV = 40;

/** Encuadre del planeta en pantalla para una orientación (horizontal o vertical). */
interface Encuadre {
  /** Radio del planeta en pantalla, en fracciones de la mitad del lado corto de la vista */
  r: number;
  /** Centro del planeta en pantalla (−1 … 1, como las coordenadas normalizadas: +x derecha, +y arriba) */
  x: number;
  y: number;
  /** Otra cara para esta orientación (grados); si no, la del plano */
  lat?: number;
  lon?: number;
}

export interface Plano {
  /** Punto de Marte que queda bajo la cámara (grados) */
  lat: number;
  lon: number;
  apaisado: Encuadre;
  vertical: Encuadre;
  /** Giro de la cámara sobre su eje (grados): inclina el planeta en pantalla */
  giro: number;
  /** Dirección del sol vista desde la cámara: derecha, arriba y hacia la cámara */
  sol: [number, number, number];
}

/**
 * Un plano por sección de la portada (mismo orden). El primero es la portada (Marte en creciente,
 * la luz por detrás y a la derecha); el último, la cara llena con Gale en el centro: el globo del mapa.
 * Entre medias Marte gira de oeste a este (como gira de verdad): Valles Marineris, Tharsis y Olympus
 * Mons, Amazonis, Elysium y, al final, Gale.
 */
export const PLANOS: Plano[] = [
  // 0 · Portada: creciente, el título sobre la cara de noche
  {
    lat: 12,
    lon: -68,
    apaisado: { r: 0.92, x: 0.2, y: 0 },
    vertical: { r: 0.95, x: -0.08, y: 0.3 },
    giro: -4,
    sol: [0.92, 0.16, -0.38],
  },
  // 1 · El problema: muy cerca, a la derecha y cortado por el borde; amanece por la izquierda
  {
    lat: 2,
    lon: -98,
    apaisado: { r: 1.4, x: 0.8, y: -0.04 },
    vertical: { r: 1.35, x: 0.38, y: 0.62 },
    giro: 9,
    sol: [-0.55, 0.28, 0.55],
  },
  // 2 · La idea: a la izquierda, iluminado hacia el texto
  {
    lat: -14,
    lon: -134,
    apaisado: { r: 0.95, x: -0.62, y: 0.02 },
    vertical: { r: 1.0, x: -0.22, y: 0.4 },
    giro: -6,
    sol: [0.62, 0.3, 0.5],
  },
  // 3 · Cómo funciona: lejos, pequeño, junto a la lista de capas
  {
    lat: 18,
    lon: -168,
    apaisado: { r: 0.56, x: 0.56, y: 0.08 },
    vertical: { r: 0.55, x: 0.72, y: 0.8 },
    giro: 0,
    sol: [0.25, 0.45, 0.85],
  },
  // 4 · En la misión: el horizonte de Marte abajo, como desde la órbita
  {
    lat: -28,
    lon: 162,
    apaisado: { r: 2.3, x: 0, y: -3.15 },
    vertical: { r: 2.1, x: 0, y: -2.05 },
    giro: 3,
    sol: [0.05, 0.85, 0.5],
  },
  // 5 · Demo: la cara llena, Gale en el centro (algo por debajo: su rótulo sube desde el punto)
  {
    lat: 4,
    lon: 137.8,
    apaisado: { r: 0.7, x: 0, y: 0 },
    vertical: { r: 0.9, x: 0, y: 0 },
    giro: 0,
    sol: [-0.3, 0.28, 0.91],
  },
];

export const ULTIMA = PLANOS.length - 1;

/**
 * Vista de inicio del globo de la demo (y a la que vuelve desde el terreno). Distinta del último plano
 * de la portada: al tocar el planeta la cámara se acerca hasta que Marte llena el alto de la pantalla,
 * baja un poco hacia el sur y el planeta gira unos 30° hacia el oeste, así que Gale (con su rótulo)
 * queda a la derecha del centro; la luz barre la cara y asoma el terminador. En vertical gira hacia
 * el otro lado (Gale a la izquierda): a la derecha su rótulo no cabría. Mira al centro y con el norte
 * arriba, como necesitan los controles del globo.
 */
export const PLANO_GLOBO: Plano = {
  lat: -10,
  lon: 110,
  apaisado: { r: 1.0, x: 0, y: 0 },
  vertical: { r: 0.94, x: 0, y: 0, lat: -8, lon: 158 },
  giro: 0,
  sol: [-0.58, 0.3, 0.76],
};

/** Pose de la cámara y dirección del sol, en coordenadas del globo. */
export interface Pose {
  pos: Vector3;
  mira: Vector3;
  arriba: Vector3;
  sol: Vector3;
}

export const nuevaPose = (): Pose => ({ pos: new Vector3(), mira: new Vector3(), arriba: new Vector3(0, 1, 0), sol: new Vector3(1, 0, 0) });

export function copiarPose(de: Pose, a: Pose): Pose {
  a.pos.copy(de.pos);
  a.mira.copy(de.mira);
  a.arriba.copy(de.arriba);
  a.sol.copy(de.sol);
  return a;
}

const EJE_Y = new Vector3(0, 1, 0);

/** Catmull-Rom uniforme entre b y c (t ∈ [0, 1]); a y d son los vecinos. */
function cr(a: number, b: number, c: number, d: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
}

/** Valores de un plano que se interpolan (todos continuos; la dirección de la cámara como vector). */
function valores(p: Plano, vertical: boolean): number[] {
  const e = vertical ? p.vertical : p.apaisado;
  const n = latLonAVector(e.lat ?? p.lat, e.lon ?? p.lon);
  // El tamaño en logaritmo: acercarse y alejarse se perciben uniformes
  return [n[0], n[1], n[2], Math.log(e.r), e.x, e.y, p.giro, p.sol[0], p.sol[1], p.sol[2]];
}

const tmpN = new Vector3();
const tmpDerecha = new Vector3();
const tmpArriba = new Vector3();
const tmpAdelante = new Vector3();

/**
 * Pose en la posición `s` del recorrido (0 = primera sección, ULTIMA = la demo; vale cualquier valor
 * intermedio) para una vista de proporción `aspecto` (ancho / alto).
 */
export function poseEn(s: number, aspecto: number, out: Pose = nuevaPose()): Pose {
  const vertical = aspecto < 1;
  const k = MathUtils.clamp(s, 0, ULTIMA);
  const i = Math.min(Math.floor(k), ULTIMA - 1);
  const t = k - i;
  const v = (j: number) => valores(PLANOS[MathUtils.clamp(j, 0, ULTIMA)], vertical);
  const [a, b, c, d] = [v(i - 1), v(i), v(i + 1), v(i + 2)];
  const x = b.map((_, q) => cr(a[q], b[q], c[q], d[q], t));
  return poseDeValores(x, aspecto, out);
}

function poseDeValores(x: number[], aspecto: number, out: Pose): Pose {
  const [nx, ny, nz, logR, cx, cy, giro, sx, sy, sz] = x;
  const n = tmpN.set(nx, ny, nz).normalize();

  // Distancia para que el planeta (radio 1) ocupe `r` veces la mitad del lado corto
  const tanV = Math.tan(MathUtils.degToRad(FOV / 2));
  const tanH = tanV * aspecto;
  const tanCorto = Math.min(tanV, tanH);
  const alfa = Math.atan(Math.exp(logR) * tanCorto);
  const dist = 1 / Math.sin(alfa);
  out.pos.copy(n).multiplyScalar(dist);

  // Base de la cámara mirando al centro del planeta (norte arriba)
  const adelante = tmpAdelante.copy(n).negate();
  const derecha = tmpDerecha.crossVectors(adelante, EJE_Y).normalize();
  const arriba = tmpArriba.crossVectors(derecha, adelante).normalize();

  // Desviar la mirada: el centro del planeta queda en (cx, cy) de la pantalla
  out.mira
    .set(0, 0, 0)
    .addScaledVector(derecha, -cx * dist * tanH)
    .addScaledVector(arriba, -cy * dist * tanV);

  // El sol, en la base de la cámara sin girar: el giro inclina también el terminador en pantalla
  out.sol
    .set(0, 0, 0)
    .addScaledVector(derecha, sx)
    .addScaledVector(arriba, sy)
    .addScaledVector(adelante, -sz)
    .normalize();

  // Arriba de la cámara: el eje Y girado sobre la dirección de la mirada (sin giro, Y tal cual,
  // como lo deja el globo del mapa)
  const mirada = tmpAdelante.copy(out.mira).sub(out.pos).normalize();
  out.arriba.copy(EJE_Y);
  if (giro !== 0) out.arriba.applyAxisAngle(mirada, MathUtils.degToRad(-giro));
  return out;
}

/** Pose de la vista de inicio del globo de la demo (ver PLANO_GLOBO). */
export function poseGlobo(aspecto: number, out: Pose = nuevaPose()): Pose {
  return poseDeValores(valores(PLANO_GLOBO, aspecto < 1), aspecto, out);
}

/** Latitud y longitud (grados) de la dirección de `v`, con el convenio de latLonAVector. */
function latLonDe(v: Vector3) {
  const r = v.length();
  const lat = MathUtils.radToDeg(Math.asin(MathUtils.clamp(v.y / r, -1, 1)));
  const lon = MathUtils.radToDeg(Math.atan2(v.z, -v.x)) - 180;
  return { lat, lon: ((lon + 540) % 360) - 180 };
}

/** Base de la cámara de una pose sin desviar la mirada: derecha, arriba y hacia la cámara. */
function base(pos: Vector3, derecha: Vector3, arriba: Vector3, atras: Vector3) {
  atras.copy(pos).normalize();
  derecha.crossVectors(EJE_Y, atras).normalize();
  arriba.crossVectors(atras, derecha).normalize();
}

const bA = [new Vector3(), new Vector3(), new Vector3()];
const bB = [new Vector3(), new Vector3(), new Vector3()];
const bK = [new Vector3(), new Vector3(), new Vector3()];

/**
 * Mezcla dos poses (k ∈ [0, 1]) girando el planeta sobre su eje: la cámara va de un punto a otro por
 * latitud y longitud (por el lado corto), así que aunque las dos vistas miren a caras opuestas el
 * planeta da media vuelta suave en vez de pasar por dentro. El punto de mira y el sol se mezclan
 * vistos desde la cámara (el planeta se centra y la luz barre la cara mientras gira); la distancia,
 * en logaritmo.
 */
export function mezclarPoses(a: Pose, b: Pose, k: number, out: Pose): Pose {
  const la = latLonDe(a.pos);
  const lb = latLonDe(b.pos);
  let dLon = lb.lon - la.lon;
  dLon -= 360 * Math.round(dLon / 360);
  const dist = Math.exp(MathUtils.lerp(Math.log(a.pos.length()), Math.log(b.pos.length()), k));
  out.pos.set(...latLonAVector(MathUtils.lerp(la.lat, lb.lat, k), la.lon + dLon * k, dist));

  base(a.pos, bA[0], bA[1], bA[2]);
  base(b.pos, bB[0], bB[1], bB[2]);
  base(out.pos, bK[0], bK[1], bK[2]);
  // Punto de mira: desvío en el plano de la pantalla (derecha, arriba)
  const mx = MathUtils.lerp(a.mira.dot(bA[0]), b.mira.dot(bB[0]), k);
  const my = MathUtils.lerp(a.mira.dot(bA[1]), b.mira.dot(bB[1]), k);
  out.mira.set(0, 0, 0).addScaledVector(bK[0], mx).addScaledVector(bK[1], my);
  // Sol: visto desde la cámara (derecha, arriba, hacia la cámara)
  const s = [0, 1, 2].map((q) => MathUtils.lerp(a.sol.dot(bA[q]), b.sol.dot(bB[q]), k));
  out.sol.set(0, 0, 0).addScaledVector(bK[0], s[0]).addScaledVector(bK[1], s[1]).addScaledVector(bK[2], s[2]).normalize();
  out.arriba.copy(a.arriba).lerp(b.arriba, k).normalize();
  return out;
}

/** Cuánto gira el planeta (grados) al pasar de una pose a otra: para ajustar la duración. */
export function giroEntre(a: Pose, b: Pose): number {
  return MathUtils.radToDeg(a.pos.angleTo(b.pos));
}

/** Arranca y frena suave (smoothstep) */
export const suavizar = (k: number) => {
  const c = MathUtils.clamp(k, 0, 1);
  return c * c * (3 - 2 * c);
};

/**
 * Del scroll (0 … 1 de toda la portada) a la posición en el recorrido (0 … ULTIMA). Junto a cada
 * plano el scroll se queda un rato quieto (`reposo`, fracción de cada tramo a cada lado): ahí se lee
 * el texto con el planeta parado; entre medias pasa al siguiente.
 */
export function recorridoDeScroll(u: number, reposo = 0.16): number {
  const total = MathUtils.clamp(u, 0, 1) * ULTIMA;
  const i = Math.min(Math.floor(total), ULTIMA - 1);
  const local = total - i;
  return i + suavizar((local - reposo) / (1 - 2 * reposo));
}

/** Opacidad del texto de la sección `i` en la posición `s` del recorrido. */
export function visibilidad(s: number, i: number): number {
  const d = s - i;
  // La primera no entra (ya está al cargar) y la última no sale (es el final)
  if ((i === 0 && d < 0) || (i === ULTIMA && d > 0)) return 1;
  return 1 - suavizar((Math.abs(d) - 0.16) / 0.3);
}

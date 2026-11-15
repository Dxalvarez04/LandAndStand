/**
 * Cámara del terreno 3D. El encuadre se guarda en coordenadas esféricas alrededor del punto de mira,
 * que es el punto del suelo que queda en el centro de la vista:
 *   - los gestos de la persona los lleva ControlMapa (control.ts), anclados al suelo como en un mapa;
 *   - los movimientos automáticos (llegada, salida, cambio de vista, reencuadre, enfoque) son vuelos
 *     de duración fija que interpolan el encuadre: la cámara describe un arco, gira por el camino
 *     corto y arranca y frena con aceleración nula (smootherstep).
 */
import { Vector3 } from "three";

/** Encuadre en coordenadas esféricas alrededor del punto de mira. */
export interface Encuadre {
  /** Rumbo (azimut) en radianes: 0 = cámara al sur mirando al norte */
  theta: number;
  /** Ángulo desde la vertical en radianes: 0 = cenital */
  phi: number;
  /** Distancia al punto de mira en metros */
  r: number;
  objetivo: Vector3;
}

/** Arranca y frena con velocidad y aceleración nulas. */
export const suave = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function copiarEncuadre(e: Encuadre, out?: Encuadre): Encuadre {
  if (!out) return { theta: e.theta, phi: e.phi, r: e.r, objetivo: e.objetivo.clone() };
  out.theta = e.theta;
  out.phi = e.phi;
  out.r = e.r;
  out.objetivo.copy(e.objetivo);
  return out;
}

export function posicionDe(e: Encuadre, out = new Vector3()): Vector3 {
  const s = Math.sin(e.phi) * e.r;
  return out.set(e.objetivo.x + s * Math.sin(e.theta), e.objetivo.y + Math.cos(e.phi) * e.r, e.objetivo.z + s * Math.cos(e.theta));
}

/** Ajusta el rumbo de destino para que el giro vaya por el camino corto. */
export function caminoCorto(desde: Encuadre, hasta: Encuadre): Encuadre {
  const vuelta = Math.PI * 2;
  return { ...hasta, theta: hasta.theta + vuelta * Math.round((desde.theta - hasta.theta) / vuelta) };
}

/** Encuadre intermedio de un vuelo (k ya suavizado). La distancia se interpola en escala logarítmica. */
export function mezclar(a: Encuadre, b: Encuadre, k: number, out: Encuadre): Encuadre {
  out.theta = lerp(a.theta, b.theta, k);
  out.phi = lerp(a.phi, b.phi, k);
  out.r = Math.exp(lerp(Math.log(a.r), Math.log(b.r), k));
  out.objetivo.lerpVectors(a.objetivo, b.objetivo, k);
  return out;
}

/**
 * Límites de los gestos: acercarse hasta 180 m del suelo, inclinar casi hasta el horizonte (86°) y
 * alejarse hasta ver todo el entorno. La cámara no baja de `despeje` metros sobre el relieve.
 */
export const LIMITES = { minDistancia: 180, maxDistancia: 70_000, maxPolar: 1.5, minPolar: 0.002, despeje: 45 };

/**
 * Órbita baja sobre la zona de estudio: el punto donde se cambia entre el globo y el terreno. Las
 * dos escenas muestran desde ahí lo mismo (la región de Gale desde ~100 km, norte arriba, casi a
 * plomo), así que el cambio es un fundido entre dos vistas iguales.
 */
export const ORBITA = { r: 100_000, phi: 0.16, theta: 0 };

/**
 * Cámara del terreno 3D con camera-controls (CameraControls de drei):
 *   - lo que hace la persona (arrastrar, girar, rueda, pellizco) va amortiguado con un muelle crítico,
 *     sin tirones ni rebotes, y el zoom va hacia el cursor (como en un mapa);
 *   - los movimientos automáticos (llegada, cambio de vista, reencuadre) son vuelos con
 *     duración fija que interpolan en coordenadas esféricas alrededor del punto de mira: la cámara
 *     describe un arco, gira por el camino corto y arranca y frena con aceleración nula (smootherstep).
 */
import { CameraControlsImpl } from "@react-three/drei";
import { Box3, Vector3, type Object3D } from "three";

const { ACTION } = CameraControlsImpl;

export type Controles = CameraControlsImpl;

/** Encuadre en coordenadas esféricas alrededor del punto de mira (convención de camera-controls). */
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

export function encuadreActual(c: Controles): Encuadre {
  return { theta: c.azimuthAngle, phi: c.polarAngle, r: c.distance, objetivo: c.getTarget(new Vector3()) };
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
 * Límites amplios: se puede bajar hasta ~140 m del suelo, inclinar casi hasta el horizonte (86°) y
 * alejarse hasta ver todo el contexto. La cámara no atraviesa el relieve (colisión con el terreno)
 * y el punto de giro se posa en el suelo al soltar (ver EscenaTerreno).
 */
export const LIMITES = { minDistancia: 140, maxDistancia: 30_000, maxPolar: 1.5 };

/** Gestos y límites según la vista. En cenital no se gira: el norte queda siempre arriba. */
export function configurarControles(c: Controles, cenital: boolean) {
  c.smoothTime = 0.32;
  c.draggingSmoothTime = 0.14;
  c.dollyToCursor = true;
  c.dollySpeed = 0.85;
  c.minDistance = LIMITES.minDistancia;
  c.maxDistance = LIMITES.maxDistancia;
  c.minPolarAngle = 0;
  c.maxPolarAngle = LIMITES.maxPolar;
  c.boundaryFriction = 0;
  c.restThreshold = 0.004;
  c.azimuthRotateSpeed = cenital ? 0 : 0.7;
  c.polarRotateSpeed = cenital ? 0 : 0.7;
  // SCREEN_PAN en camera-controls = desplazarse sobre el plano del suelo (como un mapa)
  c.mouseButtons.left = ACTION.SCREEN_PAN;
  c.mouseButtons.right = cenital ? ACTION.SCREEN_PAN : ACTION.ROTATE;
  c.mouseButtons.middle = ACTION.DOLLY;
  c.mouseButtons.wheel = ACTION.DOLLY;
  c.touches.one = ACTION.TOUCH_SCREEN_PAN;
  c.touches.two = cenital ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.TOUCH_DOLLY_ROTATE; // en cenital, truck = sobre el suelo
  c.touches.three = cenital ? ACTION.TOUCH_SCREEN_PAN : ACTION.TOUCH_ROTATE;
}

/** El punto de mira no sale de la caja (x, z) del terreno de contexto. */
export function limitarA(c: Controles, x0: number, z0: number, x1: number, z1: number) {
  c.setBoundary(new Box3(new Vector3(x0, -1e6, z0), new Vector3(x1, 1e6, z1)));
}

/**
 * Con el ratón, girar exige el botón derecho (incómodo en un trackpad): manteniendo Mayús, Alt,
 * Ctrl o ⌘, el botón izquierdo también gira. En cenital no se gira.
 */
export function girarConIzquierdo(c: Controles, girar: boolean, cenital: boolean) {
  c.mouseButtons.left = girar && !cenital ? ACTION.ROTATE : ACTION.SCREEN_PAN;
}

/** La cámara no atraviesa estas mallas (el terreno, con su corte de rayos rápido). */
export function ponerColision(c: Controles, mallas: Object3D[]) {
  c.colliderMeshes = mallas;
}

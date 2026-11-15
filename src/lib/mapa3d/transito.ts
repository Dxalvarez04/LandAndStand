/**
 * Paso continuo entre el globo y el terreno. Son dos escenas distintas, pero la cámara no se para en
 * el cambio: lo cruza con un zoom de ritmo constante.
 *
 *   1. La escena que se deja termina su vuelo en la órbita baja con el zoom en marcha (`lanzar`).
 *   2. Se saca una foto de ese fotograma y se pone encima del lienzo. Mientras se monta la otra escena
 *      (el hilo principal se bloquea unas décimas), la foto sigue haciendo zoom al mismo ritmo: es una
 *      animación de transformación, que el navegador compone sin el hilo principal (`puente`).
 *   3. Cuando la escena nueva ya se ve, empieza donde va la foto y con su ritmo (`frenar`), y las dos
 *      se funden moviéndose juntas.
 *
 * El zoom se mide en logaritmo de la distancia al suelo: un ritmo constante se percibe uniforme.
 */

export const TRANSITO = {
  /** Ritmo del zoom al cambiar de escena, en unidades logarítmicas por segundo (×e^ritmo cada segundo) */
  ritmo: 2.1,
  /** Fundido entre las dos escenas (ms) */
  fundido: 300,
  /** Tiempo (s) que la foto mantiene el ritmo; si la escena nueva tarda más, se va parando */
  sostenido: 0.3,
  /** Zoom máximo (log) de la foto mientras espera: ×2,4 */
  tope: Math.log(2.4),
  /**
   * Al alejarse, la foto se saca con este campo de más (y se enseña ampliada): así puede encoger sin
   * que asomen sus bordes
   */
  ancho: 2,
} as const;

/** Pendiente inicial o final máxima de `frenar` y `lanzar` sin que el avance retroceda */
export const PENDIENTE_MAX = 2.2;

const h5 = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);
const h1 = (k: number) => k * (1 + k * k * (-6 + k * (8 - 3 * k)));

/** Avance 0→1 que arranca con pendiente `m` y termina con velocidad y aceleración nulas. */
export function frenar(k: number, m: number): number {
  return h5(k) + m * h1(k);
}

/** Avance 0→1 que arranca de parado (velocidad y aceleración nulas) y termina con pendiente `m`. */
export function lanzar(k: number, m: number): number {
  return 1 - frenar(1 - k, m);
}

/**
 * Pendiente (acotada) con la que un avance de `dur` ms recorre `largo` unidades entrando o saliendo
 * a `ritmo` unidades por segundo.
 */
export function pendiente(ritmo: number, dur: number, largo: number): number {
  if (!(largo > 1e-6) || !(ritmo > 0)) return 0;
  return Math.min(PENDIENTE_MAX, (ritmo * dur) / 1000 / largo);
}

/**
 * Zoom (log) de la foto a los `t` segundos de sacarla, y su ritmo: constante durante `sostenido` y
 * después cada vez más lento, sin pasar de `tope`.
 */
export function puente(t: number, ritmo: number, tope: number = TRANSITO.tope): { z: number; v: number } {
  if (!(ritmo > 0) || t <= 0) return { z: 0, v: Math.max(0, ritmo) };
  const t1 = Math.min(TRANSITO.sostenido, (tope * 0.6) / ritmo);
  if (t <= t1) return { z: ritmo * t, v: ritmo };
  const resto = tope - ritmo * t1;
  const caida = Math.exp((-ritmo * (t - t1)) / resto);
  return { z: ritmo * t1 + resto * (1 - caida), v: ritmo * caida };
}

/** La foto del cambio de escena, vista desde la escena que entra. */
export interface FotoTransito {
  /** Zoom (log; positivo = más cerca que al sacarla) y ritmo que lleva la foto ahora mismo */
  estado(): { z: number; v: number };
  /** Durante el fundido: pone la foto con el zoom que lleva la escena nueva, para que coincidan */
  seguir(z: number): void;
}

/**
 * Panel de control (columna derecha en horizontal, franja inferior en vertical). Flota sobre el mapa
 * y se puede esconder; el mapa no cambia de tamaño, solo desplaza su centro y sus controles.
 * La animación del panel (CSS) y la del mapa (cámara) usan la misma duración y curva.
 */
export const DURACION_PANEL = 500; // ms
/** cubic-bezier(0.65, 0, 0.35, 1) = easeInOutCubic (d3-ease: easeCubicInOut) */
export const CURVA_PANEL = "cubic-bezier(0.65,0,0.35,1)";
/** Alto de la pestaña para sacar y esconder el panel en vertical (queda fuera del panel) */
export const PESTANA_PX = 32;

/** Espacio que el panel quita al mapa, en píxeles. */
export interface Hueco {
  der: number;
  abajo: number;
}

export const SIN_HUECO: Hueco = { der: 0, abajo: 0 };

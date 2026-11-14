/**
 * Valores del mapa 3D que cambian en cada fotograma o con cada movimiento del ratón (posición en
 * pantalla de la selección, rumbo, escala, celda bajo el puntero…). No van en el estado de React
 * del mapa: así mover la cámara no vuelve a renderizar la escena ni las etiquetas, solo los pocos
 * componentes que los leen (ficha, brújula, tooltip) se suscriben a lo que necesitan.
 */
import { useSyncExternalStore } from "react";
import type { Celda } from "@/lib/mapa/geo";

export interface PuntoPx {
  x: number;
  y: number;
}

export interface EstadoVivo {
  /** Rumbo de la cámara en grados */
  azimut: number;
  /** Metros por píxel en el centro de la vista */
  mPorPx: number | null;
  /** Selección en pantalla (null si queda fuera) */
  ancla: PuntoPx | null;
  /** Hábitat en pantalla */
  habPx: PuntoPx | null;
  /** Camino hasta la selección en pantalla (ruta del modelo o, mientras llega, la línea recta) */
  rutaPx: PuntoPx[];
  /** Celda bajo el ratón */
  hover: { celda: Celda; x: number; y: number } | null;
}

export interface Almacen<T> {
  get: () => T;
  set: (parcial: Partial<T>) => void;
  subscribe: (aviso: () => void) => () => void;
}

export function crearAlmacen<T extends object>(inicial: T): Almacen<T> {
  let valor = inicial;
  const avisos = new Set<() => void>();
  return {
    get: () => valor,
    set: (parcial) => {
      valor = { ...valor, ...parcial };
      avisos.forEach((f) => f());
    },
    subscribe: (aviso) => {
      avisos.add(aviso);
      return () => avisos.delete(aviso);
    },
  };
}

export const estadoVivoInicial = (): EstadoVivo => ({ azimut: 0, mPorPx: null, ancla: null, habPx: null, rutaPx: [], hover: null });

/** Lee una parte del almacén; el componente solo se renderiza cuando esa parte cambia. */
export function useAlmacen<T, S>(almacen: Almacen<T>, elegir: (v: T) => S): S {
  const leer = () => elegir(almacen.get());
  return useSyncExternalStore(almacen.subscribe, leer, leer);
}

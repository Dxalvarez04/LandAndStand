/**
 * Alcance en llano de cada tripulante, para comparar a la tripulación en el panel («¿Quién sale?»).
 *
 * Es el radio de ida y vuelta de la capa 3 del modelo (radioLlano) con los valores centrales y el
 * VO₂ previo y la masa de la persona, que es lo único que el modelo distingue de cada tripulante.
 * No es la probabilidad del mapa (esa añade el relieve y la incertidumbre de los parámetros): sirve
 * para ver de un vistazo quién llega más lejos y quién limita a un grupo que camina junto.
 */
import type { EnergiaHoras, FWalk, Tripulante } from "@/lib/contract";
import { CENTRALES } from "@/lib/constants";
import { radioLlano } from "@/lib/model/marcha";

/** Tope de la barra de alcance (km): algo más que el mayor radio en llano de los perfiles (3,7 km el sol 30 al 50 %). */
export const ESCALA_ALCANCE_KM = 4;

/** Hasta dónde puede alejarse y volver esa persona ese sol en llano (km). Con fwalk «U» se usa el valor central. */
export function alcanceLlanoKm(p: Tripulante, sol: number, fwalk: FWalk, horas: EnergiaHoras): number {
  const fWalk = fwalk === "U" ? CENTRALES.fWalk : fwalk;
  return radioLlano(sol, { ...CENTRALES, vo2pre: p.vo2pre, masa: p.masa, fWalk }, horas) / 1000;
}

/** Quien menos alcanza de un grupo (el primero, si hay empate). `null` si el grupo está vacío. */
export function limitante<T extends string>(ids: T[], alcances: Record<string, number>): T | null {
  return ids.reduce<T | null>((min, id) => (min === null || alcances[id] < alcances[min] ? id : min), null);
}

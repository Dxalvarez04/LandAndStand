/**
 * CAPA 6 · Incertidumbre y agregación (sección 6).
 * Población, tripulante y pareja con NÚMEROS ALEATORIOS COMUNES
 * (el sorteo i es el mismo en todos los soles, modos y tripulantes).
 * Para validar (paso 2) cargar `public/data/draws_seed11_300.json`.
 */
import type { Estado, Resultado } from "@/lib/contract";
import type { Parametros } from "./tipos";

export interface Datos {
  dem: Float32Array;
  sorteos: Parametros[];
}

export function agregar(
  _estado: Estado,
  _datos: Datos,
  _onProgreso: (fraccion: number) => void,
): Resultado {
  throw new Error("TODO persona 1: capa 6, agregar");
}

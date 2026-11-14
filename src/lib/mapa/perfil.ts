/**
 * Perfil de una ruta del modelo sobre el DEM: longitud, subida acumulada y pendiente máxima.
 * Índices fila * 110 + columna (fila 0 = sur), como en el contrato.
 */
import { CELDA_M, N } from "@/lib/constants";

export interface PerfilRuta {
  longitudM: number;
  subidaM: number;
  bajadaM: number;
  /** Pendiente máxima de un tramo entre celdas, en % */
  pendienteMax: number;
}

export function perfilRuta(camino: Int32Array, dem: Float32Array): PerfilRuta | null {
  if (camino.length < 2) return null;
  let longitudM = 0;
  let subidaM = 0;
  let bajadaM = 0;
  let pendienteMax = 0;
  for (let i = 0; i + 1 < camino.length; i++) {
    const a = camino[i];
    const b = camino[i + 1];
    const d = Math.hypot((b % N) - (a % N), Math.floor(b / N) - Math.floor(a / N)) * CELDA_M;
    const dz = dem[b] - dem[a];
    longitudM += d;
    if (dz > 0) subidaM += dz;
    else bajadaM -= dz;
    if (d > 0) pendienteMax = Math.max(pendienteMax, (Math.abs(dz) / d) * 100);
  }
  return { longitudM, subidaM, bajadaM, pendienteMax };
}

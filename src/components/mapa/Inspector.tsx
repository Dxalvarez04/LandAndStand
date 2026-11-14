"use client";

/**
 * PERSONA 2 · Inspector de celda: coordenadas, probabilidad y (TODO) ruta ilustrativa.
 */
import type { Resultado } from "@/lib/contract";
import { N } from "@/lib/constants";
import { celdaALatLon } from "@/lib/data/targets";

interface Props {
  celda: { fila: number; columna: number } | null;
  resultado: Resultado | null;
}

export default function Inspector({ celda, resultado }: Props) {
  if (!celda) return <p className="text-sm text-stone-400">Haz clic en el mapa para ver una celda.</p>;
  const { lat, lon } = celdaALatLon(celda.fila, celda.columna);
  const p = resultado?.prob[celda.fila * N + celda.columna];
  return (
    <div className="text-sm">
      <p>
        Celda ({celda.fila}, {celda.columna}) · {lat.toFixed(4)}°, {lon.toFixed(4)}°
      </p>
      <p>
        Probabilidad de ida y vuelta: <strong>{p !== undefined ? `${(p * 100).toFixed(1)} %` : "—"}</strong>
      </p>
    </div>
  );
}

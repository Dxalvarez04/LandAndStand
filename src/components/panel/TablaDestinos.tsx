"use client";

/**
 * PERSONA 3 · Tabla de destinos.
 * TODO: distancia en línea recta entre centros de celda y desnivel neto (necesita el DEM).
 */
import type { Resultado } from "@/lib/contract";
import { DESTINOS } from "@/lib/data/targets";

export default function TablaDestinos({ resultado }: { resultado: Resultado | null }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-stone-400">
        <tr>
          <th>Destino</th>
          <th>Distancia</th>
          <th>Desnivel</th>
          <th className="text-right">Prob.</th>
        </tr>
      </thead>
      <tbody>
        {DESTINOS.map((t) => {
          const p = resultado?.destinos.find((d) => d.id === t.id)?.p;
          return (
            <tr key={t.id} className={p !== undefined && p >= 0.5 ? "text-amber-400" : ""}>
              <td>
                {t.id} {t.nombre}
              </td>
              <td>—</td>
              <td>—</td>
              <td className="text-right">{p !== undefined ? `${Math.round(p * 100)} %` : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

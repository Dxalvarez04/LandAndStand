"use client";

/**
 * PERSONA 3 · Tarjetas con la foto de Curiosity («esto es lo que verás»).
 * Se «encienden» al pasar del 50 %. TODO: fotos en /public/fotos con su número PIA.
 */
import type { Resultado } from "@/lib/contract";
import { DESTINOS } from "@/lib/data/targets";

export default function TarjetasDestino({ resultado }: { resultado: Resultado | null }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {DESTINOS.map((t) => {
        const p = resultado?.destinos.find((d) => d.id === t.id)?.p ?? 0;
        const encendido = p >= 0.5;
        return (
          <div
            key={t.id}
            className={`rounded border p-2 text-xs transition ${encendido ? "border-amber-500 opacity-100" : "border-stone-700 opacity-40"}`}
          >
            <div className="mb-1 aspect-video rounded bg-stone-700" />
            <p className="font-semibold">
              {t.id} · {t.nombre}
            </p>
          </div>
        );
      })}
    </div>
  );
}

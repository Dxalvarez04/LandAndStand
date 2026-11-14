"use client";

import type { Resultado } from "@/lib/contract";
import { DESTINOS } from "@/lib/data/targets";

interface Props {
  resultado: Resultado | null;
}

/**
 * PERSONA 3 · Tarjetas con la foto de Curiosity («esto es lo que verás»).
 * Los destinos se «encienden» visualmente al superar el 50 % de probabilidad.
 * Muestran el código PIA de la NASA y las exigencias orográficas de cada sitio.
 */
export default function TarjetasDestino({ resultado }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {DESTINOS.map((t) => {
        const p = resultado?.destinos.find((d) => d.id === t.id)?.p ?? 0;
        const encendido = p >= 0.5;
        const porcentaje = Math.round(p * 100);

        return (
          <div
            key={t.id}
            className={`flex flex-col justify-between rounded-xl border p-2.5 transition-all duration-300 ${
              encendido
                ? "border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10 opacity-100 ring-1 ring-amber-500/50"
                : "border-stone-800 bg-stone-900/60 opacity-45 grayscale hover:opacity-75 hover:grayscale-0"
            }`}
          >
            <div>
              {/* Imagen o contenedor visual de Curiosity */}
              <div className="relative mb-2 aspect-video overflow-hidden rounded-lg bg-stone-950 flex flex-col items-center justify-center border border-stone-800">
                <div className="text-center p-1.5">
                  <span className="text-[10px] font-mono font-bold text-amber-400/90 block">{t.pia}</span>
                  <span className="text-[9px] text-stone-500">NASA/JPL/MSSS</span>
                </div>
                {/* Badge de estado flotante */}
                <span
                  className={`absolute bottom-1 right-1 rounded px-1 text-[9px] font-mono font-bold ${
                    encendido ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-300"
                  }`}
                >
                  {porcentaje}%
                </span>
              </div>

              {/* Título y metadatos del destino */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-amber-400">{t.id}</span>
                  <span className="font-mono text-[10px] text-stone-400">{t.distanciaKm} km</span>
                </div>
                <h3 className="text-xs font-semibold leading-tight text-white line-clamp-1">{t.nombre}</h3>
                <p className="text-[10px] text-stone-400 line-clamp-1">{t.contexto}</p>
              </div>
            </div>

            {/* Pie con desnivel y estado de alcanzabilidad */}
            <div className="mt-2.5 border-t border-stone-800/80 pt-1.5 flex items-center justify-between text-[10px]">
              <span className={`font-mono ${t.desnivelM > 50 ? "text-rose-400" : "text-stone-400"}`}>
                {t.desnivelM > 0 ? `+${t.desnivelM} m` : `${t.desnivelM} m`}
              </span>
              <span
                className={`font-semibold ${
                  encendido ? "text-amber-300" : "text-stone-500"
                }`}
              >
                {encendido ? "Alcanzable" : "Inalcanzable"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

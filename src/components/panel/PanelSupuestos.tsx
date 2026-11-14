"use client";

/**
 * PERSONA 3 · Panel de supuestos del modelo (siempre visible).
 * REGLA ESTRICTA DE LA ESPECIFICACIÓN:
 * Está terminantemente prohibido usar la palabra «seguro» o «zona segura».
 * Se formula siempre como «alcanzable bajo los supuestos indicados».
 */
export default function PanelSupuestos() {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3.5 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Supuestos del modelo</span>
        <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono text-stone-400">v3.1 M2</span>
      </div>

      <ul className="space-y-1.5 text-[11px] leading-relaxed text-stone-400">
        <li className="flex items-start gap-1.5">
          <span className="text-amber-500 font-bold shrink-0">•</span>
          <span>
            <strong className="text-stone-300">Alcanzable bajo supuestos:</strong> Las áreas mostradas reflejan probabilidad matemática de ida y vuelta; nunca deben interpretarse como una «zona segura».
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-amber-500 font-bold shrink-0">•</span>
          <span>
            <strong className="text-stone-300">Resolución del terreno:</strong> Celdas de 32 m del DEM del USGS en el cráter Gale (3,52 × 3,52 km).
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-amber-500 font-bold shrink-0">•</span>
          <span>
            <strong className="text-stone-300">Tope de bajada en pendientes:</strong> La velocidad en descenso no supera a la de llano para mitigar el riesgo de tropiezo e inestabilidad del traje.
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-amber-500 font-bold shrink-0">•</span>
          <span>
            <strong className="text-stone-300">Tripulación y validación:</strong> Parámetros fisiológicos calibrados con datos de la ISS. Modelo de demostración técnica según NASA-STD-7009B.
          </span>
        </li>
      </ul>
    </div>
  );
}

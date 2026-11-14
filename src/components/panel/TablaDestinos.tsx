"use client";

import { useState } from "react";
import type { Resultado } from "@/lib/contract";
import { N } from "@/lib/constants";
import {
  DESTINOS,
  distanciaDesdeHabitatKm,
  desnivelDesdeHabitatM,
  type DestinoPersonalizado,
} from "@/lib/data/targets";

interface Props {
  resultado: Resultado | null;
  destinosPersonalizados: DestinoPersonalizado[];
  seleccionando: boolean;
  puntoSeleccionado: { fila: number; columna: number } | null;
  onIniciarSeleccion: () => void;
  onCancelarSeleccion: () => void;
  onGuardarDestino: (datos: { nombre: string; tareas: string[] }) => void;
  onEliminarDestino: (id: string) => void;
}

/**
 * PERSONA 3 · Panel de destinos científicos de Curiosity (T1–T6) y destinos
 * personalizados elegidos directamente sobre el mapa.
 * Muestra nombre, distancia, desnivel y probabilidad. Al pulsar un destino se
 * despliega un resumen informativo de sus tareas, sin checkboxes ni límites.
 */
export default function TablaDestinos({
  resultado,
  destinosPersonalizados,
  seleccionando,
  puntoSeleccionado,
  onIniciarSeleccion,
  onCancelarSeleccion,
  onGuardarDestino,
  onEliminarDestino,
}: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-3 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">Destinos</span>
        <span className="text-[10px] text-stone-500">Clic para ver tareas</span>
      </div>

      {/* Cabecera de columnas */}
      <div className="mb-1 grid grid-cols-[minmax(0,1fr)_3.2rem_3.2rem_2.6rem_0.75rem] items-center gap-1 px-1.5 text-[9px] font-medium uppercase tracking-wide text-stone-500">
        <span>Destino</span>
        <span className="text-right" title="Distancia">Dist.</span>
        <span className="text-right" title="Desnivel">Desn.</span>
        <span className="text-right" title="Probabilidad">Prob.</span>
        <span />
      </div>

      <div className="space-y-1">
        {DESTINOS.map((t) => (
          <FilaDestino
            key={t.id}
            etiqueta={t.id.replace("T", "")}
            nombre={t.nombre}
            distanciaKm={t.distanciaKm}
            desnivelM={t.desnivelM}
            probabilidad={resultado?.destinos.find((d) => d.id === t.id)?.p}
            contexto={t.contexto}
            tareas={t.tareas}
            abierto={abierto === t.id}
            onToggle={() => setAbierto((actual) => (actual === t.id ? null : t.id))}
          />
        ))}

        {destinosPersonalizados.map((d) => (
          <FilaDestino
            key={d.id}
            etiqueta={d.id}
            nombre={d.nombre}
            distanciaKm={distanciaDesdeHabitatKm(d.fila, d.columna)}
            desnivelM={desnivelDesdeHabitatM(resultado, d.fila, d.columna)}
            probabilidad={resultado?.prob[d.fila * N + d.columna]}
            contexto={`Destino personalizado · celda (${d.fila}, ${d.columna})`}
            tareas={d.tareas}
            personalizado
            abierto={abierto === d.id}
            onToggle={() => setAbierto((actual) => (actual === d.id ? null : d.id))}
            onEliminar={() => onEliminarDestino(d.id)}
          />
        ))}
      </div>

      {/* Alta de destinos personalizados */}
      <div className="mt-2 border-t border-stone-800 pt-2">
        {seleccionando ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-center">
            <p className="text-[10px] font-semibold text-amber-300">
              Haz clic en el mapa para elegir el nuevo destino.
            </p>
            <button
              type="button"
              onClick={onCancelarSeleccion}
              className="mt-1 text-[10px] text-stone-400 underline transition hover:text-stone-200"
            >
              Cancelar
            </button>
          </div>
        ) : puntoSeleccionado ? (
          <FormularioDestino
            key={`${puntoSeleccionado.fila}-${puntoSeleccionado.columna}`}
            fila={puntoSeleccionado.fila}
            columna={puntoSeleccionado.columna}
            resultado={resultado}
            onGuardar={onGuardarDestino}
            onCancelar={onCancelarSeleccion}
          />
        ) : (
          <button
            type="button"
            onClick={onIniciarSeleccion}
            className="w-full rounded-lg border border-dashed border-stone-700 bg-stone-950/60 px-2 py-2 text-[11px] font-semibold text-amber-400 transition hover:border-amber-500/60 hover:bg-amber-500/10"
          >
            + Añadir destino en el mapa
          </button>
        )}
      </div>
    </div>
  );
}

interface FilaDestinoProps {
  etiqueta: string;
  nombre: string;
  distanciaKm: number;
  desnivelM: number | null;
  probabilidad: number | undefined;
  contexto: string;
  tareas: string[];
  personalizado?: boolean;
  abierto: boolean;
  onToggle: () => void;
  onEliminar?: () => void;
}

function FilaDestino({
  etiqueta,
  nombre,
  distanciaKm,
  desnivelM,
  probabilidad,
  contexto,
  tareas,
  personalizado = false,
  abierto,
  onToggle,
  onEliminar,
}: FilaDestinoProps) {
  const tieneProb = probabilidad !== undefined;
  const alcanzable = tieneProb && probabilidad >= 0.5;
  const probTexto = tieneProb ? `${Math.round(probabilidad * 100)} %` : "sin calcular";
  const desnivelTexto =
    desnivelM === null ? "sin calcular" : `${desnivelM > 0 ? "+" : ""}${desnivelM} m`;

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        abierto ? "border-amber-500/40 bg-amber-500/5" : "border-stone-800 bg-stone-950/60"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        aria-controls={abierto ? `tareas-${etiqueta}` : undefined}
        aria-label={`${nombre}: ${distanciaKm.toFixed(2)} km, desnivel ${desnivelTexto}, probabilidad ${probTexto}. ${
          abierto ? "Ocultar" : "Ver"
        } tareas.`}
        className="grid w-full grid-cols-[minmax(0,1fr)_3.2rem_3.2rem_2.6rem_0.75rem] items-center gap-1 px-1.5 py-1.5 text-left transition hover:bg-stone-800/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/60"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded px-0.5 text-[9px] font-bold ${
              personalizado
                ? "border border-amber-500/50 bg-amber-500/15 text-amber-300"
                : alcanzable
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400"
            }`}
          >
            {etiqueta}
          </span>
          <span className="truncate text-[11px] font-semibold leading-tight text-stone-100">
            {nombre}
          </span>
        </span>

        <span className="whitespace-nowrap text-right font-mono text-[10px] text-stone-300">
          {distanciaKm.toFixed(2)} km
        </span>

        <span
          className={`whitespace-nowrap text-right font-mono text-[10px] ${
            desnivelM === null
              ? "text-stone-500"
              : desnivelM > 50
              ? "text-rose-400"
              : desnivelM < 0
              ? "text-emerald-400"
              : "text-stone-400"
          }`}
        >
          {desnivelM === null ? "—" : `${desnivelM > 0 ? "+" : ""}${desnivelM} m`}
        </span>

        <span className="text-right">
          {tieneProb ? (
            <span
              className={`inline-block rounded px-1 py-0.5 font-mono text-[10px] font-bold ${
                alcanzable
                  ? "border border-amber-500/30 bg-amber-500/20 text-amber-300"
                  : probabilidad >= 0.1
                  ? "bg-stone-800 text-stone-300"
                  : "bg-stone-900/60 text-stone-500"
              }`}
            >
              {probTexto}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-stone-600">—</span>
          )}
        </span>

        <span className="text-center font-mono text-[9px] text-stone-500">
          {abierto ? "▲" : "▼"}
        </span>
      </button>

      {abierto && (
        <div
          id={`tareas-${etiqueta}`}
          className="border-t border-stone-800/70 bg-stone-950/40 px-2 pb-2 pt-1.5"
        >
          <p className="text-[10px] leading-snug text-stone-400">{contexto}</p>
          <p className="mb-1 mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400/90">
            Tareas a realizar
          </p>
          {tareas.length > 0 ? (
            <ul className="space-y-1">
              {tareas.map((tarea, i) => (
                <li
                  key={`${etiqueta}-${i}`}
                  className="flex items-start gap-1.5 text-[10px] leading-snug text-stone-300"
                >
                  <span className="mt-px shrink-0 font-bold text-amber-500">•</span>
                  <span>{tarea}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] italic text-stone-500">Sin tareas registradas.</p>
          )}

          {personalizado && onEliminar && (
            <button
              type="button"
              onClick={onEliminar}
              className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-rose-400 transition hover:text-rose-300"
            >
              Eliminar destino
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface FormularioDestinoProps {
  fila: number;
  columna: number;
  resultado: Resultado | null;
  onGuardar: (datos: { nombre: string; tareas: string[] }) => void;
  onCancelar: () => void;
}

function FormularioDestino({
  fila,
  columna,
  resultado,
  onGuardar,
  onCancelar,
}: FormularioDestinoProps) {
  const [nombre, setNombre] = useState("");
  const [tareas, setTareas] = useState<string[]>([]);
  const [nuevaTarea, setNuevaTarea] = useState("");

  const distanciaKm = distanciaDesdeHabitatKm(fila, columna);
  const desnivelM = desnivelDesdeHabitatM(resultado, fila, columna);
  const probabilidad = resultado?.prob[fila * N + columna];

  const agregarTarea = () => {
    const tarea = nuevaTarea.trim();
    if (!tarea) return;
    setTareas((actuales) => [...actuales, tarea]);
    setNuevaTarea("");
  };

  const eliminarTarea = (indice: number) => {
    setTareas((actuales) => actuales.filter((_, i) => i !== indice));
  };

  const guardar = () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    onGuardar({ nombre: nombreLimpio, tareas });
  };

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-400">
          Nuevo destino
        </span>
        <span className="font-mono text-[9px] text-stone-500">
          Celda ({fila}, {columna})
        </span>
      </div>

      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del destino"
        className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1.5 text-[11px] text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none"
      />

      <div className="mt-1.5 grid grid-cols-3 gap-1">
        <div className="rounded-md bg-stone-950/70 px-1.5 py-1">
          <p className="text-[8px] uppercase tracking-wide text-stone-500">Distancia</p>
          <p className="font-mono text-[10px] font-semibold text-stone-200">
            {distanciaKm.toFixed(2)} km
          </p>
        </div>
        <div className="rounded-md bg-stone-950/70 px-1.5 py-1">
          <p className="text-[8px] uppercase tracking-wide text-stone-500">Desnivel</p>
          <p className="font-mono text-[10px] font-semibold text-stone-200">
            {desnivelM === null ? "—" : `${desnivelM > 0 ? "+" : ""}${desnivelM} m`}
          </p>
        </div>
        <div className="rounded-md bg-stone-950/70 px-1.5 py-1">
          <p className="text-[8px] uppercase tracking-wide text-stone-500">Probabilidad</p>
          <p className="font-mono text-[10px] font-semibold text-stone-200">
            {probabilidad === undefined ? "—" : `${Math.round(probabilidad * 100)} %`}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-stone-400">
          Tareas a realizar
        </p>

        {tareas.length > 0 && (
          <ul className="mb-1 space-y-1">
            {tareas.map((tarea, i) => (
              <li
                key={`${tarea}-${i}`}
                className="flex items-start gap-1.5 text-[10px] leading-snug text-stone-300"
              >
                <span className="mt-px shrink-0 font-bold text-amber-500">•</span>
                <span className="min-w-0 flex-1">{tarea}</span>
                <button
                  type="button"
                  onClick={() => eliminarTarea(i)}
                  aria-label={`Quitar tarea: ${tarea}`}
                  className="shrink-0 text-[10px] leading-none text-stone-500 transition hover:text-rose-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-1">
          <input
            type="text"
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarTarea();
              }
            }}
            placeholder="Añadir tarea..."
            className="min-w-0 flex-1 rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-[10px] text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={agregarTarea}
            disabled={!nuevaTarea.trim()}
            className="rounded-md border border-stone-700 bg-stone-800 px-2 text-[11px] font-bold text-amber-400 transition hover:border-amber-500/60 hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Añadir tarea"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={guardar}
          disabled={!nombre.trim()}
          className="flex-1 rounded-md bg-amber-500 px-2 py-1.5 text-[10px] font-bold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Guardar destino
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-md border border-stone-700 px-2 py-1.5 text-[10px] font-semibold text-stone-300 transition hover:bg-stone-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

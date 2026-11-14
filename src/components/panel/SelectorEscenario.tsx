"use client";

import type { FWalk } from "@/lib/contract";
import { CIFRA, Deslizador, Seccion } from "./comun";

interface Props {
  fwalk: FWalk;
  onFwalk: (f: FWalk) => void;
}

const OPCIONES_INTENSIDAD: { valor: FWalk; label: string }[] = [
  { valor: 0.3, label: "30 %" },
  { valor: 0.35, label: "35 %" },
  { valor: 0.4, label: "40 %" },
  { valor: 0.45, label: "45 %" },
  { valor: 0.5, label: "50 %" },
];

/**
 * PERSONA 3 · Intensidad de la marcha: fracción del VO₂ máximo que se usa al caminar,
 * en pasos de 5 % entre el 30 y el 50 %. Si llega "U" (rango por defecto), se muestra el 35 %.
 */
export default function SelectorEscenario({ fwalk, onFwalk }: Props) {
  const indiceActual = OPCIONES_INTENSIDAD.findIndex((o) => o.valor === fwalk);
  const indice = indiceActual >= 0 ? indiceActual : 1;
  const opcionActiva = OPCIONES_INTENSIDAD[indice];

  return (
    <Seccion
      id="titulo-intensidad"
      titulo="Intensidad de la marcha"
      ayuda="Parte del VO₂ máximo que se usa al caminar"
      valor={<span className={`${CIFRA} text-[15px] text-[#eaf0ff]`}>{opcionActiva.label}</span>}
    >
      <Deslizador
        min={0}
        max={OPCIONES_INTENSIDAD.length - 1}
        valor={indice}
        onCambio={(i) => onFwalk(OPCIONES_INTENSIDAD[i].valor)}
        marcas={OPCIONES_INTENSIDAD.map((o, i) => ({ v: i, texto: o.label.replace(" %", "") }))}
        etiqueta="Intensidad de la marcha"
        textoValor={opcionActiva.label}
      />
    </Seccion>
  );
}

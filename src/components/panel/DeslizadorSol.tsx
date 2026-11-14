"use client";

import { CIFRA, Deslizador, Seccion, TEXTO } from "./comun";

interface Props {
  sol: number;
  onChange: (sol: number) => void;
}

const MARCAS_SOL = [1, 7, 14, 21, 30].map((v) => ({ v, texto: String(v) }));

/**
 * PERSONA 3 · Día de la misión (sol 1 a 30). El mapa se recalcula al soltar cada paso.
 */
export default function DeslizadorSol({ sol, onChange }: Props) {
  return (
    <Seccion
      id="titulo-sol"
      titulo="Sol de la misión"
      ayuda="Días en Marte desde el aterrizaje"
      valor={
        <span className={`${CIFRA} text-[13px] ${TEXTO.terciario}`}>
          sol <span className="text-[22px] leading-none text-[#eaf0ff]">{sol}</span> / 30
        </span>
      }
    >
      <Deslizador min={1} max={30} valor={sol} onCambio={onChange} marcas={MARCAS_SOL} etiqueta="Sol de la misión" textoValor={`Sol ${sol}`} />
    </Seccion>
  );
}

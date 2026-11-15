"use client";

import { useIdioma } from "@/lib/i18n";
import { CIFRA, Deslizador, Seccion, TEXTO } from "./comun";

interface Props {
  sol: number;
  onChange: (sol: number) => void;
}

const MARCAS_SOL = [1, 7, 14, 21, 30].map((v) => ({ v, texto: String(v) }));

/**
 * PERSONA 3 · Primera pregunta de la salida: qué sol (1 a 30). Con − y + se va sol a sol. La
 * capacidad aeróbica y el equilibrio se recuperan con los soles (capa 2 del modelo), así que la
 * zona alcanzable crece. El mapa se recalcula con el último valor que se deja.
 */
export default function DeslizadorSol({ sol, onChange }: Props) {
  const { t } = useIdioma();
  return (
    <Seccion
      id="titulo-sol"
      titulo={t.solPregunta}
      ayuda={t.solAyuda}
      valor={
        <span className={`${CIFRA} text-[13px] ${TEXTO.terciario}`}>
          sol <span className="text-[24px] font-light leading-none text-[#eaf0ff]">{sol}</span> / 30
        </span>
      }
    >
      <Deslizador
        min={1}
        max={30}
        valor={sol}
        onCambio={onChange}
        marcas={MARCAS_SOL}
        etiqueta={t.solTitulo}
        textoValor={t.solValor(sol)}
        pasos={{ menos: t.solAnterior, mas: t.solSiguiente }}
      />
    </Seccion>
  );
}

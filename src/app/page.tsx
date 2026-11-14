"use client";

import { useRef, useState } from "react";
import type { Estado } from "@/lib/contract";
import { useModelo } from "@/hooks/useModelo";
import Mapa from "@/components/mapa/Mapa";
import Inspector from "@/components/mapa/Inspector";
import DeslizadorSol from "@/components/panel/DeslizadorSol";
import SelectorCaminante from "@/components/panel/SelectorCaminante";
import SelectorEscenario from "@/components/panel/SelectorEscenario";
import TablaDestinos from "@/components/panel/TablaDestinos";
import Creditos from "@/components/panel/Creditos";
import BarraProgreso from "@/components/panel/BarraProgreso";
import { PERFILES_ASTRONAUTAS } from "@/lib/data/perfiles";
import type { DestinoPersonalizado } from "@/lib/data/targets";

type PuntoMapa = { fila: number; columna: number };

const ESTADO_INICIAL: Estado = {
  sol: 1,
  modo: "grupo",
  tripulantes: [
    { vo2pre: PERFILES_ASTRONAUTAS[1].vo2pre, masa: PERFILES_ASTRONAUTAS[1].masa },
    { vo2pre: PERFILES_ASTRONAUTAS[0].vo2pre, masa: PERFILES_ASTRONAUTAS[0].masa },
    { vo2pre: PERFILES_ASTRONAUTAS[3].vo2pre, masa: PERFILES_ASTRONAUTAS[3].masa },
  ],
  fwalk: 0.35,
  energiaHoras: 6,
};

export default function Home() {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [celda, setCelda] = useState<PuntoMapa | null>(null);
  const [destinosPersonalizados, setDestinosPersonalizados] = useState<DestinoPersonalizado[]>([]);
  const [seleccionandoDestino, setSeleccionandoDestino] = useState(false);
  const [puntoDestino, setPuntoDestino] = useState<PuntoMapa | null>(null);
  const contadorDestinos = useRef(0);
  const { resultado, progreso, calculando, error } = useModelo(estado);
  const set = (parcial: Partial<Estado>) => setEstado((e) => ({ ...e, ...parcial }));

  const manejarCelda = (fila: number, columna: number) => {
    setCelda({ fila, columna });
    if (seleccionandoDestino) {
      setPuntoDestino({ fila, columna });
      setSeleccionandoDestino(false);
    }
  };

  const iniciarSeleccionDestino = () => {
    setPuntoDestino(null);
    setSeleccionandoDestino(true);
  };

  const cancelarSeleccionDestino = () => {
    setSeleccionandoDestino(false);
    setPuntoDestino(null);
  };

  const guardarDestinoPersonalizado = (datos: { nombre: string; tareas: string[] }) => {
    if (!puntoDestino) return;
    contadorDestinos.current += 1;
    const nuevoDestino: DestinoPersonalizado = {
      id: `P${contadorDestinos.current}`,
      nombre: datos.nombre,
      fila: puntoDestino.fila,
      columna: puntoDestino.columna,
      tareas: datos.tareas,
    };
    setDestinosPersonalizados((actuales) => [...actuales, nuevoDestino]);
    setPuntoDestino(null);
  };

  const eliminarDestinoPersonalizado = (id: string) => {
    setDestinosPersonalizados((actuales) => actuales.filter((d) => d.id !== id));
  };

  return (
    <main className="h-screen w-screen max-h-screen overflow-hidden p-3 bg-stone-950 flex flex-col justify-between">
      <div className="grid h-full w-full max-w-7xl mx-auto gap-4 md:grid-cols-[minmax(0,1fr)_360px] items-start overflow-hidden">
        {/* Columna Izquierda: Mapa de Marte e Inspector */}
        <section className="flex flex-col gap-2 h-full justify-center max-w-[650px] mx-auto w-full">
          <BarraProgreso progreso={progreso} visible={calculando} />
          <Mapa
            resultado={resultado}
            onCeldaClick={manejarCelda}
            destinosPersonalizados={destinosPersonalizados}
            puntoSeleccionado={puntoDestino}
            seleccionandoDestino={seleccionandoDestino}
          />
          <Inspector celda={celda} resultado={resultado} />
          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
        </section>

        {/* Columna Derecha: Módulos del Panel de Control */}
        <aside className="flex max-h-full min-h-0 flex-col gap-3 overflow-y-auto py-1 pr-1">
          {/* Módulo 1: Línea Temporal (Sol 1 a 30) */}
          <DeslizadorSol sol={estado.sol} onChange={(sol) => set({ sol })} />

          {/* Módulo 2: Quién Camina (Desplegable con checklist de tripulantes) */}
          <SelectorCaminante
            modo={estado.modo}
            tripulantes={estado.tripulantes}
            onModo={(modo) => set({ modo })}
            onTripulantes={(tripulantes) => set({ tripulantes })}
          />

          {/* Módulo 3: Intensidad aproximada empleado */}
          <SelectorEscenario
            fwalk={estado.fwalk}
            onFwalk={(fwalk) => set({ fwalk })}
          />

          {/* Módulo 4: Destinos y tareas a realizar */}
          <TablaDestinos
            resultado={resultado}
            destinosPersonalizados={destinosPersonalizados}
            seleccionando={seleccionandoDestino}
            puntoSeleccionado={puntoDestino}
            onIniciarSeleccion={iniciarSeleccionDestino}
            onCancelarSeleccion={cancelarSeleccionDestino}
            onGuardarDestino={guardarDestinoPersonalizado}
            onEliminarDestino={eliminarDestinoPersonalizado}
          />
        </aside>
      </div>

      {/* Créditos compactos en una sola línea al pie */}
      <footer className="w-full shrink-0 pt-1 border-t border-stone-850">
        <Creditos />
      </footer>
    </main>
  );
}

"use client";

import { useState } from "react";
import type { Estado } from "@/lib/contract";
import { CENTRALES } from "@/lib/constants";
import { useModelo } from "@/hooks/useModelo";
import Mapa from "@/components/mapa/Mapa";
import Inspector from "@/components/mapa/Inspector";
import DeslizadorSol from "@/components/panel/DeslizadorSol";
import SelectorCaminante from "@/components/panel/SelectorCaminante";
import SelectorEscenario from "@/components/panel/SelectorEscenario";
import TablaDestinos from "@/components/panel/TablaDestinos";
import TarjetasDestino from "@/components/panel/TarjetasDestino";
import PanelSupuestos from "@/components/panel/PanelSupuestos";
import Creditos from "@/components/panel/Creditos";
import BarraProgreso from "@/components/panel/BarraProgreso";

const ESTADO_INICIAL: Estado = {
  sol: 1,
  modo: "poblacion",
  // TODO: tripulantes ficticios de la demo (pendiente en el README)
  tripulantes: [
    { vo2pre: CENTRALES.vo2pre, masa: CENTRALES.masa },
    { vo2pre: 36, masa: 82 },
  ],
  fwalk: "U",
  energiaHoras: 6,
};

export default function Home() {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [celda, setCelda] = useState<{ fila: number; columna: number } | null>(null);
  const { resultado, progreso, calculando, error } = useModelo(estado);
  const set = (parcial: Partial<Estado>) => setEstado((e) => ({ ...e, ...parcial }));

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 p-4 lg:grid-cols-[1fr_380px]">
      <header className="lg:col-span-2">
        <h1 className="text-2xl font-bold">Land &amp; Stand</h1>
        <p className="text-sm text-stone-400">El mapa de Marte según el cuerpo que lo pisa · cráter Gale</p>
      </header>

      <section className="flex flex-col gap-3">
        <BarraProgreso progreso={progreso} visible={calculando} />
        <Mapa resultado={resultado} onCeldaClick={(fila, columna) => setCelda({ fila, columna })} />
        <Inspector celda={celda} resultado={resultado} />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>

      <aside className="flex flex-col gap-5">
        <DeslizadorSol sol={estado.sol} onChange={(sol) => set({ sol })} />
        <SelectorCaminante
          modo={estado.modo}
          tripulantes={estado.tripulantes}
          onModo={(modo) => set({ modo })}
          onTripulantes={(tripulantes) => set({ tripulantes })}
        />
        <SelectorEscenario
          fwalk={estado.fwalk}
          energiaHoras={estado.energiaHoras}
          onFwalk={(fwalk) => set({ fwalk })}
          onEnergia={(energiaHoras) => set({ energiaHoras })}
        />
        <TablaDestinos resultado={resultado} />
        <PanelSupuestos />
      </aside>

      <section className="lg:col-span-2">
        <h2 className="mb-2 text-sm font-semibold text-stone-400">Esto es lo que verás</h2>
        <TarjetasDestino resultado={resultado} />
      </section>

      <div className="lg:col-span-2">
        <Creditos />
      </div>
    </main>
  );
}

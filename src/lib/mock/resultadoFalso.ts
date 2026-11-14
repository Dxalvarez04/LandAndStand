import type { Estado, Resultado } from "@/lib/contract";
import { N } from "@/lib/constants";
import { DESTINOS, HABITAT, kmACelda } from "@/lib/data/targets";

/**
 * Resultado INVENTADO para que el mapa y el panel avancen sin esperar al cálculo.
 * Probabilidad que baja con la distancia al hábitat y crece con el sol.
 * Respeta el contrato: fila 0 = sur.
 */
export function resultadoFalso(estado: Estado): Resultado {
  const h = kmACelda(HABITAT.northKm, HABITAT.eastKm);
  const fw = estado.fwalk === "U" ? 0.35 : estado.fwalk;
  const radio =
    (12 + estado.sol * 0.8) * (fw / 0.35) * (estado.energiaHoras === 4 ? 0.7 : 1) *
    (estado.modo === "pareja" ? 0.9 : estado.modo === "grupo" ? 0.8 : 1);

  const prob = new Float32Array(N * N);
  for (let f = 0; f < N; f++) {
    for (let c = 0; c < N; c++) {
      const d = Math.hypot(f - h.fila, c - h.columna);
      prob[f * N + c] = 1 / (1 + Math.exp((d - radio) / 4));
    }
  }

  const destinos = DESTINOS.map((t) => {
    const { fila, columna } = kmACelda(t.northKm, t.eastKm);
    return { id: t.id, p: prob[fila * N + columna] };
  });

  return { prob, destinos };
}

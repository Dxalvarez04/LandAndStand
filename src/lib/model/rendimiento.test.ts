/**
 * Las optimizaciones del cálculo no cambian el resultado:
 *   - evaluarAristas (con términos precalculados) da los mismos bits que marcha() arista a arista;
 *   - repartir el Monte Carlo entre varios workers (tramos de sorteos) da lo mismo que agregar().
 */
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import type { Estado } from "@/lib/contract";
import { N } from "@/lib/constants";
import { construirGeometria, evaluarAristas } from "./grafo";
import { thetaMax } from "./fisiologia";
import { marcha } from "./marcha";
import { agregar, combinar, generarSorteos, sumarSorteo, tramo } from "./montecarlo";

const dem = new Float32Array(readFileSync("public/data/dem_real.bin").buffer.slice(0));

test("evaluarAristas = marcha() arista a arista, bit a bit", () => {
  const geo = construirGeometria(dem);
  const sorteos = generarSorteos(12, 11);
  for (const [i, p] of sorteos.entries()) {
    const s = [1, 4, 12, 30][i % 4];
    const c = evaluarAristas(geo, s, p);
    const thMax = thetaMax(s, p);
    for (let k = 0; k < geo.G.length; k++) {
      const g = geo.G[k];
      let e = Infinity;
      let t = Infinity;
      if (Math.abs(g) <= 45 && geo.theta[k] <= thMax) {
        const { V, P } = marcha(g, s, p);
        if (V > 0.02) {
          t = geo.dist[k] / V;
          e = P * t;
        }
      }
      if (Math.fround(e) !== c.energia[k] || Math.fround(t) !== c.tiempo[k] || c.factible[k] !== (e === Infinity ? 0 : 1)) {
        expect.fail(`arista ${k}, sorteo ${i}: ${e}/${t} ≠ ${c.energia[k]}/${c.tiempo[k]}`);
      }
    }
  }
}, 30_000);

test("repartir los sorteos entre workers da el mismo resultado que agregar()", () => {
  const sorteos = generarSorteos(24, 11);
  const estados: Estado[] = [
    { sol: 2, modo: "tripulante", tripulantes: [{ vo2pre: 38, masa: 70 }], fwalk: "U", energiaHoras: 6 },
    { sol: 20, modo: "grupo", tripulantes: [{ vo2pre: 45, masa: 80 }, { vo2pre: 33, masa: 62 }, { vo2pre: 40, masa: 90 }], fwalk: 0.4, energiaHoras: 4 },
  ];
  for (const estado of estados) {
    const entero = agregar(estado, { dem, sorteos }, () => {});
    for (const partes of [1, 3, 5]) {
      const datos = { dem, sorteos };
      const conteo = new Int32Array(N * N);
      for (let parte = 0; parte < partes; parte++) {
        const [desde, hasta] = tramo(sorteos.length, parte, partes);
        const suyo = new Int32Array(N * N);
        for (let i = desde; i < hasta; i++) sumarSorteo(estado, datos, i, suyo);
        for (let c = 0; c < conteo.length; c++) conteo[c] += suyo[c];
      }
      const junto = combinar(conteo, sorteos.length);
      expect(junto.prob).toEqual(entero.prob);
      expect(junto.destinos).toEqual(entero.destinos);
    }
  }
}, 30_000);

test("los tramos cubren todos los sorteos una sola vez", () => {
  for (const total of [1, 7, 300]) {
    for (const partes of [1, 2, 4, 6]) {
      let siguiente = 0;
      for (let parte = 0; parte < partes; parte++) {
        const [a, b] = tramo(total, parte, partes);
        expect(a).toBe(siguiente);
        siguiente = b;
      }
      expect(siguiente).toBe(total);
    }
  }
});

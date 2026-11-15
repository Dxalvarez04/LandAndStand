import { describe, expect, it } from "vitest";
import { CENTRALES } from "@/lib/constants";
import type { FWalk } from "@/lib/contract";
import { PERFILES_ASTRONAUTAS } from "@/lib/data/perfiles";
import { alcanceLlanoKm, ESCALA_ALCANCE_KM, limitante } from "./alcance";

const central = { vo2pre: CENTRALES.vo2pre, masa: CENTRALES.masa };
const RITMOS: FWalk[] = [0.3, 0.35, 0.4, 0.45, 0.5];

describe("alcance en llano del panel", () => {
  it("coincide con el radio del informe: 1,7 km el sol 1 y 2,2 km el sol 30 con los valores centrales", () => {
    expect(alcanceLlanoKm(central, 1, 0.35, 6)).toBeCloseTo(1.7, 1);
    expect(alcanceLlanoKm(central, 30, 0.35, 6)).toBeCloseTo(2.2, 1);
    // «U» (rango por defecto) usa el valor central del 35 %
    expect(alcanceLlanoKm(central, 1, "U", 6)).toBe(alcanceLlanoKm(central, 1, 0.35, 6));
  });

  it("crece con los soles y con el ritmo, como dicen los textos del panel", () => {
    for (const p of PERFILES_ASTRONAUTAS) {
      for (let sol = 2; sol <= 30; sol++) {
        expect(alcanceLlanoKm(p, sol, 0.35, 6)).toBeGreaterThanOrEqual(alcanceLlanoKm(p, sol - 1, 0.35, 6));
      }
      for (let i = 1; i < RITMOS.length; i++) {
        expect(alcanceLlanoKm(p, 1, RITMOS[i], 6)).toBeGreaterThanOrEqual(alcanceLlanoKm(p, 1, RITMOS[i - 1], 6));
      }
    }
  });

  it("la barra tiene sitio para el mayor alcance de los ocho perfiles", () => {
    const mayor = Math.max(...PERFILES_ASTRONAUTAS.map((p) => alcanceLlanoKm(p, 30, 0.5, 6)));
    expect(mayor).toBeLessThanOrEqual(ESCALA_ALCANCE_KM);
    expect(mayor).toBeGreaterThan(ESCALA_ALCANCE_KM * 0.8);
  });

  it("limita al grupo quien menos alcanza", () => {
    const km = { A1: 2.6, A2: 1.7, A4: 2.1 };
    expect(limitante(["A1", "A2", "A4"], km)).toBe("A2");
    expect(limitante(["A4", "A1"], km)).toBe("A4");
    expect(limitante(["A1"], km)).toBe("A1");
    expect(limitante([], km)).toBeNull();
  });
});

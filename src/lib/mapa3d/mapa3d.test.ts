import { describe, expect, it } from "vitest";
import { SphereGeometry, Vector3 } from "three";
import { CELDA_M, N, X0, Y0 } from "@/lib/constants";
import { celdaALatLon } from "@/lib/data/targets";
import { alturaEn, type Alturas } from "./alturas";
import {
  aEscena,
  celdaAProyectadas,
  deEscena,
  latLonAVector,
  proyectadasACelda,
  proyectadasALatLon,
} from "./coordenadas";

describe("coordenadas 3D", () => {
  it("escena ↔ proyectadas es reversible y el norte es −z", () => {
    const { x, z } = aEscena(X0 + 100, Y0 + 3000);
    const p = deEscena(x, z);
    expect(p.este).toBeCloseTo(X0 + 100);
    expect(p.norte).toBeCloseTo(Y0 + 3000);
    expect(aEscena(X0, Y0 + 3500).z).toBeLessThan(aEscena(X0, Y0 + 100).z);
  });

  it("celda ↔ proyectadas usa fila 0 = sur", () => {
    const c = { fila: 84, columna: 42 };
    const p = celdaAProyectadas(c);
    expect(p.norte).toBeCloseTo(Y0 + 84.5 * CELDA_M);
    expect(proyectadasACelda(p.este, p.norte)).toEqual(c);
    expect(proyectadasACelda(X0 - 1, Y0)).toBeNull();
    expect(proyectadasACelda(X0, Y0 + N * CELDA_M)).toBeNull();
  });

  it("lat/lon coincide con la de la especificación (celdaALatLon)", () => {
    const p = celdaAProyectadas({ fila: 10, columna: 20 });
    const a = proyectadasALatLon(p.este, p.norte);
    const b = celdaALatLon(10, 20);
    expect(a.lat).toBeCloseTo(b.lat, 9);
    expect(a.lon).toBeCloseTo(b.lon, 9);
  });

  it("latLonAVector sigue el convenio de SphereGeometry (u = 0 en lon −180°, v = 1 en el norte)", () => {
    const g = new SphereGeometry(1, 72, 36);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (const k of [100, 500, 1200, 2000]) {
      const u = uv.getX(k);
      const v = uv.getY(k);
      const esperado = new Vector3(...latLonAVector(v * 180 - 90, u * 360 - 180));
      const real = new Vector3(pos.getX(k), pos.getY(k), pos.getZ(k));
      expect(real.distanceTo(esperado)).toBeLessThan(1e-6);
    }
  });
});

describe("alturas", () => {
  const a: Alturas = {
    ancho: 4,
    alto: 3,
    mPx: 10,
    caja: [X0, Y0, X0 + 40, Y0 + 30],
    zmin: 0,
    zmax: 11,
    // fila 0 = norte
    datos: Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  };

  it("alturaEn interpola sobre centros de píxel (fila 0 = norte)", () => {
    expect(alturaEn(a, X0 + 5, Y0 + 25)).toBeCloseTo(0); // centro del píxel noroeste
    expect(alturaEn(a, X0 + 35, Y0 + 5)).toBeCloseTo(11); // centro del píxel sureste
    expect(alturaEn(a, X0 + 10, Y0 + 25)).toBeCloseTo(0.5);
  });
});

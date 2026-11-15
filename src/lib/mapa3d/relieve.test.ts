import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { R_MARTE } from "@/lib/constants";
import { alturaEn, type Alturas, type AlturasGale } from "./alturas";
import { aEscena } from "./coordenadas";
import { alturaCompuesta, cajaMalla, construirMalla, regionComoAlturas, resolucionEn, type Caja, type Relieve } from "./relieve";

/** Rejilla con la altura que se pida (m), fila 0 = norte. */
function rejilla(caja: Caja, mPx: number, altura: (este: number, norte: number) => number): Alturas {
  const ancho = Math.round((caja[2] - caja[0]) / mPx);
  const alto = Math.round((caja[3] - caja[1]) / mPx);
  const datos = new Float32Array(ancho * alto);
  let zmin = Infinity;
  let zmax = -Infinity;
  for (let f = 0; f < alto; f++)
    for (let c = 0; c < ancho; c++) {
      const v = altura(caja[0] + (c + 0.5) * mPx, caja[3] - (f + 0.5) * mPx);
      datos[f * ancho + c] = v;
      zmin = Math.min(zmin, v);
      zmax = Math.max(zmax, v);
    }
  return { ancho, alto, mPx, caja, zmin, zmax, datos };
}

// Tres niveles encajados con alturas distintas: 100 m (zona), 40 m (entorno) y 0 m (región)
const zona = rejilla([0, 0, 1600, 1600], 16, () => 100);
const entorno = rejilla([-3200, -3200, 4800, 4800], 64, () => 40);
const region = rejilla([-32000, -32000, 32000, 32000], 500, () => 0);
const relieve: Relieve = { zona, entorno, region };

describe("relieve en tres niveles", () => {
  it("dentro de cada nivel manda su DEM y en el borde empalma con el de fuera", () => {
    expect(alturaCompuesta(relieve, 800, 800)).toBeCloseTo(100); // centro de la zona
    expect(alturaCompuesta(relieve, 800, 3500)).toBeCloseTo(40); // entorno, lejos de sus bordes
    expect(alturaCompuesta(relieve, 20000, 0)).toBeCloseTo(0); // región
    // En el borde de la malla de la zona vale lo que el entorno; hacia dentro sube sin saltos
    const borde = cajaMalla(zona)[0];
    expect(alturaCompuesta(relieve, borde, 800)).toBeCloseTo(40);
    const medio = alturaCompuesta(relieve, borde + 130, 800);
    expect(medio).toBeGreaterThan(41);
    expect(medio).toBeLessThan(99);
    // Y lo mismo entre el entorno y la región
    expect(alturaCompuesta(relieve, cajaMalla(entorno)[2], 0)).toBeCloseTo(0);
    // Continua: dos puntos a 1 m no difieren más de lo que da la franja
    for (const x of [borde - 0.5, borde + 60, borde + 259.5, 1500, 4700, 4770])
      expect(Math.abs(alturaCompuesta(relieve, x + 1, 800) - alturaCompuesta(relieve, x, 800))).toBeLessThan(1);
  });

  it("sin entorno ni región es el terreno local, tal cual", () => {
    const solo: Relieve = { zona, entorno: null, region: null };
    expect(alturaCompuesta(solo, 8, 800)).toBeCloseTo(alturaEn(zona, 8, 800));
    expect(alturaCompuesta(solo, -500, 800)).toBeCloseTo(100); // fuera: el borde
  });

  it("la resolución es la del nivel que manda en cada punto", () => {
    expect(resolucionEn(relieve, 800, 800)).toBe(16);
    expect(resolucionEn(relieve, 3000, 800)).toBe(64);
    expect(resolucionEn(relieve, 20000, 800)).toBe(500);
  });

  it("la región (rejilla en grados) pasa a proyectadas con píxeles cuadrados", () => {
    const g: AlturasGale = { ancho: 4, alto: 4, lon: [135.8, 139.8], lat: [-7, -3], min: 0, max: 3, datos: new Int16Array(16).fill(7), tinteGlobo: [1, 1, 1] };
    const a = regionComoAlturas(g);
    const grado = (R_MARTE * Math.PI) / 180;
    expect(a.mPx).toBeCloseTo(grado);
    expect(a.caja[3] - a.caja[1]).toBeCloseTo(4 * grado);
    expect(alturaEn(a, a.caja[0] + 10, a.caja[1] + 10)).toBe(7);
  });
});

describe("malla de un nivel", () => {
  const hueco = cajaMalla(zona);
  const m = construirMalla({
    caja: cajaMalla(entorno),
    paso: 64,
    altura: (e, n) => alturaCompuesta(relieve, e, n),
    zRef: 0,
    cajaUv: entorno.caja,
    hueco,
    faldon: 50,
  });
  const v = (i: number) => new Vector3(m.posiciones[i * 3], m.posiciones[i * 3 + 1], m.posiciones[i * 3 + 2]);

  it("las caras de la superficie miran hacia arriba y ninguna cae dentro del hueco", () => {
    const a = aEscena(hueco[0], hueco[3]);
    const b = aEscena(hueco[2], hueco[1]);
    let superficie = 0;
    for (let t = 0; t < m.indices.length; t += 3) {
      const [p, q, r] = [m.indices[t], m.indices[t + 1], m.indices[t + 2]];
      if (p >= m.nSuperficie || q >= m.nSuperficie || r >= m.nSuperficie) continue; // faldón
      superficie++;
      expect(new Vector3().crossVectors(v(q).sub(v(p)), v(r).sub(v(p))).y).toBeGreaterThan(0);
      const c = v(p).add(v(q)).add(v(r)).divideScalar(3);
      expect(c.x > a.x && c.x < b.x && c.z > a.z && c.z < b.z).toBe(false);
    }
    expect(superficie).toBeGreaterThan(1000);
  });

  it("hay vértices justo en el borde del hueco, a la altura de la superficie compuesta", () => {
    const a = aEscena(hueco[0], hueco[3]);
    const b = aEscena(hueco[2], hueco[1]);
    let enBorde = 0;
    for (let i = 0; i < m.nSuperficie; i++) {
      const q = v(i);
      if (Math.abs(q.x - a.x) < 1e-3 && q.z >= a.z - 1e-3 && q.z <= b.z + 1e-3) {
        enBorde++;
        expect(q.y).toBeCloseTo(40, 3); // el borde de la zona vale lo que el entorno
      }
    }
    expect(enBorde).toBeGreaterThan(10);
  });

  it("los faldones bajan desde los bordes con la normal de su vértice, y las uv van de 0 a 1 con el norte arriba", () => {
    let faldon = 0;
    for (let i = m.nSuperficie; i < m.posiciones.length / 3; i++) {
      faldon++;
      expect(m.normales[i * 3 + 1]).toBeGreaterThan(0.5);
    }
    expect(faldon).toBeGreaterThan(100);
    const ys = Array.from(m.posiciones).filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBeCloseTo(-50);
    // Primer vértice: esquina noroeste
    expect(m.uvs[0]).toBeGreaterThan(0);
    expect(m.uvs[0]).toBeLessThan(0.01);
    expect(m.uvs[1]).toBeGreaterThan(0.99);
    // En un llano todas las normales de la superficie miran al cenit
    const llano = construirMalla({ caja: [0, 0, 640, 640], paso: 64, altura: () => 5, zRef: 0, cajaUv: [0, 0, 640, 640], alero: 1000 });
    for (let i = 0; i < llano.nSuperficie; i++) expect(llano.normales[i * 3 + 1]).toBeCloseTo(1);
    const xs = Array.from(llano.posiciones).filter((_, i) => i % 3 === 0);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(2000); // el alero sale 1 km por cada lado
  });
});

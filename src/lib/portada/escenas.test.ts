import { describe, expect, it } from "vitest";
import { MathUtils, Vector3 } from "three";
import { FOV, mezclarPoses, nuevaPose, poseEn, poseGlobo, recorridoDeScroll, ULTIMA, visibilidad } from "./escenas";
import { GALE, latLonAVector } from "@/lib/mapa3d/coordenadas";

/** Centro del planeta en pantalla (coordenadas normalizadas) para una pose y un aspecto. */
function centroEnPantalla(s: number, aspecto: number) {
  const p = poseEn(s, aspecto);
  const adelante = p.mira.clone().sub(p.pos).normalize();
  const derecha = new Vector3().crossVectors(adelante, p.arriba).normalize();
  const arriba = new Vector3().crossVectors(derecha, adelante);
  const aCentro = p.pos.clone().negate();
  const z = aCentro.dot(adelante);
  const tanV = Math.tan(MathUtils.degToRad(FOV / 2));
  return { x: aCentro.dot(derecha) / z / (tanV * aspecto), y: aCentro.dot(arriba) / z / tanV, z };
}

describe("portada · planos del planeta", () => {
  it("la última sección deja la cámara como el globo del mapa: mira al centro, norte arriba, Gale de frente", () => {
    for (const aspecto of [16 / 9, 0.46]) {
      const p = poseEn(ULTIMA, aspecto);
      expect(p.mira.length()).toBeLessThan(1e-9);
      expect(p.arriba.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9);
      const gale = new Vector3(...latLonAVector(GALE.lat, GALE.lon));
      // Gale cerca del centro de la cara visible (a menos de 12°)
      expect(gale.angleTo(p.pos)).toBeLessThan(MathUtils.degToRad(12));
      // Cara llena: el sol llega casi desde la cámara
      expect(p.sol.angleTo(p.pos)).toBeLessThan(MathUtils.degToRad(30));
    }
  });

  it("el globo de la demo empieza en otra vista (más cerca y girado) que la última de la portada", () => {
    for (const aspecto of [16 / 9, 0.46]) {
      const g = poseGlobo(aspecto);
      const p = poseEn(ULTIMA, aspecto);
      // Lo que necesitan los controles del globo: mira al centro, norte arriba
      expect(g.mira.length()).toBeLessThan(1e-9);
      expect(g.arriba.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9);
      // Hay movimiento: se acerca y gira unos grados
      expect(g.pos.length()).toBeLessThan(p.pos.length());
      const giro = MathUtils.radToDeg(g.pos.angleTo(p.pos));
      expect(giro).toBeGreaterThan(18);
      expect(giro).toBeLessThan(40);
      // Gale sigue en la cara visible, sin acercarse al borde (su rótulo tiene que caber)
      const gale = new Vector3(...latLonAVector(GALE.lat, GALE.lon));
      expect(gale.angleTo(g.pos)).toBeLessThan(MathUtils.degToRad(35));
    }
  });

  it("de la portada al globo, la mezcla da media vuelta suave sin saltos y acaba en la vista del globo", () => {
    const a = poseEn(0, 16 / 9);
    const b = poseGlobo(16 / 9);
    const m = nuevaPose();
    let antes = mezclarPoses(a, b, 0, nuevaPose()).pos.clone();
    expect(antes.distanceTo(a.pos)).toBeLessThan(1e-6);
    for (let k = 0.01; k <= 1.0001; k += 0.01) {
      mezclarPoses(a, b, Math.min(k, 1), m);
      expect(m.pos.length()).toBeGreaterThan(1.05);
      expect(m.pos.distanceTo(antes)).toBeLessThan(0.2);
      expect(Math.abs(m.sol.length() - 1)).toBeLessThan(1e-9);
      antes = m.pos.clone();
    }
    expect(m.pos.distanceTo(b.pos)).toBeLessThan(1e-6);
    expect(m.mira.length()).toBeLessThan(1e-6);
    expect(m.sol.distanceTo(b.sol)).toBeLessThan(1e-6);
  });

  it("la portada es un creciente: el sol llega por detrás del planeta", () => {
    const p = poseEn(0, 16 / 9);
    expect(p.sol.dot(p.pos.clone().normalize())).toBeLessThan(-0.2);
  });

  it("el planeta queda donde dice el plano y nunca se mete la cámara dentro", () => {
    const c = centroEnPantalla(0, 16 / 9);
    expect(c.x).toBeCloseTo(0.2, 1);
    expect(c.y).toBeCloseTo(0, 1);
    for (let s = 0; s <= ULTIMA; s += 0.05) {
      for (const aspecto of [16 / 9, 1, 0.46]) {
        const p = poseEn(s, aspecto);
        expect(p.pos.length()).toBeGreaterThan(1.05);
        expect(Math.abs(p.sol.length() - 1)).toBeLessThan(1e-9);
        expect(Math.abs(p.arriba.length() - 1)).toBeLessThan(1e-9);
      }
    }
  });

  it("el recorrido es continuo: pasos pequeños de scroll mueven poco la cámara", () => {
    let antes = poseEn(0, 16 / 9).pos.clone();
    for (let s = 0.01; s <= ULTIMA; s += 0.01) {
      const ahora = poseEn(s, 16 / 9).pos;
      expect(ahora.distanceTo(antes)).toBeLessThan(0.15);
      antes = ahora.clone();
    }
  });
});

describe("portada · scroll", () => {
  it("el scroll recorre todas las secciones, sin retroceder, y reposa junto a cada plano", () => {
    expect(recorridoDeScroll(0)).toBe(0);
    expect(recorridoDeScroll(1)).toBe(ULTIMA);
    let antes = 0;
    for (let u = 0; u <= 1; u += 0.002) {
      const s = recorridoDeScroll(u);
      expect(s).toBeGreaterThanOrEqual(antes - 1e-12);
      antes = s;
    }
    // Reposo: un poco de scroll pasado un plano no lo mueve
    expect(recorridoDeScroll(1 / ULTIMA + 0.01)).toBe(1);
  });

  it("cada texto se ve en su plano y no en los demás", () => {
    for (let i = 0; i <= ULTIMA; i++) {
      expect(visibilidad(i, i)).toBe(1);
      for (let j = 0; j <= ULTIMA; j++) if (j !== i) expect(visibilidad(i, j)).toBe(0);
    }
    expect(visibilidad(-0.5, 0)).toBe(1);
    expect(visibilidad(ULTIMA + 0.5, ULTIMA)).toBe(1);
  });
});

import { beforeAll, describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { LIMITES } from "./camara";
import { ControlMapa, type Suelo } from "./control";

type Oyente = (e: Record<string, unknown>) => void;
const ANCHO = 800;
const ALTO = 600;

/** Lienzo y ventana de mentira: solo guardan los oyentes para poder dispararlos. */
const enVentana = new Map<string, Oyente>();
beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window = {
    addEventListener: (tipo: string, f: Oyente) => enVentana.set(tipo, f),
    removeEventListener: () => {},
  };
});

/** Suelo con una loma opcional: plano en y = 0 y, si se pide, una meseta de `alto` m para x > 1500. */
function suelo(alto = 0): Suelo {
  const altura = (x: number) => (x > 1500 ? alto : 0);
  return {
    altura,
    cortar: (o, d, tMax) => {
      // Avance a pasos cortos: suficiente para una prueba
      let antes = o.y - altura(o.x);
      for (let t = 5; t < tMax && t < 200_000; t += 5) {
        const ahora = o.y + d.y * t - altura(o.x + d.x * t);
        if (antes >= 0 && ahora < 0) return t - 5 * (ahora / (ahora - antes));
        antes = ahora;
      }
      return null;
    },
  };
}

function montar(s: Suelo = suelo()) {
  const camara = new PerspectiveCamera(40, ANCHO / ALTO, 5, 900_000);
  const enLienzo = new Map<string, Oyente>();
  const dom = {
    addEventListener: (tipo: string, f: Oyente) => enLienzo.set(tipo, f),
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: ANCHO, height: ALTO }),
    style: {},
  } as unknown as HTMLElement;
  const control = new ControlMapa(camara, dom, s, { ...LIMITES, caja: [-20_000, -20_000, 20_000, 20_000] }, () => {});
  control.conectar();
  control.fijar({ theta: -0.3, phi: 0.9, r: 5000, objetivo: new Vector3(0, 0, 0) });
  /** Punto del plano y = 0 que se ve en un píxel del lienzo. */
  const bajo = (x: number, y: number) => {
    const o = camara.position.clone();
    const d = new Vector3((x / ANCHO) * 2 - 1, -(y / ALTO) * 2 + 1, 0.5).unproject(camara).sub(o).normalize();
    return o.addScaledVector(d, -o.y / d.y);
  };
  const puntero = (tipo: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
    (tipo === "pointerdown" ? enLienzo : enVentana).get(tipo)!({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y, ...extra });
  const rueda = (x: number, y: number, deltaY: number) => enLienzo.get("wheel")!({ clientX: x, clientY: y, deltaY, deltaMode: 0, preventDefault: () => {} });
  const fotogramas = (n: number) => {
    for (let i = 0; i < n; i++) control.actualizar(1 / 60);
  };
  return { camara, control, bajo, puntero, rueda, fotogramas };
}

describe("gestos de la cámara anclados al suelo", () => {
  it("al arrastrar, el punto agarrado sigue bajo el cursor", () => {
    const { bajo, puntero, fotogramas } = montar();
    const agarrado = bajo(200, 180);
    puntero("pointerdown", 200, 180);
    for (const [x, y] of [[260, 240], [380, 300], [470, 420]]) {
      puntero("pointermove", x, y);
      fotogramas(1);
      expect(bajo(x, y).distanceTo(agarrado)).toBeLessThan(0.5);
    }
    puntero("pointerup", 470, 420);
  });

  it("la rueda acerca hacia el punto bajo el cursor, que no se mueve de sitio", () => {
    const { control, bajo, rueda, fotogramas } = montar();
    const antes = bajo(620, 400);
    const r0 = control.enc.r;
    for (let i = 0; i < 4; i++) rueda(620, 400, -120);
    fotogramas(90);
    expect(control.enc.r).toBeLessThan(r0 * 0.6);
    expect(bajo(620, 400).distanceTo(antes)).toBeLessThan(1);
  });

  it("el punto de mira queda en el suelo, en el centro de la vista, y la distancia respeta los límites", () => {
    const { control, bajo, rueda, fotogramas } = montar();
    for (let i = 0; i < 80; i++) {
      rueda(300, 200, -240);
      fotogramas(3);
    }
    fotogramas(120);
    expect(control.enc.r).toBeGreaterThanOrEqual(LIMITES.minDistancia - 1e-6);
    expect(control.enc.r).toBeLessThan(LIMITES.minDistancia * 1.05);
    expect(Math.abs(control.enc.objetivo.y)).toBeLessThan(0.5);
    expect(control.enc.objetivo.distanceTo(bajo(ANCHO / 2, ALTO / 2))).toBeLessThan(1);
    for (let i = 0; i < 200; i++) {
      rueda(300, 200, 240);
      fotogramas(3);
    }
    fotogramas(120);
    expect(control.enc.r).toBeLessThanOrEqual(LIMITES.maxDistancia * 1.001);
  });

  it("el botón derecho gira e inclina sin pasar del límite ni atravesar el suelo", () => {
    const { camara, control, puntero, fotogramas } = montar();
    const rumbo = control.enc.theta;
    puntero("pointerdown", 400, 300, { button: 2 });
    puntero("pointermove", 520, -900, { button: 2 }); // mucho hacia arriba: hasta el horizonte
    fotogramas(2);
    puntero("pointerup", 520, -900, { button: 2 });
    expect(control.enc.theta).not.toBeCloseTo(rumbo, 3);
    expect(control.enc.phi).toBeLessThanOrEqual(LIMITES.maxPolar + 1e-9);
    expect(camara.position.y).toBeGreaterThanOrEqual(LIMITES.despeje - 1e-6);
  });

  it("al moverse hacia una meseta, la cámara sube lo justo para no meterse en ella", () => {
    const meseta = suelo(900);
    const { camara, control, puntero, fotogramas } = montar(meseta);
    control.fijar({ theta: 0, phi: 1.2, r: 1500, objetivo: new Vector3(0, 0, 0) });
    // Se arrastra el suelo hacia la izquierda varias veces: la cámara avanza hacia el este (x > 1500)
    for (let k = 0; k < 12; k++) {
      puntero("pointerdown", 600, 420);
      puntero("pointermove", 200, 420);
      fotogramas(2);
      puntero("pointerup", 200, 420);
      fotogramas(40);
    }
    expect(camara.position.x).toBeGreaterThan(1500);
    expect(camara.position.y).toBeGreaterThanOrEqual(meseta.altura(camara.position.x, camara.position.z) + LIMITES.despeje - 1e-6);
  });

  it("en cenital no se gira: el norte queda arriba", () => {
    const { control, puntero, fotogramas } = montar();
    control.configurar({ cenital: true });
    puntero("pointerdown", 400, 300, { button: 2 });
    puntero("pointermove", 300, 200, { button: 2 });
    fotogramas(2);
    puntero("pointerup", 300, 200, { button: 2 });
    expect(control.enc.theta).toBe(0);
    expect(control.enc.phi).toBeCloseTo(LIMITES.minPolar);
  });

  it("bloqueado (llegada y salida) no atiende gestos", () => {
    const { control, rueda, fotogramas } = montar();
    control.configurar({ bloqueado: true });
    const r0 = control.enc.r;
    rueda(300, 200, -240);
    fotogramas(30);
    expect(control.enc.r).toBe(r0);
  });
});

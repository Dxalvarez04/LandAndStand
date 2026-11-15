/**
 * Gestos de la cámara del terreno 3D, anclados al suelo como en un mapa:
 *
 *   arrastrar             el punto del suelo que se agarra sigue bajo el cursor (o el dedo), con
 *                         inercia al soltar
 *   rueda / pellizco      se acerca o se aleja de lo que hay bajo el cursor, que no se mueve de sitio
 *   botón derecho         gira e inclina alrededor del punto del suelo del centro de la vista
 *   (o Mayús, Alt, Ctrl,  (arrastrar hacia arriba inclina hacia el horizonte)
 *   ⌘ + arrastrar)
 *   dos dedos             pellizco = acercar; girar los dedos = rumbo; subir o bajar los dos = inclinar
 *
 * El punto de mira es siempre el punto del suelo que queda en el centro: después de cada gesto se
 * vuelve a buscar a lo largo del eje de la cámara, sin moverla. La cámara no atraviesa el relieve.
 *
 * No depende de React: recibe la cámara, el lienzo y el suelo. La escena llama a `actualizar` en
 * cada fotograma y a `fijar` durante los vuelos automáticos.
 */
import { Vector3, type PerspectiveCamera } from "three";
import { copiarEncuadre, posicionDe, type Encuadre } from "./camara";

export interface Suelo {
  /** Altura de la escena (m) en un punto x, z */
  altura(x: number, z: number): number;
  /** Distancia a lo largo del rayo hasta el relieve, o null */
  cortar(origen: Vector3, dir: Vector3, tMax: number): number | null;
}

export interface LimitesControl {
  minDistancia: number;
  maxDistancia: number;
  minPolar: number;
  maxPolar: number;
  /** Altura mínima de la cámara sobre el suelo (m) */
  despeje: number;
  /** Caja del punto de mira en la escena: [x0, z0, x1, z1] */
  caja: [number, number, number, number];
}

type Modo = "nada" | "mover" | "girar" | "dos";

interface Puntero {
  x: number;
  y: number;
  /** Posición ya aplicada */
  ax: number;
  ay: number;
}

const GIRO = 0.0045; // rad por píxel
const RUEDA = 0.0017; // logaritmo de la distancia por píxel de rueda
const T_ZOOM = 0.085; // s: suavizado del zoom
const T_INERCIA = 0.24; // s: frenado tras soltar
const LEJOS = 600_000;

const acotar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class ControlMapa {
  /** Encuadre actual (lo lee la escena; no se modifica desde fuera: usar `fijar`) */
  readonly enc: Encuadre = { theta: 0, phi: 0.6, r: 5000, objetivo: new Vector3() };
  /** Vista desde arriba con el norte arriba: no se gira ni se inclina */
  private cenital = false;
  /** Sin gestos (durante la llegada y la salida) */
  private sinGestos = false;
  /** La persona ha empezado un gesto (la escena cancela su vuelo) */
  private alEmpezar: (() => void) | null = null;

  private modo: Modo = "nada";
  private readonly punteros = new Map<number, Puntero>();
  private readonly ancla = new Vector3();
  private planoY = 0;
  private readonly vel = new Vector3();
  private ultimoMov = 0;
  private zoomPend = 0;
  private readonly anclaZoom = new Vector3();
  private hayAnclaZoom = false;
  private cursorZoom = { x: NaN, y: NaN, t: 0 };
  private previo2: { cx: number; cy: number; d: number; a: number } | null = null;
  private sucio = true;
  private rect = { left: 0, top: 0, width: 1, height: 1 };

  private readonly o = new Vector3();
  private readonly d = new Vector3();
  private readonly p = new Vector3();
  private readonly q = new Vector3();

  constructor(
    private readonly camara: PerspectiveCamera,
    private readonly dom: HTMLElement,
    private readonly suelo: Suelo,
    private readonly limites: LimitesControl,
    private readonly invalidar: () => void,
  ) {}

  conectar(): () => void {
    const { dom } = this;
    const abajo = (e: PointerEvent) => this.alPulsar(e);
    const mover = (e: PointerEvent) => this.alMover(e);
    const arriba = (e: PointerEvent) => this.alSoltar(e);
    const rueda = (e: WheelEvent) => this.alRodar(e);
    const menu = (e: Event) => e.preventDefault();
    const fuera = () => this.soltarTodo();
    dom.addEventListener("pointerdown", abajo);
    dom.addEventListener("wheel", rueda, { passive: false });
    dom.addEventListener("contextmenu", menu);
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", arriba);
    window.addEventListener("pointercancel", arriba);
    window.addEventListener("blur", fuera);
    return () => {
      dom.removeEventListener("pointerdown", abajo);
      dom.removeEventListener("wheel", rueda);
      dom.removeEventListener("contextmenu", menu);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", arriba);
      window.removeEventListener("pointercancel", arriba);
      window.removeEventListener("blur", fuera);
      this.soltarTodo();
    };
  }

  configurar(o: { cenital?: boolean; bloqueado?: boolean; alEmpezar?: (() => void) | null }) {
    if (o.cenital !== undefined) this.cenital = o.cenital;
    if (o.alEmpezar !== undefined) this.alEmpezar = o.alEmpezar;
    if (o.bloqueado !== undefined) {
      this.sinGestos = o.bloqueado;
      if (o.bloqueado) this.soltarTodo();
    }
  }

  get bloqueado(): boolean {
    return this.sinGestos;
  }

  /** Coloca la cámara en un encuadre, sin gestos pendientes (vuelos automáticos). */
  fijar(e: Encuadre) {
    copiarEncuadre(e, this.enc);
    this.vel.set(0, 0, 0);
    this.zoomPend = 0;
    this.aplicar();
  }

  /** Para lo que quede de inercia o de zoom. */
  detener() {
    this.vel.set(0, 0, 0);
    this.zoomPend = 0;
  }

  /** Acerca (factor < 1) o aleja (factor > 1) respecto al centro de la vista, con suavizado. */
  zoomPor(factor: number) {
    this.hayAnclaZoom = false;
    this.cursorZoom.x = NaN;
    this.zoomPend = acotar(this.zoomPend + Math.log(factor), -1.6, 1.6);
    this.invalidar();
  }

  get gesto(): boolean {
    return this.modo !== "nada";
  }

  // ---- Entradas ----

  private local(e: { clientX: number; clientY: number }) {
    const r = this.dom.getBoundingClientRect();
    this.rect = r;
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private alPulsar(e: PointerEvent) {
    if (this.bloqueado) return;
    const { x, y } = this.local(e);
    if (e.pointerType === "mouse") this.punteros.clear();
    this.punteros.set(e.pointerId, { x, y, ax: x, ay: y });
    this.alEmpezar?.();
    this.detener();
    if (this.punteros.size >= 2) {
      this.modo = "dos";
      this.previo2 = this.medirDos();
    } else if (e.pointerType === "mouse" && !this.cenital && (e.button !== 0 || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey)) {
      this.modo = "girar";
    } else if (e.pointerType === "mouse" && e.button === 1) {
      return this.punteros.clear();
    } else {
      this.modo = "mover";
      this.agarrar(x, y);
    }
    if (e.pointerType === "mouse") this.dom.style.cursor = "grabbing";
    this.invalidar();
  }

  private alMover(e: PointerEvent) {
    const p = this.punteros.get(e.pointerId);
    if (!p) return;
    const { x, y } = this.local(e);
    p.x = x;
    p.y = y;
    this.sucio = true;
    this.invalidar();
  }

  private alSoltar(e: PointerEvent) {
    if (!this.punteros.delete(e.pointerId)) return;
    if (this.punteros.size === 1 && this.modo === "dos") {
      // Queda un dedo: sigue moviendo desde donde está
      const [resto] = this.punteros.values();
      resto.ax = resto.x;
      resto.ay = resto.y;
      this.modo = "mover";
      this.agarrar(resto.x, resto.y);
      this.vel.set(0, 0, 0);
    } else if (this.punteros.size === 0) {
      if (this.modo !== "mover" || performance.now() - this.ultimoMov > 90) this.vel.set(0, 0, 0);
      this.modo = "nada";
      this.previo2 = null;
      this.dom.style.cursor = "";
    }
    this.invalidar();
  }

  private soltarTodo() {
    this.punteros.clear();
    this.modo = "nada";
    this.previo2 = null;
    this.vel.set(0, 0, 0);
    this.dom.style.cursor = "";
  }

  private alRodar(e: WheelEvent) {
    if (this.bloqueado) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 32;
    else if (e.deltaMode === 2) d *= 400;
    if (e.ctrlKey) d *= 6; // pellizco en un trackpad: llega como rueda con Ctrl y pasos pequeños
    d = acotar(d, -260, 260);
    if (d === 0) return;
    if (this.zoomPend === 0 && this.vel.lengthSq() === 0 && this.modo === "nada") this.alEmpezar?.();
    this.vel.set(0, 0, 0);
    const { x, y } = this.local(e);
    const ahora = performance.now();
    const c = this.cursorZoom;
    // El ancla se mantiene mientras se rueda en el mismo sitio: no «resbala» al pasar por un borde
    if (!(Math.hypot(x - c.x, y - c.y) < 4 && ahora - c.t < 300)) {
      this.hayAnclaZoom = this.puntoBajo(x, y, this.anclaZoom);
      c.x = x;
      c.y = y;
    }
    c.t = ahora;
    this.zoomPend = acotar(this.zoomPend + d * RUEDA, -1.6, 1.6);
    this.invalidar();
  }

  // ---- Geometría ----

  /** Rayo desde la cámara por un punto del lienzo (px): deja el origen en `o` y la dirección en `d`. */
  private rayo(x: number, y: number) {
    const cam = this.camara;
    this.o.setFromMatrixPosition(cam.matrixWorld);
    this.d
      .set((x / this.rect.width) * 2 - 1, -(y / this.rect.height) * 2 + 1, 0.5)
      .unproject(cam)
      .sub(this.o)
      .normalize();
  }

  /** Punto del suelo bajo un punto del lienzo. */
  private puntoBajo(x: number, y: number, out: Vector3): boolean {
    this.rayo(x, y);
    const t = this.suelo.cortar(this.o, this.d, LEJOS);
    if (t === null) return false;
    out.copy(this.o).addScaledVector(this.d, t);
    return true;
  }

  /** Corte del rayo de un punto del lienzo con el plano horizontal y = planoY (sin pasar del horizonte). */
  private enPlano(x: number, y: number, out: Vector3) {
    this.rayo(x, y);
    const dy = Math.min(this.d.y, -0.035);
    const t = (this.planoY - this.o.y) / dy;
    out.set(this.o.x + this.d.x * t, this.planoY, this.o.z + this.d.z * t);
  }

  private agarrar(x: number, y: number) {
    const hay = this.puntoBajo(x, y, this.ancla);
    this.o.setFromMatrixPosition(this.camara.matrixWorld);
    // El plano de arrastre pasa por el punto agarrado; si queda a la altura de la cámara o más alto
    // (una ladera vista desde abajo), se usa uno por debajo para que el arrastre no se dispare
    const tope = this.o.y - Math.max(10, 0.05 * this.enc.r);
    this.planoY = hay ? Math.min(this.ancla.y, tope) : Math.min(this.enc.objetivo.y, tope);
    this.enPlano(x, y, this.ancla);
  }

  private medirDos() {
    const [a, b] = [...this.punteros.values()];
    return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.max(8, Math.hypot(b.x - a.x, b.y - a.y)), a: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  /**
   * Escala la escena alrededor de un punto: ese punto no se mueve en pantalla. Devuelve true si se
   * ha llegado a un límite de distancia.
   */
  private escalar(s: number, centro: Vector3) {
    const e = this.enc;
    const min = this.limites.minDistancia;
    const max = Math.max(this.limites.maxDistancia, e.r);
    const deseada = e.r * s;
    const tope = deseada < min || deseada > max;
    const f = tope ? acotar(deseada, min, max) / e.r : s;
    e.objetivo.sub(centro).multiplyScalar(f).add(centro);
    e.r *= f;
    return tope;
  }

  private despejada(e: Encuadre): boolean {
    posicionDe(e, this.q);
    return this.q.y >= this.suelo.altura(this.q.x, this.q.z) + this.limites.despeje;
  }

  /** Lleva el encuadre a la cámara. */
  private aplicar() {
    const cam = this.camara;
    posicionDe(this.enc, cam.position);
    cam.lookAt(this.enc.objetivo);
    cam.updateMatrixWorld();
  }

  // ---- Fotograma ----

  /**
   * Aplica los gestos pendientes. `dt` en segundos. Devuelve true si la cámara sigue moviéndose
   * (hay que pedir otro fotograma).
   */
  actualizar(dt: number): boolean {
    const e = this.enc;
    const L = this.limites;
    const paso = acotar(dt, 0.001, 0.05);
    let cambio = false;
    let girando = false;

    if (this.sucio && this.modo !== "nada") {
      this.sucio = false;
      if (this.modo === "mover") {
        const [p] = this.punteros.values();
        if (p && (p.x !== p.ax || p.y !== p.ay)) {
          this.enPlano(p.x, p.y, this.p);
          let dx = this.ancla.x - this.p.x;
          let dz = this.ancla.z - this.p.z;
          const largo = Math.hypot(dx, dz);
          const tope = 3 * e.r;
          if (largo > tope) {
            dx *= tope / largo;
            dz *= tope / largo;
          }
          e.objetivo.x += dx;
          e.objetivo.z += dz;
          this.vel.set(this.vel.x * 0.4 + (dx / paso) * 0.6, 0, this.vel.z * 0.4 + (dz / paso) * 0.6);
          this.ultimoMov = performance.now();
          p.ax = p.x;
          p.ay = p.y;
          cambio = true;
        }
      } else if (this.modo === "girar") {
        const [p] = this.punteros.values();
        if (p) {
          e.theta -= (p.x - p.ax) * GIRO;
          e.phi -= (p.y - p.ay) * GIRO;
          p.ax = p.x;
          p.ay = p.y;
          cambio = true;
          girando = true;
        }
      } else if (this.modo === "dos" && this.previo2 && this.punteros.size >= 2) {
        const antes = this.previo2;
        const ahora = this.medirDos();
        const [a, b] = [...this.punteros.values()];
        const centro = this.puntoBajo(antes.cx, antes.cy, this.p) ? this.p : e.objetivo;
        this.escalar(antes.d / ahora.d, centro);
        if (this.cenital) {
          // El centro del pellizco arrastra el mapa
          this.aplicar();
          this.planoY = centro.y;
          this.enPlano(antes.cx, antes.cy, this.ancla);
          this.enPlano(ahora.cx, ahora.cy, this.p);
          e.objetivo.x += this.ancla.x - this.p.x;
          e.objetivo.z += this.ancla.z - this.p.z;
        } else {
          let giro = ahora.a - antes.a;
          if (giro > Math.PI) giro -= 2 * Math.PI;
          if (giro < -Math.PI) giro += 2 * Math.PI;
          if (Math.abs(giro) < 0.5) {
            const dx = e.objetivo.x - centro.x;
            const dz = e.objetivo.z - centro.z;
            const c = Math.cos(giro);
            const s = Math.sin(giro);
            e.objetivo.x = centro.x + dx * c + dz * s;
            e.objetivo.z = centro.z - dx * s + dz * c;
            e.theta += giro;
          }
          // Inclinar: los dos dedos suben o bajan a la vez
          const d1 = a.y - a.ay;
          const d2 = b.y - b.ay;
          if (d1 * d2 > 0 && Math.abs(d1 - d2) < 0.6 * Math.max(Math.abs(d1), Math.abs(d2))) {
            e.phi -= ((d1 + d2) / 2) * GIRO;
            girando = true;
          }
        }
        for (const p of [a, b]) {
          p.ax = p.x;
          p.ay = p.y;
        }
        this.previo2 = ahora;
        cambio = true;
      }
    }

    // Zoom pendiente (rueda, teclas, botones), repartido en unos fotogramas
    if (this.zoomPend !== 0) {
      let parte = this.zoomPend * (1 - Math.exp(-paso / T_ZOOM));
      if (Math.abs(this.zoomPend - parte) < 0.002) parte = this.zoomPend;
      this.zoomPend -= parte;
      if (this.escalar(Math.exp(parte), this.hayAnclaZoom ? this.anclaZoom : e.objetivo)) this.zoomPend = 0;
      cambio = true;
    }

    // Inercia al soltar
    if (this.modo === "nada" && this.vel.lengthSq() > 0) {
      e.objetivo.x += this.vel.x * paso;
      e.objetivo.z += this.vel.z * paso;
      this.vel.multiplyScalar(Math.exp(-paso / T_INERCIA));
      if (this.vel.length() < 0.02 * e.r) this.vel.set(0, 0, 0);
      cambio = true;
    }

    if (!cambio) return false;

    // Límites
    if (this.cenital) {
      e.theta = 0;
      e.phi = L.minPolar;
    } else e.phi = acotar(e.phi, L.minPolar, L.maxPolar);
    const ox = acotar(e.objetivo.x, L.caja[0], L.caja[2]);
    const oz = acotar(e.objetivo.z, L.caja[1], L.caja[3]);
    if (ox !== e.objetivo.x || oz !== e.objetivo.z) {
      e.objetivo.x = ox;
      e.objetivo.z = oz;
      this.vel.set(0, 0, 0);
    }

    // La cámara no atraviesa el relieve
    if (!this.despejada(e)) {
      if (girando) {
        // Se inclina menos, sin soltar el punto de giro
        let a = L.minPolar;
        let b = e.phi;
        for (let k = 0; k < 14; k++) {
          e.phi = (a + b) / 2;
          if (this.despejada(e)) a = e.phi;
          else b = e.phi;
        }
        e.phi = a;
      }
      if (!this.despejada(e)) {
        // Sube lo justo, sin cambiar hacia dónde mira
        const falta = this.suelo.altura(this.q.x, this.q.z) + L.despeje - this.q.y;
        e.objetivo.y += falta;
      }
    }

    this.aplicar();

    // El punto de mira vuelve al suelo a lo largo del eje de la cámara (la cámara no se mueve)
    if (!girando) {
      this.o.copy(this.camara.position);
      this.d.copy(e.objetivo).sub(this.o).normalize();
      const t = this.suelo.cortar(this.o, this.d, LEJOS);
      if (t !== null && t > 1) {
        e.objetivo.copy(this.o).addScaledVector(this.d, t);
        e.r = t;
      }
    }

    return this.zoomPend !== 0 || (this.modo === "nada" && this.vel.lengthSq() > 0);
  }
}

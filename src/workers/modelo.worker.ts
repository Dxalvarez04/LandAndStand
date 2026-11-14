/// <reference lib="webworker" />
/**
 * Worker del modelo. Varios iguales trabajan en paralelo (useModelo): cada uno suma su tramo de
 * sorteos del Monte Carlo («contar») o el cálculo entero («calcular»), y calcula rutas.
 *
 * Un cálculo nuevo deja obsoleto al anterior: el bucle cede el hilo cada pocos milisegundos,
 * atiende los mensajes que hayan llegado y, si hay uno más nuevo, abandona el suyo. Al empezar
 * cede una vez, así de una ráfaga (arrastrar el deslizador del sol) solo se calcula el último valor.
 */
import type { MensajeAlWorker, MensajeDelWorker } from "@/lib/contract";
import { N } from "@/lib/constants";
import { calcularRuta, cargarDatos } from "@/lib/model";
import { combinar, sorteosDe, sumarSorteo, tramo } from "@/lib/model/montecarlo";

const enviar = (m: MensajeDelWorker, transfer: Transferable[] = []) =>
  (self as DedicatedWorkerGlobalScope).postMessage(m, transfer);

/** Id del último cálculo pedido; los anteriores se abandonan. */
let vigente = 0;

// Ceder el hilo sin la espera mínima de setTimeout: un mensaje a uno mismo por un MessageChannel
const cola: (() => void)[] = [];
const canal = new MessageChannel();
canal.port1.onmessage = () => cola.shift()?.();
const ceder = () =>
  new Promise<void>((seguir) => {
    cola.push(seguir);
    canal.port2.postMessage(0);
  });

const CEDER_MS = 12;
const AVISO_MS = 120;

self.onmessage = async (ev: MessageEvent<MensajeAlWorker>) => {
  const m = ev.data;
  const { id } = m;
  try {
    if (m.tipo === "ruta") {
      const ruta = await calcularRuta(m.estado, m.celda);
      enviar({ tipo: "ruta", id, ruta }, ruta ? [ruta.ida.buffer, ruta.vuelta.buffer] : []);
      return;
    }

    vigente = id;
    await ceder();
    const datos = await cargarDatos();
    if (id !== vigente) return;

    const total = sorteosDe(datos).length;
    const [desde, hasta] = m.tipo === "contar" ? tramo(total, m.parte, m.partes) : [0, total];
    const conteo = new Int32Array(N * N);
    let ultimaCesion = performance.now();
    let ultimoAviso = ultimaCesion;

    for (let i = desde; i < hasta; i++) {
      sumarSorteo(m.estado, datos, i, conteo);
      const ahora = performance.now();
      if (ahora - ultimaCesion < CEDER_MS) continue;
      if (ahora - ultimoAviso >= AVISO_MS) {
        ultimoAviso = ahora;
        const hechos = i + 1 - desde;
        if (m.tipo === "contar") enviar({ tipo: "avance", id, hechos, total });
        else enviar({ tipo: "progreso", id, fraccion: hechos / total });
      }
      await ceder();
      ultimaCesion = performance.now();
      if (id !== vigente) return;
    }

    if (m.tipo === "contar") {
      // El DEM va copiado (no transferido): el worker lo sigue usando
      enviar({ tipo: "conteo", id, conteo, total, elevacion: m.parte === 0 ? datos.dem : undefined }, [conteo.buffer]);
    } else {
      const resultado = { ...combinar(conteo, total), elevacion: datos.dem };
      enviar({ tipo: "resultado", id, resultado }, [resultado.prob.buffer]);
    }
  } catch (e) {
    if (m.tipo === "ruta") enviar({ tipo: "ruta", id, ruta: null });
    else enviar({ tipo: "error", id, mensaje: e instanceof Error ? e.message : String(e) });
  }
};

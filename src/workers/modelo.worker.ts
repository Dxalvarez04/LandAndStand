/// <reference lib="webworker" />
import type { MensajeAlWorker, MensajeDelWorker } from "@/lib/contract";
import { calcular } from "@/lib/model";

const enviar = (m: MensajeDelWorker, transfer: Transferable[] = []) =>
  (self as DedicatedWorkerGlobalScope).postMessage(m, transfer);

self.onmessage = async (ev: MessageEvent<MensajeAlWorker>) => {
  const { id, estado } = ev.data;
  try {
    const resultado = await calcular(estado, (fraccion) =>
      enviar({ tipo: "progreso", id, fraccion }),
    );
    enviar({ tipo: "resultado", id, resultado }, [resultado.prob.buffer]);
  } catch (e) {
    enviar({ tipo: "error", id, mensaje: e instanceof Error ? e.message : String(e) });
  }
};

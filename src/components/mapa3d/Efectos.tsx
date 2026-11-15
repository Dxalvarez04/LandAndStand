"use client";

/**
 * Posprocesado (solo escritorio): oclusión ambiental en los pliegues del terreno, brillo suave
 * (sol, atmósfera), viñeta ligera, suavizado SMAA y tonos ACES. En móvil no se usa: el renderizador
 * aplica ACES directamente.
 */
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type EffectComposer as Compositor } from "postprocessing";
import { memo, type Ref } from "react";

/** `compositor`: para volver a dibujar un fotograma a mano (la imagen fija del cambio de escena). */
function Efectos({ terreno, compositor }: { terreno: boolean; compositor?: Ref<Compositor | null> }) {
  return (
    <EffectComposer ref={compositor} multisampling={0} enableNormalPass={false}>
      {terreno && <N8AO aoRadius={45} intensity={1.4} distanceFalloff={0.6} halfRes quality="medium" />}
      <Bloom intensity={terreno ? 0.14 : 0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.3} darkness={terreno ? 0.3 : 0.6} />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

export default memo(Efectos);

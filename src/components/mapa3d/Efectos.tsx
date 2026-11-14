"use client";

/**
 * Posprocesado (solo escritorio): oclusión ambiental en los pliegues del terreno, brillo suave
 * (sol, atmósfera), viñeta ligera, suavizado SMAA y tonos ACES. En móvil no se usa: el renderizador
 * aplica ACES directamente.
 */
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { memo } from "react";

function Efectos({ terreno }: { terreno: boolean }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {terreno && <N8AO aoRadius={45} intensity={1.6} distanceFalloff={0.6} halfRes quality="medium" />}
      <Bloom intensity={terreno ? 0.18 : 0.35} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.32} darkness={terreno ? 0.42 : 0.6} />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

export default memo(Efectos);

# Land & Stand

**The map of Mars according to the body that walks on it.** NASA Space Apps Challenge 2026, Madrid, challenge: Interplanetary survival guide: Martian map. https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/

> *Every team will map Mars. We map Mars as it looks to a body just back from six months in zero gravity.*
 
A demo website that shows, over the real terrain of Gale Crater, the probability that a newly arrived astronaut, or a pair of astronauts, can walk to each point and back, depending on the mission sol. The layer updates when you switch crew member, sol or design scenario.

## Start

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # comprobar que compila antes de subir
```

Next.js 16 (App Router) + TypeScript + Tailwind 4. Ojo: Next 16 cambia APIs; ver `AGENTS.md` y `node_modules/next/dist/docs/`.

## Structure

```
src/
├── app/page.tsx              # Mounts everything: stores the `estado` and passes the `resultado`
├── lib/
│   ├── contract.ts           # ⚠️ THE CONTRACT (Estado, Resultado and worker messages)
│   ├── constants.ts          # Specification constants and central values
│   ├── data/targets.ts       # Habitat, reference points T1–T6, mission destinations M1–M6, km→cell (truncating) and cell→lat/lon
│   ├── mock/resultadoFalso.ts# Made-up result until there is a real calculation
│   └── model/                # PERSON 1 · layers 2–6
│       ├── fisiologia.ts     #   layer 2
│       ├── marcha.ts         #   layer 3 (M2)
│       ├── grafo.ts          #   layer 4
│       ├── alcanzabilidad.ts #   layer 5 (outbound Dijkstra + reverse return)
│       ├── montecarlo.ts     #   layer 6
│       └── index.ts          #   calcular(): currently returns the mock (MODELO_REAL = false)
├── workers/modelo.worker.ts  # Web Worker: adds up its share of the draws (several in parallel) and computes routes
├── hooks/useModelo.ts        # Splits the calculation across the workers and merges the result (resultado, progreso)
└── components/
    ├── mapa/                 # PERSON 2 · Mapa.tsx, Inspector.tsx
    └── panel/                # PERSON 3 · sol, walker, scenario, table, cards, assumptions, credits
public/
├── data/                     # DEM, HiRISE, targets, posteriors and draws (pending from Katrina)
└── fotos/                    # Curiosity photos of each reference point
````

## Documents

| File | What it contains |
|---|---|
| [`docs/especificacion_algoritmos.md`](docs/especificacion_algoritmos.md) | **The reference for coding.** The tool's layers, their formulas, the validation protocol and common mistakes. |
| [`docs/especificacion_algoritmos.docx`](docs/especificacion_algoritmos.docx) | The original specification, with figures. |
| [`docs/informe_tecnico.md`](docs/informe_tecnico.md) | Revised technical report: model, results, limitations, video script, slides and jury questions. |
| [`docs/idea_original.md`](docs/idea_original.md) | The initial proposal and what has changed since then. |

## Team and roles

Three people are developing the tool. Katrina Espinar is the author of the model and the scientific reference, but she is not involved in development.

### Person 1 · Computation (physiological layer over the terrain)

- Layers 1–6 of the specification: physiology, suited walking, 8-neighbour graph, outbound and return Dijkstra (the return on the reverse graph) and Monte Carlo for crew member, pair and group.
- Runs in Web Workers: the 300 draws are split across several (up to 6, depending on the cores) and the page merges the counts; the result is identical to that of a single worker. A new state makes the calculation in progress obsolete, so dragging a slider does not queue up calculations (see below).
- **Done when** it reproduces the validation protocol in section 10: flat ground on sol 1 ≈ 0.22 m/s and ≈ 1.7 km; Rock Hall = 0.290 on sol 1 with `draws_seed11_300.json`.
- If Katrina shares the Python repo, the work comes down to exporting the already computed layers to JSON.

### Person 2 · Visual: the map

- HiRISE background and probability layer in viridis, transparent below 2%.
- 50% and 90% contours (*marching squares*, for example with d3-contour).
- Habitat, mission destinations (M1–M6 and those added by the crew) and Curiosity reference points (T1–T6), with their percentage.
- Inspector when clicking a cell: coordinates, probability and illustrative out-and-back route.
- Animation when changing sol.
- ⚠️ The DEM has **south in row 0**, but the image has **north at the top**: the rows must be flipped when drawing.

### Person 3 · Visual: the panel and the destinations

- Sol slider (1–30).
- Selector of who walks: crew selectable without limit (one or more people) from the 8 precomputed profiles forecast at landing.
- Scenario selector: intensity (35% by default; fixed options of 30, 35, 40, 45 and 50%). Suit energy is fixed at 6 h in this view.
- Table of **mission destinations** with distance, elevation change and probability; clicking one expands a summary of its tasks and the map flies to it. It starts with six proposed destinations (M1–M6, chosen on the DEM and the HiRISE image: some are reachable on sol 1 and others only later or never within 30 sols); they can be removed and your own can be added on the map (P1, P2…), also from the card of a point or a reference point with "Add to mission destinations".
- The Curiosity sites (T1–T6) are not mission destinations: on the map they are **reference points** (hollow ring), with their photo and their percentage.
- The panel floats over the map and is hidden with the tab on its edge; it slides in once the camera is already over the study area.
- Cards with the Curiosity photo ("this is what you'll see"). Destinations "light up" when they go above 50%.
- Assumptions panel always visible, credits and progress bar while calculating.

## The contract between the three parts

It is the only thing that has to be agreed before splitting up, and it is not changed afterwards without telling the other two.

```js
// Person 3 modifies it; person 1 receives it
estado = {
  sol,                                    // 1..30
  modo,                                   // "tripulante" | "pareja" | "grupo"
  tripulantes: [{ vo2pre, masa }],        // 1 in tripulante, 2 in pareja, 3+ in grupo (no limit)
  fwalk,                                  // "U" (U(0.30;0.40)) | 0.30 | 0.35 | 0.40 | 0.45 | 0.50
  energiaHoras                            // 6 | 4
}

// Person 1 returns it; person 2 draws it on the map and person 3 in the table
resultado = {
  prob: Float32Array(12100),              // 110 × 110, row 0 = SOUTH, column 0 = west
  elevacion: Float32Array(12100),         // optional: DEM in metres, row 0 = SOUTH
  destinos: [{ id: "T3", p: 0.29 }, ...]
}
```

While the calculation is not ready, the two people working on the visuals use a made-up `resultado`, for example a probability that decreases with distance from the habitat. That way nobody waits for anybody.

## Decisions made

- **Never "safe" or "safe zone".** We say "reachable under the stated assumptions". In the landing layer, "suitable area according to the assumed slope rule".
- **Only model M2.** Pandolf's model (M1) does not reproduce the Mars data.
- **Fixed forecast profiles (not editable on site):** Since the tool is a predictive solution for when the crew arrives and cannot measure their VO₂ or mass on Martian ground, 8 modelled profiles are used (`src/lib/data/perfiles.ts`), which cannot be edited manually.
- **Group mode added:** Allows coordinating expeditions of more than 2 astronauts walking together; the joint radius is limited by the most vulnerable member of the group.
- **Study area:** the 3.52 × 3.52 km window of the Gale DEM with six Curiosity sampling sites, not the boxwork area from the original idea.
- **Out of the demo:** radiation (RAD), meteorology (REMS), storms, partner injury, CRISM and THEMIS. They are mentioned as "next steps" in the pitch.
- **Optional:** the landing layer (layer 7). For the demo it is enough to overlay the map already computed in Python, without a draggable habitat. The analytical layer (layer 9) is not implemented.
- **Plan B:** if the in-browser calculation is not validated in time, the maps are precomputed in Python and served as JSON with the same contract. The interface does not change.

## Astronaut profiles forecast at landing (`src/lib/data/perfiles.ts`)

| ID | Name and Role | Archetype | VO₂pre (mL/kg/min) | Mass (kg) | Operational Assessment |
|---|---|---|:---:|:---:|---|
| **A1** | Dr. Elena Vega (Commander) | Elite athlete | 55.0 | 68 | Cardiovascularly gifted. NASA-fit from Sol 1. Maximum range (> 2.6 km). |
| **A2** | Dr. Marcus Vance (Specialist) | ISS standard / Average | 40.6 | 75 | Canonical reference profile. NASA-fit from Sol 7. |
| **A3** | Eng. Lars Lindholm (Cargo) | Strength / Heavy mass | 44.0 | 92 | Large aerobic engine, but high mass; limits suit energy before time. |
| **A4** | Dr. Yasmine Al-Mansoor (Geologist) | Light / High efficiency | 46.0 | 54 | Minimal metabolic consumption; maximum energy autonomy for long traverses. |
| **A5** | Dr. Alexei Morozov (Astrobiologist) | Regulatory limit | 36.5 | 78 | NASA pre-flight limit. Drops to 31 mL/kg/min after landing; takes weeks to recover. |
| **A6** | Dr. Chloe Bennett (Pilot) | Balance deficit | 48.0 | 70 | High endurance but vestibular impairment; blocked on steep hills. |
| **A7** | Tech. Kenji Sato (Robotics) | Severe deconditioning | 33.0 | 86 | Sharp drop due to weightlessness (-24%). Bottleneck on group outings. |
| **A8** | Dr. Sarah O'Connor (Physician) | Rapid readaptation | 43.0 | 65 | Accelerated biological recovery (tauA = 6 sols); by Sol 3 she is already at 95%. |

## To do

- [ ] **Ask Katrina** for the `data/` folder (`dem_real.npy`, `aoi_color.jpg`, posteriors), `docs/targets/targets.json`, `results/draws_seed11_300.json` and `results/real_prob_con.npy`. Also ask for the Python repo (`src/landstand/`), if she has it. Without `data/` the real calculation cannot start.
- [ ] Replace the provisional elevation in the mock (`src/lib/mock/elevacionFalsa.ts`) with the real DEM when it is available.
- [ ] Decide between computing in the browser (what the specification asks for) or precomputing in Python.
- [ ] Check in the challenge statement whether DEM, HiRISE and Curiosity positions and photos count as the three minimum data types.
- [ ] Choose the web stack.
- [x] Define the fictional crew members for the demo (8 profiles in `src/lib/data/perfiles.ts`, not editable on site due to the predictive premise).
- [x] Curiosity photos of each destination, with their PIA number (`public/fotos/`, see `docs/fuentes.md`).

## Milestones

1. Contract agreed. Map and panel working with made-up data. Validation step 1 passed.
2. Real calculation integrated into the interface and validation step 2 passed.
3. Code frozen a few hours before the deadline and video recorded with the final version.

## Official data sources

Full list, with verified sizes and details, in [`docs/fuentes.md`](docs/fuentes.md). Everything is in the

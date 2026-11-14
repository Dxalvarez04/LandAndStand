# Land & Stand · Layered algorithm specification
*Spanish original: [es/especificacion_algoritmos.md](es/especificacion_algoritmos.md)*

For reimplementing the tool from scratch and reproducing the report's numbers exactly (model v3.1).

NASA Space Apps Challenge 2026 · Madrid · November 14, 2026

> Markdown version of `es/especificacion_algoritmos.docx` (the original, with figures, is in the `es/` folder). If there is any discrepancy, the `.docx` prevails.

## 0. How to use this document

The tool has seven layers. Each one takes the output of the previous one:

1. **Data:** terrain, imagery, habitat and destinations.
2. **Physiology:** aerobic capacity and balance by sol.
3. **Suited walking:** speed and power on each slope.
4. **Terrain graph:** time and energy cost of each step between cells.
5. **Reachability:** round trip within the budget (Dijkstra).
6. **Uncertainty and aggregation:** Monte Carlo, crew member, pair, population and scenarios.
7. **Landing site:** where to place the habitat to reach more science, while respecting landing suitability.

At the end there is an interface layer and the validation protocol. The reference is the Python code in the repository (`src/landstand/model.py` and `src/landstand/terrain_real.py`). If your code does not reproduce the values in section 10, there is a bug.

**Units:** SI, except VO₂ in mL/kg/min, angles in degrees and display distances in km. Time in seconds, energy in joules and power in watts.

## 1. Data layer

| Item | File | Details |
|---|---|---|
| Elevation model | `data/dem_real.npy` | 110 × 110 float32 array, 32 m cells (3.52 × 3.52 km). **Row 0 is SOUTH**, column 0 is west. Elevation in meters. No gaps. |
| Background image | `data/aoi_color.jpg` | 1320 × 1320 px, HiRISE color of the same window, **north up** (image row 0 = north). |
| Destinations | `docs/targets/targets.json` | Habitat and T1–T6 in km from the southwest corner: `north_km`, `east_km`, plus photo and credits. |
| Window | — | Mars equirectangular projection (central meridian 0, sphere R = 3,396,190 m). x from 8141.0 to 8144.52 km; y from −282.0 to −278.48 km. |

km → cell conversion (same as in Python, with truncation):

```python
fila    = int(north_km / 0.032)   # int() truncates toward zero
columna = int(east_km  / 0.032)
```

- Habitat: (2.70, 1.36) km → cell (84, 42).
- Destinations:
  - T1 Ogunquit Beach (2.621, 1.018)
  - T2 Ireson Hill (2.800, 0.825)
  - T3 Rock Hall (1.725, 2.049)
  - T4 Aberlady/Kilmarie (1.863, 2.375)
  - T5 Edinburgh (1.212, 2.205)
  - T6 Mary Anning (1.672, 2.818)

Latitude and longitude of a cell (for the inspector):

```
x   = 8 141 000 + (columna + 0.5) · 32
y   = −282 000 + (fila + 0.5) · 32
lon = x / R · 180/π
lat = y / R · 180/π
```

**Posteriors** (`data/post_delta.npy`, `post_tau_a.npy`, `post_tau_b.npy`): 40,000 samples each. δ and τa must be taken from the same row (they are correlated, r = −0.55); τb is sampled separately.

## 2. Physiology layer

For an astronaut with parameters p on sol s (s = 1 is the day after landing):

```
vo2max(s)    = VO2pre · (1 − δ · exp(−s / τa))     # mL/kg/min
theta_max(s) = th_lim − d_th · exp(−s / τb)        # degrees
```

`vo2max` is that day's aerobic capacity. `theta_max` is the steepest slope they can walk on with that day's balance.

## 3. Suited-walking layer (model M2)

Constants: `KJ_PER_L = 20.1` (kJ per liter of O₂).

**Cost-versus-slope curve (Minetti 2002).** G is the slope in % (100 · Δz / distance):

```
i     = clip(G / 100, −0.45, +0.45)
C(i)  = 280.5·i⁵ − 58.7·i⁴ − 76.8·i³ + 51.9·i² + 19.6·i + 2.5
ratio = max(C(i), 0.5) / 2.5          # = 1 on flat ground
```

**Terrain-limited maximum speed (Tobler, capped)**, with S = G / 100:

```
tobler(S) = min(v_flat, v_flat · exp(−3.5 · (|S + 0.05| − 0.05)))
```

**Metabolic speed and consumption:**

```
cap      = f_walk · vo2max(s)                                         # allowed intensity
v_met(G) = max(0, V_ref · (cap − rest2) / ((ref2 − rest2) · ratio(G)))
vo2(V,G) = rest2 + (ref2 − rest2) · (V / V_ref) · ratio(G)
```

**Final speed with the downhill cap (v3.1 base case):**

```
V = min(tobler(G/100), v_met(G))
if G < 0:
    V_llano = min(tobler(0), v_met(0))
    V = min(V, V_llano)                    # nobody walks downhill faster than on flat ground
P = vo2(V, G) · W · KJ_PER_L / 60          # watts; W = body mass in kg
```

P is computed **after** applying the cap, using the final V.

**Flat-ground radius** (for the flat-ground figure and the “on flat ground” comparison), with V and P at G = 0:

```
dT    = V · (0.8 · T_EVA − T_TASK) / 2
dE    = V · (0.8 · P_DES · T_EVA − P_TASK · T_TASK) / (2 · max(P, 1))   # 0 if V = 0
radio = min(dT, dE)
```

## 4. Terrain graph layer

Directed graph with 8 neighbors. Each cell (r, c) connects to (r + dr, c + dc) for dr, dc ∈ {−1, 0, 1} except (0, 0), if the target cell lies inside the grid.

For each edge u → v:

```
dist     = 32 · sqrt(dr² + dc²)            # 32 or 45.25 m
S        = (z[v] − z[u]) / dist ;  G = 100 · S
theta    = degrees(atan(|S|))
(V, P)   = capa_marcha(G, s, p)
factible = (V > 0.02) and (|G| ≤ 45) and (theta ≤ theta_max(s))
t        = dist / V      (only if factible)
e        = P · t         (only if factible)
```

Infeasible edges do not exist in that draw. The geometry (dist, S, G, theta, ratio) does not depend on the draw: precompute it once. Only V, P, t and e change from draw to draw.

## 5. Reachability layer (round trip)

Design constants: `T_EVA = 6 h = 21 600 s`, `RHO = 0.20`, `T_TASK = 1800 s`, `P_TASK = 300 W`, `P_DES = 352 W`.

Algorithm per draw and sol:

```
1. OUTBOUND: Dijkstra from H with weight = e (energy) over the feasible edges u→v.
             → Eo[c] minimum energy H→c, pred_o[c] predecessor.

2. RETURN:   Dijkstra from H over the REVERSE GRAPH: relax from u towards v using
             the edge v→u (cost of going from v to u).
             → Eb[c] minimum energy c→H, pred_b[c].

3. Time ALONG THOSE SAME PATHS (not a separate time Dijkstra):
             To[c] = To[pred_o[c]] + t(pred_o[c] → c)
             Tb[c] = Tb[pred_b[c]] + t(c → pred_b[c])
             (it can be accumulated during the Dijkstra itself: when the energy of c
              improves, store the time of the path that improved it)

4. c is reachable if:
             Eo[c] and Eb[c] are finite
             To[c] + T_TASK + Tb[c] ≤ (1 − RHO) · T_EVA                      # 17 280 s
             Eo[c] + P_TASK·T_TASK + Eb[c] ≤ (1 − RHO) · P_DES · T_EVA_E
             with T_EVA_E = 6 h by default; 4 h in the "Apollo energy" scenario
```

Use a binary heap. Valid optimization: do not expand nodes whose outbound energy already exceeds the budget, since it does not change the result. Typical cost: 12,100 nodes and about 95,000 edges, on the order of milliseconds per Dijkstra in JavaScript.

**Route for the inspector:** with the central parameters (section 6), the `pred_o` chain from the destination back to H is the outbound leg, and the `pred_b` chain is the return leg. It is illustrative only: the colors integrate all the uncertainty.

## 6. Uncertainty and aggregation layer

**Knowledge parameters** (one “epistemic draw”):

| Parameter | Distribution |
|---|---|
| δ, τa | Same random row of `post_delta` and `post_tau_a` |
| τb | Random element of `post_tau_b` |
| f_walk | U(0.30, 0.40) |
| th_lim | U(20, 30) degrees |
| d_th | U(5, 10) degrees |
| v_flat | U(0.8, 1.2) m/s |
| ref2 | U(28, 30) mL/kg/min |
| rest2 | U(4, 6) mL/kg/min |
| V_ref | U(0.5, 1.0) m/s |

**Between-astronaut variability** (population mode only): VO2pre ~ N(40.6, 6.4) clipped to [25, 60]; W ~ N(75, 10) clipped to [50, 100].

**Central values** (for routes and checks): VO2pre 40.6; W 75; δ 0.16; τa 15; τb 0.95; f_walk 0.35; th_lim 25; d_th 7.5; v_flat 1.0; ref2 29; rest2 5; V_ref 0.75.

**Aggregation modes** (N draws, one 110 × 110 binary mask per draw):

```
Population:   draw i = epistemic parameters i + random astronaut i
              prob[c] = media_i( alcanzable_i[c] )

Crew member:  VO2pre and W fixed (the crew member's own); only the epistemic part varies
              prob[c] = media_i( alcanzable_i[c] )

Pair A+B:     in EACH draw i, the same epistemic parameters for A and B
              prob[c] = media_i( alcanzable_A,i[c] AND alcanzable_B,i[c] )
```

Use **common random numbers**: draw i must be the same across all sols, modes and crew members, so that differences between options are not noise. Monte Carlo error: ±1.96 · sqrt(p(1−p)/N), about ±10 percentage points with N = 80 and p = 0.5. To quote figures, use N = 300.

**Design scenarios** (selectors in the interface):

- **Intensity:** by default f_walk ~ U(0.30, 0.40) (conservative); fixed options of 30, 35, 40, 47% (walking observed in lunar simulations) and 50% (stress test).
- **Suit energy:** T_EVA_E = 6 h (default) or 4 h (Apollo design). Only the energy constraint changes; the time constraint stays at 6 h.

## 7. Landing-site selection layer (new)

**Question:** if we could choose where to land within the window, which site suitable for landing maximizes the reachable science for a newly arrived crew?

**The trick that makes it cheap.** Evaluating every cell as a habitat would require 2 Dijkstra runs per candidate cell (more than 24,000 per draw). Instead, the search is rooted at each destination j:

```
for each draw i and each destination j:
    RETURN   (j → h):  Dijkstra from j on the FORWARD graph   → Eb_j[h], pred_b
    OUTBOUND (h → j):  Dijkstra from j on the REVERSE graph   → Eo_j[h], pred_o
    times along those same trees (as in layer 5):
        Tb_j[h] = Tb_j[pred_b[h]] + t(pred_b[h] → h)
        To_j[h] = To_j[pred_o[h]] + t(h → pred_o[h])
    alcanzable_j,i[h] = finite and To+T_TASK+Tb ≤ 0.8·T_EVA
                        and Eo+P_TASK·T_TASK+Eb ≤ 0.8·P_DES·T_EVA_E

P_j[h] = media_i( alcanzable_j,i[h] )   # probability of reaching j and returning if the habitat is at h
```

That is 2 × (number of destinations) Dijkstra runs per draw, the same cost as a normal map. It has been verified: it gives exactly the same result as rooting at the habitat (0 differences in 360 comparisons).

**Landing suitability mask** (explicit assumptions, adjustable in the interface):

```
pendiente[c]   = degrees(atan(|DEM gradient|))   # gradient by central differences, 32 m
pend_lander[c] = mean of pendiente over the 3×3 window (~96 m)
arena          = dune mask (dark areas of the HiRISE image), dilated by 1 cell
seguro[c]      = pend_lander[c] ≤ 5°  and  c is not in the dilated arena
                 and  c is not within 2 cells of the edge
```

**Objective function and robustness to landing dispersion:**

```
ciencia[h]  = Σ_j w_j · P_j[h]               # w_j = 1: expected number of reachable destinations
robusta[h]  = mean of ciencia over the 3×3 window (dispersion of ±~50 m)
best site   = argmax_h { robusta[h] : seguro[h] }
```

The weights w_j let you give more scientific value to some destinations than to others. Robustness can be tightened by using the minimum instead of the mean, or a larger window if the lander's dispersion is larger.

**Reference result** (300 draws, seed 11, base case):

| | Current habitat (84, 42) | Best suitable site, sol 1 |
|---|---|---|
| Cell | (84, 42) | (52, 60), 1.1 km away: 4.729° S, 137.376° E |
| Expected destinations on sol 1 (out of 6) | 2.63 | 4.25 |
| Expected destinations on sol 14 | 3.16 | 4.75 (best site for sol 14: cell 55, 46) |
| Rock Hall / Edinburgh, sol 1 | 29% / 4% | > 99% / 93% |
| Ogunquit Beach / Ireson Hill, sol 1 | > 99% / 99% | 29% / 15% |
| Fraction of the window suitable for landing | 13.7% | |

*Figure (in the `.docx`):* expected reachable destinations on sol 1 by landing site (suitable zones only). Triangle: current habitat. Star: best suitable site.

**Interpretation:** landing on Vera Rubin Ridge, next to Glen Torridon, instead of on the plain raises the expected science on the first sol from 2.6 to 4.3 destinations. In exchange, the dunes end up far away. This is a demonstration of the method with 6 example destinations and an assumed landing rule (≤ 5°), not a landing-site proposal.

**In the interface:** a map of “expected science depending on where you land” (suitable zones only), the best site marked, and the option to drag the habitat to any cell to recompute. Reference code: `landing/landing_site.py`.

## 8. Interface layer (minimum for the demo)

- Map with a HiRISE background, probability on a perceptual scale (viridis), transparent below 2%. 50% and 90% contours computed with *marching squares* on the cell centers. Habitat and destinations with their percentage.
- Sol slider from 1 to 30. Precompute all sols in the background for the current settings.
- Selector for who walks (population, editable crew members, pair).
- Destination table: straight-line distance between cell centers, net elevation change and probability.
- Scenario selectors: intensity and suit energy.
- Always-visible assumptions panel: “reachable under the stated assumptions, never safe”; 32 m resolution; fictional crew; model not validated on Mars; descents no faster than on flat ground.
- Computation in Web Workers so the interface does not block, with a progress bar.
- Landing layer: map of expected science by landing site, with the best suitable site marked and a draggable habitat.

## 9. Analysis layer (optional; not needed for the tool)

The report also uses a two-level Monte Carlo (800 worlds × 400 astronauts), Sobol indices (SALib) and the expected value of information (EVPPI) by regression. It is in `src/landstand/analysis.py`. There is no need to reimplement it.

## 10. Validation protocol (mandatory)

**Step 1. Individual functions** (central values, sol 1):

| Check | Expected value |
|---|---|
| ratio(0) | 1.000 |
| vo2max(1) with δ = 0.16 and τa = 15 | ≈ 34.5 mL/kg/min |
| Flat-ground speed | ≈ 0.22 m/s |
| Speed on a 20% downhill | same as on flat ground (because of the cap) |
| Flat-ground radius, sol 1 | ≈ 1.7 km |

**Step 2. Maps with the same draws.** Python's random generator (numpy) cannot be reproduced in JavaScript. Use the 300 draws already exported to `results/draws_seed11_300.json` (generated with `rng = numpy.random.default_rng(11)`, `P = {**sample_epi(300, rng), **sample_var(300, rng)}`), load them into your code and compare:

| Destination (sol 1, base) | Expected probability |
|---|---|
| T1 Ogunquit Beach | 0.997 |
| T2 Ireson Hill | 0.987 |
| T3 Rock Hall | 0.290 |
| T4 Aberlady/Kilmarie | 0.263 |
| T5 Edinburgh | 0.037 |
| T6 Mary Anning | 0.053 |

- Sol 14: T3 0.490 · T4 0.460 · T5 0.083 · T6 0.130.
- 4 h scenario (sol 1): T3 0.057 · T4 0.043.
- 47% scenario (sol 1): T3 0.727 · T4 0.713 · T5 0.313 · T6 0.390.

The full reference map is `results/real_prob_con.npy` (sols 1, 2, 3, 5, 7, 10, 14). Target: 0 differing cells. This is how the current tool was validated (`tool/VALIDATION.md`).

**Step 3. With your own random generator:** the probabilities must match the reference ones within the Monte Carlo error (|z| < 2).

## 11. Common mistakes to avoid

- Flipping rows: the elevation model has south in row 0 and the image has north up.
- Rounding instead of truncating when converting km to cells.
- Computing time with a separate time Dijkstra: it must be measured along the minimum-energy paths.
- Forgetting the reverse graph for the return leg, because going uphill and going downhill do not cost the same.
- Computing power before applying the downhill cap.
- Sampling δ and τa separately.
- In pair mode, using different draws for each member.
- Showing the word “safe” for reachable terrain. In the landing layer, “suitable zone under the assumed slope rule”, not “safe”.
- In the landing layer, forgetting that the return leg is j → h on the forward graph and the outbound leg is h → j on the reverse graph, which is the opposite of layer 5.

## 12. Credits that must appear in the tool

- **Terrain:** USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef and Parker, 2016).
- **Imagery:** HiRISE, NASA/JPL-Caltech/University of Arizona.
- **Destination positions:** NASA/JPL-Caltech, Curiosity position archive.
- **Destination photos:** NASA/JPL-Caltech/MSSS, with their PIA number.

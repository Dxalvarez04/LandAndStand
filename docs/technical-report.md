# Land & Stand

*Spanish original: [es/informe_tecnico.md](es/informe_tecnico.md)*

**Astronaut functional capacity and probabilistic reachability on the surface of Mars** · Technical report (revised version)

Katrina Espinar Herranz · Land & Stand Team · NASA Space Apps Challenge 2026 · November 14, 2026

> **Transcription note.** Text copied from the report shared by the team. The equations and figures were lost when it was copied. The equations marked with † have been filled in with the formulas from the [algorithm specification](algorithm-spec.md), which is the reference for the code. Those not found in the specification are marked as pending.

## Abstract

**Objective.** To quantify how much of the Martian terrain is reachable on foot, as a round trip, for a crew freshly arrived after months of weightlessness: with what probability, for what fraction of the crew, and as a function of mission sol.

**Methods.** A mechanistic model with three components:

- Aerobic recovery, with Bayesian calibration from ISS astronaut data.
- Sensorimotor recovery, with Bayesian calibration from five functional tests in 19 crew members.
- Metabolic cost of walking in a pressurized suit, calibrated with measurements in simulated Martian gravity and with an empirical slope cost curve.

An alternative model based on the Pandolf equation was rejected as the primary model because it does not reproduce the Mars data, and it is retained as a sensitivity analysis.

The uncertainty in the physiological and suit parameters was propagated with a two-level Monte Carlo that separates knowledge uncertainty from inter-astronaut variability. It was decomposed with Sobol indices and translated into decisions with the expected value of partial perfect information, estimated by nonparametric regression. The design variables (life support, EVA duration, walking intensity) were fixed and are studied as scenarios.

**Results.**

- **Range.** The median reachable radius on flat ground on sol 1 is 1.6 km (90% prediction interval: 0.8–2.7 km) and rises to 1.9 km by sol 30, with 352 W of life support for 6 h and walking at 30–40% of VO₂max.
- **Crew fraction.** On sol 1, 69% of the crew could make the round trip to 1.5 km (credible interval: 6–96%).
- **Pairs.** In paired EVAs, limited by the slower member, that figure drops to 48%.
- **Aerobic fitness.** On sol 1, between 40% and 63% of the simulated astronauts, based on ISS crew data, would fall below NASA's in-mission VO₂max requirement for surface EVAs (36.5 mL/kg/min), compared with 13–27% before flight. The range depends on whether a correction is applied for VO₂peak having been measured on a cycle ergometer.
- **What explains the uncertainty.** Above all, individual VO₂max (Sₜ = 0.50), the speed at which the suit cost was measured (0.31) and walking intensity (0.14). Aerobic recovery does not exceed Sₜ = 0.04.
- **Value of information.** Planning the first walk with each crew member's measured fitness, instead of with an average astronaut, increases expected science by 21% to 44% (depending on the assumed cost of aborting). NASA already measures this fitness before flight; what is new is using it in the map and updating it during the mission. Knowing the suit cost curve increases it by 13% to 16%.
- **Real terrain.** On the Gale digital elevation model (USGS, 1 m resampled to 32 m), with the habitat on Murray formation bedrock next to the Bagnold dunes and six real destinations along Curiosity's traverse, Rock Hall (Vera Rubin Ridge, 1.2 km away and 157 m higher) is reached on sol 1 with a probability of 29% (49% on sol 14), compared with 78% on flat ground at the same distance. The farthest and highest drill sites (1.7–1.8 km, +170–210 m) remain at 4–5% on sol 1 and 8–13% on sol 14.
- **Balance.** The model does not allow walking downhill faster than on flat ground, because of the risk of falling: without that limit, Rock Hall would rise from 29% to 50%. As a slope limit, and with the assumed tolerance (20–30°, level C), balance did not change the reachability of any target, at either 32 m or 16 m; if the tolerable slope on sol 1 were 10°, Rock Hall would drop to 15%.
- **Design assumptions.** The terrain results depend mainly on two design decisions, which are shown as scenarios: with the Apollo life-support energy budget (4 h instead of 6 h), Rock Hall drops to 6% on sol 1; with the walking intensity observed in simulated lunar EVAs (47% of VO₂peak), it rises to 73%.

**Conclusions.** Under our assumptions, what recovers quickly (balance, within days) is not what limits range. What does limit it (the cost of walking in the suit relative to each person's aerobic capacity) barely changes over a month, and its absolute value depends on suit design assumptions that must be pinned down with real data. Planning must be probabilistic, per crew member and per pair, and with explicit assumptions, never in terms of a safe zone.

## 1. Introduction

The first human walk on Mars will be taken by someone arriving after about six months of weightlessness, with reduced aerobic capacity and altered balance, and without real-time support from Earth (1): at maximum separation between the two planets, a signal takes about 22 minutes each way. NASA's register of human health risks notes that sensorimotor impairment is greatest during and shortly after gravity transitions, including the first extravehicular activities (2). The Earth-Independent Medical Operations (EIMO) framework proposes progressively shifting decisions to the crew (3).

Current mapping tools, such as Mars Trek or the USGS geologic maps, describe the terrain at regional scale (4) and treat the explorer as a constant. This work turns the crew's functional capacity into a planning variable and expresses it as a probability.

**Contributions:**

- A sol-dependent capacity model with recovery constants calibrated by Bayesian inference on astronaut data.
- The explicit separation of inter-astronaut variability, knowledge uncertainty, structural uncertainty and design variables, the latter treated as scenarios.
- A probabilistic formulation of the reachable set that replaces the notion of a "safe zone".
- A robust quantification of the value of information, which ranks what is worth measuring before a mission.
- Operational recommendations for the Land & Stand tool.

## 2. Methods

### 2.1 Formal framework

Let Ω be the set of cells, s the sol since landing, ψ the vector of knowledge parameters and ξ the vector of individual characteristics. A cell c is reachable if, along the minimum-energy path γ\*, the following conditions hold simultaneously:

```
(1) T_out(γ*) + T_task + T_back(γ*) ≤ (1 − ρ) · T_EVA                        †
(2) E_out(γ*) + P_task · T_task + E_back(γ*) ≤ (1 − ρ) · P_des · T_EVA        †
(3) θ_i ≤ θ_max(s)  and  |i| ≤ 0.45  on every segment of γ*                   †
```

γ\* is obtained with Dijkstra's algorithm (5) on a directed 8-neighbor graph, with energy as the cost. Time is integrated along that same path, so equations 1 and 2 are evaluated on a single route. θ_i is the slope of each path segment, not the maximum terrain gradient: the grid diagonals allow zigzagging. The limit |i| ≤ 0.45 is the validity domain of the slope cost curve (Section 2.4).

**Design variables, fixed:** reserve ρ = 0.20; T_EVA = 6 h; a 30-min task at the destination at 300 W. As the mean energy budget we use P_des = 352 W (the mean 1200 Btu/h of the Apollo life support system (6)) sustained over the 6 h of the EVA. This implies a life support system with 1.5 times the energy of the Apollo design, which was sized for 4 h. With the Apollo budget (4 h), the median sol-1 radius drops from 1.6 to 1.2 km (Section 3.8).

The reachable set with confidence 1 − α is:

```
R_{1−α}(s) = { c ∈ Ω : P_{ψ,ξ}[ c satisfies (1)–(3) on sol s ] ≥ 1 − α }      † (reconstructed)
```

It is a chance constraint in the sense of Charnes and Cooper (7), and it formalizes the distinction between reachable and safe.

### 2.2 Aerobic recovery

```
VO₂max(s) = VO₂pre · (1 − δ · e^(−s/τa))                                      †
```

Moore et al. (8) observed in 14 astronauts, using cycle ergometer tests, a change in VO₂peak of −15% on day 1 (95% CI: −19 to −10%) and of −2% on day 30 (95% CI: −6 to +3%). The aerobic capacity index of 37 ISS astronauts shows the same pattern: it falls after landing and recovers by 30 days (9).

**Bayesian calibration.** Gaussian likelihood (standard deviation = CI width / 3.92) and weakly informative uniform priors (δ in 0.01–0.40; τa in 1–80 sols), solved on a grid. Result:

- δ: median 0.16 (90% credible interval: 0.11–0.25).
- τa: median 15 sols (2–40). With only two points it is poorly identified.

The joint posterior has a correlation of −0.55 between δ and τa. In the Monte Carlo, both are sampled jointly from the same row of the posterior in order to preserve it.

### 2.3 Sensorimotor recovery

Clément et al. (10) measured in 19 crew members, using five measures from three functional tests (tandem walk, recovery from a fall, walk and turn), the differences from preflight values, with 95% CIs, a few hours after landing, on the following day and at 6–11 days. The time profile matches that of the Field Test study, in which tandem walk performance worsens mainly during the first 24 h (11). For each measure, D(t) = D₀ · e^(−t/τ) was fitted by Bayesian inference on a (D₀, τ) grid:

| Measure | Median τ (90% credible interval) |
|---|---|
| Tandem walk, eyes closed | 3.5 days (2.1–5.5) |
| Turn (angular velocity) | 1.1 days (0.6–2.7) |
| Recovery from fall | 0.9 days (0.6–1.4) |
| Walk and turn (time) | 0.8 days (0.2–2.9) |
| Tandem walk, eyes open | 0.5 days (0.2–0.9) |

τb is sampled from the equal-weight mixture of the five posteriors (median 0.95 days; 0.35–4.4). It is not a hierarchical model. The maximum traversable slope is:

```
θ_max(s) = θ_lim − Δθ · e^(−s/τb)                                             †
```

with θ_lim ~ U(20°, 30°) and Δθ ~ U(5°, 10°). Converting the sensorimotor deficit into degrees is the weakest assumption in the model (level C).

*Figure 1 (not included in this text). Sensorimotor recovery after long-duration ISS stays. Points: relative deficit in the five measures of Clément et al. (10), normalized by its value on landing day. Band: mixture of the posteriors of the recovery constant.*

### 2.4 Cost of suited walking

**Primary model (M2).** In NASA's EVA Walkback Test (12), as summarized in the review by Ade et al. (13), walking on a treadmill in a pressurized suit at very slow speed (less than 1 m/s) cost about 28–30 mL/kg/min in simulated Martian gravity and 17–20 in lunar gravity. We were unable to consult the primary report, so the exact speed of those measurements is treated as an uncertainty. We model consumption as linear in speed, with the slope dependence of Minetti et al. (14):

```
VO₂(V, i) = VO₂^rest + (VO₂^ref − VO₂^rest) · (V / V_ref) · C(i) / C(0)       †
C(i) = 280.5·i⁵ − 58.7·i⁴ − 76.8·i³ + 51.9·i² + 19.6·i + 2.5                  †
```

C(i) is the cost per meter in J/(kg·m) for a slope i, valid between −0.45 and 0.45. Parameters: VO₂^ref ~ U(28, 30) mL/kg/min, VO₂^rest ~ U(4, 6) mL/kg/min and V_ref ~ U(0.5, 1.0) m/s. The resulting sustainable speed (0.22 m/s on sol 1 with the central parameters) is far below the speeds measured in suits: it is a linear extrapolation outside the range of the measurements and one of the largest sources of structural uncertainty. The Minetti curve was measured without a suit and at 1 g; scaling it by C(i)/C(0) assumes that neither the suit nor Martian gravity changes the effect of slope.

**Speed.** The astronaut walks at the highest speed that keeps their oxygen consumption below a fraction f_walk of their VO₂max for that day. That value cannot exceed the terrain limit, given by the Tobler function normalized and capped by v_flat (15). In suited simulated lunar EVAs (n = 5), the mean intensity over the whole EVA was 31–36% of VO₂peak, within a sustainable range of 30–40%; the walking segments were more intense (2 km traverse: 47% on average, maximum 69%) (16). Downhill, speed cannot exceed the same astronaut's sustainable flat-ground speed on that sol: with altered balance and the suit, descending faster would increase the risk of falling (Section 3.9). We take f_walk ~ U(0.30, 0.40) as the conservative scenario and show f_walk = 0.47 as the observed-walking scenario (Section 3.8). The map probabilities are conditional on this choice.

**Alternative model (M1), sensitivity only.** Equation of Pandolf et al. (17) with the weight-dependent terms scaled by r = 0.38:

```
[Pending equation: it was not preserved when the text was copied and is not in the specification.]
```

Under lunar gravity, at 1 m/s and with η = 1.1, it predicts 236 W. This is of the same order as the means of complete Apollo EVAs (228–352 W) (18), but those means include all tasks, not just walking. In Martian gravity at 0.75 m/s it predicts about 14 mL/kg/min, half of what was measured in suits. Moreover, its load term is applied outside its validation range (load greater than body mass) and produces all-or-nothing behavior. For these reasons, M1 is not combined with M2.

### 2.5 Sources of uncertainty

| Parameter | Type | Distribution | Level | Source |
|---|---|---|---|---|
| Preflight VO₂max | Variability | N(40.6, 6.4) mL/kg/min | A | (8) |
| Body mass W | Variability | N(75, 10) kg | C | Assumption (adults) |
| δ and τa | Knowledge | Joint posterior | A/B | Calibration with (8) |
| τb | Knowledge | Mixture of posteriors | A/B | Calibration with (10) |
| θ_lim / Δθ | Knowledge | U(20°, 30°) / U(5°, 10°) | C | Assumption |
| Walking intensity f_walk | Knowledge | U(0.30, 0.40); scenario 0.47 | B | (16) |
| Maximum flat-ground speed | Knowledge | U(0.8, 1.2) m/s | C | Assumption |
| VO₂^ref / VO₂^rest | Knowledge | U(28, 30) / U(4, 6) mL/kg/min | B/C | (12), cited in (13) |
| Reference speed V_ref | Knowledge | U(0.5, 1.0) m/s | B | (13): "less than 1 m/s" |
| Life support, duration, reserve | Design | Fixed; scenarios in Section 3.8 | — | (6) |

Levels of evidence: A, direct measurement in astronauts or in simulated Martian gravity; B, analog data or calibration; C, reasoned assumption.

### 2.6 Propagation, sensitivity and value of information

**One-level Monte Carlo.** 20,000 astronaut–parameter samples. Summary metric: the flat-ground reachable radius d\*(s), the maximum distance that satisfies equations 1 and 2 on compacted regolith.

**Two-level Monte Carlo.** 800 possible worlds (knowledge parameters) by 400 astronauts (variability). For each world, the fraction of the crew that reaches each distance is computed. The spread across worlds is the uncertainty about that fraction. This is the standard approach in risk analysis (19). For paired EVAs, the pair's range is that of the more limited member.

**Global sensitivity.** First-order (S₁) and total (Sₜ) Sobol indices with the estimators of Saltelli et al. (20), implemented in SALib (21), on M2 and with the design variables fixed. For δ and τa, uniform marginals over their 90% credible intervals are used, which ignores their correlation of −0.55.

**Value of information.** Reference decision: choosing the distance d of the target of the first walk. Utility: d km of science if the astronaut gets there and back, and −C if the walk has to be aborted, with C = 1 or 3 equivalent km. The expected value of partial perfect information (22) is:

```
EVPPI(φ) = E_φ[ max_d E_{ψ|φ} U(d, ψ) ] − max_d E_ψ U(d, ψ)      (standard form; the original equation was not preserved)
```

It was estimated by nonparametric regression of utility on φ (23), with degree-3 polynomials. The uncertainty of the estimate was obtained with 200 bootstrap replicates. As a noise reference, the EVPPI of a random variable unrelated to the outcome was computed.

**Reachability on real terrain.** We used the Gale merged digital elevation model (MSL Gale Merged DEM, version 3), built for the Curiosity mission from HiRISE, CTX and HRSC models tied to MOLA, at 1 m resolution (24). Its internal reduced-resolution version (averaged to 32 m) was read, and an area of 3.52 × 3.52 km (110 × 110 cells) was clipped between the southern Bagnold dunes, Vera Rubin Ridge and Glen Torridon, along Curiosity's traverse (sols 1600–2840). The relief of the area is 546 m. The habitat was placed on Murray formation bedrock (4.712° S, 137.367° E). The six destinations are sites where Curiosity collected samples, located with the rover's official position archive (25) on the sampling sol; Ireson Hill was located on the orbital image (±30 m). Equations 1–3 were solved for 300 samples and sols 1–14, in two scenarios: with the sensorimotor deficit and without it (Δθ = 0). With 300 samples, the standard error of a 70% probability is about 2.6 points, and one sample is equivalent to 0.33 points. As robustness checks, the calculation was repeated at 16 m resolution, without any slope limit, with lower slope tolerances, with the habitat displaced by 64–181 m, under the design scenarios of Section 3.8, and on synthetic terrain with a continuous 37° scarp.

**Reproducibility.** `calib.py`, `landstand_model.py`, `analysis.py`, `terrain.py`, `terrain_real.py` and `figs.py` regenerate all numbers and figures with fixed seeds.

## 3. Results

### 3.1 Calibration and checks

| Check | Model | Reference | Interpretation |
|---|---|---|---|
| M1, lunar gravity, 1 m/s | 236 W | 228–352 W, Apollo EVA means (18) | Same order; not a pure-walking comparison |
| M1, Martian gravity, 0.75 m/s | ≈ 14 mL/kg/min | 28–30 mL/kg/min in suit (12,13) | M1 fails: excluded as primary model |
| M2, Martian gravity | Calibrated | 28–30 mL/kg/min (12,13) | Calibration data, not independent validation |
| Aerobic deficit, days 1 and 30 | Posterior centered on −15% / −2% | −15% / −2% (8) | Calibration |
| Sensorimotor recovery | τ 0.5–3.5 days | Five tests, 19 crew members (10) | Calibration |

All rows are calibrations or order-of-magnitude checks: the primary model has no external validation in Martian gravity, and we state this as a limitation (Section 4.1).

### 3.2 Reachable radius

| Sol | Median (90% prediction interval) | Radius with 90% probability |
|---|---|---|
| 1 | 1.6 km (0.8–2.7) | 0.95 km |
| 7 | 1.8 km (0.9–2.9) | 1.1 km |
| 14 | 1.9 km (1.0–2.9) | 1.2 km |
| 30 | 1.9 km (1.0–3.0) | 1.2 km |

*Figure 2 (not included). Probability that a target is reachable, as a round trip, on flat terrain, by distance and sol (model M2). Contours: 50% (red) and 90% (white).*

With the central parameters (not the median), the sustainable speed rises from 0.22 m/s on sol 1 to 0.28 m/s on sol 30, and the radius from 1.7 to 2.2 km. Under the reference design assumptions, the active limit is usually time (in 79% of the samples on sol 1): walking costs 304–349 W, below the design power. With the Apollo energy budget, energy would become the limit (Section 3.8). The suit reference speed alone moves the central sol-1 radius between 1.1 km (V_ref = 0.5 m/s) and 2.3 km (1.0 m/s).

**Sensitivity to M1.** With M1, 48% of the samples cannot sustain walking on sol 1 and the rest reach several kilometers (medians of 1.7, 3.8 and 5.0 km on sols 1, 7 and 30). This bimodality is an artifact of the load term outside its validity range.

### 3.3 What fraction of the crew gets there

Median across worlds and 90% credible interval:

| Distance | Sol 1 | Sol 7 | Sol 30 |
|---|---|---|---|
| 1.0 km | 93% (64–100) | 98% (76–100) | 98% (86–100) |
| 1.5 km | 69% (6–96) | 82% (15–98) | 89% (27–98) |
| 2.0 km | 21% (0–83) | 35% (0–90) | 50% (1–93) |
| 2.5 km | 1% (0–46) | 3% (0–61) | 9% (0–75) |

**Paired EVAs (sol 1, median).** 88% of pairs reach 1.0 km, compared with 93% of individuals. At 1.5 km, 48% versus 69%. At 2.0 km, 2.5% versus 21%.

*Figure 3 (not included). Fraction of the crew that can make the round trip, by distance. Lines: median across simulated worlds; bands: 90% credible interval (knowledge uncertainty). The slope of the line reflects inter-astronaut variability. Dashed: pairs on sol 1.*

### 3.4 Aerobic fitness versus NASA requirements

The NASA-STD-3001 standard requires maintaining an in-mission VO₂max of at least 36.5 mL/kg/min on missions with surface EVAs (requirement V1 4002) and retaining at least 80% of preflight capacity (V1 4003) (26).

| Time point | Below 36.5 mL/kg/min (V1 4002) | Below 80% of preflight value (V1 4003) |
|---|---|---|
| Preflight | 27% | — |
| Sol 1 | 63% | 1% |
| Sol 7 | 47% | 0% |
| Sol 30 | 32% | 0% |

The relative decline barely breaches requirement V1 4003. The problem with requirement V1 4002 is the absolute level: part of the reference cohort is already below it before flight, and the post-landing decline pushes the majority below it on the first sol.

**Caveats.** The VO₂peak in (8) was measured on a cycle ergometer, which tends to give values 5–10% lower than a treadmill; with that correction, the sol-1 percentage would drop to 40–52% (and the preflight one to 13–18%). In addition, the ISS cohort was not selected using the 36.5 mL/kg/min requirement, which would be required of a Mars crew, and the postflight tests were performed at 1 g.

### 3.5 Global sensitivity

*Figure 4 (not included). Sobol indices of the reachable radius on sol 1 (M2, design variables fixed). Light bars: total index, which includes interactions; dark bars: first order.*

On sol 1, the dominant factors are:

- Individual VO₂max (Sₜ = 0.50; S₁ = 0.46).
- The suit reference speed (0.31; 0.29).
- Walking intensity (0.14; 0.12).

The aerobic decline δ (0.04), the suited standing cost (0.03) and body mass (0.03) contribute little. The constant τa does not exceed 0.005 on sol 1 or 0.034 on sol 7. With M2 the output is unimodal and the interactions are small (the sum of the Sₜ is 1.05), so variance is an appropriate measure.

### 3.6 Value of information and operational decisions

| What is known before planning the first walk | EVPPI, C = 1 (90% CI) | Improvement | EVPPI, C = 3 (90% CI) | Improvement |
|---|---|---|---|---|
| Each crew member's fitness (VO₂max, mass) | 0.17 (0.15–0.18) | +21% | 0.28 (0.24–0.31) | +44% |
| Suit cost–speed curve | 0.10 (0.09–0.12) | +13% | 0.10 (0.09–0.11) | +16% |
| Walking intensity f_walk | 0.05 (0.04–0.06) | +6% | 0.05 (0.05–0.06) | +8.5% |
| Aerobic recovery (δ, τa) | 0.005 (0.004–0.011) | +0.6% | 0.004 (0.003–0.011) | +0.7% |
| Noise reference | 0.000 (0.000–0.004) | — | 0.000 (0.000–0.002) | — |

Values in equivalent km of science. Current optimal decision: a target at 1.0 km (C = 1, expected utility 0.79) or at 0.9 km (C = 3, utility 0.62). Aerobic recovery stays around the level of the noise reference.

**How to read these values.** NASA already measures each crew member's VO₂max before flight: the first value measures the gain from planning with that measurement, and from updating it during the mission, instead of planning with an average astronaut. It is a calculation with perfect information, flat terrain and a simplified utility (arrive or abort); the 21–44% range reflects two abort costs, not an uncertainty interval. Individual fitness belongs to the variability axis and the other parameters to the knowledge axis. The research priority that follows is to measure the cost curve of the exploration suit in partial gravity and to check fitness during the mission before the first EVA.

**Walking intensity as a decision.** With the central parameters, the sol-1 radius goes from 1.3 km at f_walk = 0.30 to 1.7 km (0.35), 2.1 km (0.40) and 2.4 km (0.50). Above 0.40 the gain is small because life-support energy becomes the limit. Working above the sustainable range increases fatigue, which is not modeled. The combined effect with the energy budget is shown in Section 3.8.

### 3.7 Reachability on real terrain

| Destination (Curiosity site) | Distance | Climb | Sol 1 | Sol 7 | Sol 14 | Flat ground, sol 1 |
|---|---|---|---|---|---|---|
| T1 Ogunquit Beach (dune) | 0.33 km | 0 m | > 99% | > 99% | > 99% | > 99% |
| T2 Ireson Hill | 0.53 km | −14 m | 99% | > 99% | > 99% | 99% |
| T3 Rock Hall (Vera Rubin Ridge) | 1.19 km | +157 m | 29% | 44% | 49% | 78% |
| T4 Aberlady and Kilmarie (Glen Torridon) | 1.32 km | +142 m | 26% | 41% | 46% | 70% |
| T5 Edinburgh (Greenheugh pediment) | 1.71 km | +211 m | 4% | 7% | 8% | 44% |
| T6 Mary Anning (Glen Torridon) | 1.79 km | +171 m | 5% | 10% | 13% | 39% |

Straight-line distance from the center of the habitat cell. "Flat ground": probability of reaching the same distance on flat terrain (Section 3.2).

*Figure 5 (not included). Probability of reaching each cell as a round trip on sol 1 and sol 14 over the real Gale terrain, with the HiRISE color mosaic as the background (NASA/JPL-Caltech/University of Arizona; USGS mosaic). Triangle: habitat. Points: Curiosity sampling sites T1–T6. Contours at 50% (white) and 90% (orange).*

**Climbing matters more than distance.** Rock Hall is 1.2 km away, but it requires a 157 m climb up Vera Rubin Ridge: its probability on sol 1 is 29%, compared with 78% for a point at the same distance on flat ground. At the farthest and highest sites the difference is multiplied: Edinburgh, on the Greenheugh pediment, has 4% versus 44% on flat ground. What grows sol by sol is what is reachable on moderate terrain, thanks to aerobic recovery: Rock Hall goes from 29% to 49% in two weeks.

**Balance as a slope limit is not limiting at the assumed tolerance.** The results with and without the sensorimotor deficit coincide for all targets (35 of 12,100 cells change by one sample). Nor do they change at 16 m resolution or when the slope limit is removed altogether: on 20% slopes the sustainable speed is already about 0.07 m/s, so the minimum-energy paths never use steep segments. This conclusion does, however, depend on the assumed tolerance (level C):

| Maximum tolerable slope on sol 1 | T3 | T4 | T5 | T6 |
|---|---|---|---|---|
| Reference (θ_lim 20–30°, Δθ 5–10°) | 29% | 26% | 4% | 5% |
| θ_lim = 15°, Δθ = 7.5° | 27% | 23% | 4% | 5% |
| θ_lim = 10°, Δθ = 7.5° | 15% | 11% | 2% | 2% |
| Fixed 6° (DEM at 16 m) | 7% | 3% | 0% | 1% |

On the synthetic terrain, with a 37° scarp whose crossing requires at least 20.8°, the limit changed the probability of two targets on sol 1 by a single sample (from 0.7% to 1.0%).

**Robustness.** Going from 32 to 16 m raises Rock Hall by 3 points (32% versus 29%) and does not change the other destinations. Displacing the habitat by 64 m in any direction changes T3–T6 by at most 7 points.

### 3.8 Design scenarios

| Sol 1 | Reference | Apollo energy (4 h) | Observed walking (f = 0.47) | Both |
|---|---|---|---|---|
| Median flat-ground radius | 1.6 km | 1.2 km | 2.3 km | 1.5 km |
| Energy is the active limit | 21% | 87% | 71% | 99% |
| T3 Rock Hall | 29% | 6% | 73% | 25% |
| T4 Aberlady and Kilmarie | 26% | 4% | 71% | 20% |
| T5 Edinburgh | 4% | 0% | 31% | 1% |
| T6 Mary Anning | 5% | 0.3% | 39% | 2% |

Reference: 352 W for 6 h and f_walk ~ U(0.30, 0.40). Apollo energy: 352 W for 4 h, the Apollo life-support design (6). Observed walking: f_walk = 0.47, the mean over the 2 km traverse in simulated lunar EVAs (16).

These two decisions move the terrain probabilities more than any physiological parameter, in opposite directions: a smaller life support system lowers them and walking faster raises them. The map probabilities are therefore conditional on them, and the tool allows them to be changed. Pinning them down requires data from the real exploration suit (energy available per EVA and walking cost in partial gravity).

### 3.9 Structural sensitivity

In addition to parameter uncertainty, we tested four model-construction decisions with the same 300 samples (sols 1 and 14; paired comparisons).

- **Descent.** On flat ground, speed is limited by metabolism (median of 0.22 m/s on sol 1), but downhill it would be limited only by the preferred speed. The first version of the model thus allowed descending up to 2.7 times faster than on flat ground: the return from Rock Hall took 41 min versus 213 min on the way out. For a suited astronaut with altered balance this is not credible, so the base case limits descent to flat-ground speed. This is the most influential structural decision: without that limit, Rock Hall would be at 50% on sol 1 (64% on sol 14). A stricter variant, which reduces descent speed according to the day's sensorimotor deficit, barely changes the result (26%).
- **Grid.** With 8 neighbors, flat-ground paths are on average 5.5% longer than the straight line (up to 8.2%); with 16 neighbors, 1.4%. Using 16 neighbors raises the ridge destinations by 0 to 4 points.
- **Loose sand.** We delineated the Bagnold dunes on the HiRISE image (15% of the window, including Ogunquit Beach) and multiplied the net walking cost by 1.5 or 2.0; the measured terrain factor for loose sand is 2.0–2.1 (27). Ogunquit Beach does not change, Ireson Hill loses 3–6 points, Aberlady and Kilmarie 4, and the area with p ≥ 0.9 shrinks by 15–22%.
- **Samples without EVA capability.** Only 1 of 300 fails to reach 0.05 m/s on flat ground; excluding it changes the probabilities by 0.3 points at most.

| Destination | Base, sol 1 | Conservative, sol 1 | No descent limit, sol 1 | Base, sol 14 | Conservative, sol 14 |
|---|---|---|---|---|---|
| T1 Ogunquit Beach | > 99% | > 99% | > 99% | > 99% | > 99% |
| T2 Ireson Hill | 99% | 96% | 99% | > 99% | 99% |
| T3 Rock Hall | 29% | 33% | 50% | 49% | 50% |
| T4 Aberlady and Kilmarie | 26% | 25% | 47% | 46% | 44% |
| T5 Edinburgh | 4% | 5% | 12% | 8% | 11% |
| T6 Mary Anning | 5% | 6% | 15% | 13% | 14% |
| Area with p ≥ 0.5 | 4.5 km² | 4.4 km² | 5.4 km² | 5.6 km² | 5.7 km² |

Base: 8-neighbor grid, no sand cost and descent limited to flat-ground speed. Conservative: 16 neighbors and sand with a factor of 1.5. With descent already limited, the other structural decisions offset each other: the conservative case stays within 5 points of the base case.

## 4. Discussion

**Main finding.** Within the design assumptions, walking range in the first sols depends mainly on two things: each person's aerobic capacity and the cost of walking in the suit. The first varies widely between astronauts and the second is poorly known. Post-landing aerobic recovery, by contrast, barely moves the result. This conclusion depends on recovery at 0.38 g following the pattern observed at 1 g; if it were slower, recovery would gain weight. On terrain, the design decisions (life-support energy and walking intensity) weigh more than all of the above.

**Two clocks, one of which is not limiting.** Sensorimotor recovery is fast (constants of 0.5–3.5 days), but, with the assumed slope tolerance, its recovery does not change reachability: the cost of climbing slopes in a suit becomes limiting first. What does matter is a safety rule that does not depend on the sol: do not descend faster than on flat ground. If the tolerable slope were about 10°, slope would also be limiting. Its operational importance lies in the risk of falls and injury, which has not been quantified here. The slowest test, walking with eyes closed (τ ≈ 3.5 days), suggests treating the first sols under low visibility as a risk scenario in its own right.

**Personalization and pairs.** Individual VO₂max explains half of the variance, and planning with each crew member's measured fitness is what adds the most value. Paired EVAs, limited by the slower member, drastically reduce range at intermediate distances. This justifies planning per crew member and per pair, not with an average astronaut.

**NASA requirements.** Between four and six out of every ten simulated astronauts, based on ISS data, would be below the in-mission VO₂max requirement on the first sol. This points to strengthening aerobic countermeasures before landing or to staggering the first EVAs.

**Limitations.**

- The primary model (M2) is calibrated with a single set of suited measurements, cited secondhand (12, cited in 13), without external validation in Martian gravity. It extrapolates linearly in speed down to 0.22 m/s, and the Minetti curve was measured without a suit and on Earth.
- The conversion of the sensorimotor deficit into degrees of slope has no direct data (level C), and the risk of falling is not quantified. Balance acts as a slope limit and, in simplified form, by limiting descent to flat-ground speed; without that limit, Rock Hall would go from 29% to 50% (Section 3.9).
- The terrain results are conditional on two design variables (life-support energy and walking intensity) that change them by up to 45 points (Section 3.8).
- The readaptation data come from returns to 1 g and are calibrated in days, although they are applied in sols (1 sol = 1.027 days).
- Small cohorts: 14 and 19 crew members, with a mean age of about 48 years.
- The individual variability of δ, τa and τb is not modeled, only their mean uncertainty.
- τb comes from a mixture of posteriors, not from a hierarchical model.
- The Sobol indices ignore the correlation between δ and τa.
- The EVPPI depends on the utility function (C = 1 and C = 3 are shown) and on the chosen regression.
- Thermoregulation, cumulative fatigue, sleep, circadian rhythm, nutrition and in-transit countermeasures are not modeled.
- The walking cost assumes compacted regolith: walking on loose sand, as in the Bagnold dunes (T1), costs considerably more. The 8-neighbor grid lengthens paths by up to 8% (5.5% on average), which biases range downward by 0–4 points (Section 3.9). The habitat is a proposal, and the photos of each destination are rover views at the site, not views from the habitat. With 300 samples, the probabilities have a standard error of about 2–3 points.
- It is a demonstration model for the hackathon, not an operational tool.

### 4.1 Credibility and path to operational use

We assessed the model against NASA's standard for models and simulations, NASA-STD-7009B (the current revision, from 2024) (28). The standard scores eleven factors from 0 to 4 and does not set mandatory levels: it requires them to be reported together with the results. This is a self-assessment by the team, AI-assisted and not independent.

| Factor (NASA-STD-7009B) | Level | Basis |
|---|---|---|
| Data pedigree | 1 | Suit cost from a secondary source (13); tolerable slope assumed |
| Verification | 2 | 34 tests; bit-for-bit reproduction; identical web version |
| Validation | 1 | Calibration only; no data at 0.38 g or from real EVAs |
| Technical review (development and use) | 1\* | Internal AI-assisted review, not independent |
| Process management (development and use) | 1 | Git and tests, no formal requirements |
| Fitness for use | 1 | First use; Mars outside the calibrated domain |
| Input pedigree | 2 | USGS, JPL; suit energy from Apollo |
| Uncertainty characterization | 2 | Two-level Monte Carlo; design and model form not propagated |
| Results robustness | 3 | Sobol, EVPPI, resolution, habitat, scenarios |

\*Only if the team confirms that it reviewed the findings; otherwise, 0.

For a minimum-criticality demonstration these levels are sufficient, provided the maps say "reachable under the assumptions" and never "safe". For planning real EVAs we propose level 3 on all factors, as a panel of NASA EVA experts did (29). The largest gaps (validation, fitness for use, data, independent review) are not closed with code, but with data and people.

**Roadmap, by priority:**

1. Configuration control, with requirements and intended use documented.
2. Obtain the primary suit reports (12,30) and an independent human review.
3. Consumables of the current exploration suit instead of Apollo's.
4. Suited metabolic cost as a function of speed and slope at 0.38 g (ARGOS (31), parabolic flight), holding back data for validation.
5. Functional tests on ramps after landing and a fall-risk model.
6. Cost on loose sand and a terrain-type layer.
7. Analogs (Desert RATS, MDRS, HERA) with predictions registered before each EVA.
8. Readaptation data after partial gravity (Artemis).
9. In mission: a fitness test before each EVA and Bayesian updating with telemetry.

In operational use the tool only advises; the crew and ground control decide. It is recalculated daily and during the EVA, warns when it leaves the validated domain and always displays its credibility.

## 5. Conclusions

- Under our assumptions, early walking range on Mars is limited by the cost of walking in a suit relative to each person's aerobic capacity, not by post-landing recovery.
- Balance recovers within days and, with the assumed slope tolerance, its recovery is not what limits reachability. Its role lies in the risk of falling, and the rule of not descending faster than on flat ground greatly reduces range to the ridge destinations.
- The most valuable thing for planning is to use each crew member's measured fitness; the most valuable thing still to be measured is the suit cost curve in partial gravity.
- On real terrain, climbing matters more than distance, and the result depends on two design decisions (life-support energy and walking intensity) and on how descent is modeled, which must be pinned down with exploration-suit data and functional tests.
- According to NASA-STD-7009B, the model is fit for a demonstration, not for operations: the next step is not more code, but suited walking data at 0.38 g and an independent human review.
- Planning must be probabilistic, per crew member and per pair, and with explicit assumptions, never in terms of a "safe zone".

## Annex A · Recommendations for the team

| Decision | Recommendation | Rationale |
|---|---|---|
| Model | M2 only | M1 does not reproduce the Mars data |
| Legend | 90% and 50% probability contours | Formalizes "reachable under assumptions" |
| Crew member selector | VO₂max and mass of each astronaut | Highest value of information |
| Pair mode | Range is set by the more limited member | Changes the result substantially at 1.5–2 km |
| Design scenarios | Selector for intensity (30–40%, 47%, 50%) and for energy budget (6 h or Apollo's 4 h) | They move the result more than physiology does |
| Study area | 3.5 × 3.5 km clip of the real USGS DEM with six Curiosity sites | The median radius is around 1.6–1.9 km |
| Climbs | Show the elevation gain next to the distance of each target | Rock Hall (1.2 km, +157 m): 29% versus 78% on flat ground |
| Sol-by-sol growth | Show it at the moderate-climb destinations (T3, T4) | That is where it becomes visible |
| Computation | The tool computes in the browser; to cite figures, use 300 samples | About 37 s per sol with 300 samples in Python at 32 m |

## Annex B · Script and presentation

**30-second video (English):**

> Every team will map Mars. We map Mars as it looks to a body just back from six months in zero gravity. Land & Stand shows, sol by sol, the probability that each astronaut, and each pair, can walk to a real Curiosity site on Mount Sharp and get back. Change the crew member: the map changes. We show what's reachable, for whom, how likely, and why.

**2-minute pitch:** see the deliverables document (Spanish and English versions, under 260 words).

**Seven slides:**

| No. | Title | Content | Criterion |
|---|---|---|---|
| 1 | Land & Stand | Hook question: how far on the first day? | Presentation |
| 2 | The body is the missing layer | Deconditioning, 22-min delay, 4–6 out of 10 below the requirement on sol 1 | Relevance |
| 3 | Reachable, sol by sol | Figure 5: Rock Hall 29% versus 78% on flat ground | Creativity |
| 4 | Who can make it? | Individuals versus pairs | Validity |
| 5 | Fast clock, slow clock | At the assumed tolerance, balance is not what limits | Validity |
| 6 | What to know first | Planning with measured fitness: +21–44%; suit curve: +13–16% | Impact |
| 7 | Data, method & next steps | NASA data with credits, reproducible code, design scenarios, declared AI-assisted review | Presentation |

## Annex C · Tough questions from the judges

1. **Why did you discard the Pandolf model?** Because in Martian gravity it predicts half the cost measured in suits and produces an artificial all-or-nothing behavior. We keep it only as a sensitivity analysis.
2. **Isn't 0.22 m/s too slow?** Yes, it is slow, and we say so: it is a linear extrapolation of the suit cost measured at less than 1 m/s, capped at 30–40% of the day's VO₂max. In simulated lunar EVAs, walking was performed at 47% of VO₂peak; with that value, the median sol-1 radius goes from 1.6 to 2.3 km. That is why intensity is a scenario selector in the tool.
3. **Why does balance have no influence, if it is what is most affected?** Because, with the assumed slope tolerance (20–30°), the cost of climbing in a suit becomes limiting first: at a 20% slope the sustainable speed is already 0.07 m/s. If the tolerable slope were 10°, Rock Hall would drop from 29% to 15%. Where it does act is on descent: we do not allow descending faster than on flat ground, and that matters a great deal (without that limit, Rock Hall would be at 50%). We do not quantify the fall risk itself.
4. **Why a two-level Monte Carlo?** Because "astronauts are different" and "we don't know enough" are handled differently: the first with per-crew-member maps and the second by measuring.
5. **How do you know the value of information is not noise?** We estimate it by regression, with bootstrap intervals and a noise variable as a reference, and we show it with two utility functions. Aerobic recovery stays at noise level; individual fitness and the suit, well above it.
6. **Is the 36.5 mL/kg/min requirement real?** Yes: NASA-STD-3001, requirement V1 4002, for in-mission VO₂max with surface EVAs.
7. **Why not "safe zone"?** Because safety requires validated failure probabilities that do not exist for Mars. We show probabilities under visible assumptions.
8. **Have you validated the model?** We have calibrated it with astronaut and suit data, and we have reviewed the analysis with AI assistance (we declare this). An external validation in Martian gravity does not yet exist; we state this as a limitation.
9. **Why Mount Sharp?** Because it has the best elevation model on Mars and a Curiosity traverse with real sampling sites: we can put probabilities on places that science has already chosen. *[Confirm whether the challenge statement mentions it.]*
10. **Why 352 W for 6 h, if the Apollo life support lasted 4 h?** It is a modern-suit assumption and we show it as a scenario: with the Apollo budget, Rock Hall drops from 29% to 6% on sol 1. Pinning it down requires data from the real exploration suit.
11. **Could it be used on a real mission?** Not yet, and we say so using NASA-STD-7009B: the code is verified and reproducible, but validation is minimal because no data exist on suited walking in Martian gravity. We have the roadmap to get there.
12. **What would you do with more time?** Obtain the primary report of the EVA Walkback Test, calibrate M2 with the current exploration suit, a hierarchical per-crew-member recovery model, loose-sand cost, Gale terrain at 1 m resolution, quantification of fall risk, and validation at analog stations such as the MDRS in Utah.

## References

1. Phelps SE, Martin K, Costes SV, Thompson M, Suresh R, Abadie L, et al. TOPICAL: development of medical capabilities and technologies for health monitoring, diagnostics, and treatment during human exploration spaceflight [Internet]. Houston (TX): NASA Johnson Space Center; 2021 [cited 2026 Nov 14]. Available from: https://ntrs.nasa.gov/citations/20210023828
2. National Aeronautics and Space Administration, Human System Risk Board. Risk of altered sensorimotor/vestibular function impacting critical mission tasks, human health, and long-term health (Sensorimotor Risk) [Internet]. Washington (DC): NASA; [updated 2025 Jul 8; cited 2026 Nov 14]. Available from: https://www.nasa.gov/directorates/esdmd/hhp/sensorimotor-risk/
3. Parker M, Krihak M, Laing C, Bardina J, Anderson A. Earth-Independent Medical Operations (EIMO) concept of operations (ConOps) [Internet]. Presented at: NASA Human Research Program Investigators' Workshop; 2024 Feb 13 [cited 2026 Nov 14]. Available from: https://ntrs.nasa.gov/citations/20240001402
4. NASA International Space Apps Challenge. Interplanetary survival guide: Martian map [Internet]. Washington (DC): NASA; 2026 [cited 2026 Nov 14]. Available from: https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/
5. Dijkstra EW. A note on two problems in connexion with graphs. Numer Math. 1959;1(1):269-71. doi:10.1007/BF01386390
6. Carson MA. Apollo portable life support system performance report. In: Second Conference on Portable Life Support Systems. Washington (DC): NASA; 1972 [cited 2026 Nov 14]. Available from: https://ntrs.nasa.gov/citations/19720019460
7. Charnes A, Cooper WW. Chance-constrained programming. Manage Sci. 1959;6(1):73-9. doi:10.1287/mnsc.6.1.73
8. Moore AD Jr, Downs ME, Lee SM, Feiveson AH, Knudsen P, Ploutz-Snyder L. Peak exercise oxygen uptake during and following long-duration spaceflight. J Appl Physiol (1985). 2014;117(3):231-8. doi:10.1152/japplphysiol.01251.2013
9. Moore AD Jr, Lynn PA, Feiveson AH. The first 10 years of aerobic exercise responses to long-duration ISS flights. Aerosp Med Hum Perform. 2015;86(12 Suppl):A78-86. doi:10.3357/AMHP.EC10.2015
10. Clément G, Moudy SC, Macaulay TR, Bishop MO, Wood SJ. Mission-critical tasks for assessing risks from vestibular and sensorimotor adaptation during space exploration. Front Physiol. 2022;13:1029161. doi:10.3389/fphys.2022.1029161
11. Rosenberg MJF, Reschke MF, Cerisano JM, Kofman IS, Fisher EA, Gadd NE, et al. Field Test: results of tandem walk performance following long-duration spaceflight [abstract]. Presented at: NASA Human Research Program Investigators' Workshop; 2017 Jan 23-26; Galveston (TX) [cited 2026 Nov 14]. Available from: https://ntrs.nasa.gov/citations/20160013636
12. Norcross JR, Lee LR, Clowers KG, Morency RM, Desantis L, De Witt JK, et al. Feasibility of performing a suited 10-km ambulation on the Moon: final report of the EVA Walkback Test (EWT). Hanover (MD): NASA Center for AeroSpace Information; 2009. Report No.: NASA/TP-2009-214796.
13. Ade CJ, Broxterman RM, Craig JC, Schlup SJ, Wilcox SL, Warren S, et al. Prediction of lunar- and Martian-based intra- and site-to-site task performance. Aerosp Med Hum Perform. 2016;87(4):367-74. doi:10.3357/AMHP.4399.2016
14. Minetti AE, Moia C, Roi GS, Susta D, Ferretti G. Energy cost of walking and running at extreme uphill and downhill slopes. J Appl Physiol (1985). 2002;93(3):1039-46. doi:10.1152/japplphysiol.01177.2001
15. Tobler W. Three presentations on geographical analysis and modeling. Santa Barbara (CA): National Center for Geographic Information and Analysis; 1993. Technical Report No.: 93-1.
16. Strock NC, Frisco D, Estep PN, Schlotman T, Norcross J, Prejean BJ, et al. Evaluation of aerobic capacity in relation to simulated lunar surface extravehicular activities [poster]. Presented at: 94th Aerospace Medical Association Annual Scientific Meeting; 2024 May 5-9; Chicago (IL) [cited 2026 Nov 14]. Available from: https://ntrs.nasa.gov/citations/20230014953
17. Pandolf KB, Givoni B, Goldman RF. Predicting energy expenditure with loads while standing or walking very slowly. J Appl Physiol Respir Environ Exerc Physiol. 1977;43(4):577-81. doi:10.1152/jappl.1977.43.4.577
18. Waligora JM, Hawkins WR, Humbert GF, Nelson LJ, Vogel SJ, Kuznetz LH. Apollo experience report: assessment of metabolic expenditures. Washington (DC): NASA; 1975. Report No.: NASA TN D-7883.
19. Frey HC. Quantitative analysis of uncertainty and variability in environmental policy making. Washington (DC): American Association for the Advancement of Science; 1992.
20. Saltelli A, Annoni P, Azzini I, Campolongo F, Ratto M, Tarantola S. Variance based sensitivity analysis of model output. Design and estimator for the total sensitivity index. Comput Phys Commun. 2010;181(2):259-70. doi:10.1016/j.cpc.2009.09.018
21. Herman J, Usher W. SALib: an open-source Python library for sensitivity analysis. J Open Source Softw. 2017;2(9):97. doi:10.21105/joss.00097
22. Felli JC, Hazen GB. Sensitivity analysis and the expected value of perfect information. Med Decis Making. 1998;18(1):95-109. doi:10.1177/0272989X9801800117
23. Strong M, Oakley JE, Brennan A. Estimating multiparameter partial expected value of perfect information from a probabilistic sensitivity analysis sample: a nonparametric regression approach. Med Decis Making. 2014;34(3):311-26. doi:10.1177/0272989X13505910
24. Calef FJ III, Parker T. Mars MSL Gale merged DEM 1m, version 3 [Internet]. Flagstaff (AZ): USGS Astrogeology Science Center; 2016 [cited 2026 Nov 14]. Available from: https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m
25. NASA Jet Propulsion Laboratory. Mars Science Laboratory (Curiosity) rover waypoints [Internet]. Pasadena (CA): NASA/JPL-Caltech; [accessed 2026 Nov 14]. Available from: https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json
26. National Aeronautics and Space Administration. NASA space flight human-system standard. Volume 1: crew health. NASA-STD-3001, Revision C [Internet]. Washington (DC): NASA; 2023 [cited 2026 Nov 14]. Requirements V1 4002 and V1 4003. Available from: https://www.nasa.gov/reference/4-0-human-performance
27. Soule RG, Goldman RF. Terrain coefficients for energy cost prediction. J Appl Physiol. 1972;32(5):706-8. doi:10.1152/jappl.1972.32.5.706
28. National Aeronautics and Space Administration. NASA-STD-7009B. Standard for models and simulations [Internet]. Washington (DC): NASA; 2024 [cited 2026 Nov 14]. Available from: https://standards.nasa.gov/sites/default/files/standards/NASA/B/1/NASA-STD-7009B-Final-3-5-2024.pdf
29. Perkins RA, Gallo CA, Ivanoff AE, Yates KM, Schkurko CM, Somers JT, et al. Modeling and simulation credibility assessments of whole-body finite element computational models for use in NASA extravehicular activity applications. Comput Methods Biomech Biomed Engin. 2023. doi:10.1080/10255842.2023.2293653
30. Norcross JR, Clowers KG, Clark T, Harvill L, Morency RM, Stroud LC, et al. Metabolic costs and biomechanics of inclined ambulation and exploration tasks in a planetary suit [Internet]. Houston (TX): NASA Johnson Space Center; 2010 [cited 2026 Nov 14]. Report No.: NASA/TP-2010-216125. Available from: https://ntrs.nasa.gov/citations/20110003409
31. Yao J, Jarvis S, Vu LQ, Kim KH, Flaspohler C, Sabahi SP, et al. In-depth analysis of subject functional performance and subjective feedback data for evaluating ARGOS simulation quality [Internet]. Presented at: International Conference on Environmental Systems; 2024 Jul 21-25; Louisville (KY) [cited 2026 Nov 14]. Available from: https://ntrs.nasa.gov/citations/20230016453

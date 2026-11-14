# Original idea (Nov 13, 2026)
*Spanish original: [es/idea_original.md](es/idea_original.md)*

Katrina Espinar's initial proposal for the *Martian Map* challenge, shared in the team's group chat before the revised report. It is kept for context; **the [specification](algorithm-spec.md) is what now takes precedence**.

## The proposal

- **Idea.** Every team is going to make a map of Mars as if a healthy astronaut were walking on it. But the first astronauts will arrive after about 6 months without gravity: with balance problems, less strength and poorer cardiovascular fitness, and those deficits last for days. On top of that, Earth is up to 24 minutes away by radio, so nobody can help them in real time.
- **Concept.** Reachable Mars depends on the body that sets foot on it. The map shows which areas this crew can cover on this sol, as a round trip. With a sol slider, the area starts small around the habitat and grows as they readapt. Science targets “light up” when they become reachable. The area shrinks if there is a dust storm, a solar storm or an injury.
- **Pitch line.** *“Every team will map Mars. We map Mars as it looks to a body that just spent six months in zero gravity.”*
- **Where.** The boxwork area of Mount Sharp, Gale crater: it is the example given in the challenge statement itself, Curiosity's route is in the resources, and Curiosity measures radiation (RAD) and weather (REMS) there.
- **What the tool would include:**
  1. Body capability per sol: speed, maximum slope and fall risk depending on the terrain.
  2. Science campaign: which target to visit on which sol.
  3. Safety: radiation dose, a solar-storm button and “if you get injured here, can your crewmate bring you back?”.
  4. At each target, the real Curiosity photo: “this is what you will see”.
- **Data:** topography (HiRISE/Mars Trek), spectral (CRISM), thermal (THEMIS), radiation (RAD) and atmospheric (REMS). Five types; the challenge asks for at least three.

## What has changed with the revised report and the specification

| Original idea | Now | Reason |
|---|---|---|
| “Safe zone” | Probability of making the round trip, “reachable under the stated assumptions” | There are no validated failure probabilities for Mars. The word “safe” is banned from the interface. |
| Boxwork area | 3.52 × 3.52 km window between the Bagnold Dunes, Vera Rubin Ridge and Glen Torridon, with six Curiosity sampling sites (T1–T6) | That is where the model is computed and validated, with the USGS DEM. |
| Speed, slope and fall risk | Speed and maximum slope per sol; downhill walking limited to flat-ground speed. Fall risk is not quantified. | No data to quantify it. |
| Science campaign | Probability of each destination per sol, crew member and pair | Kept, in probabilistic form. |
| Radiation, solar storm, dust storm, crewmate injury | Out of the demo: moved to “next steps” | Not in the model. |
| Real Curiosity photo at each target | Kept | — |
| Five data types (HiRISE, CRISM, THEMIS, RAD, REMS) | Topography (USGS DEM), HiRISE imagery, Curiosity positions and photos | Pending: confirm in the challenge statement whether they count as three types. |

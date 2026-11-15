# Map style · “Apollo”

*Spanish version: [es/estilo_mapa.md](es/estilo_mapa.md)*

Design reference for the map (person 2) and for the look of the panel (the panel logic belongs to person 3). Any visual change must follow this document. If something doesn't fit, it gets changed here first.

**Inspiration:** [NASA Eyes on the Solar System](https://www.jpl.nasa.gov/news/explore-the-solar-system-with-nasas-new-and-improved-3d-eyes/) (night blue, thin lines, a single floating card) and the Futura typeface on the plaque Apollo 11 left on the Moon.

**Tone:** a reliable technical instrument, not a poster. Numbers are set in monospace, as on instrumentation. There is a km ruler along the edge of the study area, and panels are solid with 1 px borders.

**Usage principle** (Orion cockpit): by default, only what is needed to answer “can I get there and back today?” is shown. If an element doesn't help answer it, it goes.

## Color

The tokens live in `src/lib/mapa/estilo.ts` (for SVG and canvas) and are repeated as Tailwind classes in the components.

| Token | Value | Use |
|---|---|---|
| `noche` | `#060a17` | Background of the instrument, legend and controls |
| `noche2` | `#0b1226` | Map background without imagery |
| info card | `#070c1b`, opaque | Point info card (no transparency or blur) |
| line | `#a0beff` at 15–30% | 1 px borders, dividers and ruler |
| `texto` | `#eaf0ff` | Main text |
| `texto2` | `#b9c6e6` | Secondary text |
| `rotulo` | `#8d9cc2` | Data labels (“Distance to habitat”), coordinates, ruler |
| `ambar` | `#ffcf70` | What is within reach: destinations ≥ 50%, 90% contour, “likely” phrase |
| `ruta` | `#ff8fd8` | Outbound route (solid) and return route (dotted), selection reticle |
| Probability | viridis | Required by the specification. Not to be changed. |
| 50% contour | `#e8f1ff`, dashed 4-3, 1.2 px | |
| 90% contour | `ambar`, solid, 1.7 px | |

Amber is the **only accent**. Pink is used only for the selection and the route.

## Typography

`src/components/mapa/fuente.ts`. Both fonts are loaded only on the map.

- **Jost** (free version of Futura), weights 300, 400 and 500: all text.
- **IBM Plex Mono** (class `CIFRA`, with `tabular-nums`): all numbers (percentages, distances, coordinates, ruler km, PIA and sol of the photos).
- **The main figure** (info card percentage): 36 px, weight 300. The % sign sits at mid-height, tight against the number.
- **Name on the info card**: 15 px, weight 500, preceded by the id in monospace (`T3`).
- **Destination names on the map**: 13.5 px with no box, with a dark halo (`text-shadow`).
- **Minimum**: 11 px for reference numbers (ruler, coordinates) and 12 px for any text that has to be read.
- No letter-spaced capitals and no “tag”-style labels: hierarchy is set with size and weight.

## Shape

| Element | Shape |
|---|---|
| Info card, legend and controls | Rectangle with a 3–6 px radius, solid, 1 px border |
| Photo thumbnail | 2 px radius |
| Habitat | White triangle with a dark border and the label “Habitat” |
| Mission destinations | 10 px dot with a dark border (a diamond if the crew added it): white, or amber if ≥ 50%. Label with id (M1, P1…), name and percentage |
| Landmarks (T1–T6, Curiosity) | Hollow ring with a dot, fainter post and more muted text; the percentage without amber (they are not goals, they only help with orientation). Tapping one shows its photo |
| Selection | Fixed pink ring with an 11 px radius and a center dot (does not spin) |

- Touch targets are at least 44 px.
- The only shadow is a black shadow under the info card, to separate it from the map. No colored shadows.

## Layout

The page never scrolls: there are only two areas, map and panel. The map always fills the whole screen and the panel floats on top (right column in landscape, bottom 40% in portrait). It doesn't resize the map: the map's corners move out of its way and the 3D scene shifts its center to stay centered in the visible part, with the same animation as the panel (0.5 s, ease-in-out).

The interface is available in English and Spanish; a language switch sits with the map controls (top right), and the choice is remembered on that device.

On the Mars globe and during the descent only the map is shown: the panel comes in when the camera lands on the study area (near the end of the arc down) and leaves as soon as you ask to go back to the globe, while the camera rises. A tab on its edge (on the left in landscape, on top in portrait) hides it and brings it back; when picking a point for a new destination it comes back out on its own.

On the 3D terrain, each corner has a fixed role:

| Corner | Content |
|---|---|
| Top left | “‹ Mars globe” (on mobile, just the arrow). It is hidden while a point is being picked, and the “Tap the point for the new destination” bar appears in its place. Below it, the first-time hint: how to move (with the mouse or with the fingers) and “Tap the ground or a destination to see if you can get there and back”. It disappears on the first tap |
| Top right | Zoom + / −, “3D \| Top-down”, the language switch and “?”, which opens “Getting around”: the mouse or touch gestures and the keys (it closes with Esc or by tapping outside). There is no button to return to the initial framing: the 0 key does it, and rotating the screen reframes automatically |
| Bottom left | Legend |
| Bottom right | Attribution (“Sources · USGS · NASA/JPL-Caltech”) and compass |

In the 2D map (plan B without WebGL):

| Corner | Content |
|---|---|
| Top left | First-time hint (“Tap any point…”); it disappears on the first tap |
| Top right | Zoom + / − and “Study area” (the latter only when zoomed in) |
| Bottom left | Legend: “Round-trip probability”, viridis bar from 2% to 100% with ticks at 50% and 90% |
| Bottom right | Attribution (“Sources · USGS · NASA/JPL-Caltech”), scale bar and north arrow |

- The study area (3.52 km) is the largest square that fits, centered, with a km ruler (ticks every 500 m and numbers every 1 km).
- **Context:** around it, the real HiRISE terrain is shown dimmed (50% brightness, 55% saturation), because there is no computation there. There is 1 km to the west (where the mosaic ends) and 3 km to the north, east and south. You can zoom out until the context fills the window; in 2D, “Study area” returns to the initial framing.
- **Study area layers, bottom to top:** color HiRISE, probability (viridis at 60%), 8 m shaded relief in *soft-light* blending (so the ridges can be read through the color) and, last, contours and route clipped to the edge of the area.
- If there is no room at the sides for the legend and the scale, a strip is reserved for them at the bottom so they don't cover the ruler.

## Point info card

- It opens **next to the tapped point**, in the spot that covers neither the path drawn to the habitat nor the point: it tries right and left (centered, higher or lower), above and below, and keeps the one that covers the least (first, the one on the side opposite the path). While the model's route is on its way, it avoids the straight line to the habitat. When the map moves it doesn't switch sides unless its own side starts covering the path. The compact strip (mobile) goes at the top or bottom by the same criterion.
- On any point or on a landmark (not on a mission destination or the habitat), at the end, “Add to mission destinations” (dashed button with the pink cross, as in the panel; in the compact strip, just the cross): the panel comes out, asks for the name and the tasks, and the point is marked as a new destination. On a landmark, its name and what was studied there are suggested.
- On a mission destination it shows what is there and its planned tasks; on a landmark, “Landmark · …” and the Curiosity photo.
- It answers, in this order:
  1. Can I get there and back? (percentage and phrase)
  2. What will I see? (Curiosity photo, only at destinations)
  3. How far is it?
  4. Which way? (out and back legend, and the profile of the model's route: outbound length, cumulative climb and maximum slope)
  5. At the end, the latitude and longitude.
- **Preview:** the thumbnail of what Curiosity saw at that destination, with “What Curiosity saw” and the type (360°, Panorama or Photo). Tapping it opens the viewer.
- **Viewer** (`VisorFoto.tsx`), full screen:
  - In 360° it rotates endlessly and the heading is shown in degrees; panoramas scroll from side to side; photos zoom and pan.
  - It is controlled by dragging, with the wheel, by pinching or with a double tap. With the keyboard: arrows, + and −, and Esc to go back.
  - The header shows the PIA, the camera, the sol and the official credit for that image (PIA23042 is “NASA/JPL-Caltech”, without MSSS).
  - **Heading:** only if the official caption says which way the image faces (T1: northwest at the ends and southeast in the center; T2: from west-southwest to north-northwest). It is shown at the top center of the image (“135° SE”). If the caption doesn't say, it isn't shown: nothing is made up.
  - **Official record:** official NASA title, a summary of the caption (in the interface language), dates, number of images, credit and link to the NASA record. On wide screens it opens on the right; on mobile, at the bottom and collapsed on entry.
  - Data in `src/lib/data/fotos.ts`.

## Route

- It is the model's route: the least-energy path (layer 5), with the central parameters and the first crew member. The outbound route is solid and the return dotted. On this terrain they usually coincide.
- The path goes from cell to cell in 8 directions. It is drawn smoothed (Chaikin, 2 passes) so it doesn't look like a 45° zigzag: it passes through the same cells.
- If the model finds no path within the energy budget, the info card says “No route”. The approximate route is only used if the model doesn't compute routes.

## Official sources

- Tapping “Sources” (bottom right) opens a full-screen view with the nine sources. For each one it gives the official product, the authorship and date, the technical detail, the exact credit from the specification (§12) and the link to the official page.
- It also shows the study area (location, size, projection and bounds) and the table of Curiosity images with their PIA and credit.
- Data in `src/lib/data/fuentes.ts`. Any new figure or credit has to come from an official record.

## Screens

| Screen | Map | Panel | Info card |
|---|---|---|---|
| Spacecraft / desktop (landscape) | Full screen; the scene centers on what the panel leaves free | ~440 px right column over the map (at most 34% of the width); it must fit entirely; hidden with the tab | Next to the point |
| Mobile portrait (< 560 px wide) | Full screen; the scene centers on the top 60% | Bottom 40% over the map, scrolls internally; hidden with the tab | Compact strip (thumbnail, percentage, name, band and distance), at the top or bottom depending on where the point is. The legend and the scale are hidden while the strip is at the bottom |
| Short screen (≤ 500 px tall, mobile landscape) | No zoom buttons (fingers are used) and no legend | Right column, scrolls internally | Compact strip |
| 3D map at < 560 px wide | Compact controls: no + / − (pinch). “Mars globe” is reduced to just the arrow. The 3D view is framed closer and more from above | — | Compact strip |
| Mars globe (any screen) | Full screen | Hidden | — |

## 3D map

The main map is 3D (`src/components/mapa3d/`); the 2D one remains as plan B if there is no WebGL or if the scene fails.

1. **Globe.** Mars with Viking color, MOLA relief, a thin atmosphere (ochre on the day side, bluish at the terminator) and stars. The Gale region is shown in relief (HRSC-MOLA, ×3) with its CTX image, blended into the globe, and marked with a leader line: a white dot on the crater, a thin vertical line with an elbow and, at the top, “Gale crater” with “Enter the study area ›”. Tapping the name (or the dot) takes you down to the study area; there is no automatic descent and there are no other buttons. The label is hidden when Gale is on the far side. “‹ Mars globe”, on the terrain, goes back the same way in reverse.
2. **Descent.** A continuous descent, with no fade to a flat color. About 2.6 s down to a low orbit ~100 km above the study area (north up, looking almost straight down), where the crater and Mount Sharp are seen sharp. The terrain scene starts from exactly that view, so the switch between the two scenes is a 0.75 s cross-fade between two matching images. From there the camera arcs down to the 3D view (2.8 s). Going back, the camera rises to the low orbit (1.9 s), the scenes switch the same way and the globe pulls back to its starting view (2.4 s).
3. **Terrain.** Real data all the way to the horizon, in three nested levels sampled from one continuous surface: each one blends into the next over a strip along its edge, so there is no step and no flat plane where the terrain ends.
   - Local terrain, 7.5 × 9.5 km: the 1 m DEM reduced to 16 m, with HiRISE color and, inside the study area, the most detailed image (1.3 m/px on desktop).
   - Surroundings, 33 × 57 km: the same DEM at 64 m, with the MSL orthophoto.
   - Gale region, 237 km: the HRSC-MOLA DEM with the CTX mosaic. Its edge extends outward until it is lost in the haze.

   Mount Sharp, the crater floor and the rim on the horizon can be seen. The orthophoto and the CTX mosaic are grayscale and are colored with the palette of the HiRISE color mosaic: the color is approximate, not measured, and they are not used in any computation. Inside the study area the probability tints the terrain instead of covering it (what is light stays light and what is dark stays dark), with some emission so it reads the same on shaded slopes. Up close (under ~2 km) a fine grain is added to the color so the ground next to the camera doesn't look smooth. There is a “butterscotch” sky and a dust haze of the same color that thins with height: looking toward the horizon you go through a lot of air and the distant relief merges with the sky; looking down, even from high up, the ground stays clear (at 10 km the haze hides about 7%). Sun from the west-southwest at 32° (as in the HiRISE images).
4. **Lines.** The 50% and 90% contours, the border of the study area and the km ruler (on the south and west edges, ticks every 500 m and numbers every km) are lines laid on the relief with a constant width on screen (`Lineas3D.tsx`): they are as crisp from far away as at ground level. The 50% contour is light and dashed and the 90% one amber, a little thicker than in 2D (1.8 and 2.3 px) and with a dark halo. They used to be painted into the terrain texture, which turned them into blurry stripes up close and showed their labels upside down from the north.
5. **Views.** “3D” (oblique from the south-southwest) and “Top-down” (north up, no rotation: it reads like a plan and it is the only one with a scale). The relief is always the real one.
6. **Labels.** They are HTML and their size doesn't change with distance. The dot sits on a thin post and the text on a fixed side for each site, so they don't overlap. The proposed mission destinations have a dot, the added ones a diamond, and amber marks those above 50%. Curiosity landmarks have a hollow ring and more muted text. The legend explains the two marks (“Destination” and “Landmark”). If two labels still meet on screen (tilted view, distant sites), the one with the highest priority stays (habitat, new destination, selection, destinations at 50% or more, other destinations, landmarks, contour labels, ruler numbers) and the others keep only their mark, which can still be tapped. From afar they simplify: from about 13 km away the names go (destinations keep their id and percentage, landmarks only their ring) and so do the contour and ruler labels; from about 30 km only a single “Study area” label and the border of the area remain.
7. **Mission destinations (person 3's decision).** The plan starts with six proposed destinations (M1–M6: Northern hills, Western sand field, Pale ridge, Northeast plain, Southern fractured ground and Eastern scarp), chosen on the DEM and the HiRISE image so that some are reachable on sol 1 and others only later or never within 30 sols. They are a team proposal, not Curiosity sites, and they can be removed. To add one, the panel asks for a point with “Add destination on the map”. The map shows the “Tap the point for the new destination” bar, with a crosshair cursor; hovering shows the probability, and “Cancel” or Esc go back. The chosen point is marked with a hollow pink diamond, “New destination · name it in the panel”. When saved it appears as P1, P2… and its info card shows the planned tasks, the route and the trip.

## Motion

- The reachable area grows when the sol changes (550 ms, ease-in-out).
- **Camera, what the user does** (anchored to the ground, as on a map; `src/lib/mapa3d/control.ts`):
  - Dragging moves the map: the grabbed point of the ground stays under the cursor or finger and, on release, the map glides on with inertia that dies out in a fraction of a second (time constant 0.24 s).
  - The wheel or a pinch zoom toward what is under the cursor, which stays in place (each step is spread over a few frames, 0.085 s).
  - The right button, or dragging with Shift, Alt, Ctrl or ⌘ held down, rotates and tilts around the ground point at the center of the view (dragging up tilts toward the horizon).
  - On touch: one finger moves, a pinch zooms, twisting two fingers changes the heading and moving two fingers up or down tilts.
  - In top-down there is no rotation or tilt: north stays up.
  - Keys: + and − zoom, 0 reframes the study area, C switches between 3D and top-down, the arrows pick a point of the grid and Esc closes the info card (or cancels picking a point).
  - Limits: down to 180 m, tilt up to 86° (almost the horizon) and zoom out to 70 km. The camera stays at least 45 m above the relief and never goes through it. The look-at point is always the ground point at the center of the view, and it can travel across the whole surroundings. No bounce.
- **Camera, automatic moves** are fixed-duration flights: arrival from the low orbit 2.8 s, return up to it 1.9 s, view change 0.95 s, return to the initial framing (0 key or rotating the screen) 0.7 s, going to a destination tapped in the panel 1.1 s (it moves closer without changing heading and selects it). From the globe to the terrain, about 5.4 s in total (2.6 s down to the low orbit and 2.8 s in an arc down to the 3D view). They interpolate in spherical coordinates around the look-at point, so the camera traces an arc, rotates the short way round and the distance changes on a logarithmic scale. They start and stop with zero acceleration (smootherstep). Any gesture interrupts them, except during the arrival and the return, when gestures are off.
- **Globe:** damped rotation and zoom, slower the closer you are.
- Labels are hidden during the arrival and appear with a 0.6 s fade as the camera lands. Between the globe and the terrain there is no fade to a color: the scenes switch at the low orbit, where both show the same view, with a 0.75 s cross-fade.
- Apart from that, nothing spins, pulses or glows; the compass only follows the camera.
- With `prefers-reduced-motion` there are no flights or descent: it jumps straight there.

## Panel

The panel follows the same style as the map. The shared pieces are in `src/components/panel/comun.tsx`: `CIFRA`, the text and border colors, `Seccion`, `Deslizador`, `Despliegue`, `Casilla`, `MarcaDestino` and `Chevron`. Texts and number formats (decimal comma in Spanish, point in English) come from `useIdioma()` in `src/lib/i18n.ts`.

- **Structure:** a solid column (`#0a0f1f`) that reads from top to bottom in three blocks separated by a 1 px border: what it is (header), the walk being defined (three questions) and what the model answers for the mission destinations. Each question has a title (15 px, weight 500), the current answer on the right, a help line that says what it changes on the map, and its control. Margins and layout follow the width of the panel itself, not of the window.
- **Header:** “Walk plan”, with a small strip of the viridis scale, and “The map's color is the round-trip probability for this walk.”
- **“Which sol?”:** slider from 1 to 30 with − and + buttons at the sides to go one sol at a time; on the right, “sol 12 / 30” with the number in large type.
- **“Who goes out?”:** the eight profiles are always in view (two columns, four when the panel is wide), each one a toggle with its id, surname and a square check box. A tap adds or removes a person (at least one always goes out); on the right, “1 person”, “Pair” or “Group of n”. Under each profile, a bar with how far that person can go and return on flat ground that sol (layer 3 with the central values, on a 0–4 km scale; it is not the map's probability). With several people a tick marks the group's reach, and the line below says who limits it: “Reach today on flat ground · limited by …”. “Profiles” opens each profile's card: role, archetype, pre-flight VO₂, mass and today's flat-ground reach.
- **“At what pace?”:** slider from 30% to 50% in steps of 5, with “easy” and “hard” at the ends; on the right, “35% of their aerobic capacity”.
- **Mission destinations:** one row per destination with the same marker as the map (dot or diamond, amber if ≥ 50%), id, name, distance, elevation (arrow up or down and metres) and round-trip probability. Under each row, a bar in the map's color scale cut at its probability, with a tick at 50% (like the contour). “Round trip”, in the block's header, has a dotted underline: hovering over it, tapping it or reaching it with the keyboard explains what it means. While a new walk is being computed, the figures dim. Landmarks T1–T6 don't appear. Tapping a row expands its context, its planned tasks and “Remove from mission”, marks it as active (pink line on the left, as the selection on the map) and flies the map to that destination, which is selected. It also works the other way: tapping a mission destination on the map expands its row and brings it into view. “Add destination on the map” is a dashed button with a pink cross. While the point is being picked, the block has a pink border on the left.
- **Computation status:** only while computing, a 2 px bar along the top edge of the panel (for screen readers, “Computing scenario”). It takes up no space, so nothing moves when dragging a slider. Dragging a slider doesn't pile up computations: only the last value is computed.
- **Sliders:** thin track, light fill, ticks aligned with the center of the handle (16 × 24 px, white) and a pink ring on focus.
- **Footer:** data credits and “NASA Space Apps Challenge 2026 · Madrid”.

## Forbidden

So that it doesn't look like a generic AI-made interface:

- Inter or Roboto. Monospace only for numbers, never for text.
- Purple or blue-purple gradients, and gradient text.
- `backdrop-blur`, translucent glass-style panels and pills (`rounded-full`) on buttons or labels.
- Letter-spaced capitals for labels, decorative icons and emojis.
- Decorative glows, pulses or rotations; grain; HUD corner brackets.
- More than one accent: amber is the only color that means “within reach”.
- Text that doesn't answer the map's question (development notices, section titles, long explanations).
- The word “safe” or “safe zone”. Say “reachable under the stated assumptions”.
- Painting `prob` without going through `src/lib/mapa/geo.ts`, because row 0 is the south.

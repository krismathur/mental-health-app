# CITY MISSIONS

A real-time 3D open-world vertical slice. You live on Maple Rise in the Bayline
District, your team is in the Fulton Cup final tonight, and the fifteen minutes
between waking up and tip-off do not go to plan.

Mental strength is tracked underneath all of it, and it is never mentioned to
the player while they are playing.

## Running it

```bash
npm start                                   # from the repository root
open http://localhost:3000/pressure-zone/index.html
```

Nothing is downloaded at runtime. Three.js is vendored into `vendor/` and
resolved by the import map in `index.html`. Every texture, mesh and sound is
generated in the browser at load.

```bash
npm --prefix public/pressure-zone run check  # headless logic tests
```

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move |
| Mouse | Look (click the canvas to lock the pointer) |
| `Q` / `E` | Turn the camera without a mouse |
| `Shift` | Sprint |
| `Space` | Jump, or brake in a vehicle |
| `E` | Talk, pick up, use |
| `F` | Get on or off a bike, board or car |
| Hold left mouse (or `J`) | Load a shot, release to fire |
| `G` | Pass to a teammate |
| `M` | Map |
| `Esc` | Pause and profile |

On a touch screen the left half of the display drives movement, the right half
turns the camera, and the buttons on the right handle interact, shoot and run.

## How it is built

| File | Responsibility |
| --- | --- |
| `game.js` | Renderer, frame loop, interaction layer, story sequencing |
| `world-data.js` | Pure layout data: roads, blocks, buildings, routes, surfaces |
| `city-build.js` | Turns that data into merged and instanced geometry |
| `materials.js` | Procedural colour and normal maps for every surface |
| `sky.js` | Time of day, sun and moon, weather, fog, post-processing |
| `character.js` | Humanoid rig and procedural animation |
| `player.js` | Controller, spring-arm camera, input |
| `vehicles.js` / `traffic.js` | Rideable vehicles and ambient road traffic |
| `npc.js` | Pedestrians, friends, court crowd |
| `basketball.js` | Ball physics, defender, match state, announcer |
| `missions.js` / `mental.js` / `progress.js` | Story, stats, XP and saves |
| `hud.js` / `city.css` / `index.html` | Interface shell |
| `city-check.mjs` | Headless test suite |

`missions.js`, `mental.js`, `progress.js` and `world-data.js` deliberately
import neither the DOM nor Three.js, which is why the whole story can be played
through under Node in the test suite.

## Where the realism comes from

There are no purchased 3D assets here, so the look is carried by technique
rather than by art budget:

- **Surface relief.** Every texture is generated together with a normal map
  derived from the same height field, so asphalt, brick and grass catch the
  sun instead of reading as flat colour.
- **One clock drives everything.** The sun arc, sky gradient, fog colour,
  star fade, window glow, street lights and traffic headlights all read from
  the same hour value.
- **Real reflections.** A PMREM environment map is regenerated from the live
  sky twice a second, so car paint, glass and wet roads reflect the actual
  time of day.
- **Wet roads.** Rain drops road roughness and raises environment intensity,
  which is what makes a street look wet rather than just darker.
- **Human proportions.** Characters are built at roughly 7.5 head-heights with
  jointed limbs and procedural gait. No oversized heads, no stubby arms.
- **Camera language.** A collision-aware spring arm with run bob, a field of
  view push when sprinting and framed cinematic shots on story beats.

Performance comes from merging static geometry per material, instancing trees
and windows, swapping pedestrians to a cheaper rig at distance, culling traffic
beyond the fog, and keeping only six real street lights alive around the player.

## The first fifteen minutes

1. **Morning.** Wake up, walk out of your room, meet Mara on the street.
2. **Get your reps in.** Cross the district to Fulton Court and make five.
3. **The jersey run.** Three minutes to reach the corner store before it shuts.
4. **The long way.** The storm lands early and your chain snaps. Pick a route.
5. **Before tip-off.** Help Dev warm up, run your own drill, or gather the team.
6. **The Fulton Cup Final.** Riverside go up 8-0 before you touch the ball.

## The mental strength system

Six traits: resilience, focus, confidence, courage, adaptability and teamwork.
They only move in response to something the player actually did.

| What you did | What it moves |
| --- | --- |
| Ran it back after losing the final | Resilience |
| Delivered before the shutters came down | Focus |
| Scored with the game on the line | Confidence |
| Took the alley you had never used | Courage |
| Found another route when the bike died | Adaptability |
| Rebounded for Dev instead of your own drill | Teamwork |

Growth slows as a trait gets high, so the first hour feels quick and mastery
takes real play. The combined value of focus, confidence and resilience becomes
**composure**, which quietly offsets pressure when you shoot late in a close
game. That is the only place the system touches the difficulty, and the player
is never told about it.

There are no quizzes, no pop-up lessons and no reflection prompts. The stat
readout lives on the pause screen, phrased as observations rather than advice.
Progression has no currency, no randomised rewards and no loot boxes: every
unlock is listed with the exact level it arrives at.

## Extending it

- **A new district**: add blocks and roads to `BLOCKS` and `ROADS` in
  `world-data.js`. The builder, traffic, pedestrians, map and surface lookups
  all read from that one description.
- **A new vehicle**: add an entry to `VEHICLE_SPECS` and a mesh builder in
  `vehicles.js`, then unlock it from `UNLOCKS` in `progress.js`.
- **A new mission**: append to `MISSIONS` in `missions.js` using the existing
  step types (`goto`, `talk`, `drill`, `collect`, `ride`, `choice`, `match`,
  `scripted`) and point the previous mission's `next` at it.
- **A new behaviour**: add it to `BEHAVIOURS` in `mental.js` and report it from
  wherever the player earns it.
- **Real art**: every mesh builder is isolated. Swap the body of
  `createCharacter`, `buildCarMesh` or `CityBuilder.buildBuildings` for loaded
  glTF and the rest of the game is unaffected.

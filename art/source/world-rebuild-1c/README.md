# WORLD.REBUILD.1-C — NPC population bootstrap

This folder documents the roster integration for the active `WorldScene` in `src/world-rebuild-scene.js`.

## Current runtime

- New, isolated save key: `world-rebuild-1c-v1`.
- Population is seeded once by `src/world-rebuild-population.js`; existing legacy save keys and backups are not used to restore NPCs into this scene.
- The roster contains exactly 108 stable `population:v1:*` IDs in 12 role groups. NPC visual style IDs are persisted so appearance does not reroll after reload.
- NPC sprites use the existing reusable appearance sheets. Spawns are distributed among `city`, `south-suburb`, `sect`, and `forest-outer`, checked against the current map collision geometry.
- The scene ticks the existing autonomous simulation and routes visible NPCs on the map navigation grid. City guards follow patrol points.
- The new-world authority profile reuses a roster member for the city master, keeping this world at 108 NPCs. Other legacy authority-system tests retain their original 109-NPC contract.
- `CityLawSystem` records duplicate-safe city combat incidents, exempts authorized duels and retaliation/self-defense, adds notoriety/grudges, dispatches nearby guards without teleportation, optionally alerts the city master for a severe high-realm threat, and persists response/containment state.

## Verification artifacts

Run `npm run build`, `npm run test:systems`, and `node tests/world-rebuild-1c-browser.mjs` (the browser script expects the local Vite server on port 5175).

Browser screenshots and machine-readable evidence are written under `art/previews/world-rebuild-1c/`; `roster.json` contains the full stable roster and `verification.json` contains runtime observations.

## Known scope limits

This integration makes the population visible and active in the current map; it does not finish every profession's gameplay loop. NPCs travel to work markers and the simulation changes their role/state, but tavern service, quest acceptance/completion, hunter-versus-monster combat, spatial herb harvesting, and repair commissions are not all connected to this new isolated runtime. There is no normal player combat control in this map scene yet: city law can be triggered through the scene's `reportCombat` integration API and is exercised by the browser test. The current city terrain also retains the existing repeated grey ground tiles. These are follow-up work, not verified features of this population bootstrap.

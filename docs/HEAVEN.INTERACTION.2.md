# HEAVEN.INTERACTION.2 — 2026-11-23

Implemented NPC card with equally prominent Ban tặng / Nhập thân actions. Selecting an NPC does not possess it. Gift panel pins the recipient ID and closes when selection changes. Shared HUD uses the existing heaven.divinePower and unchanged catalog/possession prices. Owned items transfer for no extra fee. Each action transfers one item, matching the existing one-per-kind vault purchase rule.

Atomic purchase-and-gift reuses the existing purchase/transfer reducers on a staged ledger and inventory. Commit saves once and restores balance, ownership and inventory if persistence fails or throws. Transaction IDs reject replay. UI suppresses repeated activation for 650ms. Dead/ascended/foreign recipients and malformed inventories are rejected. NPC inventory has no slot capacity in the existing model, so a full-bag test is not applicable. No extra inventory/currency or save migration introduced.

Books remain items until learned through the existing possession UI. Rods are not auto-equipped. NPC roster, presets, LOD scheduler, collision, combat and save keys remain unchanged. Wallet checks are constant-time and catalog rendering occurs only on opening, transactions, tab changes or balance changes.

Validation
- TypeScript and Vite build passed.
- All system suites passed, including atomic transfer, duplicate ID, dead recipient, insufficient funds and failed/throwing-save rollback.
- Release validator passed for 24 presets, 108 mapping and P09/P24.
- Chrome production preview on port 5183 passed the new interaction test with a separate temporary profile. No user LocalStorage cleared.
- Verified card actions, owned book gift without charge, rod buy-and-gift, repeated click suppression, possession/shared wallet, learning and reload, insufficient funds, 108 NPC and no missing assets or runtime errors.
- Tests drive the real WorldScene and DOM controls via CDP, including diagnostic selection by NPC ID. This does not separately prove mouse hit-testing on each NPC sprite.
- Sent J/E/D input during possession. No assertion of successful combat damage or nearby-loot pickup in this focused run.
- Evidence: art/previews/heaven-interaction/ contains seven screenshots, verification.json and worldscene-gameplay.webm recording gift, purchase and possession.
- Headless SwiftShader with screencast measured about 15.8 FPS (p95 66.7ms) in this run. This is not a comparable hardware FPS benchmark and does not establish a rendering improvement. Simulation LOD tests still pass.

Files
- src/world/HeavenShop.js
- src/world/HeavenShopUI.js
- src/world-rebuild-scene.js
- src/world-rebuild.js
- tests/heaven-shop.test.mjs
- tests/heaven-shop-browser.mjs
- tests/heaven-interaction-browser.mjs

Deployment: prepared for v0.1.8. VPS deployment is not performed or verified from this environment. Release publication is reported separately after Actions completes.

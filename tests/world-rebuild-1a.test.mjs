import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { archiveLegacyWorld, LEGACY_ARCHIVE_KEY, LEGACY_SAVE_KEYS } from '../src/world-rebuild.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const storage = new MemoryStorage();
const legacy = Object.fromEntries(LEGACY_SAVE_KEYS.map((key, i) => [key, JSON.stringify({ world: 'legacy', roster: [`old-${i}`] })]));
for (const [key, value] of Object.entries(legacy)) storage.setItem(key, value);
const first = archiveLegacyWorld(storage);
assert.equal(first.ok, true);
assert.equal(first.alreadyArchived, false);
assert.deepEqual(first.sourceKeys.sort(), [...LEGACY_SAVE_KEYS].sort());
assert.deepEqual(JSON.parse(storage.getItem(LEGACY_ARCHIVE_KEY)).saves, legacy);
for (const [key, value] of Object.entries(legacy)) assert.equal(storage.getItem(key), value, 'archive must not delete source saves');
assert.equal(archiveLegacyWorld(storage).alreadyArchived, true, 'archive is idempotent');

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const entry = await readFile(new URL('../src/world-rebuild.js', import.meta.url), 'utf8');
const scene = await readFile(new URL('../src/world-rebuild-scene.js', import.meta.url), 'utf8');
assert.match(html, /src="\/src\/world-rebuild\.js"/);
assert.doesNotMatch(html, /dao-main\.ts/);
assert.doesNotMatch(entry, /thien-dao-world-v1['"].*getItem|createInitialNPCs|DivineWorldScene/);
assert.match(entry, /world-rebuild-scene\.js/);
assert.doesNotMatch(scene, /dao-main\.ts|QingyunWorldGFX5B5\.tmj|createInitialNPCs|DivineWorldScene/);
assert.match(scene, /world-rebuild-1b\.tmj/);
console.log('WORLD.REBUILD.1-A: legacy saves archive without deletion/restoration; 1B scene entry remains isolated from legacy loader/population.');

import Phaser from 'phaser';
import type { EnvironmentSave, RiverFishSave } from './types';

export type RiverFishSpecies = 'common' | 'spirit';
export type RiverFishDepth = 'surface-near' | 'diving' | 'deep-swim' | 'rising';
type FishRuntime = RiverFishSave & {
  sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse;
  path: { x: number; y: number }[]; speed: number; rng: () => number; lastX: number; lastY: number;
  moved: number; visibleInCamera: boolean; pendingMovement: number;
};
type Cell = { index: number; x: number; y: number; component: number };

const STEP = 8;
const WATER_FIRST_GID = 444;
const WATER_LAST_GID = 507;
const ROCK_GIDS = new Set([492, 493]);
const PHASES: RiverFishDepth[] = ['surface-near', 'diving', 'deep-swim', 'rising'];
const PHASE_DURATIONS: Record<RiverFishDepth, number> = {
  'surface-near': 6300, diving: 700, 'deep-swim': 9300, rising: 700,
};
const hash = (value: string) => { let h = 2166136261; for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619); return h >>> 0; };
const rngFor = (seed: number) => { let n = seed || 1; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; };
const property = (object: any, name: string) => Array.isArray(object.properties) ? object.properties.find((p: any) => p.name === name)?.value : object.properties?.[name];

/** Lives in the main WorldScene and uses its Tiled Water layer as the fish's walkable domain. */
export class WorldRiverFishSystem {
  private originX = 0; private originY = 0; private gridWidth = 0; private gridHeight = 0;
  private passable = new Uint8Array(); private componentAt = new Int32Array();
  private cells: Cell[] = []; private cellsByComponent = new Map<number, Cell[]>(); private fish: FishRuntime[] = [];
  private waterTiles = 0; private componentCount = 0;
  private bridgeRects: { x: number; y: number; right: number; bottom: number }[] = [];

  constructor(private scene: Phaser.Scene, private map: Phaser.Tilemaps.Tilemap, private environment: EnvironmentSave) {
    const layer = map.getLayer('Water');
    if (!layer) throw new Error('WorldScene không có layer Tiled Water');
    const minX = map.width, minY = map.height; let maxX = -1, maxY = -1;
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const gid = layer.data[y]?.[x]?.index ?? -1;
      if (gid >= WATER_FIRST_GID && gid <= WATER_LAST_GID && !ROCK_GIDS.has(gid)) { this.waterTiles++; maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    }
    let left = minX, top = minY;
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const gid = layer.data[y]?.[x]?.index ?? -1;
      if (gid >= WATER_FIRST_GID && gid <= WATER_LAST_GID && !ROCK_GIDS.has(gid)) { left = Math.min(left, x); top = Math.min(top, y); }
    }
    if (!this.waterTiles || maxX < left) throw new Error('Layer Water không chứa nước hợp lệ cho cá');
    this.originX = left * map.tileWidth; this.originY = top * map.tileHeight;
    this.gridWidth = (maxX - left + 1) * map.tileWidth / STEP; this.gridHeight = (maxY - top + 1) * map.tileHeight / STEP;
    this.passable = new Uint8Array(this.gridWidth * this.gridHeight);
    this.componentAt = new Int32Array(this.passable.length); this.componentAt.fill(-1);
    for (const object of map.getObjectLayer('StaticDecor')?.objects ?? []) {
      if (property(object, 'waterBridge') === true || property(object, 'waterBridge') === 'true') {
        this.bridgeRects.push({ x: (object.x ?? 0) - 12, y: (object.y ?? 0) - 12, right: (object.x ?? 0) + (object.width ?? 0) + 12, bottom: (object.y ?? 0) + (object.height ?? 0) + 12 });
      }
    }
    const bodySamples: { x: number; y: number }[] = [];
    for (let y = -12; y <= 12; y += 8) for (let x = -16; x <= 16; x += 8) bodySamples.push({ x, y });
    for (let gy = 0; gy < this.gridHeight; gy++) for (let gx = 0; gx < this.gridWidth; gx++) {
      const index = gy * this.gridWidth + gx, wx = this.originX + (gx + .5) * STEP, wy = this.originY + (gy + .5) * STEP;
      const waterAt = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= map.widthInPixels || y >= map.heightInPixels) return false;
        const gid = layer.data[Math.floor(y / map.tileHeight)]?.[Math.floor(x / map.tileWidth)]?.index ?? -1;
        return gid >= WATER_FIRST_GID && gid <= WATER_LAST_GID && !ROCK_GIDS.has(gid);
      };
      if (bodySamples.every(p => waterAt(wx + p.x, wy + p.y)) && !this.bridgeRects.some(r => wx + 16 > r.x && wx - 16 < r.right && wy + 12 > r.y && wy - 12 < r.bottom)) this.passable[index] = 1;
    }
    this.floodFill();
    this.environment.fish ??= [];
    if (!this.environment.fish.length) this.seedFish();
    this.createSprites();
  }

  private floodFill() {
    const queue = new Int32Array(this.passable.length);
    for (let start = 0; start < this.passable.length; start++) {
      if (!this.passable[start] || this.componentAt[start] >= 0) continue;
      const component = this.componentCount++, indices: number[] = []; let head = 0, tail = 0;
      queue[tail++] = start; this.componentAt[start] = component;
      while (head < tail) {
        const index = queue[head++], x = index % this.gridWidth, y = Math.floor(index / this.gridWidth); indices.push(index);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue;
          const next = ny * this.gridWidth + nx; if (!this.passable[next] || this.componentAt[next] >= 0) continue;
          this.componentAt[next] = component; queue[tail++] = next;
        }
      }
      const cells = indices.map(index => {
        const x = index % this.gridWidth, y = Math.floor(index / this.gridWidth);
        return { index, x, y, component };
      });
      this.cellsByComponent.set(component, cells); this.cells.push(...cells);
    }
  }

  private seedFish() {
    const component = [...this.cellsByComponent.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (!component || component[1].length < 10) return;
    const cells = component[1], targetX = 5440, targetY = 2208, placed: Cell[] = [];
    const candidatePool = cells.filter(c => {
      const x = this.originX + (c.x + .5) * STEP, y = this.originY + (c.y + .5) * STEP;
      return Math.abs(y - targetY) < 720 && Math.abs(x - targetX) < 230;
    }).sort((a, b) => {
      const ax = this.originX + (a.x + .5) * STEP, ay = this.originY + (a.y + .5) * STEP;
      const bx = this.originX + (b.x + .5) * STEP, by = this.originY + (b.y + .5) * STEP;
      return Math.abs(ay - targetY) + Math.abs(ax - targetX) * .35 - Math.abs(by - targetY) - Math.abs(bx - targetX) * .35;
    });
    for (let i = 0; i < 5; i++) {
      const preferredY = targetY + [-430, -230, -30, 250, 470][i];
      const point = candidatePool.find(c => placed.every(p => Math.hypot(p.x - c.x, p.y - c.y) >= 28) && Math.abs(this.originY + (c.y + .5) * STEP - preferredY) < 170) ??
        cells.find(c => placed.every(p => Math.hypot(p.x - c.x, p.y - c.y) >= 28));
      if (!point) continue;
      placed.push(point);
      const seed = hash(`world-river-fish-${i + 1}`), random = rngFor(seed), state: RiverFishSave = {
        id: `world-river-fish:${String(i + 1).padStart(2, '0')}`, species: i === 4 ? 'spirit' : 'common',
        x: this.originX + (point.x + .5) * STEP, y: this.originY + (point.y + .5) * STEP, seed, component: component[0],
        depthState: PHASES[(i * 3) % PHASES.length], phaseMs: Math.floor(random() * PHASE_DURATIONS[PHASES[(i * 3) % PHASES.length]])
      };
      this.environment.fish!.push(state);
    }
  }

  private createSprites() {
    const common = this.scene.anims.exists('world-fish-common-swim'), spirit = this.scene.anims.exists('world-fish-spirit-swim');
    if (!common) this.scene.anims.create({ key: 'world-fish-common-swim', frames: this.scene.anims.generateFrameNumbers('world-fish-common', { start: 0, end: 5 }), frameRate: 1000 / 140, repeat: -1 });
    if (!spirit) this.scene.anims.create({ key: 'world-fish-spirit-swim', frames: this.scene.anims.generateFrameNumbers('world-fish-spirit', { start: 0, end: 5 }), frameRate: 1000 / 180, repeat: -1 });
    for (const saved of this.environment.fish ?? []) {
      if (saved.caughtBy) continue;
      let cell = this.cellAt(saved.x, saved.y);
      if (cell < 0 || this.componentAt[cell] !== saved.component) {
        const candidate = this.cells.filter(c => c.component === saved.component).sort((a, b) => this.cellDistance(a, saved.x, saved.y) - this.cellDistance(b, saved.x, saved.y))[0];
        if (!candidate) { saved.invalidReason = 'saved-position-outside-water-region'; continue; }
        saved.x = this.originX + (candidate.x + .5) * STEP; saved.y = this.originY + (candidate.y + .5) * STEP; cell = candidate.index;
      }
      const seed = saved.seed >>> 0, random = rngFor(seed), texture = saved.species === 'common' ? 'world-fish-common' : 'world-fish-spirit';
      const shadow = this.scene.add.ellipse(saved.x, saved.y + 2, 23, 6, 0x102d32, .2).setDepth(1.26);
      const sprite = this.scene.add.sprite(saved.x, saved.y, texture, 0).setDepth(1.27).setName(saved.id);
      sprite.setData('fishId', saved.id); sprite.play(saved.species === 'common' ? 'world-fish-common-swim' : 'world-fish-spirit-swim');
      const runtime: FishRuntime = { ...saved, sprite, shadow, path: [], speed: (saved.species === 'common' ? 24 : 18) + random() * 6, rng: random, lastX: saved.x, lastY: saved.y, moved: 0, visibleInCamera: false, pendingMovement: 0 };
      if (Number.isFinite(saved.targetX) && Number.isFinite(saved.targetY)) this.planTo(runtime, saved.targetX!, saved.targetY!);
      else this.planNext(runtime, true);
      this.fish.push(runtime); this.applyDepth(runtime);
    }
  }

  private cellAt(x: number, y: number) {
    if (x < this.originX || y < this.originY) return -1;
    const gx = Math.floor((x - this.originX) / STEP), gy = Math.floor((y - this.originY) / STEP), i = gy * this.gridWidth + gx;
    return gx < 0 || gy < 0 || gx >= this.gridWidth || gy >= this.gridHeight || !this.passable[i] ? -1 : i;
  }
  waterComponent(x: number, y: number) {
    const cell = this.cellAt(x, y);
    return cell < 0 ? -1 : this.componentAt[cell];
  }

  isWaterTile(x: number, y: number) {
    const gid = this.map.getLayer('Water')?.data[Math.floor(y / this.map.tileHeight)]?.[Math.floor(x / this.map.tileWidth)]?.index ?? -1;
    return gid >= WATER_FIRST_GID && gid <= WATER_LAST_GID && !ROCK_GIDS.has(gid);
  }

  fishNearHook(x: number, y: number, component: number) {
    return this.fish.filter(fish => fish.component === component && Math.hypot(x - fish.x, y - fish.y) <= 90)
      .sort((a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y))[0]?.id;
  }

  catchFish(id: string, npcId: string, commit: (species: RiverFishSpecies) => boolean) {
    const index = this.fish.findIndex(fish => fish.id === id);
    const saved = this.environment.fish?.find(fish => fish.id === id);
    if (index < 0 || !saved || saved.caughtBy) return null;
    saved.caughtBy = npcId;
    if (!commit(saved.species)) {
      delete saved.caughtBy;
      return null;
    }
    const [fish] = this.fish.splice(index, 1);
    fish.sprite.destroy();
    fish.shadow.destroy();
    return saved.species;
  }
  private cellDistance(cell: Cell, x: number, y: number) { return Math.hypot(this.originX + (cell.x + .5) * STEP - x, this.originY + (cell.y + .5) * STEP - y); }
  private planTo(fish: FishRuntime, x: number, y: number) {
    const start = this.cellAt(fish.x, fish.y), goal = this.cellAt(x, y);
    if (start < 0 || goal < 0 || this.componentAt[start] !== fish.component || this.componentAt[goal] !== fish.component) return false;
    const previous = new Int32Array(this.passable.length); previous.fill(-1); const queue = new Int32Array(this.passable.length); let head = 0, tail = 0;
    previous[start] = start; queue[tail++] = start;
    while (head < tail && previous[goal] < 0) {
      const at = queue[head++], gx = at % this.gridWidth, gy = Math.floor(at / this.gridWidth);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue;
        const next = ny * this.gridWidth + nx; if (!this.passable[next] || this.componentAt[next] !== fish.component || previous[next] >= 0) continue;
        previous[next] = at; queue[tail++] = next; if (next === goal) break;
      }
    }
    if (previous[goal] < 0) return false;
    const path: number[] = []; for (let at = goal; at !== start; at = previous[at]) path.push(at); path.reverse();
    fish.path = path.map(i => ({ x: this.originX + (i % this.gridWidth + .5) * STEP, y: this.originY + (Math.floor(i / this.gridWidth) + .5) * STEP }));
    fish.targetX = x; fish.targetY = y; return true;
  }
  private planNext(fish: FishRuntime, initial = false) {
    const start = this.cellAt(fish.x, fish.y); if (start < 0) return;
    const here = this.cells.find(c => c.index === start); if (!here) return;
    const pool = (this.cellsByComponent.get(fish.component) ?? []).filter(c => c.index !== start && Math.hypot(c.x - here.x, c.y - here.y) >= (initial ? 6 : 10) && Math.hypot(c.x - here.x, c.y - here.y) <= 32);
    for (let attempt = 0; attempt < 18 && pool.length; attempt++) {
      const target = pool[Math.floor(fish.rng() * pool.length)], x = this.originX + (target.x + .5) * STEP, y = this.originY + (target.y + .5) * STEP;
      if (this.planTo(fish, x, y) && fish.path.length > 4) return;
    }
    fish.path = []; fish.targetX = undefined; fish.targetY = undefined;
  }

  private nextPhase(fish: FishRuntime) {
    const index = PHASES.indexOf(fish.depthState); fish.depthState = PHASES[(index + 1) % PHASES.length]; fish.phaseMs = 0;
  }
  private applyDepth(fish: FishRuntime, inView = true) {
    const d = Math.min(1, fish.phaseMs / PHASE_DURATIONS[fish.depthState]); let alpha = .82, tint = 0xc4dfd2, shadow = .22;
    if (fish.depthState === 'diving') { alpha = .82 - .72 * d; tint = 0x7d9b9e; shadow = .18 - .13 * d; }
    else if (fish.depthState === 'deep-swim') { alpha = .10; tint = 0x55747d; shadow = .035; }
    else if (fish.depthState === 'rising') { alpha = .10 + .72 * d; tint = 0x93bfbd; shadow = .035 + .18 * d; }
    fish.sprite.setAlpha(alpha).setTint(tint).setDepth(1.27); fish.shadow.setPosition(fish.sprite.x, fish.sprite.y + 2).setAlpha(shadow);
    const surfaced = inView && (fish.depthState === 'surface-near' || fish.depthState === 'diving');
    fish.sprite.setVisible(surfaced);
    fish.shadow.setVisible(surfaced);
  }
  private move(fish: FishRuntime, dt: number) {
    const oldX = fish.x, oldY = fish.y;
    if (!fish.path.length) this.planNext(fish);
    const target = fish.path[0];
    if (target) {
      const dx = target.x - fish.x, dy = target.y - fish.y, distance = Math.hypot(dx, dy), step = fish.speed * dt;
      if (distance <= step + .2) { fish.x = target.x; fish.y = target.y; fish.path.shift(); }
      else { fish.x += dx / distance * step; fish.y += dy / distance * step; if (Math.abs(dx) > 1) fish.sprite.setFlipX(dx < 0); }
    }
    const cell = this.cellAt(fish.x, fish.y);
    if (cell < 0 || this.componentAt[cell] !== fish.component) {
      fish.x = fish.lastX; fish.y = fish.lastY; fish.path = []; fish.targetX = undefined; fish.targetY = undefined; this.planNext(fish);
    } else { fish.lastX = fish.x; fish.lastY = fish.y; }
    fish.sprite.setPosition(fish.x, fish.y); fish.moved += Math.hypot(fish.x - oldX, fish.y - oldY); fish.shadow.setPosition(fish.x, fish.y + 2);
  }

  update(delta: number, camera: Phaser.Cameras.Scene2D.Camera) {
    const dt = Math.min(Math.max(delta, 0), 60);
    const view = camera.worldView;
    for (const fish of this.fish) {
      const near = fish.x >= view.x - 64 && fish.x <= view.right + 64 &&
        fish.y >= view.y - 64 && fish.y <= view.bottom + 64;
      fish.phaseMs += dt;
      if (fish.phaseMs >= PHASE_DURATIONS[fish.depthState]) this.nextPhase(fish);
      fish.pendingMovement += dt;
      if (near || fish.pendingMovement >= 145 + fish.seed % 66) {
        while (fish.pendingMovement > 0) {
          const step = Math.min(fish.pendingMovement, 60);
          this.move(fish, step / 1000);
          fish.pendingMovement -= step;
        }
      }
      if (near) this.applyDepth(fish);
      else if (fish.visibleInCamera || fish.sprite.visible || !fish.sprite.anims.isPaused) {
        this.applyDepth(fish, false);
        fish.sprite.anims.pause();
      }
      if (near && !fish.visibleInCamera) fish.sprite.anims.resume();
      fish.visibleInCamera = near;
    }
  }

  flushSave() {
    const saved = this.environment.fish ?? [];
    for (const fish of this.fish) {
      const record = saved.find(record => record.id === fish.id);
      if (!record) continue;
      record.x = fish.x; record.y = fish.y; record.depthState = fish.depthState;
      record.phaseMs = Math.round(fish.phaseMs); record.targetX = fish.targetX; record.targetY = fish.targetY;
    }
  }

  get visibleCount() { return this.fish.filter(fish => fish.sprite.visible).length; }

  getState(camera: Phaser.Cameras.Scene2D.Camera) {
    return { count: (this.environment.fish ?? []).length, living: this.fish.length, common: this.fish.filter(f => f.species === 'common').length, spirit: this.fish.filter(f => f.species === 'spirit').length,
      waterTiles: this.waterTiles, safeWaterCells: this.cells.length, waterRegions: this.componentCount, bridgeRegionsExcluded: this.bridgeRects.length,
      records: this.fish.map(f => ({ id: f.id, species: f.species, x: +f.x.toFixed(1), y: +f.y.toFixed(1), depthState: f.depthState, phaseMs: Math.round(f.phaseMs), alpha: +f.sprite.alpha.toFixed(2), moving: f.path.length > 0, remainingWaypoints: f.path.length, component: f.component, inCamera: camera.worldView.contains(f.x, f.y), spriteVisible: f.sprite.visible, shadowAlpha: +f.shadow.alpha.toFixed(2), invalidPosition: this.cellAt(f.x, f.y) < 0 })) };
  }
  get closestFishPosition() { return this.fish.length ? { x: this.fish.reduce((sum, fish) => sum + fish.x, 0) / this.fish.length, y: this.fish.reduce((sum, fish) => sum + fish.y, 0) / this.fish.length } : null; }
}

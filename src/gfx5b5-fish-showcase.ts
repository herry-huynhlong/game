import Phaser from 'phaser';

type WaterKind = 'river_south' | 'river_east' | 'stream_south' | 'rock_foam' | 'lake_ripple';
type DepthState = 'surface-near' | 'diving' | 'deep-swim' | 'rising';
type WaterEffect = { sprite: Phaser.GameObjects.Sprite; kind: WaterKind; phase: number; period: number; lastFrame: number };
type NavCell = { index: number; x: number; y: number; component: number; depth: 'shallow' | 'deep'; bankDistance: number };
type Swimmer = {
  id: string; species: 'common' | 'spirit'; sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse;
  seed: number; rng: () => number; component: number; phase: DepthState; phaseTime: number; phaseDuration: number;
  speed: number; targetPath: { x: number; y: number }[]; targetLabel: string; dwell: number; cycle: number;
  flip: number; depthTier: 'shallow' | 'deep'; nearestBank: number; bodyValid: boolean; distanceMoved: number;
  lastX: number; lastY: number; maxStep: number;
};
const GRID = 8;
const ROCK_GIDS = new Set([306, 307]); // GFX5B5WaterTiles local rock tiles (water atlas GIDs).
const MOTION: Record<WaterKind, { start: number; length: number; period: number }> = {
  river_south: { start: 0, length: 8, period: 150 }, river_east: { start: 8, length: 8, period: 145 },
  stream_south: { start: 16, length: 8, period: 190 }, rock_foam: { start: 24, length: 8, period: 145 }, lake_ripple: { start: 32, length: 8, period: 220 },
};
const property = (o: any, k: string) => Array.isArray(o.properties) ? o.properties.find((p: any) => p.name === k)?.value : o.properties?.[k]?.value;
const hashSeed = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const seeded = (seed: number) => { let state = seed || 0x6d2b79f5; return () => { state = (state + 0x6d2b79f5) | 0; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

class FishShowcase extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private effects: WaterEffect[] = [];
  private swimmers: Swimmer[] = [];
  private waterCells!: Uint8Array;
  private rockCells!: Uint8Array;
  private bankDistance!: Uint8Array;
  private finePassable!: Uint8Array;
  private fineComponent!: Int32Array;
  private fineCells: NavCell[] = [];
  private cellByIndex: (NavCell | undefined)[] = [];
  private cellsByComponent = new Map<number, NavCell[]>();
  private gridWidth = 0;
  private gridHeight = 0;
  private componentCount = 0;
  private waterTileCount = 0;
  private waterGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private debugPanel!: Phaser.GameObjects.Text;
  private debug = false;
  private simScale = 1;
  private simulationClock = 0;
  private statusClock = 0;
  private offBank = false;
  private bridge?: Phaser.GameObjects.Image;
  private surfaceRipples: { shape: Phaser.GameObjects.Arc; life: number; duration: number }[] = [];

  constructor() { super('gfx5b5-fish-showcase'); }

  preload() {
    this.load.tilemapTiledJSON('fish-water-trial', '/maps/gfx5b5/QingyunWaterTrial.tmj');
    this.load.image('fish-terrain', '/assets/tilesets/gfx5b5_area_terrain.png');
    this.load.image('fish-water-tiles', '/assets/tilesets/gfx5b5_water_tiles.png');
    this.load.spritesheet('fish-water-motion', '/assets/effects/gfx5b5_water_motion.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('fish-props', '/assets/props/gfx5b5_area_props.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('fish-common', '/assets/fauna/fish/FishCommon.png', { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet('fish-spirit', '/assets/fauna/fish/FishSpirit.png', { frameWidth: 40, frameHeight: 32 });
    this.load.on('loaderror', (f: Phaser.Loader.File) => { document.documentElement.dataset.fishLoadError = `${f.key}: ${f.src}`; });
  }

  create() {
    this.map = this.make.tilemap({ key: 'fish-water-trial' });
    const terrain = this.map.addTilesetImage('GFX5B5AreaTerrain', 'fish-terrain', 32, 32, 0, 0);
    const water = this.map.addTilesetImage('GFX5B5WaterTiles', 'fish-water-tiles', 32, 32, 0, 0);
    if (!terrain || !water) throw Error('Thiếu tileset sông thử nghiệm');
    const tilesets = [terrain, water];
    for (const [name, depth] of [['Ground', 0], ['Water', 2], ['Shore', 4], ['Details', 6]] as const) this.map.createLayer(name, tilesets, 0, 0)?.setDepth(depth);
    this.buildWaterGrid();

    // The bridge is drawn after the fish by world depth so a swimmer passes underneath its deck.
    for (const o of this.map.getObjectLayer('Decor')?.objects ?? []) {
      if (property(o, 'frame') === 'wooden_bridge') {
        const w = o.width ?? 128, h = o.height ?? 128;
        this.bridge = this.add.image((o.x ?? 0) + w / 2, (o.y ?? 0) + h / 2, 'fish-props', Number(property(o, 'frameIndex') ?? 0)).setDisplaySize(w, h).setDepth((o.y ?? 0) + h + 4);
      }
    }
    for (const o of this.map.getObjectLayer('FlowEffects')?.objects ?? []) {
      const kind = property(o, 'kind') as WaterKind | undefined;
      const motion = kind ? MOTION[kind] : undefined;
      if (!kind || !motion) continue;
      const phase = Number(property(o, 'phase') ?? 0) % motion.length;
      const frame = motion.start + phase;
      const sprite = this.add.sprite(o.x ?? 0, o.y ?? 0, 'fish-water-motion', frame).setDepth((o.y ?? 0) + 12).setAlpha(.74);
      this.effects.push({ sprite, kind, phase, period: Number(property(o, 'period') ?? motion.period), lastFrame: frame });
    }
    this.anims.create({ key: 'fish-common-swim', frames: this.anims.generateFrameNumbers('fish-common', { start: 0, end: 5 }), frameRate: 1000 / 140, repeat: -1 });
    this.anims.create({ key: 'fish-spirit-swim', frames: this.anims.generateFrameNumbers('fish-spirit', { start: 0, end: 5 }), frameRate: 1000 / 180, repeat: -1 });

    // Starts are hand-selected in connected water. Seeds give each fish its own routes and depth rhythm.
    this.addSwimmer('common-01', 'common', 568, 304, 'surface-near', 0);
    this.addSwimmer('common-02', 'common', 568, 400, 'diving', .6);
    this.addSwimmer('spirit-01', 'spirit', 624, 304, 'rising', 1.1);
    this.addSwimmer('spirit-02', 'spirit', 624, 400, 'deep-swim', 2.8);

    this.waterGraphics = this.add.graphics().setDepth(1_000_000);
    this.pathGraphics = this.add.graphics().setDepth(1_000_010);
    this.status = this.add.text(16, 92, '', { fontFamily: 'monospace', fontSize: '12px', color: '#edebd1', backgroundColor: '#14272ddd', padding: { x: 8, y: 6 }, lineSpacing: 3 }).setScrollFactor(0).setDepth(2_000_000);
    this.debugPanel = this.add.text(16, 142, '', { fontFamily: 'monospace', fontSize: '12px', color: '#cce8d8', backgroundColor: '#14272ddd', padding: { x: 8, y: 6 }, lineSpacing: 3 }).setScrollFactor(0).setDepth(2_000_001).setVisible(false);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels).centerOn(600, 352).setZoom(2).roundPixels = true;
    this.bindControls();
    document.documentElement.dataset.fishReady = 'true';
    this.refreshTelemetry();
    this.addSwimmerStateLabels();
  }

  private buildWaterGrid() {
    const layer = this.map.getLayer('Water');
    if (!layer) throw Error('Thiếu layer Water');
    const cols = this.map.width, rows = this.map.height, total = cols * rows;
    this.waterCells = new Uint8Array(total); this.rockCells = new Uint8Array(total); this.bankDistance = new Uint8Array(total); this.bankDistance.fill(255);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const gid = layer.data[y]?.[x]?.index ?? -1, i = y * cols + x;
      if (gid >= 257 && gid <= 320) { this.waterCells[i] = 1; if (ROCK_GIDS.has(gid)) this.rockCells[i] = 1; else this.waterTileCount++; }
    }
    // Infer depth once from the connected map geometry: distance to a bank, not a hand-drawn river rectangle.
    const tileQueue: number[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!this.tileWater(x, y)) continue;
      const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1 || !this.tileWater(x - 1, y) || !this.tileWater(x + 1, y) || !this.tileWater(x, y - 1) || !this.tileWater(x, y + 1);
      if (edge) { this.bankDistance[i] = 0; tileQueue.push(i); }
    }
    for (let q = 0; q < tileQueue.length; q++) {
      const i = tileQueue[q], x = i % cols, y = Math.floor(i / cols), nextDepth = this.bankDistance[i] + 1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || !this.tileWater(nx, ny)) continue;
        const ni = ny * cols + nx;
        if (this.bankDistance[ni] > nextDepth) { this.bankDistance[ni] = nextDepth; tileQueue.push(ni); }
      }
    }
    this.gridWidth = cols * this.map.tileWidth / GRID; this.gridHeight = rows * this.map.tileHeight / GRID;
    const n = this.gridWidth * this.gridHeight;
    this.finePassable = new Uint8Array(n); this.fineComponent = new Int32Array(n); this.fineComponent.fill(-1); this.cellByIndex = new Array(n);
    // This sampled ellipse approximates the visible 40x32 fish silhouette. Every sample must be water.
    const footprint: { x: number; y: number }[] = [];
    for (let y = -12; y <= 12; y += 4) { const width = 18 * Math.sqrt(Math.max(0, 1 - y * y / 144)); for (let x = -Math.floor(width); x <= Math.floor(width); x += 4) footprint.push({ x, y }); }
    for (let gy = 0; gy < this.gridHeight; gy++) for (let gx = 0; gx < this.gridWidth; gx++) {
      const x = (gx + .5) * GRID, y = (gy + .5) * GRID;
      if (footprint.every(p => this.tileWaterAtPixel(x + p.x, y + p.y))) this.finePassable[gy * this.gridWidth + gx] = 1;
    }
    // Flood-fill the fish-safe water cells; isolated ponds remain separate components.
    const queue = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      if (!this.finePassable[i] || this.fineComponent[i] >= 0) continue;
      const region = this.componentCount++, indices: number[] = []; let head = 0, tail = 0;
      queue[tail++] = i; this.fineComponent[i] = region;
      while (head < tail) {
        const at = queue[head++], x = at % this.gridWidth, y = Math.floor(at / this.gridWidth); indices.push(at);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue;
          const ni = ny * this.gridWidth + nx; if (this.finePassable[ni] && this.fineComponent[ni] < 0) { this.fineComponent[ni] = region; queue[tail++] = ni; }
        }
      }
      const cells = indices.map(index => {
        const x = index % this.gridWidth, y = Math.floor(index / this.gridWidth);
        const tx = Math.floor((x + .5) * GRID / this.map.tileWidth), ty = Math.floor((y + .5) * GRID / this.map.tileHeight);
        const bankDistance = this.bankDistance[ty * cols + tx];
        const cell: NavCell = { index, x, y, component: region, depth: bankDistance >= 2 ? 'deep' : 'shallow', bankDistance };
        this.cellByIndex[index] = cell; return cell;
      });
      this.cellsByComponent.set(region, cells); this.fineCells.push(...cells);
    }
  }

  private tileWater(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    const i = y * this.map.width + x; return this.waterCells[i] === 1 && this.rockCells[i] === 0;
  }
  private tileWaterAtPixel(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.map.widthInPixels || y >= this.map.heightInPixels) return false;
    return this.tileWater(Math.floor(x / this.map.tileWidth), Math.floor(y / this.map.tileHeight));
  }
  private cellAt(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.map.widthInPixels || y >= this.map.heightInPixels) return -1;
    const gx = Math.floor(x / GRID), gy = Math.floor(y / GRID), index = gy * this.gridWidth + gx;
    return this.finePassable[index] ? index : -1;
  }

  private findPath(start: number, goal: number, region: number, seed: number) {
    if (start < 0 || goal < 0 || this.fineComponent[start] !== region || this.fineComponent[goal] !== region) return [] as number[];
    const n = this.finePassable.length, previous = new Int32Array(n); previous.fill(-1);
    const queue = new Int32Array(n); let head = 0, tail = 0; queue[tail++] = start; previous[start] = start;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]; const shift = seed % directions.length;
    for (let i = 0; i < shift; i++) directions.push(directions.shift()!);
    while (head < tail && previous[goal] < 0) {
      const index = queue[head++], x = index % this.gridWidth, y = Math.floor(index / this.gridWidth);
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue;
        const next = ny * this.gridWidth + nx;
        if (this.finePassable[next] && this.fineComponent[next] === region && previous[next] < 0) { previous[next] = index; queue[tail++] = next; if (next === goal) break; }
      }
    }
    if (previous[goal] < 0) return [] as number[];
    const result: number[] = []; for (let at = goal; ; at = previous[at]) { result.push(at); if (at === start) break; } result.reverse(); return result;
  }

  private addSwimmer(id: string, species: 'common' | 'spirit', x: number, y: number, phase: DepthState, offset: number) {
    const seed = hashSeed(id), rng = seeded(seed), start = this.cellAt(x, y), component = start >= 0 ? this.fineComponent[start] : -1;
    if (component < 0) throw Error(`Cá ${id} không nằm trọn trong nước (${x},${y})`);
    const cell = this.cellByIndex[start]!; const wx = (cell.x + .5) * GRID, wy = (cell.y + .5) * GRID;
    const texture = species === 'common' ? 'fish-common' : 'fish-spirit';
    const shadow = this.add.ellipse(wx, wy + 2, 26, 7, 0x0c2930, .30).setDepth(wy + 1);
    const sprite = this.add.sprite(wx, wy, texture).setDepth(wy + 3); sprite.play(`fish-${species}-swim`);
    const swimmer: Swimmer = { id, species, sprite, shadow, seed, rng, component, phase, phaseTime: offset * 1000, phaseDuration: this.duration(species, phase, rng), speed: (species === 'common' ? 25 : 17) + rng() * (species === 'common' ? 9 : 6), targetPath: [], targetLabel: '—', dwell: 0, cycle: 0, flip: 1, depthTier: cell.depth, nearestBank: cell.bankDistance, bodyValid: true, distanceMoved: 0, lastX: wx, lastY: wy, maxStep: 0 };
    this.swimmers.push(swimmer); this.planNext(swimmer, true); this.applyDepth(swimmer);
  }
  private duration(species: 'common' | 'spirit', phase: DepthState, rng: () => number) {
    // Exact shared rhythm: hidden underwater for 10s, visible at the surface for 7s.
    // The short transition phases are included in those totals.
    void species; void rng;
    if (phase === 'diving' || phase === 'rising') return 600;
    if (phase === 'deep-swim') return 9400;
    return 6400;
  }

  private planNext(f: Swimmer, initial = false) {
    const start = this.cellAt(f.sprite.x, f.sprite.y), pool = this.cellsByComponent.get(f.component) ?? [];
    if (start < 0 || pool.length < 2) { f.targetPath = []; f.dwell = 700; f.targetLabel = 'chờ vùng nước'; return; }
    const current = this.cellByIndex[start], preferred = f.species === 'common' ? (f.rng() < .68 ? 'shallow' : 'deep') : (f.rng() < .76 ? 'deep' : 'shallow');
    let path: number[] = [];
    for (let attempt = 0; attempt < 18; attempt++) {
      const minX = initial ? 4 : 7, maxX = initial ? 13 : 22, maxY = initial ? 5 : 12;
      const dx = (minX + Math.floor(f.rng() * (maxX - minX + 1))) * (f.rng() < .5 ? -1 : 1);
      const dy = Math.floor((f.rng() * 2 - 1) * maxY);
      const gx = Phaser.Math.Clamp((current?.x ?? 0) + dx, 0, this.gridWidth - 1), gy = Phaser.Math.Clamp((current?.y ?? 0) + dy, 0, this.gridHeight - 1);
      const target = this.cellByIndex[gy * this.gridWidth + gx]; if (!target || target.component !== f.component) continue;
      if (target.depth !== preferred && attempt < 12) continue;
      path = this.findPath(start, target.index, f.component, (f.seed + f.cycle + attempt) >>> 0);
      if (path.length >= 5) { f.targetLabel = `A→B ${path.length} ô · ${target.depth}`; break; }
    }
    if (path.length < 2) {
      const fallback = pool.filter(c => c.index !== start && Math.abs(c.x - (current?.x ?? 0)) < 24);
      for (let k = 0; k < Math.min(12, fallback.length); k++) { const target = fallback[Math.floor(f.rng() * fallback.length)]; path = this.findPath(start, target.index, f.component, f.seed + f.cycle + k); if (path.length > 2) { f.targetLabel = `A→B ${path.length} ô · ${target.depth}`; break; } }
    }
    f.targetPath = path.slice(1).map(i => ({ x: (i % this.gridWidth + .5) * GRID, y: (Math.floor(i / this.gridWidth) + .5) * GRID }));
    f.cycle++; if (!f.targetPath.length) f.dwell = 500 + f.rng() * 700; else if (initial) f.dwell = 0;
  }

  private nextDepth(f: Swimmer) {
    const next: Record<DepthState, DepthState> = { 'surface-near': 'diving', diving: 'deep-swim', 'deep-swim': 'rising', rising: 'surface-near' };
    f.phase = next[f.phase]; f.phaseTime = 0; f.phaseDuration = this.duration(f.species, f.phase, f.rng);
    if (f.phase === 'surface-near' && f.depthTier === 'shallow') this.createRipple(f);
  }
  private createRipple(f: Swimmer) {
    const ring = this.add.circle(f.sprite.x, f.sprite.y, 3, 0x74c3c0, .08).setStrokeStyle(1, 0x9cddcf, .55).setDepth(f.sprite.y + 10);
    this.surfaceRipples.push({ shape: ring, life: 0, duration: 720 });
  }
  private applyDepth(f: Swimmer) {
    const submerged = f.phase === 'diving' || f.phase === 'deep-swim';
    let alpha = submerged ? 0 : .82, tint = submerged ? 0x446c78 : 0xc4dfd2;
    if (f.phase === 'rising') tint = 0x9cc7c2;
    f.sprite.setAlpha(alpha).setTint(tint).setDepth(f.sprite.y + 3);
    f.shadow.setPosition(f.sprite.x, f.sprite.y + 2).setDepth(f.sprite.y + 1).setAlpha(submerged ? 0 : .24);
  }
  private move(f: Swimmer, dt: number) {
    if (f.targetPath.length) {
      const target = f.targetPath[0], dx = target.x - f.sprite.x, dy = target.y - f.sprite.y, d = Math.hypot(dx, dy), step = f.speed * dt;
      if (d <= step + .2) { f.sprite.setPosition(target.x, target.y); f.targetPath.shift(); }
      else { const vx = dx / d, vy = dy / d; f.sprite.x += vx * step; f.sprite.y += vy * step; if (Math.abs(dx) > 1) f.flip = dx < 0 ? -1 : 1; f.sprite.setFlipX(f.flip < 0); }
    } else { f.dwell -= dt * 1000; if (f.dwell <= 0) this.planNext(f); }
    const distance = Math.hypot(f.sprite.x - f.lastX, f.sprite.y - f.lastY); f.distanceMoved += distance; f.maxStep = Math.max(f.maxStep, distance);
    const cellIndex = this.cellAt(f.sprite.x, f.sprite.y); f.bodyValid = cellIndex >= 0 && this.fineComponent[cellIndex] === f.component;
    if (!f.bodyValid) { this.offBank = true; f.sprite.setPosition(f.lastX, f.lastY); f.targetPath = []; this.planNext(f); }
    else { const cell = this.cellByIndex[cellIndex]!; f.depthTier = cell.depth; f.nearestBank = cell.bankDistance; f.lastX = f.sprite.x; f.lastY = f.sprite.y; }
    this.applyDepth(f);
  }
  private updateFish(dt: number) { for (const f of this.swimmers) { f.phaseTime += dt * 1000 * this.simScale; if (f.phaseTime >= f.phaseDuration) this.nextDepth(f); this.move(f, dt * this.simScale); } }

  private drawDebug() {
    const water = this.waterGraphics, paths = this.pathGraphics; water.clear(); paths.clear(); if (!this.debug) return;
    for (const c of this.fineCells) { water.fillStyle(c.depth === 'deep' ? 0x49b9d1 : 0x91d58d, .20); water.fillRect(c.x * GRID, c.y * GRID, GRID - 1, GRID - 1); }
    for (const f of this.swimmers) {
      paths.lineStyle(1.5, f.species === 'common' ? 0xffd081 : 0x7de8d3, .95); paths.beginPath(); paths.moveTo(f.sprite.x, f.sprite.y); for (const point of f.targetPath) paths.lineTo(point.x, point.y); paths.strokePath();
      paths.lineStyle(1, 0xffffc2, .85); paths.strokeEllipse(f.sprite.x, f.sprite.y, 36, 24); paths.fillStyle(0xfff0b4, 1); paths.fillCircle(f.sprite.x, f.sprite.y, 2);
    }
  }
  private refreshTelemetry() {
    const regions = [...this.cellsByComponent.entries()].sort((a, b) => b[1].length - a[1].length).map(([id, cells]) => `${id}:${cells.length}ô`);
    const regionSamples = [...this.cellsByComponent.entries()].map(([id, cells]) => ({ id, x: (cells[0].x + .5) * GRID, y: (cells[0].y + .5) * GRID, cells: cells.length }));
    const telemetry = { waterTiles: this.waterTileCount, fishSafeCells: this.fineCells.length, waterRegions: this.componentCount, regionCounts: regions, regionSamples, offBank: this.offBank, bridgeLoaded: !!this.bridge, fish: this.swimmers.map(f => ({ id: f.id, species: f.species, x: +f.sprite.x.toFixed(1), y: +f.sprite.y.toFixed(1), velocity: f.speed, movement: +f.distanceMoved.toFixed(1), maxStep: +f.maxStep.toFixed(2), frame: f.sprite.frame.name, depthState: f.phase, phaseElapsedMs: Math.round(f.phaseTime), phaseDurationMs: f.phaseDuration, depthTier: f.depthTier, alpha: +f.sprite.alpha.toFixed(2), region: f.component, bankDistance: f.nearestBank, plannedSteps: f.targetPath.length, valid: f.bodyValid })) };
    (window as any).__fishShowcaseState = telemetry;
    if (this.debug) this.debugPanel.setText(`DEBUG N · simulation ${this.simScale}× · regions ${this.componentCount} · valid body cells ${this.fineCells.length}\n${telemetry.fish.map(f => `${f.id} ${f.depthState}/${f.depthTier} (${f.x},${f.y}) v=${f.velocity.toFixed(1)} region=${f.region} bank=${f.bankDistance} ${f.plannedSteps} steps`).join('\n')}\nD: đóng debug.`).setVisible(true);
    else this.debugPanel.setVisible(false);
  }
  private addSwimmerStateLabels() {
    const lines = this.swimmers.map(f => `${f.species === 'common' ? 'Cá thường' : 'Linh cá'} · ${f.phase === 'surface-near' ? 'gần mặt' : f.phase === 'deep-swim' ? 'lặn sâu' : f.phase === 'diving' ? 'đang lặn' : 'đang nổi'} · ${f.depthTier === 'deep' ? 'nước sâu' : 'nước nông'}`).join('\n');
    this.status.setText(lines).setVisible(true);
  }
  private bindControls() {
    const zoomButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-zoom]')];
    const setZoom = (zoom: number) => { this.cameras.main.setZoom(zoom).centerOn(600, 352); zoomButtons.forEach(b => b.classList.toggle('active', Number(b.dataset.zoom) === zoom)); return zoom; };
    zoomButtons.forEach(b => b.addEventListener('click', () => setZoom(Number(b.dataset.zoom))));
    const debugButton = document.querySelector<HTMLButtonElement>('[data-debug]');
    const setDebug = (enabled: boolean) => { this.debug = enabled; debugButton?.classList.toggle('active', enabled); this.drawDebug(); this.refreshTelemetry(); };
    debugButton?.addEventListener('click', () => setDebug(!this.debug)); this.input.keyboard?.on('keydown-D', () => setDebug(!this.debug));
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => b.addEventListener('click', () => { this.simScale = Number(b.dataset.speed); document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('active', x === b)); this.refreshTelemetry(); }));
    (window as any).__fishShowcase = {
      ready: true, waterMap: 'QingyunWaterTrial', layers: this.map.layers.map(l => l.name), waterTiles: this.waterTileCount, fishSafeCells: this.fineCells.length, waterRegions: this.componentCount,
      getState: () => JSON.parse(JSON.stringify((window as any).__fishShowcaseState)), setZoom, setDebug,
      setSpeed: (scale: number) => { this.simScale = Phaser.Math.Clamp(scale, .25, 12); this.refreshTelemetry(); },
      setDepth: (id: string, state: DepthState) => { const f = this.swimmers.find(s => s.id === id); if (!f) return false; f.phase = state; f.phaseTime = 0; f.phaseDuration = this.duration(f.species, state, f.rng); this.applyDepth(f); return true; },
      getPaths: () => this.swimmers.map(f => ({ id: f.id, component: f.component, points: [{ x: f.sprite.x, y: f.sprite.y }, ...f.targetPath.map(p => ({ ...p }))], allCentersWaterSafe: f.bodyValid })),
      testPoint: (x: number, y: number, id: string) => { const f = this.swimmers.find(s => s.id === id), i = this.cellAt(x, y); return { valid: i >= 0 && !!f && this.fineComponent[i] === f.component, region: i >= 0 ? this.fineComponent[i] : -1, cell: i }; },
      route: (ax: number, ay: number, bx: number, by: number, id: string) => { const f = this.swimmers.find(s => s.id === id), a = this.cellAt(ax, ay), b = this.cellAt(bx, by); if (!f || a < 0 || b < 0) return null; const p = this.findPath(a, b, f.component, f.seed); return p.length ? p.map(i => ({ x: (i % this.gridWidth + .5) * GRID, y: (Math.floor(i / this.gridWidth) + .5) * GRID })) : null; },
      routeTo: (id: string, x: number, y: number) => { const f = this.swimmers.find(s => s.id === id), start = f ? this.cellAt(f.sprite.x, f.sprite.y) : -1, goal = this.cellAt(x, y); if (!f || start < 0 || goal < 0) return false; const p = this.findPath(start, goal, f.component, f.seed); if (p.length < 2) return false; f.targetPath = p.slice(1).map(i => ({ x: (i % this.gridWidth + .5) * GRID, y: (Math.floor(i / this.gridWidth) + .5) * GRID })); f.targetLabel = `forced A→B ${p.length} ô`; return true; },
      routeToDepth: (id: string, depth: 'shallow' | 'deep') => { const f = this.swimmers.find(s => s.id === id); if (!f) return false; const start = this.cellAt(f.sprite.x, f.sprite.y), pool = (this.cellsByComponent.get(f.component) ?? []).filter(c => c.depth === depth); let best: number[] = []; for (let i = 0; i < 60 && pool.length; i++) { const t = pool[Math.floor(f.rng() * pool.length)], p = this.findPath(start, t.index, f.component, f.seed + i); if (p.length > best.length) best = p; if (p.length >= 12) break; } if (best.length < 2) return false; f.targetPath = best.slice(1).map(i => ({ x: (i % this.gridWidth + .5) * GRID, y: (Math.floor(i / this.gridWidth) + .5) * GRID })); f.targetLabel = `đến nước ${depth} · ${best.length} ô`; return true; },
      getDebug: () => this.debug,
    };
  }
  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000; this.simulationClock += dt * this.simScale;
    for (const effect of this.effects) { const m = MOTION[effect.kind], frame = m.start + (Math.floor(this.simulationClock * 1000 / effect.period) + effect.phase) % m.length; if (frame !== effect.lastFrame) { effect.sprite.setFrame(frame); effect.lastFrame = frame; } }
    this.updateFish(dt);
    for (let i = this.surfaceRipples.length - 1; i >= 0; i--) { const ripple = this.surfaceRipples[i]; ripple.life += dt * 1000 * this.simScale; const t = Phaser.Math.Clamp(ripple.life / ripple.duration, 0, 1); ripple.shape.setScale(1 + t * 1.8).setAlpha((1 - t) * .45); if (t >= 1) { ripple.shape.destroy(); this.surfaceRipples.splice(i, 1); } }
    this.statusClock += dt * 1000;
    if (this.statusClock >= 250) { this.statusClock = 0; if (!this.debug) this.addSwimmerStateLabels(); this.refreshTelemetry(); }
    if (this.debug && Math.floor(_time / 200) !== Math.floor((_time - delta) / 200)) this.drawDebug();
  }
}
window.addEventListener('error', e => { document.documentElement.dataset.fishError = String(e.message || e.error || 'runtime error'); });
window.addEventListener('unhandledrejection', e => { document.documentElement.dataset.fishRejection = String(e.reason); });
new Phaser.Game({ type: Phaser.CANVAS, parent: 'game', width: 1440, height: 960, backgroundColor: '#17353c', pixelArt: true, roundPixels: true, antialias: false, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [FishShowcase] });

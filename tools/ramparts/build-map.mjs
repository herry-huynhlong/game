import fs from 'node:fs';

const path = new URL('../../maps/world-rebuild-1b.tmj', import.meta.url);
const original = fs.readFileSync(path, 'utf8');
const map = JSON.parse(original);
const layer = name => map.layers.find(entry => entry.name === name);
const generated = ['RampartArt', 'RampartWalkways', 'RampartStairs', 'RampartPatrol'];
map.layers = map.layers.filter(entry => !generated.includes(entry.name));
map.tilesets = map.tilesets.filter(set => set.name !== 'QingyunRamparts');
let objectId = Math.max(...map.layers.flatMap(entry => entry.objects?.map(o => o.id) ?? [])) + 1;
let layerId = Math.max(...map.layers.map(entry => entry.id)) + 1;
const addLayer = name => {
  const objects = [];
  map.layers.push({ id: layerId++, name, type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects });
  return objects;
};
const properties = values => Object.entries(values).map(([name, value]) => ({
  name, type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string', value,
}));
const object = (name, x, y, width, height, values, extras = {}) => ({
  id: objectId++, name, x, y, width, height, rotation: 0, visible: true, properties: properties(values), ...extras,
});

const art = addLayer('RampartArt');
const walkways = addLayer('RampartWalkways');
const stairs = addLayer('RampartStairs');
const patrol = addLayer('RampartPatrol');
const height = 288, width = 256, firstgid = 700;
const tile = (name, x, y, frame, depthY = y + 22) => art.push(
  object(name, x - 128, y - 171 + height, width, height, { depthY }, { gid: firstgid + frame, type: 'rampart-art' }),
);
const point = (name, x, y, values) => patrol.push(object(name, x, y, 0, 0, values, { point: true }));
map.tilesets.push({
  firstgid, name: 'QingyunRamparts', tilewidth: width, tileheight: height, columns: 6, tilecount: 28,
  image: '../public/assets/ramparts/world-ramparts.png', imagewidth: 1536, imageheight: 1440,
  margin: 0, spacing: 0, objectalignment: 'bottomleft', type: 'tileset', version: '1.10', tiledversion: '1.12.2',
});
const left = 2064, right = 4880, top = 1264, bottom = 3088, midX = 3552, midY = 2208;
const edgeData = [
  ['north', midX, top, 0, 1, 12, 16],
  ['south', midX, bottom, 0, -1, 13, 17],
  ['east', right, midY, -1, 0, 14, 19],
  ['west', left, midY, 1, 0, 15, 18],
];

for (const prop of layer('StaticDecor').objects) {
  if (![436,437,438,442,443,516,517,518,519].includes(prop.gid)) continue;
  prop.visible = false;
  if (!prop.properties.some(p => p.name === 'legacyRampart')) prop.properties.push(...properties({ legacyRampart: true }));
  if (prop.gid > 438) continue;
  const edge = prop.properties.find(p => p.name === 'edge').value;
  const vertical = prop.gid === 437;
  const x = prop.x + (vertical ? 16 : 32);
  const y = prop.y + (vertical ? 32 : 16);
  const variant = ((x + y) / 64 | 0) % 4;
  tile(prop.name, x, y, (edge === 'east' ? 8 : edge === 'west' ? 4 : 0) + variant);
}
for (const [i, [x, y, dx, dy]] of [
  [left, top, -1, -1], [right, top, 1, -1], [right, bottom, 1, 1], [left, bottom, -1, 1],
].entries()) {
  tile('Vọng lâu góc', x + dx * 24, y + dy * 26, 20 + i, y + 28);
  point('Chòi góc', x, y, { kind: 'corner', index: i });
}

const collision = layer('Collision').objects;
const open = (x, y, hw, hh) => !collision.some(r =>
  x + hw > r.x && x - hw < r.x + r.width && y + hh > r.y && y - hh < r.y + r.height);
for (const [index, [side, x, y, dx, dy, gateFrame, stairFrame]] of edgeData.entries()) {
  const horizontal = dy !== 0;
  tile('Cổng ' + side, x, y, gateFrame, y + (horizontal ? 23 : 64));
  walkways.push(horizontal
    ? object(side, left - 30, y - 29, right - left + 60, 58, { level: 1 })
    : object(side, x - 29, top - 29, 58, bottom - top + 58, { level: 1 }));
  point('Gác cổng ' + side, x, y, { kind: 'gate', side });
  for (const sign of [-1, 1]) {
    const offset = [224, 272, 336, 400, 480, 560].map(i => i * sign).find(i => {
      const sx = x + Math.abs(dy) * i, sy = y + Math.abs(dx) * i;
      return [48, 68, 88, 105, 129, 153, 174].every(d =>
        open(sx + dx * d, sy + dy * d, horizontal ? 27 : 11, horizontal ? 10 : 27));
    });
    if (offset === undefined) throw new Error('No clear staircase on ' + side + ' ' + sign);
    const sx = x + Math.abs(dy) * offset, sy = y + Math.abs(dx) * offset;
    const ux = sx + dx * 26, uy = sy + dy * 26;
    const fx = ux + dx * 105, fy = uy + dy * 105;
    const name = 'Thang ' + side + ' ' + (sign < 0 ? 'A' : 'B');
    tile(name, ux, uy + 66, stairFrame, Math.max(uy, fy) + 36);
    stairs.push(object(name, Math.min(ux, fx) - 28 * Math.abs(dy), Math.min(uy, fy) - 28 * Math.abs(dx),
      horizontal ? 56 : 105, horizontal ? 105 : 56, { side, upperX: ux, upperY: uy, footX: fx, footY: fy }));
    const tx = x + Math.abs(dy) * (offset + sign * 238), ty = y + Math.abs(dx) * (offset + sign * 238);
    tile('Tháp canh ' + side, tx - dx * 34, ty - dy * 30, 24 + index);
    point('Vọng gác ' + side, tx, ty, { kind: 'tower', side });
  }
}
map.nextobjectid = objectId;
map.nextlayerid = layerId;
// Tiled may split tile data across rows. Keep its original formatting.
const dataArray = /("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g;
const arrays = [...original.matchAll(dataArray)].map(match => match[2]);
let index = 0;
const result = JSON.stringify(map, null, ' ').replace(dataArray,(match, prefix, values) => {
  const existing = arrays[index++];
  return existing && existing.replace(/\s/g,'') === values.replace(/\s/g,'') ? prefix + existing : match;
});
fs.writeFileSync(path, result + '\n');
console.log(art.length + ' art objects, ' + stairs.length + ' stairs, ' + patrol.length + ' posts');

import fs from 'node:fs';

const file = new URL('../../maps/world-rebuild-1b.tmj', import.meta.url);
const original = fs.readFileSync(file, 'utf8');
const map = JSON.parse(original);
const prop = (o, name) => o.properties?.find(p => p.name === name)?.value;
if (prop(map, 'sectLayoutVersion')) process.exit(0);

const layer = name => map.layers.find(l => l.name === name);
const objects = name => layer(name).objects;
const property = (name, value) => ({name, value, type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string'});
const set = (o, name, value) => {
  const old = o.properties?.find(p => p.name === name);
  if (old) old.value = value;
  else (o.properties ??= []).push(property(name, value));
};
const add = (list, name, x, y, width, height, data = {}, extra = {}) => {
  const o = {id: map.nextobjectid++, name, x, y, width, height, rotation: 0, visible: true,
    properties: Object.entries(data).map(([key, value]) => property(key, value)), ...extra};
  list.push(o);
  return o;
};
const art = objects('SectCampusArt'), collision = objects('SectCampusCollision'), stations = objects('SectCampusStations');
const regions = objects('RegionMarkers'), nav = objects('NavigationMarkers');
const station = id => stations.find(o => prop(o, 'station') === id);
const at = (id, name, x, y, extra) => add(stations, name, x, y, 0, 0, {station: id, ...extra}, {point: true});
const asset = (name, x, y, frame, base = false) => add(art, name, x - 160, y + 54, 320, 256, {depth: base ? 9 : y + 2}, {gid: 760 + frame});
const solid = (name, x, y, w, h) => add(collision, name, x, y, w, h, {kind: 'sect-campus'});
const move = (o, dx, dy) => {
  o.x += dx;
  o.y += dy;
  if (prop(o, 'depth') > 100) set(o, 'depth', prop(o, 'depth') + dy);
};
const relocate = (o, x, y) => {
  set(o, 'priorX', o.x);
  set(o, 'priorY', o.y);
  move(o, x - o.x, y - o.y);
};
const moveStation = (id, x, y) => relocate(station(id), x, y);
const moveGroup = (re, dx, dy) => {
  for (const p of stations.filter(o => re.test(prop(o, 'station')))) relocate(p, p.x + dx, p.y + dy);
};

const spine = 7648, left = 6832, right = 8672, north = 5232, south = 6928;
const westWing = 7488, eastWing = 7808;
const district = (id, name, x, y, w, h, px, py) => {
  const r = regions.find(o => prop(o, 'regionId') === id);
  if (r) Object.assign(r, {name, x, y, width: w, height: h});
  else add(regions, name, x, y, w, h, {regionId: id, spawnCount: 0});
  if (px !== undefined) add(nav, name, px, py, 0, 0, {markerId: id + '-approach', regionId: id, walkable: true}, {point: true});
};
district('sect', 'Thanh Vân Tông', left, north, right - left, south - north);
district('sect-gate', 'Sơn Môn và Tiếp Dẫn Điện', left, north, right - left, 160, spine, 5360);
district('sect-outer', 'Ngoại Môn', left, 5392, 752, 272, 7312, 5600);
district('sect-lodging', 'Khu sinh hoạt đệ tử', 7712, 5392, 960, 272, 8152, 5600);
district('sect-teaching', 'Truyền Công Khu', left, 5664, 752, 256, 7280, 5884);
district('sect-martial', 'Luyện Võ Khu', 7712, 5664, 960, 256, 8128, 5810);
district('sect-inner', 'Nội Môn', left, 5920, 752, 224, 7328, 6044);
district('sect-true', 'Chân Truyền Khu', 7712, 5920, 960, 224, 8128, 6058);
district('sect-crafts', 'Bách Nghệ Khu', left, 6144, 752, 240, 7280, 6316);
district('sect-central', 'Tông Môn Trọng Địa', 7712, 6144, 960, 240, 8064, 6304);
district('sect-veins', 'Linh Mạch Khu', left, 6384, 752, 240, 7296, 6536);
district('sect-herbs', 'Linh Dược Viên', 7712, 6384, 960, 240, 7968, 6528);
district('sect-back', 'Hậu Sơn', left, 6624, 752, 200, 7288, 6784);
district('sect-retreat', 'Khu bế quan', 7712, 6624, 960, 200, 8144, 6740);
district('sect-forbidden', 'Cấm Địa', left, 6824, right - left, 104, spine, 6888);

for (const [id, x, y] of [
  ['dorm', 7120, 5452], ['food', 8032, 5468], ['library', 7088, 5736], ['alchemy', 6992, 6218],
  ['forge', 7288, 6218], ['leader', 8224, 6324], ['elders', 8528, 6164],
  ['quests', 7872, 6164], ['market', 8504, 5426],
]) {
  const p = station(id), picture = art.find(o => prop(o, 'buildingId') === 'sect-campus-' + id);
  const dx = x - (picture.x + 160), dy = y - (picture.y - 54);
  move(picture, dx, dy);
  move(collision.find(o => o.name === picture.name), dx, dy);
  relocate(p, p.x + dx, p.y + dy);
  if (id === 'quests') moveGroup(/^(queue-|counter$)/, dx, dy);
}
for (const [name, gid, x, y] of [
  ['Đài Thái Cực Diễn Võ Trường', 780, 8096, 5792],
  ['Tụ Linh Trận', 770, 8172, 6040],
  ['Hồ sen', 771, 7072, 6052],
  ['Linh Dược Viên · luống Bắc', 772, 7822, 6440],
  ['Linh Dược Viên · luống Nam', 772, 7822, 6572],
]) {
  const o = art.find(o => o.name === name && o.gid === gid);
  const dx = x - o.x - 160, dy = y - o.y + 54;
  move(o, dx, dy);
  if (gid === 780) moveGroup(/^training$/, dx, dy);
  if (gid === 770) moveGroup(/^array$/, dx, dy);
  if (gid === 771) move(collision.find(o => o.name === 'Lòng hồ sen'), dx, dy);
}
moveStation('garden', 7792, 6512);
for (let i = 0; i < 6; i++) moveStation('plot-' + i, 7770 + i % 3 * 50, i < 3 ? 6452 : 6560);

const homes = art.filter(o => o.name === 'Nhà đệ tử');
const homeSolids = collision.filter(o => o.name === 'Nhà đệ tử');
for (const [i, [x, y]] of [[7376, 5452], [6992, 5570], [8376, 5514], [7376, 5998]].entries()) {
  const o = homes[i], dx = x - o.x - 160, dy = y - o.y + 54;
  move(o, dx, dy);
  move(homeSolids[i], dx, dy);
}
for (let i = 0; i < 20; i++) {
  const [x, y] = [[7120, 5500], [7376, 5512], [6992, 5618], [8376, 5574]][Math.floor(i / 5)];
  moveStation('home-' + i, x - 56 + i % 5 * 28, y);
  at('inner-home-' + i, 'Chỗ nghỉ Nội Môn', 7338 + i % 4 * 31, 6018 + Math.floor(i / 4) * 22, {hiddenLabel: true});
  at('true-home-' + i, 'Chỗ nghỉ Chân Truyền', 8424 + i % 5 * 31, 6046 + Math.floor(i / 5) * 20, {hiddenLabel: true});
}
for (let i = 0; i < 8; i++) {
  moveStation('seat-' + i, i < 4 ? 7144 + i * 42 : 7240 + (i - 4) * 42, i < 4 ? 5528 : 5618);
  at('inner-seat-' + i, 'Bồ đoàn Nội Môn', 7180 + i % 4 * 54, 6052 + Math.floor(i / 4) * 34, {hiddenLabel: true});
  at('true-seat-' + i, 'Bồ đoàn Chân Truyền', 8096 + i % 4 * 52, 6052 + Math.floor(i / 4) * 40, {hiddenLabel: true});
  at('retreat-seat-' + i, 'Bồ đoàn Bế Quan', 8200 + i % 4 * 48, 6730 + Math.floor(i / 4) * 38, {hiddenLabel: true});
}
for (let i = 0; i < 10; i++) {
  moveStation('reading-' + i, 7024 + i % 5 * 32, 5804 + Math.floor(i / 5) * 30);
  at('lesson-' + i, 'Chỗ nghe giảng', 7368 + i % 5 * 28, 5812 + Math.floor(i / 5) * 32, {hiddenLabel: true});
}
const props = art.filter(o => o.name === 'Mộc nhân'), feet = collision.filter(o => o.name === 'Chân mộc nhân');
for (let i = 0; i < 6; i++) {
  const x = 8272 + i % 3 * 94, y = 5734 + Math.floor(i / 3) * 102;
  const dx = x - props[i].x - 160, dy = y - props[i].y + 54;
  move(props[i], dx, dy); move(feet[i], dx, dy); moveStation('dummy-' + i, x, y + 26);
}

const society = objects('SocietyStations');
for (const [id, x, y] of [
  ['vein-0', 7064, 6480], ['vein-1', 7184, 6520], ['vein-2', 7340, 6480],
  ['vein-3', 7440, 6568], ['vein-4', 7000, 6584], ['vein-5', 7224, 6574],
  ['mine', 7190, 6454], ['fields', 7952, 6516],
]) {
  const p = society.find(o => prop(o, 'id') === id);
  const dx = x - p.x, dy = y - p.y;
  const picture = objects('SocietyArt').find(o => prop(o, 'ore') === id || o.gid === 1651 && o.x + 96 === p.x && o.y + 12 === p.y);
  const footprint = objects('SocietyCollision').find(o => o.name === 'Chân mạch linh khoáng' && o.x + 26 === p.x && o.y + 37 === p.y);
  if (picture) move(picture, dx, dy);
  if (footprint) move(footprint, dx, dy);
  relocate(p, x, y);
}
for (let i = 0; i < 8; i++) {
  const id = 'paddy-' + i, p = society.find(o => prop(o, 'id') === id);
  const x = 8070 + i % 4 * 170, y = 6438 + Math.floor(i / 4) * 156;
  const picture = objects('SocietyArt').find(o => o.gid === 1653 && o.x + 96 === p.x && o.y - 43 === p.y);
  move(picture, x - p.x, y - p.y);
  relocate(p, x, y);
}
for (const [name, footprint, x, y] of [
  ['Mỏ Quặng Sắt', 'Vách mỏ', 7152, 6440],
  ['Kho tập kết linh khoáng', 'Kho linh khoáng', 7496, 6454],
  ['Giỏ khoáng', null, 7490, 6490],
  ['Kho dụng cụ Linh Điền', 'Kho nông cụ', 7880, 6526],
  ['Hồ tưới', 'Hồ tưới', 8590, 6520],
]) {
  const o = objects('SocietyArt').find(o => o.name === name);
  const dx = x - o.x - 96, dy = y - o.y + 12;
  move(o, dx, dy);
  if (footprint) move(objects('SocietyCollision').find(o => o.name === footprint), dx, dy);
}
const jade = objects('SpiritVeins').find(o => prop(o, 'veinId') === 'sect-jade');
relocate(jade, 6920, 6512);
const oreArt = art.filter(o => o.name === 'Vỉa quặng sắt'), oreSolids = collision.filter(o => o.name === 'Đá vỉa quặng');
for (let i = 0; i < 3; i++) {
  const x = 6856 + i * 57, y = 6434 + i % 2 * 24, o = oreArt[i];
  const dx = x - o.x - 160, dy = y - o.y + 54;
  move(o, dx, dy); move(oreSolids[i], dx, dy); moveStation('ore-' + i, x, y + 24);
}

for (const [id, name, x, y, frame, width] of [
  ['reception', 'Tiếp Dẫn Điện', 7352, 5352, 2, 120],
  ['guard-post', 'Chốt hộ vệ Sơn Môn', 7910, 5352, 6, 90],
  ['teaching', 'Truyền Công Điện', 7396, 5740, 4, 128],
  ['inner-retreat', 'Tĩnh thất Nội Môn', 6968, 6028, 6, 90],
  ['true-cave', 'Động phủ Chân Truyền', 8510, 6028, 19, 44],
  ['talismans', 'Phù Lục Đường', 6992, 6340, 6, 90],
  ['formations', 'Trận Pháp Đường', 7224, 6316, 10, 0],
  ['materials', 'Kho nguyên liệu', 7480, 6340, 6, 90],
  ['council', 'Nghị Sự Điện', 8192, 6164, 2, 130],
  ['law', 'Chấp Pháp Điện', 7918, 6324, 7, 126],
  ['vault', 'Bảo Khố', 8540, 6324, 5, 130],
  ['herb-store', 'Kho dược liệu', 7800, 6405, 6, 82],
  ['mine-guard', 'Trạm quản sự Linh Mạch', 7418, 6416, 6, 88],
  ['rear-pavilion', 'Đình Trúc', 7336, 6740, 17, 18],
  ['elder-cave', 'Động phủ Bế Quan', 8478, 6710, 19, 46],
  ['seal', 'Bia giới Cấm Địa', 7748, 6870, 19, 22],
]) {
  const o = asset(name, x, y, frame, frame === 10);
  if ([2,4,5,6,7].includes(frame)) set(o, 'buildingId', 'sect-campus-' + id);
  if (width) solid(name, x - width / 2, y - 34, width, 42);
  at(id, name, x, y + 32);
}
for (const [id, name, x, y] of [
  ['circuit-0','Vọng gác tây',7550,5334],['circuit-1','Vọng gác đông',7744,5334],
  ['circuit-2','Tuần tra Tả viện',7472,5392],['circuit-3','Tuần tra Hữu viện',7824,5392],
  ['social-0','Sân sinh hoạt',8020,5584],['social-1','Sân sinh hoạt',8152,5560],
  ['social-2','Sân sinh hoạt',8184,5640],['social-3','Sân sinh hoạt',8312,5620],
  ['sword-court','Sân luyện kiếm',8312,5812],['mine-storage','Kho linh thạch',7496,6480],
  ['bridge','Cầu đá Hậu Sơn',7648,6680],['lotus-bank','Bờ hồ Hậu Sơn',7232,6784],
]) at(id,name,x,y,{hiddenLabel: /^(circuit|social)/.test(id)});

const marker = nav.find(o => prop(o, 'markerId') === 'sect-yard');
relocate(marker, spine, 5548);
for (const o of art.filter(o => ['Bụi hoa sân viện','Đèn đá','Bàn sân viện'].includes(o.name))) {
  const choices = [[7470,5348],[7828,5332],[7522,5548],[7772,5570],[7360,5658],[8074,5642],
    [7490,5874],[7780,5862],[7400,6082],[7796,6098],[7450,6290],[7790,6290],
    [7526,6518],[7770,6642],[7276,6748],[7902,6768],[7570,6854],[7750,6866]];
  const [x,y] = choices[o.id % choices.length];
  move(o,x - o.x - 160 + o.id % 3 * 21,y - o.y + 54 + o.id % 4 * 12);
}

const originalHeight = map.height;
map.height = 218;
for (const l of map.layers.filter(l => l.type === 'tilelayer')) {
  l.height = map.height;
  for (let row = originalHeight; row < map.height; row++) {
    const copy = l.name === 'GroundBase' || l.name === 'Water' || l.name === 'Shore';
    const start = (originalHeight - 1) * map.width;
    l.data.push(...(copy ? l.data.slice(start, start + map.width) : Array(map.width).fill(0)));
  }
}
const hash = (x,y) => ((x * 80509 ^ y * 51683 ^ x * y * 671) >>> 0);
const roads = layer('Roads').data, ground = layer('GroundBase').data, detail = layer('GroundDetails').data;
const water = layer('Water').data, shore = layer('Shore').data;
const fork = (x,y) => {
  const row = [5360, 5600, 5880, 6080, 6304, 6528, 6744].find(c => Math.abs(y-c)<43);
  return row && x > (row === 6744 ? 7168 : 6920) && x < (row === 6304 ? 8592 : 8500);
};
const avenue = (x,y) => Math.abs(x-spine)<80 || fork(x,y) ||
  [[7130,5415,5610],[7376,5448,5636],[8030,5456,5640],[8376,5510,5626],
   [7060,5750,5888],[7396,5740,5898],[8080,5776,5900],[8348,5736,5878],
   [7328,5944,6090],[8150,5954,6100],[6992,6220,6358],[7288,6226,6352],
   [7866,6178,6378],[8224,6178,6378],[8528,6178,6378],[7176,6450,6582],
   [7952,6410,6596],[8128,6664,6774]].some(([col, start, end])=>Math.abs(x-col)<40&&y>start&&y<end);
const basin = (x,y) => {
  const pond = ((x-7036)/162)**2+((y-6746)/84)**2 < 1 + .08*Math.sin(x/22+y/17);
  const stream = x > 7160 && x < 7816 && Math.abs(y - (6668 + 19*Math.sin((x-7450)/103))) < 24;
  return pond || stream;
};
for (let ty = Math.floor(north/32); ty < map.height; ty++) {
  for (let tx = Math.floor(left/32); tx < right/32; tx++) {
    const x=tx*32+16, y=ty*32+16, i=ty*map.width+tx, h=hash(tx,ty);
    const bridge = Math.abs(x-spine)<80 && y >= 6624 && y <= 6720;
    const wet = !bridge && basin(x,y);
    const path = !wet && (avenue(x,y)||((x-7648)/154)**2+((y-5365)/79)**2<1||
      ((x-8132)/165)**2+((y-6320)/68)**2<1);
    ground[i] = (y>=6624&&h%6===0?9:1) + h%8;
    detail[i] = !wet&&!path&&h%9===0 ? 113+h%8 : 0;
    water[i] = wet ? 452+h%8 : 0;
    shore[i] = 0;
    roads[i] = path ? (y>=6740 && Math.abs(x-spine)>=80 ? 73 : 81) + h%8 : 0;
    if (wet) solid('Lòng suối Hậu Sơn', x-16, y-16, 32, 32);
    if (bridge && basin(x,y)) roads[i] = 81 + h%8;
  }
}
const staticDecor = objects('StaticDecor');
function tree(name, x, y, gid, w, h) {
  const size = gid === 320 ? 12 : 10;
  add(staticDecor,name,x-w/2,y+6,w,h,{depthY:y,canopy:gid!==320},{gid,type:'prop'});
  solid('Gốc · '+name,x-size,y-8,size*2,14);
}
for (const [i,[x,y,gid,w,h]] of [
  [7488,5354,308,112,96],[7800,5354,308,112,96],[6920,5500,408,120,140],[8610,5514,312,96,96],
  [7234,5556,408,112,124],[7908,5610,408,112,124],[7426,5680,312,96,96],[8562,5750,408,120,140],
  [6910,5850,312,96,96],[7146,5936,416,120,140],[6938,6120,416,116,132],[7484,6034,312,96,96],
  [8004,6026,416,120,140],[8396,5980,308,112,96],[8570,6100,312,96,96],[7748,6180,312,96,96],
  [8108,6334,308,112,96],[8390,6280,308,112,96],[7470,6598,320,64,64],[6894,6568,320,64,64],
  [8646,6600,416,112,124],[7330,6702,312,96,96],[7238,6800,312,96,96],[6912,6826,312,96,96],
  [7470,6806,312,96,96],[7190,6668,416,120,140],[7040,6664,308,112,96],[7868,6704,312,96,96],
  [8092,6808,408,120,140],[8368,6770,308,112,96],[8550,6780,312,96,96],[8388,6858,320,64,64],
  [7434,6864,320,64,64],[7508,6896,308,112,96],[7792,6900,308,112,96],
].entries()) {
  tree((gid===320?'Đá rêu':gid===312?'Rừng trúc':gid===416?'Liễu ven hồ':'Cổ thụ sơn môn')+' '+(i+1),x,y,gid,w,h);
}

map.tilesets.push({firstgid:1830,name:'SectSouthStoneBridge',tilewidth:160,tileheight:112,
  tilecount:1,columns:1,image:'../public/assets/sect-campus/south-bridge.png',imagewidth:160,imageheight:112,
  margin:0,spacing:0,objectalignment:'bottomleft'});
add(staticDecor, 'Cầu đá Hậu Sơn · nhịp dọc', 7568, 6740, 160, 112, {depthY: 8}, {gid: 1830, type: 'prop'});
for (const x of [7572, 7709]) solid('Lan can Cầu đá Hậu Sơn', x, 6635, 14, 88);
for (const x of [7224, 7288, 7384, 7480, 7544, 7752, 7816]) {
  const y = 6668 + 19 * Math.sin((x - 7450) / 103);
  const centerX = Math.floor(x / 32) * 32 + 16, centerY = Math.floor(y / 32) * 32 + 16;
  if (water[Math.floor(centerY / 32) * map.width + Math.floor(centerX / 32)])
    add(objects('FlowEffects'), 'Dòng suối Hậu Sơn', centerX, centerY, 0, 0,
      {kind: 'river_east', phase: x % 8, period: 160}, {point: true});
}

set(map, 'sectLayoutVersion', 1);
set(map, 'preSectHeightPx', originalHeight * map.tileheight);
const output = JSON.stringify(map, null, '  ').replace(/("data"\s*:\s*)(\[\s*[0-9,\s]+\])/g, (_, prefix, current) => {
  const cells = JSON.parse(current), rows = [];
  for(let i=0;i<cells.length;i+=map.width) rows.push(cells.slice(i,i+map.width).join(','));
  return prefix+'[\n        '+rows.join(',\n        ')+'\n      ]';
});
fs.writeFileSync(file, output+'\n');
console.log('Thanh Vân Tông: 14 phân khu, thế giới '+map.width+'×'+map.height+' tiles.');

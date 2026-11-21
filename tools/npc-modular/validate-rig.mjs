import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const positional = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const file = path.resolve(positional ?? path.join(__dirname, '../../art/source/npc-modular/qingyun-disciple-rig-v1.json'));
const requireArt = process.argv.includes('--require-art');
const issues = [];
const warnings = [];
const directions = ['down', 'up', 'left', 'right'];
const slots = ['body', 'face', 'hair_back', 'hair_front', 'outfit_torso', 'outfit_sleeve_left', 'outfit_sleeve_right', 'outfit_lower', 'footwear', 'head_accessory', 'weapon'];

function check(condition, message) { if (!condition) issues.push(message); }
function validSize(size, label) {
  check(size && Number.isInteger(size.width) && size.width > 0 && Number.isInteger(size.height) && size.height > 0, `${label}: frame dimensions must be positive integers`);
}

let rig;
try { rig = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (error) { console.error(`Cannot read rig JSON: ${error.message}`); process.exit(2); }

check(rig.schemaVersion === '1.0', 'schemaVersion must be 1.0');
check(typeof rig.rigId === 'string' && /^[a-z0-9][a-z0-9._-]+$/.test(rig.rigId), 'rigId has invalid format');
check(['art-blocked', 'prototype', 'review', 'approved'].includes(rig.status), 'status is invalid');
validSize(rig.targetFrame, 'targetFrame');
check(Array.isArray(rig.directions) && directions.every(d => rig.directions.includes(d)) && rig.directions.length === 4, 'directions must contain down/up/left/right exactly once');
check(Array.isArray(rig.slots) && slots.every(s => rig.slots.includes(s)) && new Set(rig.slots).size === rig.slots.length, 'slots must include all defined slots without duplicates');
check(Array.isArray(rig.parts), 'parts must be an array');
if (Array.isArray(rig.parts)) {
  const ids = new Set();
  for (const part of rig.parts) {
    check(part && typeof part.id === 'string' && !ids.has(part.id), `part id missing or duplicated: ${part?.id ?? '(empty)'}`);
    if (part?.id) ids.add(part.id);
    check(slots.includes(part?.slot), `part ${part?.id ?? '(unknown)'} has invalid slot`);
    validSize(part?.frameSize, `part ${part?.id ?? '(unknown)'}`);
    check(Number.isInteger(part?.frameCount) && part.frameCount > 0, `part ${part?.id ?? '(unknown)'} has invalid frameCount`);
    for (const [direction, animations] of Object.entries(part?.animations ?? {})) {
      check(directions.includes(direction), `part ${part.id}: unknown animation direction ${direction}`);
      for (const [name, anim] of Object.entries(animations ?? {})) {
        check(Number.isInteger(anim.start) && Number.isInteger(anim.end) && anim.start >= 0 && anim.end >= anim.start && anim.end < part.frameCount, `part ${part.id}/${direction}/${name}: frame range outside frameCount`);
        check(Number.isFinite(anim.fps) && anim.fps > 0 && anim.fps <= 60, `part ${part.id}/${direction}/${name}: fps must be in (0,60]`);
      }
    }
    if (part?.status === 'approved') {
      check(typeof part.source === 'string' && part.source.length > 0, `approved part ${part.id} needs a source path`);
      if (typeof part.source === 'string') check(fs.existsSync(path.resolve(path.dirname(file), part.source)), `approved part ${part.id} source does not exist: ${part.source}`);
    }
  }
}
for (const direction of directions) {
  const order = rig.drawOrder?.[direction];
  check(Array.isArray(order) && new Set(order).size === order.length && order.every(slot => slots.includes(slot)), `drawOrder.${direction} must be unique and use known slots`);
  const anchors = rig.targetAnchors?.[direction];
  check(anchors && Object.keys(anchors).length > 0, `targetAnchors.${direction} is missing`);
  for (const [name, point] of Object.entries(anchors ?? {})) {
    check(Number.isInteger(point.x) && point.x >= 0 && point.x < rig.targetFrame.width && Number.isInteger(point.y) && point.y >= 0 && point.y < rig.targetFrame.height, `targetAnchors.${direction}.${name} is outside targetFrame`);
  }
}
if (rig.status !== 'approved' || !rig.parts?.some(p => p.slot === 'body' && p.status === 'approved')) warnings.push('No approved artwork/body is available; this file defines a technical contract only.');
if (requireArt && (rig.status !== 'approved' || !rig.parts?.some(p => p.slot === 'body' && p.status === 'approved'))) issues.push('--require-art requested, but no approved body/art is present');

if (issues.length) {
  console.error(`Rig validation failed (${issues.length} issue(s))`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`Rig structure valid: ${rig.rigId}`);
console.log(`Frame target: ${rig.targetFrame.width}x${rig.targetFrame.height}; directions: ${directions.join(', ')}`);
console.log(`Art status: ${rig.status}; parts: ${rig.parts.length}`);
for (const warning of warnings) console.warn(`ART BLOCKER: ${warning}`);

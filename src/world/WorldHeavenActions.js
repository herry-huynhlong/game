import { blocksGroundCombat, aboveGroundCombat } from './FlyingSword.js';
import { EconomySystem } from '../dao/EconomySystem.ts';
import { SKILLS, hasRod, itemName, rodEquipped } from './HeavenShop.js';
import { weaponAttackMode, weaponForNpc } from './WeaponCombat.js';
import { createWorldUuid } from '../world-rebuild-population.js';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { damageForStrike } from '../systems/CombatSystem.ts';

const AXES = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const facing = (x, y) => Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
const BUCKET = 96;

export class WorldHeavenActions {
  constructor(scene) {
    this.scene = scene;
    this.shots = [];
    this.guards = new Map();
    this.fishing = null;
  }

  aim(npc, target) {
    const scene = this.scene;
    const pointer = scene.input.activePointer;
    const point = target ?? (scene.lastAttackPointer && scene.cameras.main.getWorldPoint(pointer.x, pointer.y));
    const height = !target && npc.wallLevel ? scene.ramparts.height(npc) : 0;
    const dx = point ? point.x - npc.x : 0, dy = point ? point.y - npc.y + height : 0;
    const distance = Math.hypot(dx, dy);
    return distance > 6 ? [dx / distance, dy / distance] : AXES[scene.playerFacing] ?? AXES.down;
  }

  defense(npc) {
    const normal = cultivationStats(npc).defense;
    return (npc.heavenGuardUntil ?? 0) > Date.now() ? normal + Math.ceil(normal * .45) + 8 : normal;
  }

  fire(npc, skillId, target = null) {
    const scene = this.scene, weapon = weaponForNpc(npc), ai = Boolean(target), now = Date.now();
    if(blocksGroundCombat(npc)||aboveGroundCombat(target)||target&&(npc.wallLevel??0)!==(target.wallLevel??0))return false;
    const skill = SKILLS[skillId];
    const fail = message => { if (!ai) scene.worldPopulationToast(message); return false; };
    if(weapon?.kind==='crossbow'&&(!skill||skill.weapon))return fail('Dùng nỏ trong chế độ Character Rig, hoặc đổi sang vũ khí khác.');
    if (skillId && (!skill || !npc.skills?.includes(skillId))) return fail('Hãy lĩnh ngộ bí kíp và gán võ kỹ vào phím K.');
    if (skill?.weapon && weapon?.kind !== skill.weapon) return fail('Chưa trang bị vũ khí phù hợp với võ kỹ.');
    if (skill && (npc.heavenSkillReadyAt ?? 0) > now) return fail('Võ kỹ đang hồi chiêu.');
    if (skill && npc.mp < skill.mp) return fail('Không đủ linh lực.');
    if (!skill && scene.playerAttackCooldown > 0) return false;
    if (rodEquipped(npc) && (!skill || skill.range)) return fail('Hãy tháo cần câu trước khi tấn công.');
    if (this.shots.length >= 32) return false;
    const [ux, uy] = this.aim(npc, target);
    if (skill?.duration) {
      if (ai && (npc.hp > cultivationStats(npc).hpMax * .55 || npc.heavenGuardUntil > now)) return false;
      npc.heavenGuardUntil = now + skill.duration;
      npc.heavenSkillReadyAt = now + skill.cooldown;
      npc.mp -= skill.mp;
      scene.persistPopulation();
      return true;
    }
    const combo = ai ? 1 : scene.playerCombo % 3 + 1;
    const mode = weaponAttackMode(weapon, combo);
    const range = skill?.range ?? (weapon ? (weapon.kind === 'dao' ? 174 : 200) : 43);
    const width = skill?.width ?? (weapon?.kind === 'dao' ? 19 : 10);
    if (ai && (Math.hypot(target.x - npc.x, target.y - npc.y) > range - 12 || !scene.clearCombatLine(npc, target))) return false;
    if (ai && scene.populationWorld.npcs.some(other => other !== npc && other.alive && (npc.wallLevel??0)===(other.wallLevel??0) &&
      this.inLane(npc, other, ux, uy, range, width + 12))) return false;
    if (!ai) this.stopFishing();
    const dir = facing(ux, uy);
    if (!ai) {
      scene.playerFacing = dir;
      scene.playerCombo = combo;
      scene.playerAttackCooldown = weapon?.kind === 'dao' ? .52 : .42;
    }
    if (skill) {
      npc.heavenSkillReadyAt = now + skill.cooldown;
      npc.mp -= skill.mp;
      scene.persistPopulation();
    }
    const actor = scene.npcSprites.get(npc.id);
    actor?.play(`${scene.npcTextureFor(npc)}_idle_${dir}`, true);
    scene.playWeaponPose(npc, skill ?? mode, dir);
    const effect = skill?.effect ?? (weapon?.kind === 'dao' ? 'dao' : mode.hit === 'thrust' ? 'thrust' : 'jian');
    if (weapon || skill) scene.spawnWeaponFx(effect, dir, npc.x, npc.y - 16 - scene.ramparts.height(npc),scene.ramparts.depth(npc)+15);
    const sprite = scene.add.sprite(npc.x, npc.y - 15, 'heaven-projectiles', { dao: 0, jian: 3, thrust: 6 }[effect])
      .setRotation(Math.atan2(uy, ux)).setDepth(npc.y + 1).setVisible(false);
    this.shots.push({
      id: createWorldUuid(), npc, ai, wallLevel:npc.wallLevel??0, x: npc.x, y: npc.y, ux, uy, range, width, sprite,
      start: scene.time.now + (weapon || skill ? 105 : 65), travel: 0, speed: effect === 'thrust' ? 630 : 450,
      frame: { dao: 0, jian: 3, thrust: 6 }[effect], visible: Boolean(weapon || skill), hits: skill?.hits ?? 1, struck: new Set(),
      damage: damageForStrike(npc.realmIndex, combo, Boolean(skill), cultivationStats(npc).attack, skill?.multiplier ?? mode.multiplier ?? 1),
    });
    return true;
  }

  launchBolt(npc, tip, ux, uy, damage) {
    if(this.shots.length>=32)return false;
    const scene=this.scene;
    const x=tip.x,y=npc.y+uy*8;
    if(!this.shotOpen(npc,x,y))return false;
    const sprite=scene.add.image(tip.x,tip.y,'combat-mount','bolt').setOrigin(1,.5)
      .setRotation(Math.atan2(uy,ux)).setDepth(npc.y+1);
    this.shots.push({id:createWorldUuid(),npc,wallLevel:npc.wallLevel??0,x,y,ux,uy,range:300,width:7,sprite,
      start:scene.time.now,travel:0,speed:530,visible:true,hits:1,struck:new Set(),damage,elevation:tip.y-y+scene.ramparts.height(npc),bolt:true});
    return true;
  }

  inLane(origin, target, ux, uy, length, width) {
    const dx = target.x - origin.x, dy = target.y - origin.y, along = dx * ux + dy * uy;
    return along > 0 && along <= length && Math.abs(dx * uy - dy * ux) <= width;
  }

  shotOpen(shot,x,y) {
    return shot.wallLevel ? this.scene.ramparts.open(x,y,0,0) : this.scene.canOccupy(x,y);
  }

  updateShots(dt) {
    if (!this.shots.length) return;
    const scene = this.scene, buckets = new Map();
    const add = (target, fauna) => {
      if (!target.alive) return;
      const key = Math.floor(target.x / BUCKET) + ',' + Math.floor(target.y / BUCKET);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ target, fauna });
    };
    scene.populationWorld.npcs.forEach(npc => add(npc, false));
    scene.populationWorld.environment.fauna.forEach(fauna => add(fauna, true));
    this.shots = this.shots.filter(shot => {
      if((shot.npc.wallLevel??0)!==shot.wallLevel){shot.sprite.destroy();return false;}
      if (scene.time.now < shot.start) return true;
      const step = Math.min(shot.range - shot.travel, shot.speed * dt / 1000);
      for (let travelled = 0; travelled < step && shot.hits > 0;) {
        const advance = Math.min(5, step - travelled);
        const x = shot.x + shot.ux * advance, y = shot.y + shot.uy * advance;
        if (!this.shotOpen(shot,x,y)) { shot.hits = 0; break; }
        shot.x = x; shot.y = y; travelled += advance; shot.travel += advance;
        const bx = Math.floor(x / BUCKET), by = Math.floor(y / BUCKET);
        for (let iy = by - 1; iy <= by + 1 && shot.hits > 0; iy++) for (let ix = bx - 1; ix <= bx + 1 && shot.hits > 0; ix++) {
          for (const { target, fauna } of buckets.get(ix + ',' + iy) ?? []) {
            if (!shot.hits || target === shot.npc || !target.alive || aboveGroundCombat(target) || (target.wallLevel??0)!==shot.wallLevel || shot.struck.has(target.id) || (!fauna && shot.ai)) continue;
            if (Math.hypot(target.x - x, target.y - y) > shot.width + 5 ||
                !this.inLane({x:x-shot.ux*10,y:y-shot.uy*10},target,shot.ux,shot.uy,20,shot.width+4) ||
                !scene.clearCombatLine(shot,target) || !this.shotOpen(shot,target.x,target.y)) continue;
            const eventId = 'heaven-strike:' + shot.id + ':' + target.id;
            const result = fauna
              ? scene.applyFaunaDamage(target, shot.npc, shot.damage, eventId)
              : scene.reportCombat(shot.npc.id, target.id, Math.max(1, Math.floor(shot.damage - this.defense(target))), { eventId });
            if (result.ok === false) continue;
            if (shot.ai && shot.npc.populationRole === 'hunter' && fauna && !target.alive) {
              shot.npc.faunaHuntsToday = (shot.npc.faunaHuntsToday ?? 0) + 1;
              scene.persistPopulation();
            }
            shot.struck.add(target.id);
            shot.hits--;
            scene.spawnWeaponFx('thrust', facing(shot.ux, shot.uy), target.x, target.y - 12 - scene.ramparts.height(target),scene.ramparts.depth(target)+15);
            if (result.incident) scene.worldPopulationToast('Luật thành: báo động vì tấn công cư dân.');
          }
        }
      }
      if (!shot.hits || shot.travel >= shot.range || !shot.npc.alive) { shot.sprite.destroy(); return false; }
      shot.sprite.setPosition(shot.x, shot.y + (shot.elevation ?? -15) - scene.ramparts.height(shot)).setDepth(scene.ramparts.depth(shot) + 1).setVisible(shot.visible);
      if(!shot.bolt)shot.sprite.setFrame(shot.frame + Math.floor((scene.time.now - shot.start) / 68) % 3);
      return true;
    });
  }

  updateGuards() {
    const scene = this.scene, now = Date.now();
    for (const npc of scene.populationWorld.npcs) {
      const actor = scene.npcSprites.get(npc.id);
      let aura = this.guards.get(npc.id);
      if (!npc.alive || !actor || !(npc.heavenGuardUntil > now)) {
        if (aura) { aura.destroy(); this.guards.delete(npc.id); }
        continue;
      }
      if (!aura) {
        aura = scene.add.sprite(actor.x, actor.y - 17, 'heaven-guard');
        this.guards.set(npc.id, aura);
      }
      aura.setPosition(actor.x, actor.y - 17).setDepth(actor.depth + .3).setVisible(actor.visible).setFrame(Math.floor(now / 140) % 3);
    }
  }

  fish(npc) {
    const scene = this.scene, river = scene.riverFishSystem;
    if (!hasRod(npc)) return scene.worldPopulationToast('Cần sở hữu cần câu.');
    if (!rodEquipped(npc)) return scene.worldPopulationToast('Hãy trang bị cần câu trong bảng nhập thân.');
    if (this.fishing?.phase === 'bite') {
      const { fishId, until } = this.fishing;
      const species = scene.time.now <= until
        ? river.catchFish(fishId, npc.id, species => {
          const id = 'river_fish_' + species;
          EconomySystem.add(npc.inventory, id, 1);
          if (scene.persistPopulation()) return true;
          EconomySystem.remove(npc.inventory,id,1);
          return false;
        }) : null;
      if (species) {
        const id = 'river_fish_' + species;
        scene.worldPopulationToast('Đã câu được ' + itemName(id) + ' ×1.');
      } else scene.worldPopulationToast('Cá đã tuột câu.');
      this.fishing.phase = 'reel';
      this.fishing.until = scene.time.now + 550;
      this.fishing.caught = species;
      return;
    }
    if (this.fishing) {
      this.stopFishing('Thu cần sớm. Chưa bắt được cá.');
      return;
    }
    const [ux, uy] = this.aim(npc);
    const point = this.castPoint(npc,ux,uy);
    if (!point) return scene.worldPopulationToast('Đứng sát bờ và hướng cần về mặt nước.');
    scene.playerFacing = facing(ux, uy);
    this.fishing = {
      npc, point, component: point.component, phase: 'cast', until: scene.time.now + 460,
      started: scene.time.now, direction: scene.playerFacing,
      float: scene.add.sprite(npc.x,npc.y,'heaven-float').setDepth(9998),
      line: scene.add.graphics().setDepth(9997),
    };
    scene.worldPopulationToast('Đang thả câu.');
  }

  castPoint(npc, ux, uy) {
    const scene=this.scene, river=scene.riverFishSystem;
    if (!scene.canOccupy(npc.x,npc.y) || river.isWaterTile(npc.x,npc.y)) return null;
    let point=null, enteredWater=false;
    for (let distance=4;distance<=142;distance+=4) {
      const x=npc.x+ux*distance,y=npc.y+uy*distance;
      if (river.isWaterTile(x,y)) {
        if (!enteredWater && distance>52) break;
        enteredWater=true;
        const component=river.waterComponent(x,y);
        if (component>=0) {
          if (point && point.component!==component) break;
          point={x,y,component};
        } else if (point) break;
      } else {
        const gx=Math.floor(x/scene.navCell),gy=Math.floor(y/scene.navCell);
        if (enteredWater || gx<0 || gy<0 || gx>=scene.navCols || gy>=scene.navRows || scene.navBlocked[gy*scene.navCols+gx]) break;
      }
    }
    return point;
  }

  stopFishing(message) {
    if (!this.fishing) return;
    this.fishing.float.destroy();
    this.fishing.line.destroy();
    this.fishing.catchSprite?.destroy();
    this.fishing = null;
    if (message) this.scene.worldPopulationToast(message);
  }

  updateFishing() {
    const session = this.fishing, scene = this.scene;
    if (!session) return;
    const { npc, point, float, line } = session, now = scene.time.now;
    if (!npc.alive || !rodEquipped(npc) || scene.possessedNpcId !== npc.id) return this.stopFishing();
    if (session.phase === 'cast' && now >= session.until) {
      session.phase = 'wait'; session.biteAt = now + 1100; session.until = now + 18000;
    }
    if (session.phase === 'wait' && now >= session.biteAt) {
      const id = scene.riverFishSystem.fishNearHook(point.x, point.y, session.component);
      if (id) {
        session.phase = 'bite'; session.fishId = id; session.until = now + 3400;
        scene.worldPopulationToast('Cá cắn câu! Nhấn F để giật cần.');
      }
    }
    if (now >= session.until) return this.stopFishing(session.phase === 'reel' ? null : 'Chưa bắt được cá. Hãy thử vị trí khác.');
    const tip = scene.rodTip(npc, session.direction);
    const t = session.phase === 'cast' ? Math.min(1, (now - session.started) / 460)
      : session.phase === 'reel' ? (session.until - now) / 550 : 1;
    float.setPosition(Math.round(tip.x + (point.x - tip.x) * t), Math.round(tip.y + (point.y - tip.y) * t))
      .setFrame(session.phase === 'bite' ? 1 + Math.floor(now / 110) % 2 : 0);
    if (session.caught && !session.catchSprite) session.catchSprite = scene.add.sprite(float.x,float.y,'world-fish-' + session.caught).setDepth(9999);
    session.catchSprite?.setPosition(float.x, float.y);
    line.clear().lineStyle(1, 0xd5dfc5, .86).lineBetween(Math.round(tip.x), Math.round(tip.y), float.x, float.y);
  }
}

import Phaser from 'phaser';
import type { Facing } from './CombatSystem';
import { NPC_STYLE_TEXTURES } from '../dao/CharacterAppearance';

export function createGameAnimations(scene: Phaser.Scene): void {
  const add = (key: string, texture: string, start: number, end: number, frameRate: number, repeat = -1) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(texture, { start, end }), frameRate, repeat });
  };
  const dirs: Facing[] = ['down', 'up', 'left', 'right'];
  const sets: [string, string][] = [['cultivator', 'player']];
  for (const texture of ['character-blackwind', 'character-song-qinghe', 'character-sect', 'character-sect-female', 'character-civilian', 'character-merchant', 'character-guard']) {
    if (scene.textures.exists(texture)) sets.push([texture, texture]);
  }
  for (const texture of NPC_STYLE_TEXTURES) if (scene.textures.exists(texture)) sets.push([texture, texture]);
  for (const [texture, prefix] of sets) {
    dirs.forEach((dir, i) => add(`${prefix}_idle_${dir}`, texture, i * 8, i * 8 + 3, 4));
    dirs.forEach((dir, i) => add(`${prefix}_walk_${dir}`, texture, 32 + i * 8, 39 + i * 8, 9));
    dirs.forEach((dir, i) => add(`${prefix}_run_${dir}`, texture, 64 + i * 8, 71 + i * 8, 11));
    for (let combo = 1; combo <= 3; combo++) dirs.forEach((dir, i) => {
      const row = 12 + (combo - 1) * 4 + i;
      add(`${prefix}_attack_${combo}_${dir}`, texture, row * 8, row * 8 + 5, 10, 0);
    });
    dirs.forEach((dir, i) => add(`${prefix}_cast_${dir}`, texture, (24 + i) * 8, (24 + i) * 8 + 7, 9, 0));
    dirs.forEach((dir, i) => add(`${prefix}_hurt_${dir}`, texture, (28 + i) * 8, (28 + i) * 8 + 3, 9, 0));
    dirs.forEach((dir, i) => add(`${prefix}_death_${dir}`, texture, (32 + i) * 8, (32 + i) * 8 + 7, 7, 0));
  }
  // Optional art review sheets use four columns and only idle/walk rows.
  for (const id of ['C01','C02','C03','C04','C05']) {
    const texture=`prototype-${id}`;
    if (!scene.textures.exists(texture)) continue;
    dirs.forEach((dir,i)=>{
      add(`${texture}_idle_${dir}`,texture,i*4,i*4+3,id==='C05'?3.33:4.17);
      add(`${texture}_walk_${dir}`,texture,16+i*4,19+i*4,1000/140);
    });
  }
  const directions8=['down','down_right','right','up_right','up','up_left','left','down_left'] as const;
  for(const id of ['C01','C02','C03','C04','C05']){
    const texture=`prototype8-${id}`;if(!scene.textures.exists(texture))continue;
    const a5Enabled=id==='C03'&&new URLSearchParams(location.search).get('devtest')==='1'&&new URLSearchParams(location.search).get('gfx5b4c5')==='1';
    if(a5Enabled){
      directions8.forEach((dir,i)=>{
        add(`${texture}_idle_${dir}`,texture,i,i,4);
        add(`${texture}_walk_${dir}`,texture,8+i*6,13+i*6,1000/120);
      });
      continue;
    }
    directions8.forEach((dir,i)=>{
      add(`${texture}_idle_${dir}`,texture,i*4,i*4+3,id==='C05'?1000/300:1000/240);
      add(`${texture}_walk_${dir}`,texture,32+i*6,37+i*6,1000/120);
    });
    add(`${texture}_sit_enter`,texture,80,83,1000/140,0);
    add(`${texture}_cultivate`,texture,84,87,1000/300);
    add(`${texture}_sit_exit`,texture,88,90,1000/140,0);
    add(`${texture}_hit`,texture,91,93,10,0);
    add(`${texture}_death`,texture,94,97,1000/160,0);
  }
  for (const kind of ['wolf', 'rabbit']) {
    add(`${kind}_idle`, kind, 0, 5, 4);
    add(`${kind}_walk`, kind, 6, 11, 9);
    add(`${kind}_hit`, kind, 12, 17, 12, 0);
    add(`${kind}_death`, kind, 18, 23, 8, 0);
  }
  add('fx_slash', 'slash-arc', 0, 5, 14, 0);
  add('fx_impact', 'impact-spark', 0, 5, 15, 0);
  add('fx_burst', 'spirit-burst', 0, 7, 10, 0);
  add('fx_bolt', 'qi-bolt', 0, 7, 14, -1);
  add('cultivation-aura', 'spirit-aura', 0, 7, 8);
  add('realm-ascension', 'realm-ascension', 0, 7, 9, 0);
  add('foundation-breakthrough', 'foundation-breakthrough', 0, 11, 10, 0);
}

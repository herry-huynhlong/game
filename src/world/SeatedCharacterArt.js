import { rigFor } from './CharacterAssetRegistry.js';

// Integer-pixel panels for the folded legs, lap, robe and sleeves.
// Heads, hair and facial details continue to use the character's modular atlas.
const outfits={
  taoist:['#344555','#487990','#70a6a8','#dce4c9','#cbab70'],
  fairy:['#343753','#576d9a','#90a9c0','#ebdce4','#e7bf8e'],
  demon:['#292133','#632e41','#a04854','#ccb59a','#b58c68'],
  swordsman:['#273142','#395776','#6991aa','#decdb0','#bfaa75'],
  monk:['#40302b','#9a5331','#d0884f','#efcd83','#eac391'],
  civilian:['#253634','#47654a','#7f9668','#deceac','#a78b61'],
  workwear:['#322d29','#644e40','#9e805d','#ddc5a8','#c28e5a'],
};
const variants={moon:['#293750','#3e6089','#788fad','#d6dcec','#a0bfd0'],
  ember:['#3a282f','#813b43','#bd6b55','#f3d3b3','#d8aa6e'],
  earth:['#3e342c','#765c48','#9d8060','#e8d5b5','#ceaa75']};

function pixels(ctx,color,points){
  ctx.fillStyle=color;
  const ys=points.map(p=>p[1]);
  for(let y=Math.floor(Math.min(...ys));y<Math.max(...ys);y++){
    const edges=[];
    for(let i=0;i<points.length;i++){
      const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
      if((ay>y+.5)===(by>y+.5))continue;
      edges.push(ax+(bx-ax)*(y+.5-ay)/(by-ay));
    }
    edges.sort((a,b)=>a-b);
    for(let i=0;i+1<edges.length;i+=2){
      const x=Math.round(edges[i]);ctx.fillRect(x,y,Math.round(edges[i+1])-x,1);
    }
  }
}

// Source collar attachment points in each standing atlas, before cropping.
// Order is down, up, left, right. Rear poses are anchored to the nape.
const collar={
  original:[[32,39],[32,37],[28,37],[36,37]],
  elder:[[32,32],[32,31],[27,32],[36,32]],
  fairy:[[32,22],[32,22],[27,23],[37,23]],
  demon:[[32,22],[32,24],[29,23],[35,23]],
  monk:[[32,18],[32,18],[32,18],[32,18]],
  swordsman:[[32,22],[32,22],[29,22],[35,22]],
  villageMan:[[32,23],[32,23],[29,23],[35,23]],
  villageWoman:[[32,23],[32,23],[29,23],[35,23]],
  workMan:[[32,23],[32,23],[29,23],[35,23]],
  workWoman:[[32,23],[32,23],[29,23],[35,23]],
};
const directions=['down','up','left','right'];

export function meditationAnchors(look,direction,stage,breath=0){
  const index=Math.max(0,directions.indexOf(direction)),side=index>=2;
  const source=collar[rigFor(look)][index];
  const center=side?index===2?29:35:32;
  const top=stage===1?Math.round((source[1]+59)*.5):stage===2?54:59;
  const neck=[center,top+breath];
  return {source,neck,body:[center,top+breath+7],shift:[neck[0]-source[0],neck[1]-source[1]],torsoLift:59-neck[1]};
}

export function seatedTexture(textures,look,direction,stage,breath){
  const side=direction==='left'||direction==='right',back=direction==='up';
  const key=['seated',look.outfit,look.outfitColor,look.bodyType,direction,stage,breath].join('-');
  if(textures.exists(key))return key;
  const canvas=textures.createCanvas(key,64,96),ctx=canvas.getContext();
  const [shade,cloth,lit,inner,trim]=variants[look.outfitColor]??outfits[look.outfit]??outfits.taoist;
  const broad=look.bodyType==='male_strong'?3:look.bodyType==='female_slender'?-2:0;
  const loose=['taoist','fairy','demon'].includes(look.outfit)?3:0;
  const outline='#202329',skin='#d7a789',skinLit='#efc6a2';
  const sign=direction==='left'?-1:1;
  const xShift=side?sign*3:0;
  const drop=meditationAnchors(look,direction,stage,breath).torsoLift;
  const kneeRise=stage===1?8:stage===2?4:0;
  const p=(color,coords)=>pixels(ctx,color,coords.map(([x,y])=>[x+xShift,y]));
  p('#1c3030',[[10,90],[18,87],[43,87],[53,90],[49,94],[20,94]]);
  p(outline,[[12-stage,82],[20,76-kneeRise],[29,75],[34,77],[43,76-kneeRise],[52+stage,82],[54+stage,89],[49,93],[17,93],[10-stage,89]]);
  p(shade,[[13-stage,84],[20,77-kneeRise],[31,79],[37,78],[43,78-kneeRise],[52+stage,84],[49,91],[18,91]]);
  p(cloth,[[13-stage,84],[20,78-kneeRise],[29,79],[35,84],[26,89],[15,88]]);
  p(lit,[[14-stage,84],[20,79-kneeRise],[28,81],[23,82],[19,86],[15,86]]);
  p(cloth,[[30,87],[41,79-kneeRise],[45,79-kneeRise],[51+stage,84],[47,89],[39,91],[25,91]]);
  p(lit,[[34,85],[42,80-kneeRise],[46,82],[40,84],[38,87],[31,88]]);
  if(!back)p(outline,[[23,86],[30,86],[33,88],[30,90],[22,90],[19,89]]);
  p(outline,[[21-broad,61-drop],[26,59-drop],[37,59-drop],[43+broad,63-drop],[47+broad+loose,77],
    [40,84],[23,84],[17-broad-loose,77]]);
  p(cloth,[[22-broad,62-drop],[27,60-drop],[36,60-drop],[42+broad,64-drop],[44+broad,77],[38,81],[22,82],[19-broad,76]]);
  p(shade,[[34,62-drop],[42+broad,64-drop],[44+broad,77],[38,82],[31,81],[37,77]]);
  p(outline,[[27,56-drop],[36,56-drop],[37,62-drop],[33,66-drop],[27,62-drop]]);
  p(back?shade:skin,[[28,57-drop],[35,57-drop],[35,62-drop],[32,64-drop],[28,61-drop]]);
  if(back){
    p(lit,[[22-broad,63-drop],[32,61-drop],[40,64-drop],[37,66-drop],[24,68-drop]]);
    p(trim,[[21,76],[42,75],[42,77],[22,78]]);
  }else {
    const seam=side?28+sign*3:30;
    p(inner,[[26,61-drop],[30,61-drop],[seam,66-drop],[38,61-drop],[39,64-drop],[seam-1,74-drop],[seam-4,73-drop]]);
    p(trim,[[21,75],[40,75],[40,77],[22,78]]);
    p(inner,[[27,78],[37,78],[40,84],[36,87],[25,87]]);
    p(lit,[[28,78],[33,78],[32,84],[27,86]]);
  }
  const sleeveY=67-drop;
  p(shade,[[20-broad,sleeveY],[24,sleeveY+2],[25,77],[20,82],[15-broad-loose,80],[15-broad-loose,76]]);
  p(lit,[[20-broad,sleeveY],[22,sleeveY+2],[19,76],[15-broad,77],[16-broad,73]]);
  p(cloth,[[39,sleeveY],[43+broad,sleeveY+1],[47+broad+loose,77],[44,82],[39,82],[36,79],[38,74]]);
  p(lit,[[41,sleeveY+1],[43+broad,sleeveY+2],[46+broad,77],[44,78],[40,75]]);
  if(!back){
    p(skin,[[18,79],[24,77],[27,79],[26,82],[19,83]]);
    p(skinLit,[[19,79],[24,78],[25,79],[21,81],[19,81]]);
    if(!side||direction==='right'){
      p(skin,[[37,78],[41,79],[45,82],[43,84],[37,83],[35,81]]);
      p(skinLit,[[37,78],[40,79],[40,81],[36,81]]);
    }
  }
  if(look.outfit==='demon'){
    p(trim,[[18-broad,63-drop],[24,61-drop],[25,63-drop],[20-broad,66-drop]]);
    p(trim,[[39,62-drop],[43+broad,63-drop],[46+broad,67-drop],[40,66-drop]]);
  }
  canvas.refresh();
  return key;
}

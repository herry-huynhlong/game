import {itemIcon} from '../dao/ItemCatalog.ts';
import {commerceProduct} from './CommerceCatalog.js';
import {rect} from './UndergroundArt.js';

const ink='#38272d', brass='#d3a56a', wood='#6f4039', warm='#af7354', pale='#f5cc81';
const fill=(g,points,color)=>{
  g.fillStyle=color;g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);
  g.closePath();g.fill();
};
const trim=(g,x,y,w,h,color=brass)=>{g.strokeStyle=color;g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);};
function inlay(g,x,y,color=brass){
  fill(g,[[x,y-7],[x+7,y],[x,y+7],[x-7,y]],color);
  fill(g,[[x,y-4],[x+4,y],[x,y+4],[x-4,y]],'#722e37');
  rect(g,x-1,y-1,3,3,pale);
}
function mat(g,x,y,w,h,color='#70343f'){
  rect(g,x+2,y+3,w,h,'#392a2b');rect(g,x,y,w,h,color);
  trim(g,x,y,w,h);trim(g,x+4,y+4,w-8,h-8,'#b67157');
  for(let u=x+13;u<x+w-10;u+=18){inlay(g,u,y+8);inlay(g,u,y+h-8);}
  for(let v=y+26;v<y+h-20;v+=18){inlay(g,x+8,v);inlay(g,x+w-8,v);}
}
function panels(g,x,y,w,h,lattice=false){
  rect(g,x,y,w,h,ink);rect(g,x+2,y+2,w-4,h-5,wood);
  for(let u=x+5;u<x+w-8;u+=18){
    rect(g,u,y+4,13,h-11,lattice?'#966543':'#884d42');
    trim(g,u,y+4,13,h-11,'#ae784f');
    if(lattice){
      for(let yy=y+7;yy<y+h-7;yy+=5)rect(g,u,yy,13,1,'#4c3031');
      for(let xx=u+3;xx<u+13;xx+=4)rect(g,xx,y+5,1,h-12,'#543335');
    }else if(h>19)inlay(g,u+6,y+Math.floor(h/2));
  }
  rect(g,x,y+h-4,w,2,'#a66d46');
}
function light(g,x,y,r){
  const grad=g.createRadialGradient(x,y,1,x,y,r);grad.addColorStop(0,'#ef9b5140');grad.addColorStop(1,'#ef9b5100');
  g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
}
function lantern(g,x,y){
  rect(g,x,y-9,1,6,brass);
  fill(g,[[x-5,y-4],[x+5,y-4],[x+7,y],[x+4,y+6],[x-4,y+6],[x-7,y]],'#d57140');
  fill(g,[[x-2,y-4],[x+2,y-4],[x+3,y+3],[x,y+6],[x-3,y+3]],'#fed380');
  rect(g,x-4,y+6,9,2,'#9f572f');rect(g,x,y+8,1,5,brass);
}
function curtain(g,x,y,w,h){
  fill(g,[[x,y],[x+w,y],[x+w-4,y+h-2],[x+w-12,y+h],[x+w-23,y+7],[x+24,y+7],[x+12,y+h],[x+3,y+h-2]],'#80343b');
  for(let i=0;i<3;i++){
    rect(g,x+4+i*4,y+4,2,h-9-i*2,'#ac5447');
    rect(g,x+w-6-i*4,y+4,2,h-9-i*2,'#a95145');
  }
  rect(g,x-2,y-1,w+4,2,brass);rect(g,x+2,y+h-8,12,2,brass);rect(g,x+w-14,y+h-8,12,2,brass);
}
function stoneStage(g,x,y,w,h){
  rect(g,x+4,y+6,w,h,'#342b30');rect(g,x,y,w,h,'#716759');
  for(let j=y+4;j<y+h-4;j+=9){
    rect(g,x+2,j,w-4,1,'#8b7d67');
    for(let i=x+8+(j%3)*8;i<x+w-4;i+=22)rect(g,i,j,1,8,'#554d47');
  }
  rect(g,x,y+h-5,w,4,'#4d4542');rect(g,x+1,y+h-5,w-2,1,'#b1a080');rect(g,x,y,w,2,'#b1a080');
}
export function auctionFloorArt(floor,tile){
  const canvas=document.createElement('canvas');canvas.width=floor.width*tile;canvas.height=floor.height*tile;
  const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  rect(g,0,0,w,h,'#25202a');
  rect(g,tile,tile,w-2*tile,h-2*tile,'#65473d');
  const tones=['#6c4c40','#68493d','#745043','#62453a'];
  for(let y=tile;y<h-tile;y+=8)for(let x=tile;x<w-tile;x+=62){
    const row=((y-tile)/8)|0, col=((x-tile)/62)|0, start=x+(col?row%3*6:0);
    const span=Math.min(62+(col?0:row%3*6),w-tile-start);
    if(span<1)continue;
    rect(g,start,y,span,8,tones[(col*5+row*7+(col^row))%4]);
    rect(g,start,y,span,1,'#86614c');rect(g,start,y+7,span,1,'#503732');
    rect(g,start,y,1,8,'#4b3430');
    if((row+col)%4===0){rect(g,start+5,y+4,Math.min(29,span-5),1,'#805844');}
  }
  panels(g,8,7,w-16,56,true);
  panels(g,8,h-23,w-16,21);
  for(let x=40;x<w-16;x+=112){
    rect(g,x-5,12,12,55,ink);rect(g,x-2,12,6,49,'#984d40');
    rect(g,x-1,14,2,45,'#ba7353');rect(g,x-4,59,10,4,brass);
    light(g,x+16,58,43);lantern(g,x+16,42);
  }
  rect(g,18,64,5,h-90,'#92654c');rect(g,w-23,64,5,h-90,'#92654c');
  if(floor.level===0){
    stoneStage(g,12*tile,3*tile,22*tile,7*tile);
    mat(g,14*tile,4*tile,18*tile,5*tile);
    curtain(g,14*tile,3*tile,18*tile,35);
    for(let j=0;j<3;j++)stoneStage(g,21*tile-j*4,10*tile+j*5,5*tile+j*8,7);
    for(const x of [7,24])mat(g,x*tile,11*tile,15*tile,20*tile,'#753843');
    mat(g,21*tile,32*tile,5*tile,4*tile,'#783444');
  }else if(floor.level===1){
    for(const x of [3,16,29])for(const y of [4,23]){
      mat(g,x*tile,y*tile,9*tile,8*tile,'#50465a');
      curtain(g,x*tile,y*tile,9*tile,24);
    }
    const x=14*tile,y=17*tile;
    rect(g,x,y,13*tile,4*tile,'#2d2431');
    rect(g,x+8,y+6,13*tile-16,4*tile-12,'#513442');
    mat(g,x+30,y+13,13*tile-60,4*tile-26,'#662f3d');
    panels(g,x,y+4*tile-10,13*tile,12);
    for(let u=x+5;u<x+13*tile;u+=18)rect(g,u,y-2,4,11,brass);
  }else{
    for(const x of [3,16,23])mat(g,x*tile,5*tile,(x===3?11:6)*tile,7*tile,'#514957');
    mat(g,3*tile,13*tile,11*tile,5*tile,'#514957');
    mat(g,23*tile,18*tile,7*tile,5*tile,'#63404a');
  }
  for(const [left,top,right,bottom] of floor.partitions){
    if(left!==right)continue; // The wider partition is the visible balcony void.
    const x=left*tile+7;
    for(let y=top*tile;y<=bottom*tile;y+=tile){
      rect(g,x+4,y+4,14,tile+2,'#3b2b30');
      rect(g,x,y,11,tile,'#70493f');
      rect(g,x+1,y,3,tile,'#ba8256');
      rect(g,x+4,y+3,5,15,'#ac926a');rect(g,x+6,y+3,1,15,'#6e5145');
      rect(g,x,y,12,3,'#956445');
    }
  }
  for(const stair of [floor.entry,floor.down].filter(Boolean)){
    const x=stair.x*tile+12,y=stair.y*tile+18;
    if(stair===floor.entry&&floor.level===0)curtain(g,x-27,y-35,54,31);
    else staircaseArt(g,x,y);
  }
  return canvas;
}

function staircaseArt(g,x,y){
  fill(g,[[x-25,y-27],[x+25,y-27],[x+22,y+3],[x-22,y+3]],ink);
  for(let i=0;i<6;i++){
    const inset=Math.floor(i/2);
    rect(g,x-21+inset,y-25+i*5,42-2*inset,4,i%2?'#927357':'#a5805f');
    rect(g,x-21+inset,y-25+i*5,42-2*inset,1,'#d7b37c');
  }
  for(const side of [-1,1]){
    rect(g,x+side*22-1,y-28,3,31,'#a86b4b');
    rect(g,x+side*22-3,y-29,7,3,brass);rect(g,x+side*22-3,y,7,3,brass);
  }
}

export function auctionPropArt(g,x,y,prop){
  const shadow=(w)=>rect(g,x-w/2,y+2,w,4,'#392b2c');
  const cabinet=(w,h)=>{shadow(w+6);panels(g,x-w/2,y-h,w,h);rect(g,x-w/2-1,y-h,w+2,3,warm);};
  switch(prop.kind){
    case 'seat':
      shadow(26);rect(g,x-12,y-15,24,16,ink);rect(g,x-9,y-4,18,6,'#aa594e');rect(g,x-8,y-4,16,1,'#d28262');
      for(const sign of [-1,1]){
        rect(g,x+sign*11-1,y-15,3,17,warm);rect(g,x+sign*11-2,y-16,5,2,brass);
        rect(g,x+sign*10-2,y-5,5,2,brass);
      }
      inlay(g,x,y-10);break;
    case 'tea':
      cabinet(26,10);rect(g,x-10,y-13,20,4,'#b07c58');
      rect(g,x-2,y-16,6,5,'#759484');rect(g,x+4,y-15,2,3,'#b6bea0');
      rect(g,x-8,y-13,3,2,'#e0cfaa');rect(g,x+8,y-13,3,2,'#e0cfaa');break;
    case 'column':
      shadow(25);rect(g,x-9,y-3,18,7,'#827664');rect(g,x-6,y-46,12,43,'#913f39');
      rect(g,x-5,y-44,3,39,'#c27052');rect(g,x-7,y-46,14,3,brass);rect(g,x-7,y-8,14,3,brass);
      for(let i=0;i<3;i++)inlay(g,x,y-16-i*10);
      light(g,x+13,y-25,31);lantern(g,x+13,y-29);break;
    case 'plant':
      shadow(25);fill(g,[[x-9,y-9],[x+9,y-9],[x+6,y+2],[x-6,y+2]],'#7a635b');
      rect(g,x-9,y-8,18,2,'#c39b76');rect(g,x-1,y-25,3,16,'#7c5a42');
      fill(g,[[x-13,y-18],[x-8,y-27],[x-3,y-24],[x+2,y-33],[x+11,y-29],[x+14,y-20],[x+7,y-16],[x-8,y-15]],'#416551');
      rect(g,x-8,y-24,6,3,'#8c9c65');rect(g,x+3,y-29,5,3,'#899c66');break;
    case 'screen':
      cabinet(44,33);trim(g,x-20,y-31,40,27);
      for(const off of [-13,0,13]){rect(g,x+off-5,y-29,9,20,'#b59a72');inlay(g,x+off,y-18,'#a87f58');}
      break;
    case 'painting':
      shadow(29);rect(g,x-14,y-26,28,27,ink);rect(g,x-12,y-24,24,23,brass);
      rect(g,x-10,y-22,20,19,'#c6ba91');
      fill(g,[[x-9,y-6],[x-4,y-16],[x+1,y-9],[x+6,y-14],[x+9,y-6]],'#63715f');
      rect(g,x-6,y-5,12,1,'#879985');rect(g,x+5,y-20,1,4,'#905d44');break;
    case 'vase':
      shadow(23);fill(g,[[x-4,y-17],[x+5,y-17],[x+3,y-13],[x+9,y-8],[x+7,y],[x-7,y],[x-9,y-8],[x-3,y-13]],'#52716e');
      rect(g,x-4,y-17,9,2,'#d2bc86');rect(g,x-7,y-9,14,2,'#87a59a');inlay(g,x,y-5,'#b1b48e');break;
    case 'shelf':
    case 'rack':
      cabinet(47,29);
      for(let u=x-18;u<x+17;u+=7){
        if(prop.kind==='shelf')rect(g,u,y-23+(u%3),4,14,u%2?'#7b8064':'#be8259');
        else {rect(g,u,y-23,2,15,'#827e6d');rect(g,u-2,y-17,6,2,brass);}
      }
      rect(g,x-21,y-8,42,2,brass);break;
    case 'podium':
    case 'pedestal':
      shadow(65);stoneStage(g,x-30,y-13,60,16);
      fill(g,[[x-23,y-12],[x-18,y-21],[x+18,y-21],[x+23,y-12],[x+16,y-6],[x-16,y-6]],wood);
      rect(g,x-18,y-19,36,2,brass);inlay(g,x,y-13);break;
    case 'cargo':
      cabinet(36,18);trim(g,x-17,y-17,34,15,brass);rect(g,x-4,y-11,8,7,brass);rect(g,x-1,y-9,2,3,ink);break;
    case 'seal':
      for(let i=0;i<3;i++)trim(g,x-20+i*5,y-20+i*5,40-i*10,40-i*10,'#61978e');
      inlay(g,x,y,'#79b5a2');break;
    case 'balcony':
      panels(g,x-72,y-12,144,13);break;
    default:
      cabinet(prop.kind==='desk'?51:39,23);rect(g,x-9,y-24,18,4,'#c1a784');rect(g,x+11,y-27,3,7,'#797949');
      light(g,x-21,y-20,23);lantern(g,x-21,y-24);
  }
}

export function drawAuctionFurniture(g,x,y,prop,cache){
  let frame=cache.get(prop.kind);
  if(!frame){
    frame=document.createElement('canvas');frame.width=160;frame.height=76;
    auctionPropArt(frame.getContext('2d'),80,61,prop);
    cache.set(prop.kind,frame);
  }
  g.drawImage(frame,x-80,y-61);
}

export function displayTreasure(scene,g,row,x,y,at){
  const item=commerceProduct(row.itemId);
  if(!item)return;
  const f=item.arm?scene.textures.get('martial-arms').get(item.arm.icon):scene.textures.get('commerce-items').get();
  if(!f?.source.image)return;
  const offset=Math.round(Math.sin(at/270)*2);
  const [px,py]=item.arm?[f.cutX,f.cutY]:itemIcon(row.itemId);
  const width=item.arm?24:32;
  const tint=item.arm?.element==='thunder'?'#c7a9ff':item.arm?.element==='fire'?'#f19b5c':'#d8be7f';
  const raised=y-44+offset;
  g.save();g.globalAlpha=.42;fill(g,[[x-15,y-14],[x,y-18],[x+15,y-14],[x,y-11]],tint);g.globalAlpha=1;
  g.drawImage(f.source.image,px,py,width,32,x-width*.75,raised-11,width*1.5,48);
  if(item.arm?.element==='thunder'||item.arm?.element==='fire'){
    for(let i=0;i<5;i++){
      const cycle=(Math.floor(at/60)+i*7)%21;
      const sx=x+(i*17%27)-13,sy=raised+22-cycle;
      rect(g,sx,sy,2,2,tint);
      if(i%2)rect(g,sx+2,sy-2,1,2,tint);
    }
  }
  g.restore();
}

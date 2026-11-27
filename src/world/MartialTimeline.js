const slogans={
  'myriad-unite':['Hôm nay, ta mượn kiếm chém kẻ địch!','VẠN KIẾM QUY TÔNG!'],
  'nine-dragons':['Cửu thiên chứng đạo, vạn lôi nghe lệnh!','CỬU LONG LÔI KIẾP!'],
  'crow-descent':['Đại nhật lâm thế, vạn hỏa triều tông!','KIM Ô GIÁNG THẾ!'],
  'burning-field':['Hỏa long xuất thế, phần thiên luyện địa!','PHẦN THIÊN HỎA VỰC!'],
  'scarlet-dragon':['Long hồn thức tỉnh, chân viêm phần thế!','XÍCH LONG PHẦN ĐỊA!'],
  'thunder-earth':['Cửu tiêu lôi động, thiên uy giáng thế!','THIÊN LÔI TRẤN THẾ!'],
  'sky-split':['Lấy thiên địa làm kiếm, lấy vạn vật làm phong!','NHẤT KIẾM KHAI THIÊN!'],
};
const visualSlogans={
  'nine-suns':['Cửu dương đồng thiên, chân hỏa phần thế!','CỬU DƯƠNG PHẦN THIÊN!'],
  'thunder-host':['Cửu tiêu lôi động, thiên uy giáng thế!','LÔI ĐÌNH VẠN QUÂN!'],
};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const projectileSkill=skill=>['projectile','homing'].includes(skill.delivery);

export function martialTimeline(skill,swords=0){
  if(skill.id==='myriad-unite')return {
    chant:1000,charge:2000,manifest:5000,release:6000,impact:6300,aftermath:8950,recovery:9500,complete:10000,
    count:Math.max(3,swords),interval:Math.min(240,1750/Math.max(1,swords-1)),slogan:slogans[skill.id],
  };
  const ritual=skill.grade>=3&&(skill.stage===2||slogans[skill.id]);
  const release=ritual?Math.max(1950,skill.windup+1100):skill.windup;
  const impact=projectileSkill(skill)?release+80:release+(ritual?320:0);
  const duration=skill.hits>1?skill.duration||360:0;
  const aftermath=impact+Math.max(160,duration)+(projectileSkill(skill)?skill.range/Number(projectileSpeed(skill))*1000+180:0);
  return {chant:ritual?380:release*.19,charge:ritual?960:release*.32,manifest:release*.66,release,impact,
    aftermath,recovery:aftermath+380,complete:aftermath+650,count:skill.hits,
    interval:duration/Math.max(1,skill.hits-1),
    slogan:ritual?slogans[skill.id]??['Dẫn linh khí trời đất vào thân!',skill.name.toLocaleUpperCase('vi')]:null,
    visualSlogan:visualSlogans[skill.id]};
}

export function martialPhase(timeline,time){
  for(const [key,phase] of [['chant','prepare'],['charge','chant'],['manifest','charge'],['release','manifestation'],['impact','release'],
    ['aftermath','impact'],['recovery','aftermath'],['complete','recovery']])if(time<timeline[key])return phase;
  return 'complete';
}

export function martialAltitude(cast,time){
  const peak=cast.skill.id==='myriad-unite'?69:['nine-dragons','crow-descent'].includes(cast.skill.id)?46:0;
  return peak*smooth((time-cast.timeline.chant)/1800)*(1-smooth((time-cast.timeline.aftermath)/(cast.timeline.complete-cast.timeline.aftermath)));
}

export function projectileSpeed(skill){
  return { 'myriad-unite':530,'fire-palm':260,'flame-burst':216,'ice-finger':450,'jade-wave':400,'purple-slash':520 }[skill.id]??355;
}

export function swordRing(cast,index,time){
  const angle=index*2.399963+time*.0018,radius=44+(index%3)*19;
  return {x:cast.origin.x+Math.cos(angle)*radius,y:cast.origin.y+Math.sin(angle)*radius*.55,z:62+(index%3)*15,angle};
}

export function borrowedSword(cast,index,time){
  const weapon=cast.swords[index],ring=swordRing(cast,index,time);
  const angle=index*2.399963;
  const home=weapon?.representative||!weapon?.point?
    {x:cast.origin.x+Math.cos(angle)*Math.min(420,170+index*24),y:cast.origin.y+Math.sin(angle)*Math.min(290,135+index*20),z:15}:
    {...weapon.point,z:12};
  const sentAt=cast.timeline.release+index*cast.timeline.interval;
  if(time<sentAt){
    const t=smooth((time-2000-index*115)/Math.max(900,3220-index*110));
    return {x:home.x+(ring.x-home.x)*t,y:home.y+(ring.y-home.y)*t,z:home.z+(ring.z-home.z)*t,angle:Math.atan2(ring.y-home.y,ring.x-home.x)};
  }
  const projectile=cast.projectiles[index];
  if(projectile&&!projectile.done)return {...projectile,angle:Math.atan2(projectile.uy,projectile.ux)};
  if(!projectile)return ring;
  const t=smooth((time-projectile.finishedAt)/Math.min(1500,Math.max(330,10000-projectile.finishedAt)));
  return {x:projectile.x+(home.x-projectile.x)*t,y:projectile.y+(home.y-projectile.y)*t,z:12+35*Math.sin(t*Math.PI),angle:Math.atan2(home.y-projectile.y,home.x-projectile.x)};
}

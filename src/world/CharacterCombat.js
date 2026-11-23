export const AXES={down:[0,1],up:[0,-1],left:[-1,0],right:[1,0]};
export const facing=(x,y)=>Math.abs(x)>Math.abs(y)?(x<0?'left':'right'):(y<0?'up':'down');

// Each entry is [milliseconds, hand reach, hand lift, offhand reach, weight shift, weapon drawing, event].
export const ACTIONS={
  drawSword:[[65,-5,3,-2,-1,'back'],[80,-4,-9,-1,-1,'high'],[75,1,-3,0,0,'guard']],
  swordSlash:[[65,-5,-7,1,-1,'back'],[55,-2,-11,0,-2,'high'],[65,10,-4,-4,2,'cut','strike'],[60,7,2,-3,1,'low'],[70,3,1,-1,0,'guard'],[55,0,0,0,0,'guard']],
  swordDiagonal:[[65,-4,-11,0,-1,'high'],[55,-1,-15,1,-2,'high'],[60,9,1,-4,2,'cut','strike'],[60,6,5,-3,1,'low'],[80,2,-1,0,0,'guard'],[50,0,0,0,0,'guard']],
  swordThrust:[[60,-6,-2,3,-1,'guard'],[50,-2,-3,2,-1,'point'],[65,14,-3,-5,2,'point','strike'],[65,12,-3,-3,2,'point'],[70,4,-2,-1,1,'point'],[55,0,0,0,0,'guard']],
  drawSaber:[[80,-5,4,-2,-1,'low'],[85,-4,-12,0,-1,'high'],[80,2,-2,0,0,'guard']],
  saberSweep:[[85,-8,-7,1,-2,'back'],[70,-7,-12,0,-2,'high'],[80,12,-2,-6,3,'cut','strike'],[80,8,3,-3,2,'low'],[70,4,2,-2,1,'low'],[75,0,0,0,0,'guard']],
  saberOverhead:[[85,-2,-12,2,-1,'high'],[85,-4,-17,3,-2,'high'],[75,11,4,-2,3,'low','strike'],[80,7,6,-4,2,'low'],[75,3,1,-1,0,'guard'],[60,0,0,0,0,'guard']],
  saberSpin:[[85,-9,-4,2,-2,'back'],[75,-5,-9,0,-2,'high'],[75,10,-4,-4,2,'cut','strike'],[75,5,4,-4,1,'low'],[75,-3,2,0,-1,'back'],[65,0,0,0,0,'guard']],
  sheathe:[[90,3,-2,0,0,'guard'],[95,-4,-7,1,-1,'high'],[90,-7,3,0,0,'back']],
  crossbowEquip:[[90,-2,2,0,0,'hold'],[90,1,-3,3,0,'hold'],[80,3,-5,5,0,'hold']],
  crossbowAim:[[180,6,-10,9,0,'aim']],
  crossbowShoot:[[95,5,-9,8,0,'aim'],[65,8,-10,11,0,'aim','bolt'],[70,3,-9,6,-2,'recoil'],[90,5,-8,8,0,'empty']],
  crossbowReload:[[100,2,-2,3,0,'empty'],[120,2,2,0,-1,'empty'],[140,0,0,7,0,'empty'],[110,1,-3,10,0,'reload'],[90,4,-6,8,0,'hold','loaded']],
  mountEnter:[[85,0,-1,1,0,'guard'],[85,1,-6,2,0,'guard'],[90,0,-3,0,0,'guard','seated']],
  dismount:[[85,1,-3,1,0,'guard'],[85,0,-5,0,0,'guard'],[90,0,0,0,0,'guard','landed']],
};
const COMBOS={sword:['swordSlash','swordDiagonal','swordThrust'],saber:['saberSweep','saberOverhead','saberSpin']};

export class CharacterCombat {
  action=null;
  rate=1;
  loaded=true;
  weapon='none';
  combo=0;
  aim=false;

  equip(weapon,direction,animate=true){
    if(this.weapon===weapon)return;
    const previous=this.weapon;
    this.cancel();this.weapon=weapon;this.combo=0;this.aim=false;
    if(!animate)return;
    const action={sword:'drawSword',saber:'drawSaber',crossbow:'crossbowEquip'}[weapon];
    if(action)this.start(action,direction);
    else if(previous==='sword'||previous==='saber')this.start('sheathe',direction,{weapon:previous});
  }

  start(name,direction,data={}){
    if(this.action||!ACTIONS[name]||!AXES[direction])return false;
    this.action={name,direction,frame:0,time:0,data};
    return true;
  }

  attack(direction,data={}){
    if(this.action)return false;
    if(this.weapon==='crossbow')return this.start(this.loaded?'crossbowShoot':'crossbowReload',direction,data);
    const moves=COMBOS[this.weapon];
    if(!moves)return false;
    const accepted=this.start(moves[this.combo],direction,data);
    if(accepted)this.combo=(this.combo+1)%moves.length;
    return accepted;
  }

  advance(ms,emit){
    const active=this.action;
    if(!active)return;
    const frames=ACTIONS[active.name];
    active.time+=ms*this.rate;
    while(this.action===active&&active.time>=frames[active.frame][0]){
      active.time-=frames[active.frame][0];
      if(++active.frame===frames.length){this.action=null;break;}
      const event=frames[active.frame][6];
      if(!event)continue;
      if(event==='bolt')this.loaded=false;
      if(event==='loaded')this.loaded=true;
      emit(event,active);
    }
  }

  pose(direction){
    const active=this.action;
    if(active){
      const spin=['down','left','up','right'];
      const turn=active.name==='saberSpin'?[0,-1,0,1,2,0][active.frame]:0;
      return {direction:spin[(spin.indexOf(active.direction)+turn+4)%4],frame:active.frame,
        values:ACTIONS[active.name][active.frame],weapon:active.data.weapon??this.weapon};
    }
    if(this.weapon==='crossbow')return {direction,frame:0,values:[0,this.aim?6:2,this.aim?-10:-5,this.aim?9:5,0,this.loaded?(this.aim?'aim':'hold'):'empty'],weapon:'crossbow'};
    return null;
  }

  cancel(){this.action=null;}
  get state(){return this.action?.name??(this.weapon==='crossbow'?(this.aim?'crossbowAim':this.loaded?'crossbowHold':'crossbowEmpty'):'idle');}
}

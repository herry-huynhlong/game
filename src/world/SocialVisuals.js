const COLORS={tea:0x98bfa3,tavern:0xc68358,music:0xe3bf81,clinic:0xc4ceed};
export function makeWorldSpeech(scene){
  return scene.add.text(0,0,'',{
    color:'#f7eed2',fontFamily:'Georgia, serif',fontSize:'13px',backgroundColor:'#242f27',
    padding:{x:8,y:6},wordWrap:{width:174,useAdvancedWrap:true},align:'center',
  }).setOrigin(.5,1).setDepth(20012).setVisible(false);
}

export class SocialVisuals {
  constructor(scene){
    this.scene=scene;
    this.graphics=scene.add.graphics().setDepth(7900);
    this.bubbles=[];
    this.enabled=true;
    const toggle=document.createElement('button');
    toggle.type='button';toggle.textContent='Bong bóng hội thoại';
    toggle.setAttribute('aria-pressed','true');
    toggle.onclick=()=>{this.enabled=!this.enabled;toggle.setAttribute('aria-pressed',String(this.enabled));this.next=0;};
    document.querySelector('#world-dev-menu .map-regions')?.append(toggle);
    scene.events.once('shutdown',()=>toggle.remove());
    for(const venue of scene.society.places.values()){
      if(venue.id==='inn')continue;
      for(const s of venue.seats){
        const chair=scene.add.graphics({x:s.x,y:s.y}).setDepth(s.y-1);
        chair.fillStyle(0x273b34,.38).fillEllipse(2,1,17,9);
        chair.fillStyle(0x514031,1).fillRect(-7,-7,14,8);
        chair.fillStyle(0xb48a5a,1).fillRect(-6,-8,12,4);
        chair.fillStyle(0x70543c,1).fillRect(-6,-4,2,7).fillRect(5,-4,2,7);
      }
    }
  }

  bubble(index){
    return this.bubbles[index]??(this.bubbles[index]=makeWorldSpeech(this.scene));
  }

  update(time){
    if(time<(this.next??0))return;
    this.next=time+125;
    const scene=this.scene,society=scene.society,view=scene.cameras.main.worldView,zoom=scene.cameras.main.zoom;
    const now=society.now(),g=this.graphics, occupied=[];
    g.clear();
    const visible=(x,y)=>x>=view.left&&x<=view.right&&y>=view.top&&y<=view.bottom;
    let count=0;
    for(const [id,visit] of Object.entries(society.visits)){
      if(visit.phase!=='using')continue;
      const n=scene.scheduler.byId.get(id)?.npc;
      if(!n||!visible(n.x,n.y)||!society.isSeated(n))continue;
      const seat=society.seatFor(n),direction=seat?.facing;
      const dx=direction==='left'?-1:direction==='right'?1:0;
      const phase=(now+(n.aiProfile?.seed??0))%13;
      if(zoom>=.65&&['tea','tavern'].includes(visit.venue)&&phase<6){
        const lifting=phase<3,x=Math.round(n.x+dx*(lifting?8:5)),y=Math.round(n.y-(lifting?13:21));
        const tea=visit.venue==='tea';
        g.fillStyle(0x704227,1).fillRect(x-4,y+2,9,3);
        g.fillStyle(COLORS[visit.venue],1).fillRect(x-2,y-3,5,5);
        g.fillStyle(0xeee2b7,1).fillRect(x-2,y-4,6,2);
        g.fillStyle(tea?0x8c6b46:0xae5346,1).fillRect(x-1,y-3,3,1);
        if(tea)g.fillStyle(0xe6ebc5,.65).fillRect(x,y-8,1,2).fillRect(x+1,y-11,1,2);
      }
    }
    const music=society.places.get('music');
    if(music&&society.onDuty(music)&&Object.values(society.visits).some(v=>v.venue==='music'&&v.phase==='using')&&visible(music.staff.x,music.staff.y)){
      const {x,y}=music.staff;
      g.fillStyle(0x392b2a,1).fillRect(x-13,y-9,27,5);
      g.fillStyle(0xa5744b,1).fillRect(x-12,y-11,24,4);
      g.fillStyle(0xdbb87f,1).fillRect(x-10,y-10,20,1).fillRect(x-10,y-8,20,1);
      g.fillStyle(0xe4ac83,1).fillRect(x-9+(now%4)*3,y-12,4,3).fillRect(x+4-(now%3)*2,y-11,3,2);
      for(let i=0;i<3;i++){
        const step=(now+i*4)%12,px=Math.round(x+i*8-8+step/2),py=Math.round(y-17-step);
        g.fillStyle(COLORS.music,.9-step*.045).fillRect(px,py,2,5).fillRect(px-3,py+4,4,2).fillRect(px+1,py,3,1);
      }
    }
    if(this.enabled)for(const conversation of society.social.current()){
      const line=conversation.lines.at(-1),n=line&&scene.scheduler.byId.get(line.speaker)?.npc;
      if(!n||!visible(n.x,n.y)||count>=4||!society.isSeated(n))continue;
      const small=zoom<.63,w=small?34:188;
      if(occupied.some(b=>Math.abs(n.x-b.x)*zoom<w&&Math.abs(n.y-b.y)*zoom<(small?24:64)))continue;
      occupied.push(n);
      const bubble=this.bubble(count++),text=small?'···':line.text;
      if(bubble.text!==text)bubble.setText(text);
      bubble.setPosition(Math.round(n.x),n.y-(small?28:34)).setScale(1/zoom).setVisible(true);
      bubble.setData('speaker',n.id);
      if(!small)g.fillStyle(0xeed8a2,.86).fillRect(Math.round(n.x)-1,Math.round(n.y)-21,3,2);
    }
    for(let i=count;i<this.bubbles.length;i++)this.bubbles[i].setVisible(false);
  }
}

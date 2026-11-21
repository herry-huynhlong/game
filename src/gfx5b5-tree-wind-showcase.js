import Phaser from 'phaser';

const species=[
  {key:'ancient',label:'Cổ thụ GFX.5B.2',url:'/assets/props/ancient-tree-v2.png',w:112,h:96,frames:[11,12,13,14],dur:[250,250,250,250]},
  {key:'T03',label:'Tùng núi',url:'/assets/world-rebuild-1b2/T03-mountain-pine.png',w:96,h:112,frames:[0,1,2,3,4,5,6,7],dur:[160,160,180,160,160,180,160,160]},
  {key:'T04',label:'Cây lá rộng',url:'/assets/world-rebuild-1b2/T04-broadleaf.png',w:96,h:112,frames:[0,1,2,3,4,5,6,7],dur:[170,180,170,170,180,170,170,180]},
  {key:'T05',label:'Liễu rủ',url:'/assets/world-rebuild-1b2/T05-willow.png',w:96,h:112,frames:[0,1,2,3,4,5,6,7],dur:[200,200,220,200,200,220,200,200]},
  {key:'T06',label:'Cổ mộc yêu lâm',url:'/assets/world-rebuild-1b2/T06-monster-ancient.png',w:96,h:112,frames:[0,1,2,3,4,5,6,7],dur:[220,220,240,220,220,240,220,220]},
  {key:'bamboo',label:'Trúc T02',url:'/assets/props/T02-bamboo-v2.png',w:96,h:96,frames:[0,1,2,3,4,5,6,7],dur:Array(8).fill(200)},
];
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
let liveScene;
class WindShowcase extends Phaser.Scene{
  constructor(){super('tree-wind-showcase');this.paused=false;this.step=0;this.zoom=2;this.items=[];this.selected=0}
  preload(){for(const s of species)this.load.spritesheet(s.key,s.url,{frameWidth:s.w,frameHeight:s.h})}
  create(){liveScene=this;this.cameras.main.setBackgroundColor('#263d31');const cols=3,cellW=250,cellH=280,scale=this.zoom;species.forEach((s,i)=>{const col=i%cols,row=Math.floor(i/cols),cx=160+col*cellW,cy=157+row*cellH;const sprite=this.add.sprite(cx,cy,s.key,s.frames[0]).setScale(scale).setDepth(1).setInteractive({useHandCursor:true});sprite.setName(s.key);const label=this.add.text(cx,cy+63*scale,s.label,{fontFamily:'system-ui',fontSize:`${12*scale}px`,color:'#f4e8c4',stroke:'#1b2d23',strokeThickness:3}).setOrigin(.5).setDepth(2);const item={sprite,label,s,cx,cy,phase:hash(s.key+'-showcase')%s.dur.reduce((a,b)=>a+b,0),last:-1};sprite.on('pointerdown',()=>{this.selected=i;this.applyZoom()});this.items.push(item)});
    document.getElementById('wind').onclick=e=>{this.paused=!this.paused;e.currentTarget.textContent=this.paused?'Bật gió':'Tạm dừng gió'};
    document.getElementById('step').onclick=()=>{this.paused=true;this.step++;for(const item of this.items){const i=this.step%item.s.frames.length;item.sprite.setFrame(item.s.frames[i]);item.last=i}};
    document.getElementById('zoom').onchange=e=>{this.zoom=Number(e.target.value);this.applyZoom()};
    document.getElementById('record').onclick=async e=>{const status=document.getElementById('status');if(!this.game.canvas.captureStream||!window.MediaRecorder){status.textContent='Trình duyệt không hỗ trợ ghi WebM';return}const chunks=[],stream=this.game.canvas.captureStream(30),rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});rec.ondataavailable=x=>x.data.size&&chunks.push(x.data);rec.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download='gfx5b5-tree-wind-showcase.webm';a.click();status.textContent='Đã tải WebM 6 giây'};rec.start();e.currentTarget.disabled=true;status.textContent='Đang ghi 6 giây…';setTimeout(()=>{rec.stop();e.currentTarget.disabled=false},6000)};
    document.getElementById('status').textContent='6 loài · 4× để cận cảnh (chọn cây ở 2×) · nearest-neighbor';
  }
  applyZoom(){const detail=this.zoom===4;this.items.forEach((item,i)=>{const visible=!detail||i===this.selected;item.sprite.setVisible(visible);item.label.setVisible(visible);if(detail){item.sprite.setPosition(380,278).setScale(4);item.label.setPosition(380,548).setFontSize('18px')}else{item.sprite.setPosition(item.cx,item.cy).setScale(this.zoom);item.label.setPosition(item.cx,item.cy+63*this.zoom).setFontSize(`${12*this.zoom}px`)}})}
  update(_time,delta){if(this.paused)return;for(const item of this.items){const total=item.s.dur.reduce((a,b)=>a+b,0),t=(this.time.now+item.phase)%total;let n=0,at=t;while(n<item.s.dur.length-1&&at>=item.s.dur[n]){at-=item.s.dur[n++]}if(n!==item.last){item.sprite.setFrame(item.s.frames[n]);item.last=n}}}
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:760,height:620,backgroundColor:'#263d31',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{pixelArt:true,roundPixels:true,antialias:false},scene:[WindShowcase]});
window.__treeWindShowcase={ready:()=>Boolean(liveScene?.items.length===6),state:()=>liveScene?.items.map(({sprite,s})=>({name:s.key,frame:sprite.frame.name,x:s.x,y:s.y,visible:sprite.visible,scale:sprite.scaleX}))};

const colors=[0x8de2ad,0x61c4eb,0xb892e9,0xf4c46e];

export class SpiritVeinOverlay {
  constructor(scene){
    this.scene=scene;
    this.veins=scene.sectCampus.spiritVeins;
    this.enabled=true;
    this.markers=scene.add.graphics().setDepth(7882);
    const map=document.getElementById('world-map-menu');
    const section=document.createElement('details');
    section.innerHTML='<summary>Linh mạch</summary><label><input type="checkbox" checked> Hiện trên bản đồ</label> <select data-grade aria-label="Phẩm cấp"><option value="">Mọi phẩm cấp</option><option value="1">Hạ phẩm</option><option value="2">Trung phẩm</option><option value="3">Thượng phẩm</option><option value="4">Cực phẩm</option></select> <select data-owner aria-label="Chủ sở hữu"><option value="">Mọi chủ sở hữu</option><option value="owned">Có chủ</option><option value="wild">Vô chủ</option></select> <select data-stock aria-label="Trữ lượng"><option value="">Mọi trữ lượng</option><option value="stock">Còn trữ lượng</option><option value="empty">Đã cạn</option></select><div data-veins></div>';
    map.append(section);
    const grade=section.querySelector('[data-grade]'),owner=section.querySelector('[data-owner]'),
      stock=section.querySelector('[data-stock]'),list=section.querySelector('[data-veins]');
    this.refreshList=()=>{if(section.open)for(const button of list.children){
      const site=this.veins.sites.get(button.dataset.id);
      button.hidden=Boolean(grade.value&&Number(grade.value)!==site.grade||
        owner.value&&Boolean(site.state.owner)!==(owner.value==='owned')||
        stock.value&&(site.state.amount>0)!==(stock.value==='stock'));
      button.textContent=site.name+' · '+site.state.amount+'/'+site.max;
    }};
    for(const site of this.veins.sites.values()){
      const button=document.createElement('button');
      button.type='button';button.dataset.id=site.id;list.append(button);
      button.onclick=()=>{map.hidden=true;scene.inspector.select({kind:'spiritVein',id:site.id});scene.inspector.locate();};
    }
    section.ontoggle=grade.onchange=owner.onchange=stock.onchange=this.refreshList;
    section.querySelector('input').onchange=e=>{this.enabled=e.target.checked;this.next=0;};
    scene.events.once('shutdown',()=>section.remove());
  }
  update(time){
    if(time<(this.next??0))return;
    this.next=time+170;
    const {worldView,zoom}=this.scene.cameras.main;
    this.markers.clear();
    for(const site of this.veins.sites.values()){
      const {x,y}=site.point,near=zoom>=.5;
      const visible=this.enabled&&x>=worldView.x-45&&x<=worldView.right+45&&y>=worldView.y-45&&y<=worldView.bottom+45;
      const sprite=site.sprite;
      sprite.setVisible(visible).setAlpha(site.state.amount>0?1:.48);
      sprite.setScale(near?1.38:Math.min(1.5,.32/zoom));
      if(!visible)continue;
      const size=(near?4:5)/zoom,px=x,py=y-(near?44:13/zoom);
      const color=site.state.amount>0?colors[site.grade-1]:0x8b938b;
      this.markers.fillStyle(0x182321,.91).fillCircle(px,py,size*1.2);
      this.markers.fillStyle(color,.98).fillTriangle(px-size,py,px,py-size,px+size,py);
      this.markers.fillTriangle(px-size,py,px,py+size,px+size,py);
    }
    if(time>=(this.nextList??0)){this.nextList=time+1000;this.refreshList();}
  }
}

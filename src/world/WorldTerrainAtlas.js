const TILE_COLUMNS = 32;
const MAX_VARIANTS = 1024;
const TEXTURE_KEY = 'world-terrain-atlas';

// This map exists only to render. The authored map continues to supply
// collisions, terrain queries, interactions and debug metadata.
export class WorldTerrainAtlas {
  static create(scene, layers, tilesets) {
    const gl=scene.game.renderer.gl;
    if(!gl||layers.length===0||gl.getParameter(gl.MAX_TEXTURE_SIZE)<1024)return null;
    const {map}=scene, groupIds=new Map(), groups=[];
    const cityGround=tilesets.find(tileset=>tileset.name==='QingyunCourtyardGround');
    const opaqueCityMaterial=tile=>cityGround&&tile.index>=cityGround.firstgid&&tile.index<cityGround.firstgid+96;
    const data=[];
    for(let y=0;y<map.height;y++){
      const row=[];
      for(let x=0;x<map.width;x++){
        const tiles=[];
        for(const layer of layers){
          const tile=layer.layer.data[y][x];
          if(tile?.index>=0&&tile.visible&&tile.alpha){
            const alpha=tile.alpha*layer.alpha;
            if(alpha===1&&opaqueCityMaterial(tile))tiles.length=0;
            tiles.push({tile,alpha});
          }
        }
        const signature=tiles.map(({tile,alpha})=>[tile.index,tile.rotation,Number(tile.flipX),Number(tile.flipY),alpha].join(':')).join('|');
        if(!groupIds.has(signature)){
          if(groups.length>=MAX_VARIANTS)return null;
          groupIds.set(signature,groups.length);groups.push(tiles);
        }
        row.push(groupIds.get(signature));
      }
      data.push(row);
    }
    return new WorldTerrainAtlas(scene,layers,tilesets,groups,data);
  }

  constructor(scene,layers,tilesets,groups,data) {
    this.scene=scene;
    this.layers=layers;
    this.tileVariants=groups.length;
    const {map,textures}=scene, edge=map.tileWidth;
    const columns=Math.min(TILE_COLUMNS,groups.length);
    const lookup=new Map();
    for(const tileset of tilesets){
      const image=tileset.image.getSourceImage();
      for(let gid=tileset.firstgid;gid<tileset.firstgid+tileset.total;gid++){
        const uv=tileset.getTileTextureCoordinates(gid);
        if(uv)lookup.set(gid,{uv,image,width:tileset.tileWidth,height:tileset.tileHeight});
      }
    }
    const texture=textures.createCanvas(TEXTURE_KEY,columns*edge,Math.ceil(groups.length/columns)*edge);
    const ctx=texture.context;
    ctx.imageSmoothingEnabled=false;
    for(let i=0;i<groups.length;i++){
      const x=(i%columns)*edge,y=Math.floor(i/columns)*edge;
      for(const {tile,alpha} of groups[i]){
        const {image,uv,width,height}=lookup.get(tile.index);
        ctx.globalAlpha=alpha;
        if(!tile.rotation&&!tile.flipX&&!tile.flipY){
          ctx.drawImage(image,uv.x,uv.y,width,height,x,y,edge,edge);
        }else{
          ctx.save();
          ctx.translate(x+edge/2,y+edge/2);
          ctx.rotate(tile.rotation);
          ctx.scale(tile.flipX?-1:1,tile.flipY?-1:1);
          ctx.drawImage(image,uv.x,uv.y,width,height,-edge/2,-edge/2,edge,edge);
          ctx.restore();
        }
      }
    }
    texture.refresh();
    this.renderMap=scene.make.tilemap({data,tileWidth:edge,tileHeight:edge});
    const atlas=this.renderMap.addTilesetImage(TEXTURE_KEY,TEXTURE_KEY,edge,edge,0,0,0);
    // Phaser 4.2.1's GPU submitter adds the layer translation to both the matrix
    // and the local quad. Standard TilemapLayers use the full world origin.
    this.renderLayer=this.renderMap.createLayer(0,atlas,(scene.worldMinX??0)/2,0,true).setDepth(0);
    this.setActive(true);
    scene.events.once('shutdown',()=>{
      this.renderMap.destroy();
      textures.remove(TEXTURE_KEY);
    });
  }

  update(camera){
    // The GPU tile shader does not apply Phaser's integral-zoom vertex rounding.
    // Keep the authored layer renderer when the camera requests that pixel grid.
    this.setActive(!(camera.roundPixels&&Number.isInteger(camera.zoomX)&&Number.isInteger(camera.zoomY)));
  }

  setActive(active){
    if(this.active===active)return;
    this.active=active;
    for(const layer of this.layers)layer.setVisible(!active);
    this.renderLayer.setVisible(active);
  }
}

const percentile = (sorted, rate) => sorted[Math.max(0, Math.ceil(sorted.length * rate) - 1)] ?? 0;

export class WorldPerformancePanel {
  constructor(scene) {
    this.scene = scene;
    this.frames = [];
    this.saves = 0;
    this.longTasks = [];
    this.panel = document.createElement('aside');
    this.panel.hidden = true;
    this.panel.id = 'world-performance';
    this.panel.style.cssText = 'position:fixed;left:14px;bottom:70px;z-index:23;padding:10px;background:#14261ff5;border:1px solid #88764a;color:#f1e7cc;font:12px monospace';
    const close = document.createElement('button');
    close.textContent = 'Đóng hiệu năng';
    close.onclick = () => this.setOpen(false);
    this.details = document.createElement('pre');
    this.details.style.marginBottom = '0';
    this.panel.append(close, this.details);
    document.body.append(this.panel);
    this.button = document.getElementById('toggle-world-performance');
    if (this.button) this.button.onclick = () => this.setOpen(this.panel.hidden);
    if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
      this.observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) this.longTasks.push(entry.startTime);
        this.longTasks = this.longTasks.filter(time => time > performance.now() - 10000);
      });
      this.observer.observe({ type: 'longtask' });
    }
    this.preRender = () => {this.renderStart = performance.now();this.frameDrawCalls=0;};
    this.postRender = () => {this.renderMs = performance.now() - this.renderStart;this.drawCalls=this.restoreDrawCalls?.length?this.frameDrawCalls:null;};
    scene.game.events.on('prerender',this.preRender);
    scene.game.events.on('postrender',this.postRender);
  }

  setOpen(open) {
    this.panel.hidden=!open;
    for(const restore of this.restoreDrawCalls??[])restore();
    this.restoreDrawCalls=[];
    if(!open)return;
    const gl=this.scene.game.renderer.gl;
    for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
      const original=gl?.[name];
      if(typeof original!=='function')continue;
      gl[name]=(...args)=>{this.frameDrawCalls++;return original.apply(gl,args);};
      this.restoreDrawCalls.push(()=>{gl[name]=original;});
    }
  }

  recordSave(ok, ms) {
    if (ok) this.saves++;
    this.saveMs = ms;
  }

  snapshot() {
    const scene = this.scene, sorted = [...this.frames].sort((a,b) => a-b);
    const mean = sorted.reduce((sum,value)=>sum+value,0) / Math.max(1,sorted.length);
    const npcs=scene.populationWorld.npcs, view=scene.cameras.main.worldView;
    let rendered=0,inCamera=0,active=0;
    for(const npc of npcs){
      if(!npc.alive)continue;
      const actor=scene.npcSprites.get(npc.id);
      if(npc.x>=view.x&&npc.x<=view.right&&npc.y>=view.y&&npc.y<=view.bottom)inCamera++;
      if(actor?.visible&&(actor.alpha>=.01||scene.npcAppearanceFleet?.entries.get(npc.id)?.renderer.root.visible||scene.characterRigPreview?.npc===npc))rendered++;
      if(npc.action!=='idle'&&npc.action!=='rest')active++;
    }
    return {
      inCamera,rendered,active,drawCalls:this.drawCalls, collisionMs:scene.groundCollisionMs,
      terrainVariants:scene.terrainCache?.tileVariants??0,
      modularActors:scene.npcAppearanceFleet?.entries.size??0,
      fps:mean ? 1000/mean : 0, peakFrameMs:sorted.at(-1)??0,
      p50:percentile(sorted,.5), p95:percentile(sorted,.95), p99:percentile(sorted,.99),
      total:scene.populationWorld.npcs.length, levels:[...scene.scheduler.counts],
      ...scene.lastNpcUpdates,
      aiMs:scene.populationAiCost, routeMs:scene.routeTimeThisFrame, routeCalls:scene.routesStartedThisFrame,
      simulationMs:scene.simulationMs, animationMs:scene.animationMs, uiMs:scene.worldUiMs,
      renderMs:this.renderMs, sprites:scene.children.list.filter(child=>child.visible && (
        child.type==='Sprite'||child.type==='Image'
      ) && scene.inSceneryView(child,180)).length,
      gameObjects:scene.children.list.length, textures:scene.textures.getTextureKeys().length,
      fauna:[...scene.faunaSprites.values()].filter(sprite=>sprite.visible).length,
      fish:scene.riverFishSystem?.visibleCount??0, saves:this.saves, saveMs:this.saveMs,
      loadMs:scene.populationLoadMs,
      heapMB:performance.memory?.usedJSHeapSize/1024/1024 || null,
      longTasks:this.longTasks.filter(time=>time>performance.now()-10000).length,
    };
  }

  update(time,delta) {
    const now=performance.now();
    const elapsed=this.previousFrame!==undefined?now-this.previousFrame:delta;
    this.previousFrame=now;
    if(elapsed>0){this.frames.push(elapsed);if(this.frames.length>120)this.frames.shift()}
    if(this.panel.hidden||time<(this.nextRender??0))return;
    this.nextRender=time+600;
    const m=this.snapshot();
    this.details.textContent=[
      `FPS ${m.fps.toFixed(1)} · p95 ${m.p95.toFixed(1)} ms`,
      `NPC ${m.total} · Trong camera ${m.inCamera} · Bật hiển thị ${m.rendered} · Hoạt động ${m.active}`,
      `L0/L1/L2 mô phỏng ${m.levels.join('/')} · WebGL draw calls ${m.drawCalls??'—'}`,
      `Di chuyển ${m.moved??0} · quyết định ${m.decisions??0} · chờ ${m.queued??0}`,
      `Mô phỏng ${(m.simulationMs??0).toFixed(2)} ms · animation ${(m.animationMs??0).toFixed(2)} ms · UI ${(m.uiMs??0).toFixed(2)} ms`,
      `AI ${(m.aiMs??0).toFixed(2)} ms · đường ${(m.routeMs??0).toFixed(2)} ms (${m.routeCalls??0})`,
      `Va chạm ${(m.collisionMs??0).toFixed(2)} ms`,
      `Render CPU ${(m.renderMs??0).toFixed(2)} ms · texture ${m.textures} · mẫu tile ${m.terrainVariants}/1024`,
      `Renderer NPC ${m.modularActors} · JS heap ${m.heapMB?.toFixed(1)??'—'} MB`,
      `Yêu thú / cá đang hiện ${m.fauna}/${m.fish}`,
      `Lưu ${m.saves} · ${(m.saveMs??0).toFixed(2)} ms · tác vụ dài/10s ${m.longTasks}`,
    ].join('\n');
  }

  destroy() {
    this.setOpen(false);
    this.observer?.disconnect();
    this.scene.game.events.off('prerender',this.preRender);
    this.scene.game.events.off('postrender',this.postRender);
    if(this.button)this.button.onclick=null;
    this.panel.remove();
  }
}

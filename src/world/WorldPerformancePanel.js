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
    close.onclick = () => { this.panel.hidden = true; };
    this.details = document.createElement('pre');
    this.details.style.marginBottom = '0';
    this.panel.append(close, this.details);
    document.body.append(this.panel);
    this.button = document.getElementById('toggle-world-performance');
    if (this.button) this.button.onclick = () => { this.panel.hidden = !this.panel.hidden; };
    if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
      this.observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) this.longTasks.push(entry.startTime);
        this.longTasks = this.longTasks.filter(time => time > performance.now() - 10000);
      });
      this.observer.observe({ type: 'longtask' });
    }
    this.preRender = () => { this.renderStart = performance.now(); };
    this.postRender = () => { this.renderMs = performance.now() - this.renderStart; };
    scene.game.events.on('prerender',this.preRender);
    scene.game.events.on('postrender',this.postRender);
  }

  recordSave(ok, ms) {
    if (ok) this.saves++;
    this.saveMs = ms;
  }

  snapshot() {
    const scene = this.scene, sorted = [...this.frames].sort((a,b) => a-b);
    const mean = sorted.reduce((sum,value)=>sum+value,0) / Math.max(1,sorted.length);
    return {
      fps:mean ? 1000/mean : 0, peakFrameMs:sorted.at(-1)??0,
      p50:percentile(sorted,.5), p95:percentile(sorted,.95), p99:percentile(sorted,.99),
      total:scene.populationWorld.npcs.length, levels:[...scene.scheduler.counts],
      ...scene.lastNpcUpdates,
      aiMs:scene.populationAiCost, routeMs:scene.routeTimeThisFrame, routeCalls:scene.routesStartedThisFrame,
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
      `NPC ${m.total} · L0/L1/L2 ${m.levels.join('/')}`,
      `Di chuyển ${m.moved??0} · quyết định ${m.decisions??0} · chờ ${m.queued??0}`,
      `AI ${(m.aiMs??0).toFixed(2)} ms · đường ${(m.routeMs??0).toFixed(2)} ms (${m.routeCalls??0})`,
      `Render CPU ${(m.renderMs??0).toFixed(2)} ms · sprite gần ${m.sprites}`,
      `Yêu thú / cá đang hiện ${m.fauna}/${m.fish}`,
      `Lưu ${m.saves} · ${(m.saveMs??0).toFixed(2)} ms · tác vụ dài/10s ${m.longTasks}`,
    ].join('\n');
  }

  destroy() {
    this.observer?.disconnect();
    this.scene.game.events.off('prerender',this.preRender);
    this.scene.game.events.off('postrender',this.postRender);
    if(this.button)this.button.onclick=null;
    this.panel.remove();
  }
}

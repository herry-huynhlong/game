import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';

const fields=`
  const lab=s.martialGallery,combat=s.martialCombat;
  const input=name=>document.querySelector('[data-martial="'+name+'"]');
  const field=(name,value)=>{const node=input(name);node.value=value;node.dispatchEvent(new Event('change'));};
  const fire=()=>document.querySelector('.martial-gallery-controls button').onclick();
`;

export async function captureVanPhap({send,evalScene,run,errors,failed,visit,ready,output}){
  await mkdir(output,{recursive:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:880,deviceScaleFactor:1,mobile:false});
  const shot=async(path,format='png')=>{
    const image=await send('Page.captureScreenshot',{format,...(format==='jpeg'?{quality:85}:{})});
    await writeFile(path,Buffer.from(image.data,'base64'));
  };
  const courses=await evalScene(fields+`
    field('speed',0);field('zoom','game');field('detail',2);
    return [...input('course').options].map((row,i)=>{
      const grade=['myriad-sword','chaos-thunder','golden-crow'].includes(row.value)?4:row.value==='void-sword'?3:Math.floor(i/3);
      return {id:row.value,label:row.text,grade,weapon:input('weapon').options[i+1].value};
    });
  `);
  const catalog=await evalScene(fields+`
    const target=document.querySelector('.martial-weapon-catalog');target.open=true;
    return target.querySelectorAll('button').length;
  `);
  assert.equal(catalog,15);
  await shot(join(output,'15-vu-khi.png'));
  await run("document.querySelector('.martial-weapon-catalog').open=false");
  const samples=[];
  for(const course of courses){
    const skills=await evalScene(fields+`
      field('course',${JSON.stringify(course.id)});field('weapon',${JSON.stringify(course.weapon)});
      return [...input('skill').options].map(row=>[row.value,row.text]);
    `);
    for(const [id,name] of skills){
      const specification=await evalScene(fields+`
        field('skill',${JSON.stringify(id)});
        const wave=${JSON.stringify(course.id)};
        field('light',['golden-crow','nine-skies'].includes(wave)?'night':'day');
        const ok=fire(),cast=combat.casts.get(lab.snapshot().actorId);
        return {ok,t:cast?.timeline};
      `);
      assert.ok(specification.ok,id);
      const {t}=specification;
      const video=course.grade>=3&&!process.argv.includes('--skip-videos');
      const record=video&&(!process.argv.includes('--refresh-solar')||['crow-descent','nine-suns'].includes(id));
      const sampleAt=id==='myriad-unite'?5520:id==='nine-dragons'?1850:id==='crow-descent'?2100:
        t.impact+(t.aftermath-t.impact>2500?440:155);
      const moments=new Set([0,Math.min(sampleAt,t.complete-30)]);
      const scenes=record?join(output,'frames',id):null;
      if(record){
        await mkdir(scenes,{recursive:true});
        for(let i=0;i<t.complete+180;i+=100)moments.add(i);
      }
      let previous=0,index=0,visible=0,heads=0;
      for(const time of [...moments].sort((a,b)=>a-b)){
        const state=await evalScene(fields+`
          lab.advance(${time-previous});
          const art=combat.vanPhap;
          return {used:art.used+combat.cinematic.visibleCount(),
            heads:art.pool.filter(p=>p.visible&&p.depth===9212&&p.frame.name.startsWith('chaos-head')).length};
        `);
        visible=Math.max(visible,state.used);
        heads=Math.max(heads,state.heads);
        if(time===Math.min(sampleAt,t.complete-30))await shot(join(output,id+'.png'));
        if(record&&time%100===0)await shot(join(scenes,String(index++).padStart(4,'0')+'.jpg'),'jpeg');
        previous=time;
      }
      if(id==='nine-dragons')assert.equal(heads,9,'Nine separately rendered dragon heads');
      assert.ok(visible>0,id);
      const castResult=await evalScene(fields+`
        lab.advance(${t.complete+8200-previous});
        return {...lab.snapshot(),remaining:combat.casts.size+combat.vanPhap.wards.size+combat.cinematic.visibleCount()};
      `);
      assert.ok(castResult.hits>0,id);
      assert.equal(castResult.remaining,0,id);
      if(record){
        const encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','10',
          '-i',join(scenes,'%04d.jpg'),'-an','-pix_fmt','yuv420p','-c:v','libx264','-preset','ultrafast',
          '-movflags','+faststart',join(output,id+'.mp4')],{stdio:'inherit',windowsHide:true});
        assert.equal(encode.status,0,id);
      }
      samples.push({...course,id,course:course.id,name,visible,heads,duration:t.complete,
        hits:castResult.hits,impactEvents:castResult.impactEvents,video});
      console.log(id+' · '+visible+' rendered · '+castResult.hits+' hits');
    }
  }
  assert.equal(samples.length,45);
  const group=await evalScene(fields+`
    field('light','night');field('course','golden-crow');field('skill','nine-suns');
    field('weapon','crow_dao');field('group',8);
    const ok=fire(),count=combat.casts.size;
    lab.advance(2680);
    return {ok,count,remaining:combat.casts.size,stamps:combat.vanPhap.used};
  `);
  assert.equal(group.count,8,JSON.stringify(group));
  assert.equal(group.remaining,8,JSON.stringify(group));
  await shot(join(output,'tam-tu-si-dong-thoi.png'));
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:800,y:740,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:800,y:740,button:'left',clickCount:1});
  const audio=await run(`new Promise(resolve=>{
    const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');
    ${fields}
    field('group',1);field('skill','crow-descent');fire();
    let prior=0,started=0,peakVoices=0;
    const frame=time=>{
      if(!started)started=time;
      if(prior)lab.advance(time-prior);
      peakVoices=Math.max(peakVoices,combat.vanPhap.voices.size);
      prior=time;
      if(time-started<2420)requestAnimationFrame(frame);
      else resolve({peakVoices,locked:s.sound.locked});
    };
    requestAnimationFrame(frame);
  })`);
  assert.ok(audio.peakVoices<=7,JSON.stringify(audio));
  await visit('/?combatGallery=1&skill=nine-dragons&testMode=1',ready);
  const direct=await evalScene(fields+"return input('skill').value;");
  assert.equal(direct,'nine-dragons');
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  await writeFile(join(output,'samples.json'),JSON.stringify({samples,group,audio,direct},null,2)+'\n');
}

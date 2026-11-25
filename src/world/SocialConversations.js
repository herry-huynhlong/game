const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const relevant=/breakthrough|death|fauna-defeated|treasure|sect-campus|recruit|trade|market-price|vein|expedition|civic-case/;
const idle=[
  ['Trà này thơm thật. Đạo hữu thường ghé quán vào giờ này sao?','Ta thích lúc quán còn yên. Có thể ngồi thong thả một lát.','Vậy lần tới gặp nhau ở đây nhé.','Được, ta cũng muốn nghe chuyện của đạo hữu.'],
  ['Dạo này đi đâu cũng vội. Hôm nay mới có dịp ngồi yên.','Ta cũng vậy. Có người trò chuyện thì thấy nhẹ lòng.','Ngày mai ta còn nhiều việc, nhưng hôm nay cứ thong thả.','Phải, nghỉ một chút rồi hãy tính chuyện ngày mai.'],
  ['Khi đả tọa, đạo hữu thường tìm chỗ nào yên tĩnh?','Ta chọn một chỗ quen, miễn không chắn lối qua lại.','Ta sẽ thử giữ một giờ cố định, chắc sẽ dễ tập trung hơn.','Lúc mệt thì nghỉ trước. Ép mình quá cũng chẳng ích gì.'],
];

export class SocialConversations {
  constructor(society){
    this.society=society;
    this.scene=society.scene;
    this.world=society.world;
    this.state=society.state.conversations??={active:{},history:[],cooldown:{},serial:0,counters:{},seen:[]};
    this.seen=new Set(this.state.seen);
  }
  npc(id){return this.scene.scheduler.byId.get(id)?.npc;}
  count(key){this.state.counters[key]=(this.state.counters[key]??0)+1;}
  diary(n,event){
    const journal=this.society.account(n).socialJournal??=[];
    journal.push({at:this.society.now(),...event});
    if(journal.length>16)journal.shift();
  }
  learn(n,event,source,verified){
    if(!n)return;
    const news=this.society.account(n).news??=[];
    const before=news.find(e=>e.id===event.id);
    if(before&&(before.verified||!verified))return;
    if(before)Object.assign(before,{source,verified});
    else news.push({id:event.id,text:event.description??event.text,at:this.society.now(),source,verified});
    if(news.length>12)news.shift();
  }
  observe(){
    for(const e of this.world.events.slice(-45)){
      if(!e.id||this.seen.has(e.id)||!e.description||!relevant.test(e.type??''))continue;
      this.seen.add(e.id);this.state.seen.push(e.id);
      if(e.data?.civic){
        for(const id of e.data.knownBy)this.learn(this.npc(id),e,'hồ sơ hoặc chứng kiến',e.data.verified);
        continue;
      }
      const actor=this.npc(e.actorId),target=this.npc(e.targetId),origin=target??actor;
      const fresh=Math.abs(this.society.now()-(Number(e.day)*1440+Number(e.minute)))<=12;
      this.learn(actor,e,'tham gia',true);this.learn(target,e,'tham gia',true);
      for(const id of e.data?.members??[])this.learn(this.npc(id),e,'tham gia',true);
      if(fresh&&actor&&e.type==='market-trade'){
        this.diary(actor,{kind:'trade',topic:e.description,id:e.id});
        if(target&&target!==actor)for(const [from,to] of [[actor,target],[target,actor]]){
          const score=from.relationships[to.id]??0;
          if(score>=0&&score<12)from.relationships[to.id]=score+1;
        }
      }
      if(fresh&&origin)for(const n of this.world.npcs){
        if(n.alive&&n!==actor&&n!==target&&distance(n,origin)<=68&&this.scene.monsterLine(n,origin))this.learn(n,e,'chứng kiến',true);
      }
    }
    while(this.state.seen.length>180)this.seen.delete(this.state.seen.shift());
  }
  groups(){
    const groups=new Map();
    for(const [id,visit] of Object.entries(this.society.visits)){
      const n=this.npc(id);
      if(!n?.alive||!['using','waiting-care'].includes(visit.phase)||!this.society.isSeated(n)||visit.venue==='inn')continue;
      const key=visit.venue+':'+visit.table;
      const group=groups.get(key)??[];
      group.push(n);groups.set(key,group);
    }
    return groups;
  }
  current(venue){return Object.values(this.state.active).filter(c=>!venue||c.venue===venue);}
  start(key,group,at){
    const venue=key.split(':')[0], [first]=group;
    const news=group.flatMap(n=>(this.society.account(n).news??[]).map(e=>({...e,speaker:n.id})))
      .filter(e=>at-e.at<1320&&group.some(n=>!(this.society.account(n).news??[]).some(k=>k.id===e.id)))
      .sort((a,b)=>Number(b.verified)-Number(a.verified)||b.at-a.at)[0];
    const people=news?[...group].sort((a,b)=>Number(b.id===news.speaker)-Number(a.id===news.speaker)):group;
    const serial=++this.state.serial;
    const proposed=venue==='tea'&&group.length>=2&&serial%3!==0?this.scene.expeditions?.teaPlan(group):null;
    const proposal=proposed?.q;
    const subject=proposal?'Bàn việc xuất hành':news?'Tin tức':venue==='clinic'?'Chuyện dưỡng thương':venue==='music'?'Thưởng nhạc':'Chuyện đời thường';
    this.state.active[key]={id:'conversation-'+serial,venue,table:key.split(':')[1],people:people.slice(0,4).map(n=>n.id),
      initiator:news?.speaker??first.id,topic:subject,news:proposal?null:news,
      proposal:proposal&&{key:proposal.key,label:proposal.label,invite:proposed.team.find(n=>!group.includes(n))?.name},
      started:at,next:at,lines:[],
      script:(serial+Math.round((first.aiProfile?.axes?.sociability??45)/15))%idle.length};
    this.count('started');
  }
  line(c,index){
    if(c.proposal)return ['Có một việc đang cần người. '+c.proposal.label+'. Ai muốn cùng đi?',
      'Ta có thể góp sức, miễn cả đội thống nhất đường đi và tiền công.',
      c.proposal.invite?'Có thể mời '+c.proposal.invite+' gặp ở lối ra, nếu người ấy đang rảnh.':
        'Ta cũng muốn tham gia. Hãy kiểm tra sức lực và hẹn ở lối ra.',
      'Vậy xem hợp đồng còn mở không rồi cùng quyết định.'][index];
    if(c.news)return [
      (c.news.verified?'Ta biết việc này: ':'Ta nghe kể, chưa rõ thực hư: ')+c.news.text,
      c.news.verified?'Đạo hữu kể vậy, ta sẽ ghi nhớ. Người khác nghe lại vẫn nên xác minh.':'Ta sẽ hỏi thêm trước khi tin chuyện này.',
      'Cảm ơn đạo hữu đã chia sẻ. Tin này có thể hữu ích cho lần tới.',
      'Để ta ghi vào sổ. Giờ mời đạo hữu dùng tiếp.',
    ][index];
    if(c.venue==='music')return ['Khúc đàn hôm nay thật khoan thai.','Đoạn cuối nghe như tiếng gió ngoài hiên.','Ta muốn nán lại nghe thêm một khúc.','Được, trời còn chưa khuya.'][index];
    if(c.venue==='clinic')return ['Đạo hữu cũng đang chờ y sư sao?','Phải. Vết thương đã đỡ, nhưng vẫn nên khám lại.','Cứ ngồi nghỉ. Đến lượt ta sẽ nhắc đạo hữu.','Đa tạ. Mong cả hai sớm khỏe.'][index];
    return idle[c.script][index];
  }
  finish(key,c,group,at){
    delete this.state.active[key];this.state.cooldown[key]=at+37+(c.script*9);
    if(c.lines.length<4)return;
    c.ended=at;c.outcome='Đã trò chuyện';
    for(const n of group){
      const account=this.society.account(n);
      account.needs.social=Math.max(0,account.needs.social-13);
      for(const q of group){
        if(n===q||!c.people.includes(q.id)||!c.people.includes(n.id))continue;
        const contacts=account.contacts??={};
        const prior=n.relationships[q.id]??0;
        if(!contacts[q.id]&&prior===0&&n.id<q.id)this.count('newRelations');
        if(prior>=-10)n.relationships[q.id]=Math.min(100,prior+2);
        if(prior<18&&(n.relationships[q.id]??0)>=18&&n.id<q.id)this.count('friendships');
        contacts[q.id]={times:(contacts[q.id]?.times??0)+1,at};
        if(Object.keys(contacts).length>24)delete contacts[Object.keys(contacts).sort((a,b)=>contacts[a].at-contacts[b].at)[0]];
      }
      if(c.people.includes(n.id)){
        if(c.news&&n.id!==c.news.speaker)this.learn(n,c.news,c.news.speaker,false);
        this.diary(n,{kind:'conversation',venue:c.venue,topic:c.topic,other:c.people.filter(id=>id!==n.id),id:c.id});
      }
    }
    if(c.venue==='tea'&&group.length>=2){
      const party=this.scene.expeditions?.fromConversation(group.filter(n=>c.people.includes(n.id)),c);
      if(party){
        c.outcome='Thành lập '+party.name;this.count('parties');
        for(const n of group.filter(n=>party.members.includes(n.id)))this.diary(n,{kind:'party',topic:party.job.label,id:party.id});
      }
    }
    this.state.history.push(c);if(this.state.history.length>64)this.state.history.shift();
    this.count('completed');this.scene.requestBackgroundSave();
  }
  tick(){
    const at=this.society.now(),groups=this.groups();
    if(at%4===0)this.observe();
    for(const [key,c] of Object.entries(this.state.active)){
      const team=(groups.get(key)??[]).filter(n=>c.people.includes(n.id));
      if(team.length<2){delete this.state.active[key];this.state.cooldown[key]=at+20;continue;}
      if(at<c.next)continue;
      if(c.lines.length>=4){this.finish(key,c,team,at);continue;}
      const order=c.people.filter(id=>team.some(n=>n.id===id));
      const speaker=order[c.lines.length%order.length];
      c.lines.push({speaker,text:this.line(c,c.lines.length),at});
      c.next=at+5+(c.script+c.lines.length)%3;
      this.scene.requestBackgroundSave();
    }
    for(const [key,group] of groups){
      if(group.length<2||this.state.active[key]||at<(this.state.cooldown[key]??0)||this.current().length>=6)continue;
      this.start(key,group,at);
    }
  }
}

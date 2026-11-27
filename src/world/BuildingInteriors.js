export const AUCTION_SITE='van-bao-auction';
export const AUCTION_BUILDING='van-bao-cac';
export const AUCTION_LOT=Object.freeze({
  center:{x:8576,y:1454},
  visual:{x:8480,y:1300,width:192,height:154},
  footprint:{x:8498,y:1400,width:156,height:49},
  entry:{x:8576,y:1470},
  waiting:{x:8576,y:1482},
});

const at=(x,y)=>({x,y});
const prop=(kind,name,x,y)=>({kind,name,x,y});
const podium=prop('podium','Bục đấu giá',23,7);
const seating=Array.from({length:24},(_,i)=>{
  const column=i%6;
  return {...prop('seat','Ghế '+(i+1),10+column*4+(column>=3?5:0),14+Math.floor(i/6)*5),floor:0};
});
const vip=Array.from({length:6},(_,i)=>({...prop('seat','Ghế nhã các '+(i+1),7+(i%3)*13,i<3?11:26),floor:1}));
export const auctionSeats=[...seating,...vip];

function makeFloor(level,name,width,height,entry,down,props,partitions=[]){
  const rows=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>
    !x||!y||x===width-1||y===height-1?'#':'.'));
  for(const {x,y,kind} of props) {
    if(['seat','desk','podium','staff'].includes(kind))continue;
    rows[y][x]='#';
  }
  for(const [left,top,right,bottom] of partitions)
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)rows[y][x]='#';
  return {id:AUCTION_SITE+'-floor-'+(level+1),level,name,width,height,rows,entry,down,
    rooms:[{x:Math.floor(width/2),y:Math.floor(height/2),biome:0,name}],flora:[],props,partitions,edges:[],auction:true};
}

export function createAuctionRoom(){
  const hall=makeFloor(0,'Vạn Bảo Chính Sảnh',46,38,at(23,34),at(40,7),[
    podium,prop('desk','Quản sự tiếp khách',8,29),prop('desk','Quầy ký gửi và giao nhận',8,13),
    prop('display','Bảng công cáo',5,24),prop('counter','Quầy trà',37,28),
    ...seating,...seating.map(p=>prop('tea','Bàn trà',p.x,p.y-2)),
    ...[4,41].flatMap(x=>[11,18,25,33].map(y=>prop('column','Cột chạm',x,y))),
    ...[13,33].map(x=>prop('plant','Chậu tùng',x,33)),
    ...[12,34].flatMap(x=>[7,10].map(y=>prop('vase','Bình men ngọc',x,y))),
    prop('screen','Bình phong đón khách',5,29),prop('screen','Bình phong khu trà',40,28),
    prop('plant','Chậu lan',5,18),prop('plant','Chậu lan',39,17),
  ]);
  const rooms=makeFloor(1,'Thiên Bảo Nhã Các',41,35,at(36,7),at(36,28),[
    ...vip,...vip.map(p=>prop('tea','Bàn trà khách quý',p.x,p.y-2)),
    ...vip.flatMap(p=>[prop('screen','Bình phong nhã các',p.x+4,p.y-2),prop('plant','Chậu lan',p.x-3,p.y-2)]),
    prop('balcony','Lan can nhìn xuống chính sảnh',20,17),
    prop('desk','Bàn giám định',7,18),prop('vase','Bình men ngọc',30,17),
    ...[5,18,31].flatMap(x=>[5,24].map(y=>prop('painting','Tranh thủy mặc',x,y))),
  ],[[11,3,11,11],[24,3,24,11],[11,25,11,31],[24,25,24,31],[14,17,26,20]]);
  const vault=makeFloor(2,'Vạn Bảo Bí Khố',36,30,at(31,24),null,[
    prop('shelf','Tủ công pháp',5,7),prop('rack','Giá kiếm và binh khí',11,7),
    prop('cargo','Rương linh thạch',5,15),prop('cargo','Kho nguyên liệu',11,15),
    prop('pedestal','Bệ ký gửi',19,9),prop('pedestal','Tủ linh bảo',24,9),
    prop('desk','Sổ sách quản sự',25,20),prop('staff','Vị trí hộ vệ',28,23),
    prop('screen','Bình phong kho',17,24),prop('plant','Chậu tùng',21,24),
    prop('seal','Trận pháp bảo vệ',19,17),prop('desk','Quầy niêm phong',22,12),
    prop('vase','Bình men lam',4,22),prop('column','Cột bảo khố',13,21),
    prop('column','Cột bảo khố',28,9),prop('cargo','Hòm hồ sơ',23,24),
  ]);
  return {floors:[hall,rooms,vault],nodes:[]};
}

export const BUILDING_INTERIORS=new Map([[AUCTION_BUILDING,{
  id:AUCTION_BUILDING,siteId:AUCTION_SITE,capacity:auctionSeats.length,
  name:'Vạn Bảo Các',type:'Thương hội và đấu giá',
  hours:'Ký gửi ngày 1–5 · Đấu giá ngày 7 từ 10:00',
  services:'Ký gửi, giao nhận, đấu giá, giám định và lưu kho',
  entry:AUCTION_LOT.entry,exit:AUCTION_LOT.waiting,createMap:createAuctionRoom,
}]]);

export function auctionSite(point){
  const interior=BUILDING_INTERIORS.get(AUCTION_BUILDING);
  const map=interior.createMap();
  return point&&{id:interior.siteId,kind:'auction',name:interior.name,point,grade:1,max:0,minutes:0,
    state:{amount:0},map,entrySlots:[map.floors[0].entry,at(22,34),at(24,34),at(23,35),at(23,33)]};
}

-- Run from the game root with Aseprite -b --script.
local source = "art/source/heaven/"
local output = "public/assets/heaven/"
local function ink(hex)
  return Color{r=tonumber(hex:sub(1,2),16),g=tonumber(hex:sub(3,4),16),b=tonumber(hex:sub(5,6),16)}
end
local function dot(im,x,y,c) im:drawPixel(x,y,ink(c)) end
local function line(im,x,y,u,v,c)
  local n=math.max(math.abs(u-x),math.abs(v-y),1)
  for i=0,n do dot(im,math.floor(x+(u-x)*i/n+.5),math.floor(y+(v-y)*i/n+.5),c) end
end
local function shape(im,pts,c)
  for y=0,im.height-1 do
    local cuts={}
    for j,a in ipairs(pts) do
      local b=pts[j%#pts+1]
      if (a[2]<=y and b[2]>y) or (b[2]<=y and a[2]>y) then
        cuts[#cuts+1]=a[1]+(y-a[2])*(b[1]-a[1])/(b[2]-a[2])
      end
    end
    table.sort(cuts)
    for j=1,#cuts,2 do
      for x=math.ceil(cuts[j]),math.floor(cuts[j+1]) do dot(im,x,y,c) end
    end
  end
end
local function sheet(name,w,h,count,layers,draw)
  local sprite=Sprite(w,h)
  sprite.layers[1].name=layers[1]
  for i=2,#layers do sprite:newLayer().name=layers[i] end
  local atlas=Image(w*count,h)
  for i=1,count do
    local frame=i==1 and sprite.frames[1] or sprite:newEmptyFrame()
    frame.duration=.12
    local images={}
    for j=1,#layers do images[j]=Image(w,h) end
    draw(i-1,table.unpack(images))
    local flat=Image(w,h)
    for j,im in ipairs(images) do
      sprite:newCel(sprite.layers[j],frame,im,Point(0,0))
      flat:drawImage(im,Point(0,0))
    end
    atlas:drawImage(flat,Point((i-1)*w,0))
  end
  sprite:saveAs(source..name..".aseprite")
  atlas:saveAs(output..name..".png")
  sprite:close()
end

local grip={{39,48},{25,48},{26,48},{38,48}}
local tips={{{51,34},{48,58},{46,55},{53,29}},{{44,15},{37,4},{42,13},{52,14}},{{13,19},{4,34},{5,31},{19,12}},{{51,19},{60,34},{59,31},{45,12}}}
local function bamboo(im,gx,gy,tx,ty)
  local bx,by=math.floor((gx*5+tx*3)/8),math.floor((gy*5+ty*3)/8)
  line(im,gx-2,gy+3,bx,by,"3d3029")
  line(im,gx+1,gy+2,bx+2,by,"443625")
  line(im,bx+1,by,tx,ty,"544426")
  line(im,gx,gy,bx+1,by,"b58643")
  line(im,bx+1,by,tx,ty,"d3b174")
  dot(im,bx,by,"e7ca86")
  dot(im,tx,ty,"ede0ab")
  for i=0,3 do dot(im,gx-1,gy+i,i%2==0 and "7d5437" or "493325") end
end
sheet("rod-grip",64,64,16,{"Cần tre và đốt","Tay, cổ tay áo"},function(i,rod,hand)
  local d,p=math.floor(i/4)+1,i%4+1
  local gx,gy=table.unpack(grip[d])
  local tx,ty=table.unpack(tips[d][p])
  bamboo(rod,gx,gy,tx,ty)
  shape(hand,{{gx-3,gy-4},{gx+1,gy-5},{gx+3,gy-2},{gx+1,gy},{gx-3,gy-1}},"233b3d")
  line(hand,gx-2,gy-3,gx+1,gy-3,"81998b")
  line(hand,gx-1,gy-1,gx+1,gy-1,"ead1a1")
  dot(hand,gx,gy,"b78662")
end)
sheet("float",12,12,3,{"Gợn nước","Phao, lưỡi và dây"},function(i,ripple,body)
  local w=2+i
  line(ripple,6-w,8,4,9,"568e97")
  line(ripple,6,10,6+w,8,"9ccacc")
  line(body,6,2+i%2,6,7,"fbf1c0")
  line(body,5,5,7,5,"ab5141")
  line(body,5,6,7,6,"e68d60")
  dot(body,6,7,"874037")
end)

local books={
  {"book_qingyun_wave","296769","8dccbc",1},
  {"book_crescent_wave","793f35","e4ad73",2},
  {"book_spirit_thrust","35436e","a5bdee",3},
  {"book_spirit_guard","4a5b3b","e6cf89",4},
}
for _,b in ipairs(books) do
  sheet(b[1],24,24,1,{"Giấy và gáy","Bìa","Phù hiệu"},function(_,paper,cover,mark)
    shape(paper,{{4,5},{16,2},{20,5},{21,17},{17,21},{6,22},{3,18}},"302631")
    shape(paper,{{4,15},{18,12},{20,16},{17,20},{5,20}},"e1c894")
    line(paper,6,19,16,18,"a28159")
    shape(cover,{{4,5},{17,3},{20,6},{18,16},{5,18}} ,b[2])
    line(cover,5,5,5,17,"242a31")
    line(cover,7,6,17,4,b[3])
    line(cover,7,16,17,14,b[3])
    for y=7,14,3 do dot(cover,5,y,"eed49e") end
    if b[4]==1 then line(mark,9,13,15,7,b[3]);line(mark,9,11,12,14,b[3])
    elseif b[4]==2 then line(mark,10,7,13,8,b[3]);line(mark,13,8,14,11,b[3]);line(mark,14,11,11,14,b[3])
    elseif b[4]==3 then line(mark,8,12,15,9,b[3]);line(mark,13,8,16,9,b[3])
    else shape(mark,{{11,7},{15,10},{11,14},{8,11}},b[3]);dot(mark,11,10,b[2]) end
  end)
end
sheet("fishing_rod_basic",24,24,1,{"Cần tre","Dây, phao và lưỡi"},function(_,rod,tackle)
  bamboo(rod,5,19,20,4)
  line(tackle,20,5,20,16,"a8af9f");dot(tackle,20,12,"f59c63")
  line(tackle,20,16,19,18,"d9ddcf");line(tackle,19,18,17,17,"d9ddcf")
end)
sheet("projectiles",48,48,9,{"Luồng khí","Lõi sáng","Hạt linh lực"},function(i,edge,core,motes)
  local style,phase=math.floor(i/3),i%3
  if style==0 then
    shape(edge,{{13,4},{29,5},{38,12},{44,22},{40,32},{31,41},{10,44},{24,34},{30,26},{31,20},{26,12}},"ab653d")
    shape(core,{{16,6},{29,7},{38,14},{41,22},{35,32},{23,39},{31,28},{35,22},{32,15}},"ffe49c")
  elseif style==1 then
    shape(edge,{{6,11},{30,13},{42,19},{45,24},{38,29},{13,34},{27,26},{31,21}},"3ca6a6")
    shape(core,{{13,13},{30,16},{41,20},{44,23},{28,28},{34,22}},"c0fff1")
  else
    shape(edge,{{1,21},{31,18},{45,23},{34,28},{10,25},{22,23}},"627cdc")
    shape(core,{{13,23},{32,21},{44,23},{33,25}},"edf0ff")
  end
  for j=0,3 do dot(motes,3+j*4+phase,(i*3+j*5)%16+15,style==0 and "ebac61" or "a6e4e1") end
end)
sheet("guard",48,48,3,{"Mảnh vòng hộ thể","Hạt sáng"},function(i,ring,sparks)
  for octant=0,7 do
    for j=0,4 do
      local a=(octant*5+j+i)*math.pi/20
      local x,y=math.floor(24+19*math.cos(a)),math.floor(24+21*math.sin(a))
      if j<3 then dot(ring,x,y,j==1 and "e9f0b8" or "82c595") end
    end
    local a=octant*math.pi/4+i*.17
    dot(sparks,math.floor(24+22*math.cos(a)),math.floor(24+22*math.sin(a)),"badf9f")
  end
end)
